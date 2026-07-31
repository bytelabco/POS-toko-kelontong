from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.models import db, Category, Product
from routes.auth import manager_required

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('/api/categories', methods=['GET'])
@jwt_required()
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([{ 'id': c.id, 'name': c.name } for c in categories])

@categories_bp.route('/api/categories', methods=['POST'])
@manager_required
def add_category():
    data = request.get_json()
    if Category.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Kategori sudah ada'}), 400
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    return jsonify({'message': 'Kategori berhasil ditambahkan', 'id': category.id}), 201

@categories_bp.route('/api/categories/<int:id>', methods=['DELETE'])
@manager_required
def delete_category(id):
    category = Category.query.get_or_404(id)

    # Lepaskan referensi kategori dari semua produk yang memakainya,
    # sesuai janji di pesan konfirmasi frontend ("Produk akan kehilangan kategorinya")
    Product.query.filter_by(category_id=id).update({'category_id': None})

    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Kategori berhasil dihapus'})