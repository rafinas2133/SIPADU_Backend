import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { loginLimiter, resetPasswordLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import {
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators';

const router = Router();

router.post('/login', loginLimiter, loginValidator, validate, authController.login.bind(authController));
router.post('/refresh', refreshTokenValidator, validate, authController.refresh.bind(authController));
router.post('/forgot-password', resetPasswordLimiter, forgotPasswordValidator, validate, authController.forgotPassword.bind(authController));
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
