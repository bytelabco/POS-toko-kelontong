from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Shift, Transaction, User
from datetime import datetime
from routes.auth import manager_required

shifts_bp = Blueprint('shifts', __name__)

def get_active_shift(user_id=None):
    query = Shift.query.filter_by(status='open')
    if user_id:
        query = query.filter_by(opened_by=user_id)
    return query.order_by(Shift.opened_at.desc()).first()

def get_current_user():
    identity = get_jwt_identity()
    return User.query.get(int(identity))

@shifts_bp.route('/api/shifts/active', methods=['GET'])
@jwt_required()
def get_active():
    user  = get_current_user()
    shift = get_active_shift(user_id=user.id if user else None)
    if not shift:
        return jsonify(None)
    return jsonify({
        'id':           shift.id,
        'opened_by':    shift.opener.username if shift.opener else None,
        'opening_cash': shift.opening_cash,
        'opened_at':    shift.opened_at.strftime('%d %b %Y, %H:%M'),
        'status':       shift.status
    })

@shifts_bp.route('/api/shifts/active-users', methods=['GET'])
@manager_required
def get_active_users():
    current_user = get_current_user()

    active_shifts = Shift.query.filter_by(status='open').all()

    result = []
    for s in active_shifts:
        if not s.opener:
            continue
        if current_user.role == 'manager' and s.opener.role != 'cashier':
            continue
        result.append({
            'user_id':      s.opener.id,
            'username':     s.opener.username,
            'role':         s.opener.role,
            'opened_at':    s.opened_at.strftime('%d %b %Y, %H:%M'),
            'opening_cash': s.opening_cash
        })

    return jsonify(result)

@shifts_bp.route('/api/shifts/open', methods=['POST'])
@jwt_required()
def open_shift():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User tidak ditemukan'}), 404

    active = get_active_shift(user_id=user.id)
    if active:
        return jsonify({'error': 'Kamu masih punya shift yang aktif'}), 400

    data         = request.get_json()
    opening_cash = data.get('opening_cash', 0)

    shift = Shift(
        opened_by    = user.id,
        opening_cash = opening_cash,
        status       = 'open'
    )
    db.session.add(shift)
    db.session.commit()

    return jsonify({
        'message':      'Shift berhasil dibuka',
        'shift_id':     shift.id,
        'opening_cash': shift.opening_cash,
        'opened_at':    shift.opened_at.strftime('%d %b %Y, %H:%M')
    }), 201

@shifts_bp.route('/api/shifts/close', methods=['POST'])
@jwt_required()
def close_shift():
    user  = get_current_user()
    shift = get_active_shift(user_id=user.id if user else None)

    if not shift:
        return jsonify({'error': 'Tidak ada shift aktif'}), 400

    data         = request.get_json()
    closing_cash = data.get('closing_cash', 0)
    notes        = data.get('notes', '')

    transactions = Transaction.query.filter_by(
        shift_id=shift.id, status='completed'
    ).all()

    total_cash     = sum(t.total_price for t in transactions if t.payment_method == 'cash')
    total_transfer = sum(t.total_price for t in transactions if t.payment_method == 'transfer')
    total_qris     = sum(t.total_price for t in transactions if t.payment_method == 'qris')
    total_count    = len(transactions)

    expected_cash   = shift.opening_cash + total_cash
    cash_difference = closing_cash - expected_cash

    shift.closed_by            = user.id if user else None
    shift.closing_cash         = closing_cash
    shift.total_cash_sales     = total_cash
    shift.total_transfer_sales = total_transfer
    shift.total_qris_sales     = total_qris
    shift.total_transactions   = total_count
    shift.cash_difference      = cash_difference
    shift.notes                = notes
    shift.closed_at            = datetime.utcnow()
    shift.status               = 'closed'
    db.session.commit()

    return jsonify({
        'message':            'Shift berhasil ditutup',
        'opening_cash':       shift.opening_cash,
        'closing_cash':       closing_cash,
        'total_cash':         total_cash,
        'total_transfer':     total_transfer,
        'total_qris':         total_qris,
        'total_sales':        total_cash + total_transfer + total_qris,
        'total_transactions': total_count,
        'expected_cash':      expected_cash,
        'cash_difference':    cash_difference
    })

@shifts_bp.route('/api/shifts', methods=['GET'])
@manager_required
def get_shifts():
    shifts = Shift.query.order_by(Shift.opened_at.desc()).limit(30).all()
    return jsonify([{
        'id':                   s.id,
        'opened_by':            s.opener.username if s.opener else None,
        'closed_by':            s.closer.username if s.closer else None,
        'opening_cash':         s.opening_cash,
        'closing_cash':         s.closing_cash,
        'total_cash_sales':     s.total_cash_sales,
        'total_transfer_sales': s.total_transfer_sales,
        'total_qris_sales':     s.total_qris_sales,
        'total_transactions':   s.total_transactions,
        'cash_difference':      s.cash_difference,
        'notes':                s.notes,
        'opened_at':            s.opened_at.strftime('%d %b %Y, %H:%M'),
        'closed_at':            s.closed_at.strftime('%d %b %Y, %H:%M') if s.closed_at else None,
        'status':               s.status
    } for s in shifts])