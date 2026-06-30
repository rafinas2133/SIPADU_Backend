import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/guru', authorize('admin', 'guru'), dashboardController.getGuruStats.bind(dashboardController));
router.get('/admin', authorize('admin'), dashboardController.getAdminStats.bind(dashboardController));
router.get('/parent', authorize('orang_tua', 'admin'), dashboardController.getParentStats.bind(dashboardController));

export default router;
