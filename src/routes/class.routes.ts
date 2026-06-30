import { Router } from 'express';
import { classController } from '../controllers/class.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createClassValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guru'), classController.getAll.bind(classController));
router.get('/:id', authorize('admin', 'guru'), classController.getById.bind(classController));
router.get('/:id/stats', authorize('admin', 'guru'), classController.getStats.bind(classController));
router.post('/', authorize('admin'), createClassValidator, validate, classController.create.bind(classController));
router.put('/:id', authorize('admin'), classController.update.bind(classController));
router.delete('/:id', authorize('admin'), classController.delete.bind(classController));

export default router;
