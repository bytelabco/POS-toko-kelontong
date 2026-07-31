from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import func
from models.models import db, Transaction, TransactionItem, Product, Shift, User
from routes.shifts import get_active_shift

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    today     = date.today()
    yesterday = today - timedelta(days=1)

    # Transaksi hari ini
    transaksi_hari_ini = Transaction.query.filter(
        db.func.date(Transaction.created_at) == today,
        Transaction.status == 'completed'
    ).all()
    total_pendapatan = sum(t.total_price for t in transaksi_hari_ini)
    total_transaksi  = len(transaksi_hari_ini)

    # Pendapatan kemarin — buat perbandingan
    pendapatan_kemarin = db.session.query(func.sum(Transaction.total_price)).filter(
        func.date(Transaction.created_at) == yesterday,
        Transaction.status == 'completed'
    ).scalar() or 0

    if pendapatan_kemarin > 0:
        perubahan_persen = round(((total_pendapatan - pendapatan_kemarin) / pendapatan_kemarin) * 100, 1)
    else:
        perubahan_persen = None

    # Rata-rata nilai transaksi
    rata_rata_transaksi = round(total_pendapatan / total_transaksi) if total_transaksi > 0 else 0

    # Ringkasan 7 hari terakhir
    ringkasan_7hari = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        total_hari = db.session.query(func.sum(Transaction.total_price)).filter(
            func.date(Transaction.created_at) == day,
            Transaction.status == 'completed'
        ).scalar() or 0
        ringkasan_7hari.append({
            'date':    day.strftime('%d %b'),
            'revenue': total_hari
        })

    # Shift aktif milik user yang login — hitung real-time
    identity      = get_jwt_identity()
    current_user  = User.query.get(int(identity))
    active_shift  = get_active_shift(user_id=current_user.id if current_user else None)

    shift_info = None
    if active_shift:
        shift_transactions = Transaction.query.filter_by(
            shift_id=active_shift.id, status='completed'
        ).all()

        total_cash     = sum(t.total_price for t in shift_transactions if t.payment_method == 'cash')
        total_transfer = sum(t.total_price for t in shift_transactions if t.payment_method == 'transfer')
        total_qris     = sum(t.total_price for t in shift_transactions if t.payment_method == 'qris')

        shift_info = {
            'opened_at':             active_shift.opened_at.strftime('%d %b %Y, %H:%M'),
            'opening_cash':          active_shift.opening_cash,
            'total_cash_sales':      total_cash,
            'total_transfer_sales':  total_transfer,
            'total_qris_sales':      total_qris,
            'total_transactions':    len(shift_transactions),
            'estimasi_kas_sekarang': active_shift.opening_cash + total_cash
        }

    # Stok menipis
    stok_menipis = Product.query.filter(
        Product.stock <= Product.low_stock_threshold
    ).all()

    return jsonify({
        'tanggal':             str(today),
        'total_transaksi':     total_transaksi,
        'total_pendapatan':    total_pendapatan,
        'perubahan_persen':    perubahan_persen,
        'rata_rata_transaksi': rata_rata_transaksi,
        'ringkasan_7hari':     ringkasan_7hari,
        'shift_aktif':         shift_info,
        'stok_menipis': [{
            'id':    p.id,
            'name':  p.name,
            'stock': p.stock
        } for p in stok_menipis]
    })