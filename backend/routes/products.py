from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Product, Category, ProductUnit, ProductVariant, User
from routes.auth import owner_required, manager_required

products_bp = Blueprint('products', __name__)

def generate_sku(product_id, category_name=None):
    if category_name:
        prefix = ''.join([w[0] for w in category_name.upper().split()][:3])
        prefix = prefix[:3].ljust(3, 'X')
    else:
        prefix = 'PRD'
    return f"{prefix}-{str(product_id).zfill(3)}"

@products_bp.route('/api/products', methods=['GET'])
@jwt_required()
def get_products():
    identity     = get_jwt_identity()
    current_user = User.query.get(int(identity))
    can_see_cost = current_user and current_user.role in ['owner', 'manager']   # ← baru

    products = Product.query.all()
    result = []
    for p in products:
        item = {
            'id':                  p.id,
            'sku':                 p.sku,
            'name':                p.name,
            'price':               p.price,
            'promo_price':         p.promo_price,
            'promo_active':        p.promo_active,
            'effective_price':     p.promo_price if p.promo_active and p.promo_price else p.price,
            'stock':               p.stock,
            'low_stock_threshold': p.low_stock_threshold,
            'category_id':         p.category_id,
            'category_name':       p.category.name if p.category else None,
            'supplier_id':         p.supplier_id,
            'supplier_name':       p.supplier.name if p.supplier else None,
            'units': [{
                'id':         u.id,
                'unit_name':  u.unit_name,
                'conversion': u.conversion,
                'price':      u.price,
                'is_default': u.is_default
            } for u in sorted(p.units, key=lambda u: u.conversion)],
            'variants': [{
                'id':           v.id,
                'variant_name': v.variant_name,
                'sku':          v.sku,
                'price':        v.price,
                'stock':        v.stock,
                **({
                    'cost_price': v.cost_price or 0,
                    'margin':     round(((v.price - (v.cost_price or 0)) / v.price * 100), 1) if v.price and v.price > 0 and v.cost_price else None
                } if can_see_cost else {})
            } for v in p.variants]
        }

        if can_see_cost:                                                        # ← baru
            item['cost_price']   = p.cost_price or 0
            item['margin']       = round(((p.price - (p.cost_price or 0)) / p.price * 100), 1) if p.price > 0 else 0
            item['promo_margin'] = round(((p.promo_price - (p.cost_price or 0)) / p.promo_price * 100), 1) if p.promo_active and p.promo_price and p.cost_price else None

        result.append(item)

    return jsonify(result)

@products_bp.route('/api/products', methods=['POST'])
@manager_required
def add_product():
    data = request.get_json()
    product = Product(
        name=data['name'],
        price=data['price'],
        stock=data['stock'],
        low_stock_threshold=data.get('low_stock_threshold', 5),
        category_id=data.get('category_id') or None,
        promo_price=data.get('promo_price') or None,
        promo_active=data.get('promo_active', False),
        supplier_id=data.get('supplier_id') or None
    )
    db.session.add(product)
    db.session.flush()

    category = Category.query.get(product.category_id) if product.category_id else None
    product.sku = generate_sku(product.id, category.name if category else None)

    default_unit = ProductUnit(
        product_id=product.id,
        unit_name='Satuan',
        conversion=1,
        price=data['price'],
        is_default=True
    )
    db.session.add(default_unit)
    db.session.commit()

    return jsonify({'message': 'Produk berhasil ditambahkan', 'id': product.id}), 201

@products_bp.route('/api/products/<int:id>', methods=['PUT'])
@manager_required
def update_product(id):
    product = Product.query.get_or_404(id)
    data    = request.get_json()
    product.name                = data.get('name', product.name)
    product.price               = data.get('price', product.price)
    product.stock               = data.get('stock', product.stock)
    product.low_stock_threshold = data.get('low_stock_threshold', product.low_stock_threshold)
    product.promo_price         = data.get('promo_price') or None
    product.promo_active        = data.get('promo_active', False)
    product.supplier_id         = data.get('supplier_id') or None

    new_category_id = data.get('category_id') or None
    if new_category_id != product.category_id:
        product.category_id = new_category_id
        category = Category.query.get(new_category_id) if new_category_id else None
        product.sku = generate_sku(product.id, category.name if category else None)

    default_unit = ProductUnit.query.filter_by(product_id=id, is_default=True).first()
    if default_unit:
        default_unit.price = data.get('price', product.price)

    db.session.commit()
    return jsonify({'message': 'Produk berhasil diupdate'})

@products_bp.route('/api/products/<int:id>', methods=['DELETE'])
@owner_required
def delete_product(id):
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Produk berhasil dihapus'})

# ── Unit endpoints ──

@products_bp.route('/api/products/<int:id>/units', methods=['POST'])
@manager_required
def add_unit(id):
    Product.query.get_or_404(id)
    data = request.get_json()

    if not data.get('unit_name') or not data.get('price') or not data.get('conversion'):
        return jsonify({'error': 'unit_name, price, dan conversion wajib diisi'}), 400

    unit = ProductUnit(
        product_id=id,
        unit_name=data['unit_name'],
        conversion=int(data['conversion']),
        price=float(data['price']),
        is_default=False
    )
    db.session.add(unit)
    db.session.commit()
    return jsonify({'message': 'Unit berhasil ditambahkan', 'id': unit.id}), 201

@products_bp.route('/api/products/units/<int:unit_id>', methods=['DELETE'])
@manager_required
def delete_unit(unit_id):
    unit = ProductUnit.query.get_or_404(unit_id)
    if unit.is_default:
        return jsonify({'error': 'Unit default tidak bisa dihapus'}), 400
    db.session.delete(unit)
    db.session.commit()
    return jsonify({'message': 'Unit berhasil dihapus'})

# ── Variant endpoints ──

@products_bp.route('/api/products/<int:id>/variants', methods=['POST'])
@manager_required
def add_variant(id):
    product = Product.query.get_or_404(id)
    data    = request.get_json()

    if not data.get('variant_name'):
        return jsonify({'error': 'Nama varian wajib diisi'}), 400

    variant_code = data['variant_name'].upper().replace(' ', '')[:3]
    variant_sku  = f"{product.sku}-{variant_code}" if product.sku else None

    existing = ProductVariant.query.filter_by(sku=variant_sku).first()
    if existing:
        variant_sku = f"{product.sku}-{variant_code}{id}"

    variant = ProductVariant(
        product_id=id,
        variant_name=data['variant_name'],
        sku=variant_sku,
        price=data.get('price') or product.price,
        cost_price=0,
        stock=data.get('stock', 0)
    )
    db.session.add(variant)
    db.session.commit()
    return jsonify({
        'message': 'Varian berhasil ditambahkan',
        'id':      variant.id,
        'sku':     variant.sku
    }), 201

@products_bp.route('/api/products/variants/<int:variant_id>', methods=['PUT'])
@manager_required
def update_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)
    data    = request.get_json()
    variant.variant_name = data.get('variant_name', variant.variant_name)
    variant.price        = data.get('price', variant.price)
    variant.stock        = data.get('stock', variant.stock)
    db.session.commit()
    return jsonify({'message': 'Varian berhasil diupdate'})

@products_bp.route('/api/products/variants/<int:variant_id>', methods=['DELETE'])
@manager_required
def delete_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)
    db.session.delete(variant)
    db.session.commit()
    return jsonify({'message': 'Varian berhasil dihapus'})