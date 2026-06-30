import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import routes from './routes';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { globalLimiter, loginLimiter } from './middlewares/rateLimiter';
import { logger } from './utils/logger';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', globalLimiter);
app.use('/api/auth/login', loginLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── HTTP logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.http(msg.trim()) },
    })
  );
}

// ── Static files (uploads, lokal saja — production pakai Vercel Blob URL) ───
if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL) {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.resolve(uploadDir)));
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 & Error handling ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
