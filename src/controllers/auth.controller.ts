import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validasi gagal', 422, errors.array().map((e) => ({ msg: e.msg, path: e.type })));
    return false;
  }
  return true;
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, {
        accessToken: result.accessToken,
        user: result.user,
      }, 'Login berhasil');
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;

      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        sendError(res, 'Refresh token tidak ditemukan', 401);
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, result, 'Token diperbarui');
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.userId);
      }
      res.clearCookie('refreshToken');
      sendSuccess(res, null, 'Logout berhasil');
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;

      const message = await authService.forgotPassword(req.body.email);
      sendSuccess(res, null, message);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!validate(req, res)) return;

      await authService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, null, 'Password berhasil direset');
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
