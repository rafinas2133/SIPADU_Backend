import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 menit
const max      = parseInt(process.env.RATE_LIMIT_MAX || '100');

// ── Global API limiter ────────────────────────────────────────────────────────
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Terlalu banyak request dari IP ini. Coba lagi dalam ${windowMs / 60000} menit.`,
  },
});

// ── Login limiter (ketat) ─────────────────────────────────────────────────────
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // hitung hanya request GAGAL
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Akun sementara dikunci 15 menit.',
  },
});

// ── Reset password limiter ────────────────────────────────────────────────────
export const resetPasswordLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan reset password. Coba lagi dalam 1 jam.',
  },
});

// ── ML/retrain limiter (mahal) ────────────────────────────────────────────────
export const mlLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Training model dibatasi 5 kali per jam untuk menjaga kestabilan sistem.',
  },
});

// ── Upload limiter ────────────────────────────────────────────────────────────
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak upload. Coba lagi dalam 1 menit.',
  },
});
