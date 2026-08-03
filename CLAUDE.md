# CLAUDE.md — ByteLab Toko

Instruksi ini khusus untuk project **ByteLab Toko** (POS system). File ini
**TIDAK** mengikuti standar layered architecture (FastAPI/controller-interactor-repository)
yang dipakai di project backend lain — project ini sengaja tetap memakai struktur
Flask blueprint yang sudah ada dan sudah teruji. Jangan usulkan refactor ke
layered architecture kecuali diminta eksplisit.

## Project Brief

Sistem POS (point of sale) untuk UMKM Indonesia. Backend Flask + PostgreSQL,
frontend React (Create React App) + Tailwind. Mendukung transaksi multi-metode
pembayaran, produk bervarian, shift kasir per-user, voucher, dan analitik
dengan hierarki akses 3 level: **owner → manager → kasir**.

## Tech Stack

- Backend: Flask, SQLAlchemy, Flask-JWT-Extended, psycopg2, bcrypt
- Frontend: React (CRA), Tailwind CSS, Recharts, Axios, React Router
- Database: PostgreSQL
- Infra: Docker & Docker Compose (dev + production)

## Struktur Project

```
bytelab-toko/
├── docker-compose.yml           # Dev — hot reload
├── docker-compose.prod.yml      # Production
├── backend/
│   ├── app.py                    # Entry point, registrasi semua blueprint
│   ├── config.py                 # Baca .env
│   ├── models/models.py          # SEMUA model SQLAlchemy dalam 1 file
│   └── routes/                   # 1 file blueprint = 1 domain fitur
│       ├── auth.py               # Login, register, decorator role
│       ├── products.py / transactions.py / shifts.py / dashboard.py
│       ├── analytics.py / vouchers.py / customers.py / suppliers.py
│       ├── categories.py / restock.py / history.py / export.py
└── frontend/src/
    ├── pages/                    # 1 file = 1 halaman
    ├── components/                # Sidebar.js, Layout.js
    └── context/                    # AuthContext.js, SidebarContext.js
```

**Pola blueprint**: business logic, query database, dan response JSON hidup
langsung di dalam tiap file `routes/*.py` — TIDAK dipisah jadi
controller/interactor/repository. Ini pola yang disengaja untuk project ini.

## Commands

**Development (direkomendasikan):**
```bash
docker compose up          # nyalain db + backend + frontend sekaligus
docker compose up --build  # kalau ada perubahan Dockerfile/requirements.txt/package.json
docker compose down        # matiin (data aman, tersimpan di volume pgdata)
```

**Production:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

**Manual (tanpa Docker), kalau dibutuhkan:**
```bash
# Backend
cd backend && source venv/bin/activate && python app.py
# Frontend
cd frontend && npm start
```

**Akses default:** frontend `localhost:3000`, backend `localhost:5000`,
Postgres via Docker `localhost:5433` (bukan 5432, hindari bentrok Postgres lokal).

## Konvensi

### Hierarki Role & Decorator
Tiga decorator di `routes/auth.py`, pakai sesuai kebutuhan endpoint:
- `@jwt_required()` — semua role login boleh akses
- `@manager_required` — owner + manager
- `@owner_required` — owner saja

Aturan umum: data finansial (HPP, margin, cost_price, riwayat shift semua
user, laporan export) → minimal `manager_required`. Aksi destruktif (hapus
produk, void transaksi/restock) → `owner_required`.

### Mengambil User yang Sedang Login (PENTING — sumber bug berulang)
`create_access_token(identity=str(user.id))` di `auth.py` menyimpan **ID**,
BUKAN username, sebagai identity token. Selalu ambil user login dengan:
```python
identity = get_jwt_identity()
current_user = User.query.get(int(identity))
```
JANGAN pakai `User.query.filter_by(username=identity)` — ini bug yang pernah
terjadi berulang kali di `shifts.py`, `transactions.py`, `dashboard.py` karena
polanya tidak konsisten dengan `auth.py`. Cek `auth.py` sebagai referensi.

### Shift
Bersifat **per-user**, bukan shared. `get_active_shift(user_id=...)` di
`shifts.py` selalu difilter berdasarkan `opened_by`. Transaksi WAJIB ada shift
aktif milik user yang login (dicek di awal `add_transaction()`).

