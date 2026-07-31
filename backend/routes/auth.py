from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.models import db, User
from functools import wraps
import bcrypt

auth_bp = Blueprint('auth', __name__)

# Helper — ambil user yang sedang login
def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))

# Decorator — hanya owner yang boleh akses
def owner_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if user.role != 'owner':
            return jsonify({'error': 'Akses ditolak — hanya owner'}), 403
        return fn(*args, **kwargs)
    return wrapper

# Decorator — owner dan manager boleh akses
def manager_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if user.role not in ['owner', 'manager']:
            return jsonify({'error': 'Akses ditolak'}), 403
        return fn(*args, **kwargs)
    return wrapper

@auth_bp.route('/api/auth/register', methods=['POST'])
@owner_required
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username sudah dipakai'}), 400
    allowed_roles = ['owner', 'manager', 'cashier']
    role = data.get('role', 'cashier')
    if role not in allowed_roles:
        return jsonify({'error': 'Role tidak valid'}), 400
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    user = User(username=data['username'], password=hashed.decode('utf-8'), role=role)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': f'User {role} berhasil dibuat'}), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({'error': 'Username atau password salah'}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'username': user.username,
        'role': user.role
    })

@auth_bp.route('/api/auth/users', methods=['GET'])
@owner_required
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'created_at': u.created_at.strftime('%d %b %Y')
    } for u in users])

@auth_bp.route('/api/auth/users/<int:id>', methods=['DELETE'])
@owner_required
def delete_user(id):
    user = User.query.get_or_404(id)
    current = get_current_user()
    if user.id == current.id:
        return jsonify({'error': 'Tidak bisa hapus akun sendiri'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User berhasil dihapus'})