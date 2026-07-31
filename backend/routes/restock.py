from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.models import db, Product, Restock, Supplier, ProductVariant
from routes.auth import manager_required, owner_required

restock_bp = Blueprint('restock', __name__)

@restock_bp.route('/api/restock', methods=['POST'])
@manager_required
def add_restock():
    data        = request.get_json()
    product_id  = data.get('product_id')
    quantity    = data.get('quantity')
    cost_price  = data.get('cost_price')
    note        = data.get('note', '')
    supplier_id = data.get('supplier_id') or None
    variant_id  = data.get('variant_id') or None

    if not all([product_id, quantity, cost_price]):
        return jsonify({'error': 'Semua field wajib diisi'}), 400
    if quantity <= 0:
        return jsonify({'error': 'Jumlah restock harus lebih dari 0'}), 400
    if cost_price < 0:
        return jsonify({'error': 'Harga beli tidak boleh negatif'}), 400

    product = Product.query.filter_by(id=product_id).with_for_update().first()
    if not product:
        return jsonify({'error': 'Produk tidak ditemukan'}), 404

    variant = None
    if variant_id:
        variant = ProductVariant.query.filter_by(id=variant_id).with_for_update().first()

    if variant:
        # Hitung Average Cost KHUSUS varian ini — product.cost_price TIDAK disentuh,
        # karena mencampurnya dengan stok gabungan semua varian akan menghasilkan angka yang salah.
        old_stock_var    = variant.stock
        old_cost_var     = variant.cost_price or 0
        new_avg_cost_var = (
            (old_stock_var * old_cost_var) + (quantity * cost_price)
        ) / (old_stock_var + quantity)
        variant.cost_price = round(new_avg_cost_var, 2)
        variant.stock     += quantity

        # product.stock tetap di-update sebagai TOTAL gabungan semua varian (agregat)
        product.stock += quantity
    else:
        # Produk tanpa varian — hitung Average Cost seperti biasa
        old_stock    = product.stock
        old_cost     = product.cost_price or 0
        new_avg_cost = (
            (old_stock * old_cost) + (quantity * cost_price)
        ) / (old_stock + quantity)
        product.stock      += quantity
        product.cost_price  = round(new_avg_cost, 2)

    if supplier_id and not product.supplier_id:
        product.supplier_id = supplier_id

    restock = Restock(
        product_id=product_id,
        quantity=quantity,
        cost_price=cost_price,
        total_cost=quantity * cost_price,
        note=note,
        supplier_id=supplier_id,
        variant_id=variant_id,
        status='completed'
    )
    db.session.add(restock)
    db.session.commit()

    return jsonify({
        'message':      'Restock berhasil',
        'product':      product.name,
        'variant':      variant.variant_name if variant else None,
        'new_stock':    variant.stock if variant else product.stock,
        'new_avg_cost': variant.cost_price if variant else product.cost_price
    }), 201


@restock_bp.route('/api/restock/<int:id>/void', methods=['POST'])
@owner_required
def void_restock(id):
    restock = Restock.query.get_or_404(id)

    if restock.status == 'void':
        return jsonify({'error': 'Restock sudah dibatalkan'}), 400

    # Batasi void hanya untuk restock TERBARU dari produk/varian ini —
    # supaya perhitungan mundur average cost tetap akurat.
    # Kalau ada restock yang lebih baru setelah ini, pembalikan matematisnya
    # tidak lagi bisa diandalkan.
    latest = Restock.query.filter_by(
        product_id=restock.product_id,
        variant_id=restock.variant_id,
        status='completed'
    ).order_by(Restock.created_at.desc()).first()

    if latest and latest.id != restock.id:
        return jsonify({
            'error': 'Hanya restock TERBARU untuk produk/varian ini yang bisa dibatalkan, '
                     'agar perhitungan Average Cost tetap akurat. Batalkan restock yang lebih baru terlebih dahulu.'
        }), 400

    product = Product.query.filter_by(id=restock.product_id).with_for_update().first_or_404()
    variant = None
    if restock.variant_id:
        variant = ProductVariant.query.filter_by(id=restock.variant_id).with_for_update().first()

    qty        = restock.quantity
    cost_price = restock.cost_price

    current_stock = variant.stock if variant else product.stock
    if current_stock < qty:
        return jsonify({'error': f'Stok tidak cukup untuk void. Stok saat ini: {current_stock}'}), 400

    new_stock = current_stock - qty
    if new_stock > 0:
        current_avg  = variant.cost_price if variant else product.cost_price
        new_avg_cost = (current_stock * current_avg - qty * cost_price) / new_stock
        new_avg_cost = round(max(0, new_avg_cost), 2)
    else:
        new_avg_cost = 0

    if variant:
        variant.stock      -= qty
        variant.cost_price  = new_avg_cost
        product.stock       -= qty   # tetap kurangi agregat, tapi product.cost_price TIDAK disentuh (konsisten dengan add_restock)
    else:
        product.stock      -= qty
        product.cost_price  = new_avg_cost

    restock.status = 'void'
    db.session.commit()

    return jsonify({
        'message':      'Restock berhasil dibatalkan',
        'product':      product.name,
        'variant':      variant.variant_name if variant else None,
        'qty_returned': qty,
        'new_stock':    variant.stock if variant else product.stock,
        'new_avg_cost': variant.cost_price if variant else product.cost_price
    })


@restock_bp.route('/api/restock', methods=['GET'])
@manager_required
def get_restock_history():
    restocks = Restock.query.order_by(Restock.created_at.desc()).all()
    return jsonify([{
        'id':          r.id,
        'product':     r.product.name,
        'variant':     r.variant.variant_name if r.variant else None,
        'supplier':    r.supplier.name if r.supplier else None,
        'quantity':    r.quantity,
        'cost_price':  r.cost_price,
        'total_cost':  r.total_cost,
        'note':        r.note,
        'status':      r.status,
        'created_at':  r.created_at.strftime('%d %b %Y, %H:%M')
    } for r in restocks])