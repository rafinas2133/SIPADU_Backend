import { Router } from 'express';
import { observationController } from '../controllers/observation.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { upload, handleUploadError } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import { createObservationValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guru'), observationController.getAll.bind(observationController));
router.get('/:id', authorize('admin', 'guru'), observationController.getById.bind(observationController));
router.post(
  '/',
  authorize('guru', 'admin'),
  uploadLimiter,
  upload.single('attachment'),
  handleUploadError,
  createObservationValidator,
  validate,
  observationController.create.bind(observationController)
);
router.put('/:id', authorize('guru', 'admin'), observationController.update.bind(observationController));
router.delete('/:id', authorize('admin'), observationController.delete.bind(observationController));
router.post('/:id/predict', authorize('guru', 'admin'), observationController.predict.bind(observationController));

export default router;
