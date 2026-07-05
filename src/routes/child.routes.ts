import { Router } from 'express';
import { childController } from '../controllers/child.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createChildValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guru'), childController.getAll.bind(childController));
router.get('/:id', authorize('admin', 'guru'), childController.getById.bind(childController));
router.post('/', authorize('admin', 'guru'), createChildValidator, validate, childController.create.bind(childController));
router.put('/:id', authorize('admin', 'guru'), childController.update.bind(childController));
router.delete('/:id', authorize('admin'), childController.delete.bind(childController));

export default router;
