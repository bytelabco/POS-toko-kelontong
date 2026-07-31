import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.models import db
from routes.products import products_bp
from routes.transactions import transactions_bp
from routes.dashboard import dashboard_bp
from routes.auth import auth_bp
from routes.history import history_bp
from routes.analytics import analytics_bp
from routes.export import export_bp
from routes.restock import restock_bp
from routes.categories import categories_bp
from routes.vouchers import vouchers_bp
from routes.shifts import shifts_bp
from routes.customers import customers_bp
from routes.suppliers import suppliers_bp


app = Flask(__name__)
app.config.from_object(Config)

# CORS dibatasi hanya ke origin yang diizinkan, bukan seluruh internet.
# Untuk development, default-nya localhost:3000 (React dev server).
# Saat deploy nanti, set CORS_ORIGINS di .env, contoh: https://bytelabtoko.com
allowed_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=allowed_origins, supports_credentials=True)

db.init_app(app)
JWTManager(app)

app.register_blueprint(products_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(history_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(export_bp)
app.register_blueprint(restock_bp)
app.register_blueprint(categories_bp)
app.register_blueprint(vouchers_bp)
app.register_blueprint(shifts_bp)
app.register_blueprint(customers_bp)
app.register_blueprint(suppliers_bp)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # debug dikontrol dari .env, BUKAN di-hardcode.
    # Development: FLASK_DEBUG=True di .env
    # Production : FLASK_DEBUG tidak diset (atau =False) → debugger otomatis mati
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode)