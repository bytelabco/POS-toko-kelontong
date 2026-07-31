# ByteLab Toko — Point of Sale System

Sistem manajemen toko (POS) untuk UMKM di Indonesia. Dibangun dengan Flask (backend) dan React (frontend), mendukung transaksi multi-metode pembayaran, manajemen stok per-varian, shift kasir, voucher, dan analitik penjualan dengan hierarki akses berbasis role.

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Fitur Utama](#fitur-utama)
- [Role & Permission](#role--permission)
- [Struktur Project](#struktur-project)
- [Menjalankan dengan Docker (Direkomendasikan)](#menjalankan-dengan-docker-direkomendasikan)
- [Menjalankan Tanpa Docker (Manual)](#menjalankan-tanpa-docker-manual)
- [Environment Variables](#environment-variables)
- [Membuat Akun Owner Pertama](#membuat-akun-owner-pertama)
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

**Infrastruktur**
- Docker & Docker Compose — containerization (development & production)

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
├── docker-compose.yml           # Orkestrasi development (hot-reload)
├── docker-compose.prod.yml      # Orkestrasi production
├── .env                          # Env untuk docker-compose (root)
├── backend/
│   ├── Dockerfile                # Multi-stage: development & production
│   ├── .dockerignore
│   ├── app.py                    # Entry point Flask
│   ├── config.py                 # Konfigurasi (baca dari .env)
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
    ├── Dockerfile                 # Multi-stage: development & production (Nginx)
    ├── .dockerignore
    ├── src/
    │   ├── pages/                 # Satu file per halaman
    │   ├── components/            # Sidebar, Layout
    │   └── context/                # AuthContext, SidebarContext
    └── public/
```

---

## Menjalankan dengan Docker (Direkomendasikan)

Cara tercepat menjalankan seluruh stack (database, backend, frontend) sekaligus, tanpa perlu install Python/Node/PostgreSQL secara lokal.

### Prasyarat

- Docker & Docker Compose ([docker.com/get-started](https://www.docker.com/get-started))

### 1. Clone repository

```bash
git clone https://github.com/bytelabco/POS-toko-kelontong.git
cd POS-toko-kelontong
```

### 2. Buat file `.env` di root project

```env
DB_USER=postgres
DB_PASSWORD=<password database pilihan kamu>
SECRET_KEY=<generate dengan: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<generate string acak terpisah, berbeda dari SECRET_KEY>
CORS_ORIGINS=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000
```

### 3. Jalankan

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Database Postgres di dalam Docker terekspos ke `localhost:5433` (bukan `5432`, untuk menghindari bentrok dengan instalasi PostgreSQL lokal jika ada)

### Menghentikan

```bash
docker compose down
```

Menghentikan dan menghapus container, **tanpa** menghapus data (tersimpan di Docker volume `pgdata`).

### Menjalankan versi Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Perbedaan dari mode development: frontend di-build menjadi file statis dan disajikan lewat Nginx (bukan dev server React), backend dijalankan dengan Gunicorn (bukan Flask dev server), `FLASK_DEBUG` dipaksa `False`, dan tidak ada hot-reload/volume mount kode sumber.

> `docker-compose.prod.yml` hanya perlu diubah jika ada perubahan **struktur** (menambah service baru, mengubah port, dsb). Perubahan kode aplikasi sehari-hari tidak memerlukan perubahan pada file ini — cukup build ulang image saat deploy.

---

## Menjalankan Tanpa Docker (Manual)

### Prasyarat

- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+

### 1. Setup Backend

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

### 2. Setup Frontend

```bash
cd ../frontend
npm install
npm start
```

Buat file `.env` di dalam folder `frontend/` (lihat [Environment Variables](#environment-variables)).

- Backend berjalan di `http://localhost:5000`
- Frontend berjalan di `http://localhost:3000`

---

## Environment Variables

### `backend/.env` (untuk mode manual)

```env
DATABASE_URL=postgresql://username:password@localhost:5432/bytelab_toko
SECRET_KEY=<generate dengan: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET_KEY=<generate string acak terpisah, berbeda dari SECRET_KEY>
CORS_ORIGINS=http://localhost:3000
FLASK_DEBUG=True
```

### `frontend/.env` (untuk mode manual)

```env
REACT_APP_API_URL=http://localhost:5000
```

### `frontend/.env.production`

```env
REACT_APP_API_URL=<isi dengan URL API production setelah deploy>
```

### `.env` di root project (khusus Docker)

Lihat contoh lengkap di [bagian Docker](#menjalankan-dengan-docker-direkomendasikan) di atas.

> `SECRET_KEY` dan `JWT_SECRET_KEY` **harus** berbeda dan bersifat rahasia. Jangan pernah commit file `.env` ke repository — sudah dikecualikan lewat `.gitignore`.

---

## Membuat Akun Owner Pertama

Endpoint `/api/auth/register` dilindungi `@owner_required`, sehingga akun `owner` pertama tidak bisa dibuat lewat aplikasi (butuh owner untuk membuat owner). Akun pertama dibuat langsung lewat database.

### Jika menggunakan Docker

**1. Generate password ter-hash:**
```bash
docker exec -it bytelab_backend python -c "import bcrypt; print(bcrypt.hashpw(b'passwordkamu', bcrypt.gensalt()).decode())"
```
Ganti `passwordkamu` dengan password yang diinginkan. Salin output-nya (diawali `$2b$...`).

**2. Masukkan ke database:**
```bash
docker exec -it bytelab_db psql -U postgres -d bytelab_toko
```
```sql
INSERT INTO users (username, password, role, created_at)
VALUES ('owner', '<HASH_DARI_LANGKAH_1>', 'owner', now());
```

**3. Verifikasi:**
```sql
SELECT id, username, role FROM users;
```
Keluar dengan `\q`, lalu login di aplikasi menggunakan username dan password (bukan hash-nya) yang dibuat.

### Jika menjalankan manual (tanpa Docker)

Sama seperti di atas, ganti `docker exec -it bytelab_backend python -c "..."` dengan `python -c "..."` langsung (dengan virtualenv aktif), dan `docker exec -it bytelab_db psql -U postgres -d bytelab_toko` dengan `sudo -u postgres psql -d bytelab_toko`.

Setelah akun owner pertama berhasil dibuat, akun manager dan kasir berikutnya dapat dibuat langsung lewat halaman **Kelola User** di aplikasi.

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
- [ ] Jika deploy dengan `docker-compose.prod.yml`, pastikan port database (`5432`) **tidak** diekspos ke luar jaringan Docker

---

## Kontribusi

1. Buat branch baru dari `main` untuk setiap fitur/perbaikan (`git checkout -b fitur/nama-fitur`)
2. Pastikan perubahan pada model database disertai catatan migrasi manual (SQL `ALTER TABLE`) di deskripsi pull request
3. Ikuti pola hierarki role yang sudah ada (`owner_required`, `manager_required`, `jwt_required`) saat menambah endpoint baru
4. Test perubahan dengan ketiga role (owner, manager, kasir) sebelum submit pull request
5. Jika menambah service baru ke Docker, update `docker-compose.yml` **dan** `docker-compose.prod.yml`
