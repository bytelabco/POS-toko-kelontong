from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.models import db, Supplier, Product, Restock
from routes.auth import manager_required

suppliers_bp = Blueprint('suppliers', __name__)

@suppliers_bp.route('/api/suppliers', methods=['GET'])
@jwt_required()
def get_suppliers():
    suppliers = Supplier.query.order_by(Supplier.name).all()
    return jsonify([{
        'id':         s.id,
        'name':       s.name,
        'phone':      s.phone,
        'email':      s.email,
        'address':    s.address,
        'notes':      s.notes,
        'created_at': s.created_at.strftime('%d %b %Y')
    } for s in suppliers])

@suppliers_bp.route('/api/suppliers', methods=['POST'])
@manager_required
def add_supplier():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Nama supplier wajib diisi'}), 400
    supplier = Supplier(
        name=data['name'],
        phone=data.get('phone'),
        email=data.get('email'),
        address=data.get('address'),
        notes=data.get('notes')
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier berhasil ditambahkan', 'id': supplier.id}), 201

@suppliers_bp.route('/api/suppliers/<int:id>', methods=['PUT'])
@manager_required
def update_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    data     = request.get_json()
    supplier.name    = data.get('name', supplier.name)
    supplier.phone   = data.get('phone', supplier.phone)
    supplier.email   = data.get('email', supplier.email)
    supplier.address = data.get('address', supplier.address)
    supplier.notes   = data.get('notes', supplier.notes)
    db.session.commit()
    return jsonify({'message': 'Supplier berhasil diupdate'})

@suppliers_bp.route('/api/suppliers/<int:id>', methods=['DELETE'])
@manager_required
def delete_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier berhasil dihapus'})

@suppliers_bp.route('/api/suppliers/<int:id>/history', methods=['GET'])
@manager_required
def get_supplier_history(id):
    supplier = Supplier.query.get_or_404(id)
    restocks = Restock.query.filter_by(supplier_id=id)\
        .order_by(Restock.created_at.desc()).limit(20).all()

    total_spent    = sum(r.total_cost for r in restocks)
    total_restocks = len(restocks)

    return jsonify({
        'supplier': {
            'id':             supplier.id,
            'name':           supplier.name,
            'phone':          supplier.phone,
            'total_restocks': total_restocks,
            'total_spent':    total_spent
        },
        'restocks': [{
            'id':         r.id,
            'product':    r.product.name,
            'quantity':   r.quantity,
            'cost_price': r.cost_price,
            'total_cost': r.total_cost,
            'note':       r.note,
            'created_at': r.created_at.strftime('%d %b %Y, %H:%M')
        } for r in restocks]
    })