# Deployment Vercel + Neon + Vercel Blob

Panduan deploy backend SIPADU CART ke Vercel dengan database Neon dan storage Vercel Blob.

## Arsitektur

```
Frontend (Vercel)  →  Backend (Vercel Serverless)  →  Neon PostgreSQL
                              ↓
                        Vercel Blob (upload)
                              ↓
                     model.json (CART inference in-process)
```

Model ML (`cart_model_bakat_anak.pkl`) sudah di-export ke `backend/src/model/model.json` dan di-infer langsung di Node.js — **tidak perlu ML service terpisah**.

---

## 1. Setup Neon Database

1. Buat project di [neon.tech](https://neon.tech)
2. Copy **pooled connection string** (hostname berakhiran `-pooler`)
3. Jalankan migrations ke Neon:

```bash
cd backend
node scripts/migrate-to-neon.js          # schema saja
node scripts/migrate-to-neon.js --seed   # schema + data demo
```

**Migrasi data dari PostgreSQL lokal:**

```powershell
# Edit kredensial lokal di script jika perlu, lalu:
.\scripts\migrate-local-to-neon.ps1 -LocalPassword "password_anda"
```

Atau manual via SQL Editor Neon — salin isi `backend/migrations/001_init_schema.sql`.

---

## 2. Setup Vercel Blob

1. Di Vercel Dashboard → project backend → **Storage** → Create **Blob**
2. Copy `BLOB_READ_WRITE_TOKEN` ke Environment Variables

---

## 3. Deploy Backend ke Vercel

```bash
cd backend
npm install
npx vercel login
npx vercel
```

**Root Directory:** `backend` (jika deploy dari monorepo)

### Environment Variables (Vercel Dashboard)

| Variable | Contoh | Wajib |
|----------|--------|-------|
| `DATABASE_URL` | `postgresql://...@ep-xxx-pooler...neon.tech/neondb?sslmode=require` | ✅ |
| `JWT_SECRET` | random string min 32 char | ✅ |
| `JWT_REFRESH_SECRET` | random string min 32 char | ✅ |
| `FRONTEND_URL` | `https://sipadu-frontend.vercel.app` | ✅ |
| `BLOB_READ_WRITE_TOKEN` | dari Vercel Blob | ✅ |
| `NODE_ENV` | `production` | ✅ |

---

## 4. Deploy Frontend ke Vercel

Project frontend terpisah:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://sipadu-backend.vercel.app/api` |

---

## 5. Verifikasi

```bash
curl https://your-backend.vercel.app/api/health
# {"status":"ok","model_loaded":true,"deployment":"vercel",...}

curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sipadu.sch.id","password":"Admin@12345"}'
```

Admin default dibuat otomatis saat cold start pertama.

---

## Re-export Model (jika model .pkl diupdate)

```bash
# Dari root repo, butuh Python + scikit-learn:
python scripts/export_model.py
# Output: backend/src/model/model.json
```

---

## Catatan

- **Retrain** dinonaktifkan (`POST /api/models/retrain` → 501)
- Label model `Perlu Stimulasi Lanjutan` di-map ke `Butuh Stimulasi` (sesuai schema DB)
- Development lokal tetap bisa pakai `DB_HOST`/`DB_PASSWORD` tanpa `DATABASE_URL`
