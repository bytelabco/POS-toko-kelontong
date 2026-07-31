from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.models import db, Customer, Transaction
from routes.auth import manager_required

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/api/customers', methods=['GET'])
@jwt_required()
def get_customers():
    customers = Customer.query.order_by(Customer.name).all()
    return jsonify([{
        'id':                 c.id,
        'name':               c.name,
        'phone':              c.phone,
        'email':              c.email,
        'address':            c.address,
        'total_transactions': c.total_transactions,
        'total_spent':        c.total_spent,
        'created_at':         c.created_at.strftime('%d %b %Y')
    } for c in customers])

@customers_bp.route('/api/customers', methods=['POST'])
@jwt_required()
def add_customer():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Nama customer wajib diisi'}), 400
    customer = Customer(
        name=data['name'],
        phone=data.get('phone'),
        email=data.get('email'),
        address=data.get('address')
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify({
        'message': 'Customer berhasil ditambahkan',
        'id':      customer.id,
        'name':    customer.name
    }), 201

@customers_bp.route('/api/customers/<int:id>', methods=['PUT'])
@jwt_required()
def update_customer(id):
    customer = Customer.query.get_or_404(id)
    data     = request.get_json()
    customer.name    = data.get('name', customer.name)
    customer.phone   = data.get('phone', customer.phone)
    customer.email   = data.get('email', customer.email)
    customer.address = data.get('address', customer.address)
    db.session.commit()
    return jsonify({'message': 'Customer berhasil diupdate'})

@customers_bp.route('/api/customers/<int:id>', methods=['DELETE'])
@manager_required
def delete_customer(id):
    customer = Customer.query.get_or_404(id)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({'message': 'Customer berhasil dihapus'})

@customers_bp.route('/api/customers/<int:id>/history', methods=['GET'])
@jwt_required()
def get_customer_history(id):
    customer = Customer.query.get_or_404(id)
    transactions = Transaction.query.filter_by(
        customer_id=id, status='completed'
    ).order_by(Transaction.created_at.desc()).limit(20).all()

    return jsonify({
        'customer': {
            'id':                 customer.id,
            'name':               customer.name,
            'phone':              customer.phone,
            'total_transactions': customer.total_transactions,
            'total_spent':        customer.total_spent
        },
        'transactions': [{
            'id':             t.id,
            'total':          t.total_price,
            'payment_method': t.payment_method,
            'created_at':     t.created_at.strftime('%d %b %Y, %H:%M'),
            'items':          [{
                'product_name': i.product.name,
                'quantity':     i.quantity,
                'price':        i.price_at_time
            } for i in t.items]
        } for t in transactions]
    })