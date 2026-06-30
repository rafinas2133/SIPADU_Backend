/**
 * Integration Tests - Auth & User API
 * Menggunakan supertest untuk menguji endpoint Express secara end-to-end
 * Membutuhkan database test yang dikonfigurasi via .env.test
 */

import request from 'supertest';
import app from '../app';

// Simulasi tanpa DB nyata — mock Sequelize
jest.mock('../config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
  },
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  Class: { findAll: jest.fn(), findAndCountAll: jest.fn() },
  Child: { findAndCountAll: jest.fn() },
  Observation: { count: jest.fn() },
  Prediction: { count: jest.fn() },
  ModelHistory: { findOne: jest.fn() },
  AuditLog: { create: jest.fn() },
}));

const { User } = require('../models');

// ── Helper: valid JWT ─────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test_secret_min_32_chars_long_enough_here';

function makeToken(role: string) {
  return jwt.sign(
    { userId: 'test-user-id', email: 'test@test.com', role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ── Health endpoint ───────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('SIPADU CART Backend');
  });
});

// ── Auth endpoints ────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 422 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bukan-email', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when password is empty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guru@test.com', password: '' });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 when user not found', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notfound@test.com', password: 'Password@1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 422 when email format invalid', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(422);
  });

  it('returns 200 even when email not found (security)', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'notfound@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Auth middleware ───────────────────────────────────────────────────────────

describe('Authentication middleware', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Token autentikasi diperlukan');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer token_palsu_tidak_valid');
    expect(res.status).toBe(401);
  });

  it('returns 403 when role insufficient', async () => {
    const guruToken = makeToken('guru');
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${guruToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Akses ditolak');
  });

  it('allows admin to access /api/users', async () => {
    const adminToken = makeToken('admin');
    User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/route-tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ── User CRUD (admin only) ────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('returns 422 when required fields missing', async () => {
    const adminToken = makeToken('admin');
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' }); // missing email, password, role
    expect(res.status).toBe(422);
  });

  it('returns 422 when role is invalid', async () => {
    const adminToken = makeToken('admin');
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', email: 'test@test.com', password: 'Pass@1234', role: 'superadmin' });
    expect(res.status).toBe(422);
  });
});

// ── Observation validator ─────────────────────────────────────────────────────

describe('POST /api/observations', () => {
  it('returns 422 when Likert score out of range', async () => {
    const guruToken = makeToken('guru');
    const res = await request(app)
      .post('/api/observations')
      .set('Authorization', `Bearer ${guruToken}`)
      .send({
        child_id: '00000000-0000-0000-0000-000000000001',
        observation_date: '2026-06-27',
        bahasa: 5,    // INVALID
        motorik_halus: 3, motorik_kasar: 3, kognitif: 3, sosial_emosional: 3,
      });
    expect(res.status).toBe(422);
    const msgs = res.body.errors?.map((e: { msg: string }) => e.msg) || [];
    expect(msgs.some((m: string) => m.includes('Bahasa'))).toBe(true);
  });

  it('returns 422 when child_id is not UUID', async () => {
    const guruToken = makeToken('guru');
    const res = await request(app)
      .post('/api/observations')
      .set('Authorization', `Bearer ${guruToken}`)
      .send({
        child_id: 'bukan-uuid',
        observation_date: '2026-06-27',
        bahasa: 3, motorik_halus: 3, motorik_kasar: 3, kognitif: 3, sosial_emosional: 3,
      });
    expect(res.status).toBe(422);
  });
});
