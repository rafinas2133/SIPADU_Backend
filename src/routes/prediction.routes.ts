import { Router } from 'express';
import { predictionController } from '../controllers/prediction.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/distribution', authorize('admin', 'guru'), predictionController.getDistribution.bind(predictionController));
router.get('/summary', authorize('admin', 'guru'), predictionController.getSummary.bind(predictionController));
router.get('/child/:childId/latest', authorize('admin', 'guru', 'orang_tua'), predictionController.getLatestByChild.bind(predictionController));
router.get('/:id', authorize('admin', 'guru'), predictionController.getById.bind(predictionController));
router.get('/', authorize('admin', 'guru'), predictionController.getAll.bind(predictionController));

export default router;
