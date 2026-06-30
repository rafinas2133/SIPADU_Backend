import { Router } from 'express';
import { auditLogController } from '../controllers/auditlog.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/recent', auditLogController.getRecent.bind(auditLogController));
router.get('/user/:userId', auditLogController.getByUser.bind(auditLogController));
router.get('/', auditLogController.getAll.bind(auditLogController));

export default router;
