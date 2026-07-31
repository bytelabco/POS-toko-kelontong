from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(80), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    role       = db.Column(db.String(20), default='cashier', nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Category(db.Model):
    __tablename__ = 'categories'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    products   = db.relationship('Product', backref='category')

class Product(db.Model):
    __tablename__ = 'products'
    id                  = db.Column(db.Integer, primary_key=True)
    sku                 = db.Column(db.String(50), unique=True, nullable=True)
    name                = db.Column(db.String(100), nullable=False)
    price               = db.Column(db.Float, nullable=False)
    cost_price          = db.Column(db.Float, default=0)
    promo_price         = db.Column(db.Float, nullable=True)
    promo_active        = db.Column(db.Boolean, default=False)
    stock               = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=5)
    category_id         = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    supplier_id         = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    created_at          = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Shift(db.Model):
    __tablename__ = 'shifts'
    id                   = db.Column(db.Integer, primary_key=True)
    opened_by            = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    closed_by            = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    opening_cash         = db.Column(db.Float, default=0)
    closing_cash         = db.Column(db.Float, nullable=True)
    total_cash_sales     = db.Column(db.Float, default=0)
    total_transfer_sales = db.Column(db.Float, default=0)
    total_qris_sales     = db.Column(db.Float, default=0)
    total_transactions   = db.Column(db.Integer, default=0)
    cash_difference      = db.Column(db.Float, nullable=True)
    notes                = db.Column(db.Text, nullable=True)
    opened_at            = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at            = db.Column(db.DateTime, nullable=True)
    status               = db.Column(db.String(20), default='open')
    opener               = db.relationship('User', foreign_keys=[opened_by])
    closer               = db.relationship('User', foreign_keys=[closed_by])
    transactions         = db.relationship('Transaction', backref='shift')

class Transaction(db.Model):
    __tablename__ = 'transactions'
    id              = db.Column(db.Integer, primary_key=True)
    shift_id        = db.Column(db.Integer, db.ForeignKey('shifts.id'), nullable=True)
    customer_id     = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    total_price     = db.Column(db.Float, nullable=False)
    payment_method  = db.Column(db.String(20), default='cash')
    cash_received   = db.Column(db.Float, default=0)
    change_amount   = db.Column(db.Float, default=0)
    discount_amount = db.Column(db.Float, default=0)
    discount_type   = db.Column(db.String(20), default='none')
    voucher_code    = db.Column(db.String(50), nullable=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status          = db.Column(db.String(20), default='completed')
    items           = db.relationship('TransactionItem', backref='transaction')

class TransactionItem(db.Model):
    __tablename__ = 'transaction_items'
    id              = db.Column(db.Integer, primary_key=True)
    transaction_id  = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    product_id      = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    variant_id      = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=True)
    quantity        = db.Column(db.Integer, nullable=False)
    price_at_time   = db.Column(db.Float, nullable=False)
    discount_amount = db.Column(db.Float, default=0)
    product         = db.relationship('Product')
    variant         = db.relationship('ProductVariant')

class Restock(db.Model):
    __tablename__ = 'restocks'
    id         = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    variant_id  = db.Column(db.Integer, db.ForeignKey('product_variants.id'), nullable=True)
    quantity   = db.Column(db.Integer, nullable=False)
    cost_price = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    note       = db.Column(db.String(200), default='')
    status    = db.Column(db.String(20), default='completed')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    product    = db.relationship('Product', backref='restocks')
    variant    = db.relationship('ProductVariant')

class Voucher(db.Model):
    __tablename__ = 'vouchers'
    id              = db.Column(db.Integer, primary_key=True)
    code            = db.Column(db.String(50), unique=True, nullable=False)
    discount_type   = db.Column(db.String(20), nullable=False)
    discount_value  = db.Column(db.Float, nullable=False)
    min_transaction = db.Column(db.Float, default=0)
    max_uses        = db.Column(db.Integer, nullable=True)
    used_count      = db.Column(db.Integer, default=0)
    expired_at      = db.Column(db.DateTime, nullable=True)
    is_active       = db.Column(db.Boolean, default=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Customer(db.Model):
    __tablename__ = 'customers'
    id                 = db.Column(db.Integer, primary_key=True)
    name               = db.Column(db.String(100), nullable=False)
    phone              = db.Column(db.String(20), nullable=True)
    email              = db.Column(db.String(100), nullable=True)
    address            = db.Column(db.Text, nullable=True)
    total_transactions = db.Column(db.Integer, default=0)
    total_spent        = db.Column(db.Float, default=0)
    created_at         = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    transactions       = db.relationship('Transaction', backref='customer')

class ProductUnit(db.Model):
    __tablename__ = 'product_units'
    id          = db.Column(db.Integer, primary_key=True)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    unit_name   = db.Column(db.String(50), nullable=False)
    conversion  = db.Column(db.Integer, default=1)
    price       = db.Column(db.Float, nullable=False)
    is_default  = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    product     = db.relationship('Product', backref='units')

class Supplier(db.Model):
    __tablename__ = 'suppliers'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    phone      = db.Column(db.String(20), nullable=True)
    email      = db.Column(db.String(100), nullable=True)
    address    = db.Column(db.Text, nullable=True)
    notes      = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    products   = db.relationship('Product', backref='supplier')
    restocks   = db.relationship('Restock', backref='supplier')

class ProductVariant(db.Model):
    __tablename__ = 'product_variants'
    id          = db.Column(db.Integer, primary_key=True)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    variant_name = db.Column(db.String(100), nullable=False)
    sku         = db.Column(db.String(50), unique=True, nullable=True)
    price       = db.Column(db.Float, nullable=False)
    cost_price  = db.Column(db.Float, default=0)
    stock       = db.Column(db.Integer, default=0)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    product     = db.relationship('Product', backref='variants')