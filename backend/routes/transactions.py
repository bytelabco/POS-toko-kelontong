from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Transaction, TransactionItem, Product, Voucher, Customer, ProductUnit, ProductVariant, User
from routes.auth import owner_required
from datetime import datetime
from routes.shifts import get_active_shift

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/api/transactions', methods=['POST'])
@jwt_required()
def add_transaction():
    data  = request.get_json()
    items = data.get('items', [])

    if not items:
        return jsonify({'error': 'Tidak ada item'}), 400

    identity     = get_jwt_identity()
    current_user = User.query.get(int(identity))
    active_shift = get_active_shift(user_id=current_user.id if current_user else None)

    if not active_shift:
        return jsonify({'error': 'Belum ada shift aktif. Buka shift terlebih dahulu sebelum bertransaksi.'}), 400

    payment_method        = data.get('payment_method', 'cash')
    cash_received         = data.get('cash_received', 0)
    transaction_discount  = data.get('transaction_discount', 0)
    transaction_disc_type = data.get('transaction_discount_type', 'none')
    voucher_code          = data.get('voucher_code', None)
    customer_id           = data.get('customer_id', None)

    transaction = Transaction(
        total_price=0,
        payment_method=payment_method,
        discount_amount=0,
        discount_type=transaction_disc_type,
        voucher_code=voucher_code,
        shift_id=active_shift.id,
        customer_id=customer_id or None
    )
    db.session.add(transaction)
    db.session.flush()

    total_before_discount  = 0
    transaction_items_data = []

    for item in items:
        product    = Product.query.get_or_404(item['product_id'])
        unit_id    = item.get('unit_id')
        variant_id = item.get('variant_id')
        unit       = ProductUnit.query.get(unit_id) if unit_id else None
        variant    = ProductVariant.query.get(variant_id) if variant_id else None

        if variant:
            if variant.stock < item['quantity']:
                db.session.rollback()
                return jsonify({'error': f'Stok {product.name} ({variant.variant_name}) tidak cukup'}), 400
            unit_price      = variant.price or product.price
            unit_conversion = 1
            unit_name       = variant.variant_name
            variant.stock  -= item['quantity']
            product.stock  -= item['quantity']

        elif unit:
            if unit.is_default and product.promo_active and product.promo_price:
                unit_price = product.promo_price
            else:
                unit_price = unit.price
            unit_conversion = unit.conversion
            unit_name       = unit.unit_name

            if product.stock < item['quantity'] * unit_conversion:
                db.session.rollback()
                return jsonify({'error': f'Stok {product.name} tidak cukup'}), 400
            product.stock -= item['quantity'] * unit_conversion

        else:
            effective_price = product.promo_price if product.promo_active and product.promo_price else product.price
            unit_price      = effective_price
            unit_conversion = 1
            unit_name       = 'Satuan'

            if product.stock < item['quantity']:
                db.session.rollback()
                return jsonify({'error': f'Stok {product.name} tidak cukup'}), 400
            product.stock -= item['quantity']

        item_discount = 0
        subtotal      = unit_price * item['quantity']
        total_before_discount += subtotal

        transaction_item = TransactionItem(
            transaction_id=transaction.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
            quantity=item['quantity'] * unit_conversion,
            price_at_time=unit_price,
            discount_amount=item_discount
        )
        db.session.add(transaction_item)
        transaction_items_data.append({
            'product_name':    product.name,
            'unit_name':       unit_name,
            'quantity':        item['quantity'],
            'price':           unit_price,
            'effective_price': unit_price,
            'discount_amount': item_discount,
            'subtotal':        subtotal
        })

    # Hitung diskon transaksi — voucher divalidasi ULANG di sini, bukan cuma percaya hasil /check
    if voucher_code:
        voucher = Voucher.query.filter_by(code=voucher_code.upper()).with_for_update().first()   # ← baru: lock row biar aman dari race condition

        if not voucher:
            db.session.rollback()
            return jsonify({'error': 'Voucher tidak ditemukan'}), 400
        if not voucher.is_active:
            db.session.rollback()
            return jsonify({'error': 'Voucher tidak aktif'}), 400
        if voucher.expired_at and voucher.expired_at < datetime.utcnow():
            db.session.rollback()
            return jsonify({'error': 'Voucher sudah expired'}), 400
        if voucher.max_uses and voucher.used_count >= voucher.max_uses:            # ← baru: cek ulang kuota
            db.session.rollback()
            return jsonify({'error': 'Voucher sudah habis digunakan'}), 400
        if total_before_discount < voucher.min_transaction:                        # ← baru: cek ulang minimum
            db.session.rollback()
            return jsonify({'error': f'Minimum transaksi Rp {int(voucher.min_transaction):,} untuk voucher ini'}), 400

        if voucher.discount_type == 'percent':
            final_discount = total_before_discount * voucher.discount_value / 100
        else:
            final_discount = voucher.discount_value
        voucher.used_count += 1
    elif transaction_disc_type == 'percent':
        final_discount = total_before_discount * transaction_discount / 100
    elif transaction_disc_type == 'fixed':
        final_discount = transaction_discount
    else:
        final_discount = 0

    total = max(0, total_before_discount - final_discount)

    if payment_method == 'cash' and cash_received < total:
        db.session.rollback()
        return jsonify({'error': 'Uang diterima kurang dari total'}), 400

    change = cash_received - total if payment_method == 'cash' else 0

    transaction.total_price     = total
    transaction.cash_received   = cash_received
    transaction.change_amount   = change
    transaction.discount_amount = final_discount
    db.session.commit()

    if customer_id:
        customer = Customer.query.get(customer_id)
        if customer:
            customer.total_transactions += 1
            customer.total_spent        += total
            db.session.commit()

    customer_name = None
    if customer_id:
        customer = Customer.query.get(customer_id)
        if customer:
            customer_name = customer.name

    return jsonify({
        'transaction_id':  transaction.id,
        'total':           total,
        'subtotal':        total_before_discount,
        'discount_amount': final_discount,
        'voucher_code':    voucher_code,
        'cash_received':   cash_received,
        'change':          change,
        'payment_method':  payment_method,
        'customer_name':   customer_name,
        'created_at':      transaction.created_at.strftime('%d %b %Y, %H:%M'),
        'items':           transaction_items_data
    }), 201

@transactions_bp.route('/api/transactions/<int:id>/void', methods=['POST'])
@owner_required
def void_transaction(id):
    transaction = Transaction.query.get_or_404(id)

    if transaction.status == 'void':
        return jsonify({'error': 'Transaksi sudah dibatalkan'}), 400

    items = TransactionItem.query.filter_by(transaction_id=id).all()
    for item in items:
        product = Product.query.get(item.product_id)
        if product:
            product.stock += item.quantity
        if item.variant_id:
            variant = ProductVariant.query.get(item.variant_id)
            if variant:
                variant.stock += item.quantity

    # Kembalikan kuota voucher kalau transaksi ini pakai voucher              # ← baru
    if transaction.voucher_code:
        voucher = Voucher.query.filter_by(code=transaction.voucher_code).first()
        if voucher and voucher.used_count > 0:
            voucher.used_count -= 1

    if transaction.customer_id:
        customer = Customer.query.get(transaction.customer_id)
        if customer:
            customer.total_transactions = max(0, customer.total_transactions - 1)
            customer.total_spent        = max(0, customer.total_spent - transaction.total_price)

    transaction.status = 'void'
    db.session.commit()
    return jsonify({'message': 'Transaksi berhasil dibatalkan'})