-- ============================================================
-- SIPADU CART — Migrasi: Hapus role orang_tua, ganti parent_user_id dengan parent_phone
-- Jalankan: psql -U postgres -d sipadu_cart -f migrations/003_remove_orang_tua.sql
-- ============================================================

-- 1. Tambah kolom parent_phone di tabel children
ALTER TABLE children ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);

-- 2. Hapus foreign key & kolom parent_user_id dari children
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_parent_user_id_fkey;
ALTER TABLE children DROP COLUMN IF EXISTS parent_user_id;

-- 3. Hapus index parent yang tidak lagi dipakai
DROP INDEX IF EXISTS idx_children_parent;

-- 4. Hapus akun pengguna dengan role orang_tua
DELETE FROM users WHERE role = 'orang_tua';

-- 5. Update constraint role di tabel users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','guru'));

-- Selesai
