from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models.models import db, Transaction, TransactionItem, Product, Restock, ProductVariant
from datetime import datetime, timedelta, date
from sqlalchemy import func
from routes.auth import manager_required

analytics_bp = Blueprint('analytics', __name__)


def parse_date_range():
    """Pola sama dengan history.py — date_from inclusive, date_to exclusive (+1 hari).
    Default: awal bulan ini sampai hari ini, kalau parameter tidak dikirim."""
    date_from_str = request.args.get('date_from')
    date_to_str   = request.args.get('date_to')

    if date_from_str:
        dt_from = datetime.strptime(date_from_str, '%Y-%m-%d')
    else:
        today   = date.today()
        dt_from = datetime(today.year, today.month, 1)

    if date_to_str:
        dt_to = datetime.strptime(date_to_str, '%Y-%m-%d') + timedelta(days=1)
    else:
        dt_to = datetime.combine(date.today(), datetime.min.time()) + timedelta(days=1)

    return dt_from, dt_to


@analytics_bp.route('/api/analytics', methods=['GET'])
@manager_required
def get_analytics():
    dt_from, dt_to = parse_date_range()

    # Pendapatan harian dalam rentang
    num_days = (dt_to.date() - dt_from.date()).days
    daily_revenue = []
    for i in range(num_days):
        day = dt_from.date() + timedelta(days=i)
        total = db.session.query(func.sum(Transaction.total_price)).filter(
            func.date(Transaction.created_at) == day,
            Transaction.status == 'completed'
        ).scalar() or 0
        daily_revenue.append({
            'date':    day.strftime('%d %b'),
            'revenue': total
        })

    # Base query buat produk terlaris — dipakai 2 kali dengan sorting beda
    base_product_query = db.session.query(
        Product.id,
        Product.name,
        func.sum(TransactionItem.quantity).label('total_qty'),
        func.sum(TransactionItem.quantity * TransactionItem.price_at_time).label('total_revenue')
    ).join(Product, TransactionItem.product_id == Product.id)\
     .join(Transaction, TransactionItem.transaction_id == Transaction.id)\
     .filter(
        Transaction.status == 'completed',
        Transaction.created_at >= dt_from,
        Transaction.created_at < dt_to
     )\
     .group_by(Product.id, Product.name)

    # Top 5 by QUANTITY — untuk chart "Produk Terlaris (Qty)"
    top_by_qty_raw = base_product_query\
        .order_by(func.sum(TransactionItem.quantity).desc())\
        .limit(5).all()

    top_products_by_qty = [{
        'id':            p.id,
        'name':          p.name,
        'total_qty':     int(p.total_qty),
        'total_revenue': float(p.total_revenue),
        'has_variants':  bool(Product.query.get(p.id).variants)
    } for p in top_by_qty_raw]

    # Top 5 by REVENUE — untuk tabel "Produk by Pendapatan"
    top_by_revenue_raw = base_product_query\
        .order_by(func.sum(TransactionItem.quantity * TransactionItem.price_at_time).desc())\
        .limit(5).all()

    top_products_by_revenue = [{
        'id':            p.id,
        'name':          p.name,
        'total_qty':     int(p.total_qty),
        'total_revenue': float(p.total_revenue),
        'has_variants':  bool(Product.query.get(p.id).variants)
    } for p in top_by_revenue_raw]

    # Margin per produk — TETAP GLOBAL, tidak ikut filter tanggal, diurutkan dari margin tertinggi
    products = Product.query.all()
    product_margins = []
    for p in products:
        if p.variants:
            for v in p.variants:
                if v.cost_price and v.cost_price > 0 and v.price > 0:
                    product_margins.append({
                        'name':       f"{p.name} ({v.variant_name})",
                        'margin':     round(((v.price - v.cost_price) / v.price * 100), 1),
                        'price':      v.price,
                        'cost_price': round(v.cost_price),
                        'profit':     round(v.price - v.cost_price)
                    })
        elif p.cost_price and p.cost_price > 0:
            product_margins.append({
                'name':       p.name,
                'margin':     round(((p.price - p.cost_price) / p.price * 100), 1) if p.price > 0 else 0,
                'price':      p.price,
                'cost_price': round(p.cost_price),
                'profit':     round(p.price - p.cost_price)
            })

    product_margins.sort(key=lambda x: x['margin'], reverse=True)

    # Restock — dalam rentang
    daily_restock = []
    for i in range(num_days):
        day = dt_from.date() + timedelta(days=i)
        total_cost = db.session.query(func.sum(Restock.total_cost)).filter(
            func.date(Restock.created_at) == day
        ).scalar() or 0
        daily_restock.append({
            'date':       day.strftime('%d %b'),
            'total_cost': total_cost
        })

    # Summary — dalam rentang
    total_revenue = db.session.query(func.sum(Transaction.total_price))\
        .filter(
            Transaction.status == 'completed',
            Transaction.created_at >= dt_from,
            Transaction.created_at < dt_to
        ).scalar() or 0

    sold_items = db.session.query(
        TransactionItem.product_id,
        TransactionItem.variant_id,
        func.sum(TransactionItem.quantity).label('total_qty')
    ).join(Transaction, TransactionItem.transaction_id == Transaction.id)\
     .filter(
        Transaction.status == 'completed',
        Transaction.created_at >= dt_from,
        Transaction.created_at < dt_to
     )\
     .group_by(TransactionItem.product_id, TransactionItem.variant_id).all()

    total_hpp = 0
    for item in sold_items:
        if item.variant_id:
            variant = ProductVariant.query.get(item.variant_id)
            if variant and variant.cost_price:
                total_hpp += item.total_qty * variant.cost_price
        else:
            product = Product.query.get(item.product_id)
            if product and product.cost_price:
                total_hpp += item.total_qty * product.cost_price

    total_profit = total_revenue - total_hpp

    total_transactions = Transaction.query.filter(
        Transaction.status == 'completed',
        Transaction.created_at >= dt_from,
        Transaction.created_at < dt_to
    ).count()

    total_void = Transaction.query.filter(
        Transaction.status == 'void',
        Transaction.created_at >= dt_from,
        Transaction.created_at < dt_to
    ).count()

    total_products = Product.query.count()

    return jsonify({
        'date_from':               dt_from.strftime('%Y-%m-%d'),
        'date_to':                 (dt_to - timedelta(days=1)).strftime('%Y-%m-%d'),
        'daily_revenue':           daily_revenue,
        'daily_restock':           daily_restock,
        'top_products_by_qty':     top_products_by_qty,
        'top_products_by_revenue': top_products_by_revenue,
        'product_margins':         product_margins,
        'summary': {
            'total_revenue':      total_revenue,
            'total_hpp':          round(total_hpp),
            'total_profit':       round(total_profit),
            'total_transactions': total_transactions,
            'total_void':         total_void,
            'total_products':     total_products
        }
    })


@analytics_bp.route('/api/analytics/product/<int:product_id>/variant-breakdown', methods=['GET'])
@manager_required
def get_variant_breakdown(product_id):
    dt_from, dt_to = parse_date_range()

    breakdown = db.session.query(
        ProductVariant.variant_name,
        func.sum(TransactionItem.quantity).label('total_qty'),
        func.sum(TransactionItem.quantity * TransactionItem.price_at_time).label('total_revenue')
    ).join(TransactionItem, TransactionItem.variant_id == ProductVariant.id)\
     .join(Transaction, TransactionItem.transaction_id == Transaction.id)\
     .filter(
        Transaction.status == 'completed',
        ProductVariant.product_id == product_id,
        Transaction.created_at >= dt_from,
        Transaction.created_at < dt_to
     )\
     .group_by(ProductVariant.id, ProductVariant.variant_name)\
     .order_by(func.sum(TransactionItem.quantity).desc()).all()

    return jsonify([{
        'variant_name':  v.variant_name,
        'total_qty':     int(v.total_qty),
        'total_revenue': float(v.total_revenue)
    } for v in breakdown])