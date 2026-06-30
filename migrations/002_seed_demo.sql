-- ============================================================
-- SIPADU CART — Seed Data Demo
-- Jalankan SETELAH 001_init_schema.sql
-- PERHATIAN: Gunakan hanya di environment development!
-- ============================================================

-- Password untuk semua akun demo: Admin@12345 (bcrypt hash)
-- Hash ini di-generate dengan: bcrypt.hash('Admin@12345', 12)

-- ── Users ─────────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password_hash, role) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Administrator',
    'admin@sipadu.sch.id',
    '$2a$12$YKDi8InkHQ3vVxp5a7DcT.fVAXRHoR6OWnqGX0Iw3qFKsT7nExlpS',
    'admin'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Bu Rina Hartati',
    'rina@sipadu.sch.id',
    '$2a$12$YKDi8InkHQ3vVxp5a7DcT.fVAXRHoR6OWnqGX0Iw3qFKsT7nExlpS',
    'guru'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'Bu Dian Safitri',
    'dian@sipadu.sch.id',
    '$2a$12$YKDi8InkHQ3vVxp5a7DcT.fVAXRHoR6OWnqGX0Iw3qFKsT7nExlpS',
    'guru'
),
(
    'a0000000-0000-0000-0000-000000000004',
    'Pak Ahmad Pratama',
    'ahmad@gmail.com',
    '$2a$12$YKDi8InkHQ3vVxp5a7DcT.fVAXRHoR6OWnqGX0Iw3qFKsT7nExlpS',
    'orang_tua'
),
(
    'a0000000-0000-0000-0000-000000000005',
    'Ibu Sri Wahyuni',
    'sri@gmail.com',
    '$2a$12$YKDi8InkHQ3vVxp5a7DcT.fVAXRHoR6OWnqGX0Iw3qFKsT7nExlpS',
    'orang_tua'
)
ON CONFLICT (email) DO NOTHING;

-- ── Classes ───────────────────────────────────────────────────────────────────
INSERT INTO classes (id, name, teacher_id, academic_year, description) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'Kelas A',
    'a0000000-0000-0000-0000-000000000002',
    '2025/2026',
    'Kelas usia 5-6 tahun, pagi hari'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Kelas B',
    'a0000000-0000-0000-0000-000000000003',
    '2025/2026',
    'Kelas usia 4-5 tahun, pagi hari'
)
ON CONFLICT (name, academic_year) DO NOTHING;

-- ── Children ──────────────────────────────────────────────────────────────────
INSERT INTO children (id, nis, name, birth_date, gender, class_id, parent_user_id) VALUES
('c0000000-0000-0000-0000-000000000001','20240001','Arya Pratama',   '2020-03-12','L','b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004'),
('c0000000-0000-0000-0000-000000000002','20240002','Seli Amara',     '2020-07-22','P','b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005'),
('c0000000-0000-0000-0000-000000000003','20240003','Budi Santoso',   '2020-01-05','L','b0000000-0000-0000-0000-000000000002', NULL),
('c0000000-0000-0000-0000-000000000004','20240004','Nia Rahmawati',  '2020-09-14','P','b0000000-0000-0000-0000-000000000001', NULL),
('c0000000-0000-0000-0000-000000000005','20240005','Dedi Kurniawan', '2020-05-30','L','b0000000-0000-0000-0000-000000000002', NULL),
('c0000000-0000-0000-0000-000000000006','20240006','Citra Dewi',     '2020-11-08','P','b0000000-0000-0000-0000-000000000001', NULL),
('c0000000-0000-0000-0000-000000000007','20240007','Fandi Ahmad',    '2020-04-17','L','b0000000-0000-0000-0000-000000000002', NULL)
ON CONFLICT (nis) DO NOTHING;

