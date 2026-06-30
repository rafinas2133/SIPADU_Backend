import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createUserValidator, updateUserValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe.bind(userController));
router.get('/', authorize('admin'), userController.getAll.bind(userController));
router.post('/', authorize('admin'), createUserValidator, validate, userController.create.bind(userController));
router.put('/:id', authorize('admin'), updateUserValidator, validate, userController.update.bind(userController));
router.delete('/:id', authorize('admin'), userController.delete.bind(userController));

export default router;
