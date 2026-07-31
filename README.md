# ByteLab Toko — Point of Sale System

Sistem manajemen toko (POS) untuk UMKM di Indonesia. Dibangun dengan Flask (backend) dan React (frontend), mendukung transaksi multi-metode pembayaran, manajemen stok per-varian, shift kasir, voucher, dan analitik penjualan dengan hierarki akses berbasis role.

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Fitur Utama](#fitur-utama)
- [Role & Permission](#role--permission)
- [Struktur Project](#struktur-project)
- [Prasyarat](#prasyarat)
- [Instalasi & Setup](#instalasi--setup)
- [Environment Variables](#environment-variables)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Catatan Keamanan](#catatan-keamanan)
- [Kontribusi](#kontribusi)

---

## Tech Stack

**Backend**
- Flask (Python) — REST API
- PostgreSQL — database
- SQLAlchemy — ORM
- Flask-JWT-Extended — autentikasi berbasis token
- Flask-CORS — cross-origin resource sharing
- ReportLab & openpyxl — export laporan PDF/Excel

**Frontend**
- React (Create React App)
- Tailwind CSS — styling
- Recharts — visualisasi data/grafik
- Axios — HTTP client
- React Router — routing

---

## Fitur Utama

- **Transaksi** — checkout dengan dukungan produk bervarian (ukuran/warna), multi-unit (satuan/lusin/dst), diskon, dan voucher
- **Manajemen Produk** — kategori, varian, unit konversi, harga promo, kalkulasi HPP & margin otomatis
- **Shift Kasir** — buka/tutup shift per-user dengan rekonsiliasi kas otomatis (cash, transfer, QRIS)
- **Voucher** — diskon persen/nominal dengan batas penggunaan, minimum transaksi, dan tanggal kadaluarsa
- **Dashboard** — ringkasan performa harian, tren 7 hari, status shift real-time, monitoring akun aktif
- **Analitik** — laporan pendapatan/HPP/profit dengan filter rentang tanggal, margin per produk, produk terlaris
- **Manajemen Supplier & Restock** — pencatatan pembelian stok dengan perhitungan *average cost* otomatis
- **Manajemen Customer** — riwayat belanja per pelanggan
- **Export Laporan** — PDF dan Excel untuk riwayat transaksi
- **Multi-role Access Control** — hierarki akses Owner → Manager → Kasir di seluruh fitur

---

## Role & Permission

| Fitur | Owner | Manager | Kasir |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Transaksi | ✅ | ✅ | ✅ |
| Produk (lihat) | ✅ | ✅ | ✅ (tanpa HPP/margin) |
| Produk (kelola) | ✅ | ✅ | ❌ |
| Produk (hapus) | ✅ | ❌ | ❌ |
| Restock | ✅ | ✅ | ❌ |
| Riwayat Transaksi | ✅ | ✅ | ❌ |
| Analisa | ✅ | ✅ | ❌ |
| Voucher | ✅ | ✅ | ❌ |
| Kategori & Supplier | ✅ | ✅ | ❌ |
| Kelola User | ✅ | ❌ | ❌ |
| Export Laporan | ✅ | ❌ | ❌ |
| Void Transaksi/Restock | ✅ | ❌ | ❌ |

> Setiap kasir/manager wajib membuka shift terlebih dahulu sebelum dapat melakukan transaksi. Shift bersifat personal (per-user), bukan shared.

---

## Struktur Project

```
bytelab-toko/
├── backend/
│   ├── app.py                  # Entry point Flask
│   ├── config.py                # Konfigurasi (baca dari .env)
│   ├── requirements.txt
│   ├── models/
│   │   └── models.py             # Semua model SQLAlchemy
│   └── routes/
│       ├── auth.py               # Login, register, role decorators
│       ├── products.py
│       ├── transactions.py
│       ├── shifts.py
│       ├── dashboard.py
│       ├── analytics.py
│       ├── vouchers.py
│       ├── customers.py
│       ├── suppliers.py
│       ├── categories.py
│       ├── restock.py
│       ├── history.py
│       └── export.py
└── frontend/
    ├── src/
    │   ├── pages/                # Satu file per halaman
    │   ├── components/           # Sidebar, Layout
    │   └── context/               # AuthContext, SidebarContext
    └── public/
```

---

## Prasyarat

- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+

---

## Instalasi & Setup

### 1. Clone repository

```bash
git clone https://github.com/bytelabco/POS-toko-kelontong.git
cd POS-toko-kelontong
```

### 2. Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Buat file `.env` di dalam folder `backend/` (lihat [Environment Variables](#environment-variables)).

Buat database PostgreSQL:

```bash
sudo -u postgres psql
CREATE DATABASE bytelab_toko;
\q
```

Jalankan aplikasi sekali untuk membuat semua tabel:

```bash
python app.py
```

> ⚠️ `db.create_all()` hanya membuat tabel yang **belum ada**. Perubahan skema pada tabel yang sudah ada (menambah kolom, dsb.) harus dilakukan manual lewat `ALTER TABLE` di `psql`, karena project ini belum menggunakan tool migrasi seperti Flask-Migrate/Alembic.

### 3. Setup Frontend

```bash
cd ../frontend
npm install
```

Buat file `.env` di dalam folder `frontend/` (lihat [Environment Variables](#environment-variables)).

---

## Environment Variables

### `backend/.env`

```env
DATABASE_URL=postgresql://username:password@localhost:5432/bytelab_toko
SECRET_KEY=<generate dengan: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<generate string acak terpisah, berbeda dari SECRET_KEY>
CORS_ORIGINS=http://localhost:3000
FLASK_DEBUG=True
```

### `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:5000
```

### `frontend/.env.production`

```env
REACT_APP_API_URL=<isi dengan URL API production setelah deploy>
```

> `SECRET_KEY` dan `JWT_SECRET_KEY` **harus** berbeda dan bersifat rahasia. Jangan pernah commit file `.env` ke repository — sudah dikecualikan lewat `.gitignore`.

---

## Menjalankan Aplikasi

**Backend** (dari folder `backend/`, dengan virtualenv aktif):
```bash
python app.py
```
Berjalan di `http://localhost:5000`

**Frontend** (dari folder `frontend/`):
```bash
npm start
```
Berjalan di `http://localhost:3000`

Akun pertama (role `owner`) perlu dibuat manual lewat endpoint `/api/auth/register`, karena endpoint tersebut dilindungi `@owner_required` — untuk akun pertama, bisa dibuat langsung lewat `psql` dengan password yang di-hash menggunakan `bcrypt`, atau sementara longgarkan proteksi endpoint tersebut untuk registrasi awal saja.

---

## Catatan Keamanan

Sebelum deploy ke production:

- [ ] Pastikan `FLASK_DEBUG` **tidak** diset `True` di environment production
- [ ] `CORS_ORIGINS` diarahkan ke domain frontend production, bukan `*` atau localhost
- [ ] `SECRET_KEY` dan `JWT_SECRET_KEY` menggunakan nilai acak yang kuat dan berbeda satu sama lain
- [ ] `REACT_APP_API_URL` di `.env.production` diarahkan ke domain API production
- [ ] Gunakan HTTPS untuk seluruh traffic (frontend maupun backend)
- [ ] Pastikan `.env` tidak pernah ter-commit ke repository (cek dengan `git ls-files | grep .env`)
- [ ] Pertimbangkan rate limiting pada endpoint login untuk mencegah brute-force

---

## Kontribusi

1. Buat branch baru dari `main` untuk setiap fitur/perbaikan (`git checkout -b fitur/nama-fitur`)
2. Pastikan perubahan pada model database disertai catatan migrasi manual (SQL `ALTER TABLE`) di deskripsi pull request
3. Ikuti pola hierarki role yang sudah ada (`owner_required`, `manager_required`, `jwt_required`) saat menambah endpoint baru
4. Test perubahan dengan ketiga role (owner, manager, kasir) sebelum submit pull request
