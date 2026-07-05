-- ============================================================
-- SIPADU CART — Inisialisasi Skema Database PostgreSQL
-- Jalankan: psql -U postgres -d sipadu_cart -f migrations/001_init_schema.sql
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Untuk pencarian iLike yang cepat

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100)  NOT NULL,
    email               VARCHAR(150)  NOT NULL UNIQUE,
    password_hash       VARCHAR(255)  NOT NULL,
    role                VARCHAR(20)   NOT NULL CHECK (role IN ('admin','guru')),
    refresh_token       TEXT,
    reset_token         VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ── Classes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(50)  NOT NULL,
    teacher_id    UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20)  NOT NULL DEFAULT '2025/2026',
    description   TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- ── Children ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis            VARCHAR(20)  NOT NULL UNIQUE,
    name           VARCHAR(100) NOT NULL,
    birth_date     DATE         NOT NULL,
    gender         CHAR(1)      NOT NULL CHECK (gender IN ('L','P')),
    class_id       UUID         NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    parent_phone   VARCHAR(20),
    photo_path     VARCHAR(255),
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_class    ON children(class_id);
CREATE INDEX IF NOT EXISTS idx_children_name_trgm ON children USING GIN (name gin_trgm_ops);

-- ── Observations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id         UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    teacher_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    observation_date DATE        NOT NULL,
    bahasa           SMALLINT    NOT NULL CHECK (bahasa BETWEEN 1 AND 4),
    motorik_halus    SMALLINT    NOT NULL CHECK (motorik_halus BETWEEN 1 AND 4),
    motorik_kasar    SMALLINT    NOT NULL CHECK (motorik_kasar BETWEEN 1 AND 4),
    kognitif         SMALLINT    NOT NULL CHECK (kognitif BETWEEN 1 AND 4),
    sosial_emosional SMALLINT    NOT NULL CHECK (sosial_emosional BETWEEN 1 AND 4),
    note             TEXT,
    attachment_path  VARCHAR(255),
    status           VARCHAR(10) NOT NULL DEFAULT 'final' CHECK (status IN ('draft','final')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_obs_child   ON observations(child_id);
CREATE INDEX IF NOT EXISTS idx_obs_teacher ON observations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_obs_date    ON observations(observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_obs_status  ON observations(status);

-- ── Predictions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    observation_id UUID          NOT NULL UNIQUE REFERENCES observations(id) ON DELETE CASCADE,
    child_id       UUID          NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    prediction     VARCHAR(30)   NOT NULL CHECK (prediction IN ('Linguistik','Seni','Kinestetik','Butuh Stimulasi')),
    confidence     NUMERIC(5,2)  NOT NULL,
    probabilities  JSONB         NOT NULL,
    model_version  VARCHAR(50)   NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_child      ON predictions(child_id);
CREATE INDEX IF NOT EXISTS idx_pred_prediction ON predictions(prediction);
CREATE INDEX IF NOT EXISTS idx_pred_created    ON predictions(created_at DESC);

-- ── Model Histories ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_histories (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version          VARCHAR(50)   NOT NULL UNIQUE,
    accuracy         NUMERIC(6,4)  NOT NULL,
    precision        NUMERIC(6,4)  NOT NULL,
    recall           NUMERIC(6,4)  NOT NULL,
    f1_score         NUMERIC(6,4)  NOT NULL,
    training_samples INTEGER       NOT NULL,
    confusion_matrix JSONB         NOT NULL,
    parameters       JSONB         NOT NULL,
    trained_by       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_active ON model_histories(is_active);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50)  NOT NULL,
    target_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── Trigger: auto update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','classes','children','observations'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
             CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t, t, t);
    END LOOP;
END $$;

-- ── Views berguna ─────────────────────────────────────────────────────────────

-- View: perkembangan siswa terbaru
CREATE OR REPLACE VIEW v_student_latest_status AS
SELECT
    c.id            AS child_id,
    c.name          AS child_name,
    c.nis,
    cl.name         AS class_name,
    o.observation_date AS last_observed,
    o.bahasa, o.motorik_halus, o.motorik_kasar, o.kognitif, o.sosial_emosional,
    p.prediction,
    p.confidence,
    p.model_version
FROM children c
JOIN classes cl ON cl.id = c.class_id
LEFT JOIN LATERAL (
    SELECT * FROM observations
    WHERE child_id = c.id AND status = 'final'
    ORDER BY observation_date DESC LIMIT 1
) o ON TRUE
LEFT JOIN predictions p ON p.observation_id = o.id;

-- View: distribusi bakat per kelas
CREATE OR REPLACE VIEW v_talent_distribution AS
SELECT
    cl.id   AS class_id,
    cl.name AS class_name,
    p.prediction,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY cl.id), 1) AS percentage
FROM predictions p
JOIN children c  ON c.id  = p.child_id
JOIN classes  cl ON cl.id = c.class_id
GROUP BY cl.id, cl.name, p.prediction;

COMMENT ON TABLE users            IS 'Pengguna sistem: admin, guru, orang tua';
COMMENT ON TABLE classes          IS 'Kelas/rombongan belajar';
COMMENT ON TABLE children         IS 'Data siswa PAUD/TK';
COMMENT ON TABLE observations     IS 'Hasil observasi guru per siswa per aspek perkembangan';
COMMENT ON TABLE predictions      IS 'Hasil prediksi CART dari setiap observasi';
COMMENT ON TABLE model_histories  IS 'Riwayat versi model CART yang dilatih';
COMMENT ON TABLE audit_logs       IS 'Log aktivitas semua pengguna';
