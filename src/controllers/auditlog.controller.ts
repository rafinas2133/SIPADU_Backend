import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AuditLog, User } from '../models';
import { sendSuccess } from '../utils/response';

export class AuditLogController {
  /**
   * GET /audit-logs
   * Riwayat semua aktivitas sistem
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const userId = req.query.user_id as string;
      const action = req.query.action as string;
      const targetType = req.query.target_type as string;
      const from = req.query.from as string; // tanggal mulai
      const to = req.query.to as string;     // tanggal akhir
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (userId) where.user_id = userId;
      if (action) where.action = { [Op.iLike]: `%${action}%` };
      if (targetType) where.target_type = targetType;

      if (from || to) {
        where.created_at = {
          ...(from && { [Op.gte]: new Date(from) }),
          ...(to && { [Op.lte]: new Date(to + 'T23:59:59') }),
        };
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
      });

      const meta = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
      sendSuccess(res, rows, 'Audit log berhasil diambil', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /audit-logs/recent
   * 10 aktivitas terbaru — untuk widget dashboard
   */
  async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const logs = await AuditLog.findAll({
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'role'] },
        ],
        order: [['created_at', 'DESC']],
        limit,
      });

      sendSuccess(res, logs, 'Aktivitas terbaru berhasil diambil');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /audit-logs/user/:userId
   * Riwayat aktivitas seorang pengguna
   */
  async getByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await AuditLog.findAndCountAll({
        where: { user_id: req.params.userId },
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      const meta = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
      sendSuccess(res, rows, 'Riwayat aktivitas pengguna berhasil diambil', 200, meta);
    } catch (err) {
      next(err);
    }
  }
}

export const auditLogController = new AuditLogController();