-- ── Observations ──────────────────────────────────────────────────────────────
INSERT INTO observations (id, child_id, teacher_id, observation_date, bahasa, motorik_halus, motorik_kasar, kognitif, sosial_emosional, note, status) VALUES
-- Arya Pratama - Linguistik (kognitif 4, bahasa 3)
('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-06-27',3,3,3,4,3,'Arya sangat antusias saat kegiatan bercerita dan membaca.','final'),
('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-06-20',3,2,3,4,3,'Perkembangan bahasa meningkat signifikan.','final'),
('d0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-06-05',3,2,2,3,3,NULL,'final'),
-- Seli Amara - Linguistik
('d0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','2026-06-26',4,3,2,4,4,'Seli sangat komunikatif dan kaya kosakata.','final'),
-- Budi Santoso - Kinestetik (motorik_kasar 4, kognitif 2)
('d0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','2026-06-25',2,2,4,2,3,'Budi sangat aktif dan unggul dalam kegiatan fisik.','final'),
-- Nia Rahmawati - Seni (kognitif 3, bahasa 2)
('d0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002','2026-06-24',2,4,2,3,3,'Nia sangat kreatif dalam menggambar dan mewarnai.','final'),
-- Dedi Kurniawan - Butuh Stimulasi (semua rendah)
('d0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003','2026-06-23',1,2,2,1,2,'Dedi membutuhkan perhatian dan stimulasi lebih intensif.','final')
ON CONFLICT DO NOTHING;

-- ── Predictions ───────────────────────────────────────────────────────────────
-- (dalam deployment nyata, ini di-generate otomatis oleh ML service)
INSERT INTO predictions (observation_id, child_id, prediction, confidence, probabilities, model_version) VALUES
('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','Linguistik', 88.0,'{"Linguistik":88.0,"Seni":7.0,"Kinestetik":3.0,"Butuh Stimulasi":2.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','Linguistik', 91.0,'{"Linguistik":91.0,"Seni":5.0,"Kinestetik":3.0,"Butuh Stimulasi":1.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','Linguistik', 84.0,'{"Linguistik":84.0,"Seni":9.0,"Kinestetik":4.0,"Butuh Stimulasi":3.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002','Linguistik', 96.0,'{"Linguistik":96.0,"Seni":2.0,"Kinestetik":1.0,"Butuh Stimulasi":1.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000003','Kinestetik', 79.0,'{"Linguistik":8.0,"Seni":7.0,"Kinestetik":79.0,"Butuh Stimulasi":6.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000004','Seni',       85.0,'{"Linguistik":6.0,"Seni":85.0,"Kinestetik":5.0,"Butuh Stimulasi":4.0}','v1.0.0-default'),
('d0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000005','Butuh Stimulasi',65.0,'{"Linguistik":10.0,"Seni":12.0,"Kinestetik":13.0,"Butuh Stimulasi":65.0}','v1.0.0-default')
ON CONFLICT DO NOTHING;

-- ── Model history ─────────────────────────────────────────────────────────────
INSERT INTO model_histories (id, version, accuracy, precision, recall, f1_score, training_samples, confusion_matrix, parameters, trained_by, is_active) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'v1.0.0-default',
    0.9320, 0.9180, 0.9040, 0.9110,
    120,
    '[[40,1,1,0],[2,27,1,0],[0,1,26,1],[0,0,2,18]]'::jsonb,
    '{"criterion":"gini","max_depth":3,"min_samples_leaf":2}'::jsonb,
    'a0000000-0000-0000-0000-000000000001',
    TRUE
)
ON CONFLICT (version) DO NOTHING;

-- ── Audit logs ────────────────────────────────────────────────────────────────
INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address) VALUES
('a0000000-0000-0000-0000-000000000002','CREATE_OBSERVATION','observation','d0000000-0000-0000-0000-000000000001','127.0.0.1'),
('a0000000-0000-0000-0000-000000000002','CREATE_OBSERVATION','observation','d0000000-0000-0000-0000-000000000002','127.0.0.1'),
('a0000000-0000-0000-0000-000000000001','RETRAIN_MODEL','model','e0000000-0000-0000-0000-000000000001','127.0.0.1');

SELECT 'Seed data berhasil dimuat!' AS status;
