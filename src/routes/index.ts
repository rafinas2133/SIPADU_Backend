import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import classRoutes from './class.routes';
import childRoutes from './child.routes';
import observationRoutes from './observation.routes';
import predictionRoutes from './prediction.routes';
import dashboardRoutes from './dashboard.routes';
import auditlogRoutes from './auditlog.routes';
import { modelRouter, reportRouter } from './model.routes';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SIPADU CART Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    model_loaded: true,
    deployment: process.env.VERCEL ? 'vercel' : 'local',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/children', childRoutes);
router.use('/observations', observationRoutes);
router.use('/predictions', predictionRoutes);
router.use('/models', modelRouter);
router.use('/reports', reportRouter);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditlogRoutes);

export default router;
