import { Router } from 'express';
import { modelController } from '../controllers/model.controller';
import { reportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../middlewares/auth';

// ── Model routes ──────────────────────────────────────────────────────────────
export const modelRouter = Router();

modelRouter.use(authenticate);

modelRouter.get('/metrics', authorize('admin', 'guru'), modelController.getMetrics.bind(modelController));
modelRouter.get('/history', authorize('admin', 'guru'), modelController.getHistory.bind(modelController));
modelRouter.post('/retrain', authorize('admin'), modelController.retrain.bind(modelController));
modelRouter.get('/dashboard', authorize('admin'), modelController.getDashboard.bind(modelController));

// ── Report routes ─────────────────────────────────────────────────────────────
export const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.get('/child/:id', authorize('admin', 'guru', 'orang_tua'), reportController.getChildReport.bind(reportController));
reportRouter.get('/buku/:childId/html', authorize('admin', 'guru', 'orang_tua'), reportController.getBukuHtml.bind(reportController));
reportRouter.get('/buku/:childId/data', authorize('admin', 'guru', 'orang_tua'), reportController.getBukuData.bind(reportController));
reportRouter.get('/export', authorize('admin', 'guru'), reportController.exportData.bind(reportController));
reportRouter.get('/recommendations/:category', reportController.getRecommendations.bind(reportController));
