import { Request, Response, NextFunction } from 'express';
import { ModelHistory, User } from '../models';
import { mlService } from '../services/ml.service';
import { dashboardController } from './dashboard.controller';
import { sendSuccess, sendError } from '../utils/response';

export class ModelController {
  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeModel = await ModelHistory.findOne({ where: { is_active: true } });
      const mlMetrics = await mlService.getModelMetrics();

      sendSuccess(res, {
        db: activeModel,
        model: mlMetrics,
      });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await ModelHistory.findAndCountAll({
        include: [{ model: User, as: 'trainer', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      sendSuccess(res, rows, 'Riwayat model berhasil diambil', 200, {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async retrain(_req: Request, res: Response): Promise<void> {
    sendError(
      res,
      'Retrain dinonaktifkan. Model CART statis (cart_model_bakat_anak.pkl) digunakan untuk deployment Vercel.',
      501
    );
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    return dashboardController.getAdminStats(req, res, next);
  }
}

export const modelController = new ModelController();