### Produk Bervarian
`TransactionItem.variant_id` menyimpan varian yang terjual. Kalau produk punya
varian, `cost_price`/`margin` harus diambil dari `ProductVariant`, BUKAN dari
`Product` induk (`product.cost_price` tidak akurat untuk produk bervarian
karena mencampur stok gabungan semua varian). Lihat `restock.py` untuk pola
average cost per-varian yang benar.

### Filter Tanggal
Pola konsisten di seluruh project: parameter `date_from`/`date_to` (format
`YYYY-MM-DD`), `date_from` inclusive, `date_to` +1 hari lalu exclusive (`<`).
Lihat `history.py` sebagai referensi asli, dipakai ulang di `analytics.py`
dan `export.py`.

### Race Condition
Operasi yang mengubah kuota/stok bersama (voucher `used_count`, stok produk,
average cost restock) harus pakai `.with_for_update()` saat query row yang
akan diubah, untuk mencegah 2 transaksi bersamaan membaca nilai lama yang sama.

### Frontend — URL API
SELALU pakai `` `${process.env.REACT_APP_API_URL}/api/...` `` (template
literal, backtick). JANGAN hardcode `http://localhost:5000`. Nilai env var
beda otomatis antara dev (`frontend/.env`) dan production
(`frontend/.env.production`).

### Frontend — Kontrol Akses per Role
Pola: ambil `role` dari `useAuth()`, buat flag boolean (`canManage`,
`canDelete`), pakai untuk conditional render tombol/kolom sensitif. Tapi INGAT:
kontrol di frontend hanya kosmetik — backend endpoint WAJIB tetap divalidasi
dengan decorator yang sesuai, jangan andalkan frontend saja.

### Migrasi Database
Project TIDAK memakai Flask-Migrate/Alembic. `db.create_all()` di `app.py`
hanya membuat tabel yang belum ada — TIDAK mengubah tabel existing. Perubahan
skema (tambah kolom, dll) harus manual lewat `ALTER TABLE` di `psql`, dan
dicatat di pesan commit/PR terkait.

### Docker Compose — Kapan Perlu Diupdate
`docker-compose.prod.yml` hanya perlu diubah untuk perubahan STRUKTUR (service
baru, port baru). Perubahan kode aplikasi sehari-hari TIDAK memerlukan
perubahan file compose — cukup build ulang image.

## Avoid / Known Gotchas

- Jangan taruh komentar `// ← baru` atau `# ← baru` di tengah baris kode JSX
  (di dalam atribut tag atau ekspresi) — ini menyebabkan syntax error di
  parser Babel. Komentar penjelas harus di baris terpisah, di luar tag/ekspresi.
- Jangan gunakan `<>...</>` (fragment shorthand) di dalam `.map()` — fragment
  shorthand tidak bisa menerima prop `key`. Pakai `<Fragment key={...}>` dari
  `import { Fragment } from 'react'`.
- Jangan pakai `datetime.utcnow()` langsung sebagai default kolom SQLAlchemy
  tanpa dibungkus lambda — `default=datetime.now(timezone.utc)` akan dievaluasi
  SEKALI saat app start, bukan tiap kali row dibuat. Wajib
  `default=lambda: datetime.now(timezone.utc)`.
- `.env` (root, backend, frontend) TIDAK PERNAH boleh ter-commit. Selalu
  verifikasi dengan `git ls-files | grep -i "\.env"` sebelum push kalau ragu.
- `frontend/` sempat punya folder `.git` tersendiri (bawaan `create-react-app`)
  yang menyebabkan Git memperlakukannya sebagai embedded repo. Sudah dihapus —
  jangan generate ulang project React dengan cara yang membuat ini terjadi lagi.

## Akun Pertama (Owner)

`/api/auth/register` dilindungi `@owner_required` (ayam-telur). Akun owner
pertama dibuat manual lewat database — lihat README.md bagian
"Membuat Akun Owner Pertama" untuk langkah lengkap (generate hash bcrypt,
INSERT manual ke tabel `users`).