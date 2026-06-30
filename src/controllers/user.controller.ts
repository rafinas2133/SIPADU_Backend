import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';
import { User } from '../models';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByPk(req.user!.userId, {
        attributes: { exclude: ['password_hash', 'refresh_token', 'reset_token', 'reset_token_expires'] },
      });

      if (!user) {
        sendError(res, 'User tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const role = req.query.role as string;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = { is_active: true };
      if (role) where.role = role;
      if (search) {
        Object.assign(where, {
          [Op.or as unknown as string]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
        });
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password_hash', 'refresh_token', 'reset_token', 'reset_token_expires'] },
        limit,
        offset,
        order: [['name', 'ASC']],
      });

      sendSuccess(res, rows, 'Data user berhasil diambil', 200, {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(res, 'Validasi gagal', 422, errors.array().map((e) => ({ msg: e.msg })));
        return;
      }

      const { name, email, password, role } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        sendError(res, 'Email sudah terdaftar', 409);
        return;
      }

      const password_hash = await authService.hashPassword(password);
      const user = await User.create({ name, email, password_hash, role, is_active: true });

      const { password_hash: _, refresh_token, reset_token, reset_token_expires, ...safeUser } = user.toJSON();
      sendCreated(res, safeUser, 'User berhasil dibuat');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        sendError(res, 'User tidak ditemukan', 404);
        return;
      }

      const { name, email, role, password } = req.body;
      const updates: Record<string, unknown> = {};

      if (name) updates.name = name;
      if (email) updates.email = email;
      if (role) updates.role = role;
      if (password) updates.password_hash = await authService.hashPassword(password);

      await user.update(updates);

      const { password_hash, refresh_token, reset_token, reset_token_expires, ...safeUser } = user.toJSON();
      sendSuccess(res, safeUser, 'User berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        sendError(res, 'User tidak ditemukan', 404);
        return;
      }

      await user.update({ is_active: false, refresh_token: null });
      sendSuccess(res, null, 'User berhasil dinonaktifkan');
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
