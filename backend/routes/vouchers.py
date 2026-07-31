from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.models import db, Voucher
from routes.auth import manager_required
from datetime import datetime

vouchers_bp = Blueprint('vouchers', __name__)

@vouchers_bp.route('/api/vouchers', methods=['GET'])
@manager_required
def get_vouchers():
    vouchers = Voucher.query.order_by(Voucher.created_at.desc()).all()
    now = datetime.utcnow()
    return jsonify([{
        'id':              v.id,
        'code':            v.code,
        'discount_type':   v.discount_type,
        'discount_value':  v.discount_value,
        'min_transaction': v.min_transaction,
        'max_uses':        v.max_uses,
        'used_count':      v.used_count,
        'expired_at':      v.expired_at.strftime('%Y-%m-%d') if v.expired_at else None,
        'is_active':       v.is_active,
        'is_expired':      bool(v.expired_at and v.expired_at < now)   # ← baru
    } for v in vouchers])

@vouchers_bp.route('/api/vouchers/check', methods=['POST'])
@jwt_required()
def check_voucher():
    data  = request.get_json()
    code  = data.get('code', '').strip().upper()
    total = data.get('total', 0)

    voucher = Voucher.query.filter_by(code=code).first()

    if not voucher:
        return jsonify({'error': 'Voucher tidak ditemukan'}), 404
    if not voucher.is_active:
        return jsonify({'error': 'Voucher tidak aktif'}), 400
    if voucher.expired_at and voucher.expired_at < datetime.utcnow():
        return jsonify({'error': 'Voucher sudah expired'}), 400
    if voucher.max_uses and voucher.used_count >= voucher.max_uses:
        return jsonify({'error': 'Voucher sudah habis digunakan'}), 400
    if total < voucher.min_transaction:
        return jsonify({
            'error': f'Minimum transaksi Rp {int(voucher.min_transaction):,} untuk voucher ini'
        }), 400

    if voucher.discount_type == 'percent':
        discount = total * voucher.discount_value / 100
    else:
        discount = voucher.discount_value

    return jsonify({
        'code':           voucher.code,
        'discount_type':  voucher.discount_type,
        'discount_value': voucher.discount_value,
        'discount_amount': discount
    })

@vouchers_bp.route('/api/vouchers', methods=['POST'])
@manager_required
def add_voucher():
    data = request.get_json()
    if Voucher.query.filter_by(code=data['code'].upper()).first():
        return jsonify({'error': 'Kode voucher sudah ada'}), 400

    expired_at = None
    if data.get('expired_at'):
        expired_at = datetime.strptime(data['expired_at'], '%Y-%m-%d')

    voucher = Voucher(
        code=data['code'].upper(),
        discount_type=data['discount_type'],
        discount_value=data['discount_value'],
        min_transaction=data.get('min_transaction', 0),
        max_uses=data.get('max_uses') or None,
        expired_at=expired_at,
        is_active=True
    )
    db.session.add(voucher)
    db.session.commit()
    return jsonify({'message': 'Voucher berhasil dibuat'}), 201

@vouchers_bp.route('/api/vouchers/<int:id>', methods=['PUT'])            # ← sekarang khusus EDIT
@manager_required
def update_voucher(id):
    voucher = Voucher.query.get_or_404(id)
    data    = request.get_json()

    if not data.get('discount_value'):
        return jsonify({'error': 'Nilai diskon wajib diisi'}), 400

    voucher.discount_type   = data.get('discount_type', voucher.discount_type)
    voucher.discount_value  = data['discount_value']
    voucher.min_transaction = data.get('min_transaction', 0)
    voucher.max_uses        = data.get('max_uses') or None

    if data.get('expired_at'):
        voucher.expired_at = datetime.strptime(data['expired_at'], '%Y-%m-%d')
    else:
        voucher.expired_at = None

    db.session.commit()
    return jsonify({'message': 'Voucher berhasil diupdate'})

@vouchers_bp.route('/api/vouchers/<int:id>/toggle', methods=['PATCH'])   # ← baru, khusus TOGGLE
@manager_required
def toggle_voucher(id):
    voucher = Voucher.query.get_or_404(id)
    voucher.is_active = not voucher.is_active
    db.session.commit()
    return jsonify({'message': 'Status voucher diupdate', 'is_active': voucher.is_active})

@vouchers_bp.route('/api/vouchers/<int:id>', methods=['DELETE'])
@manager_required
def delete_voucher(id):
    voucher = Voucher.query.get_or_404(id)
    db.session.delete(voucher)
    db.session.commit()
    return jsonify({'message': 'Voucher berhasil dihapus'})