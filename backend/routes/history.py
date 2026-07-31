from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from models.models import db, Transaction, TransactionItem, Product
from datetime import datetime, timedelta
from routes.auth import manager_required

history_bp = Blueprint('history', __name__)

@history_bp.route('/api/history', methods=['GET'])
@manager_required
def get_history():
    date_from = request.args.get('date_from')
    date_to   = request.args.get('date_to')

    query = Transaction.query

    if date_from:
        query = query.filter(Transaction.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))
    if date_to:
        # tambah 1 hari agar include tanggal akhir sepenuhnya
        dt_to = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
        query = query.filter(Transaction.created_at < dt_to)

    transactions = query.order_by(Transaction.created_at.desc()).all()

    result = []
    for t in transactions:
        items = TransactionItem.query.filter_by(transaction_id=t.id).all()
        result.append({
            'id':          t.id,
            'total_price': t.total_price,
            'status':      t.status,
            'created_at':  t.created_at.strftime('%d %b %Y, %H:%M'),
            'items': [{
                'product_name':  Product.query.get(i.product_id).name,
                'quantity':      i.quantity,
                'price_at_time': i.price_at_time
            } for i in items]
        })
    return jsonify(result)