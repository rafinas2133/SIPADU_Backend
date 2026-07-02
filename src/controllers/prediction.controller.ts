import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Prediction, Observation, Child, Class } from '../models';
import { sendSuccess, sendError } from '../utils/response';
import { TalentCategory } from '../types';

export class PredictionController {
  /**
   * GET /predictions
   * Daftar semua prediksi dengan filter opsional
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const childId = req.query.child_id as string;
      const classId = req.query.class_id as string;
      const prediction = req.query.prediction as TalentCategory;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (childId) where.child_id = childId;
      if (prediction) where.prediction = prediction;

      // Filter by kelas — perlu join melalui child
      const childWhere: Record<string, unknown> = {};
      if (classId) childWhere.class_id = classId;

      const { count, rows } = await Prediction.findAndCountAll({
        where,
        include: [
          {
            model: Child,
            as: 'child',
            attributes: ['id', 'name', 'nis'],
            where: Object.keys(childWhere).length > 0 ? childWhere : undefined,
            include: [
              { model: Class, as: 'class', attributes: ['id', 'name'] },
            ],
          },
          {
            model: Observation,
            as: 'observation',
            attributes: ['id', 'observation_date', 'bahasa', 'motorik_halus', 'motorik_kasar', 'kognitif', 'sosial_emosional'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true,
      });

      const meta = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
      sendSuccess(res, rows, 'Data prediksi berhasil diambil', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /predictions/:id
   * Detail satu prediksi
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pred = await Prediction.findByPk(req.params.id, {
        include: [
          { model: Child, as: 'child', include: [{ model: Class, as: 'class' }] },
          { model: Observation, as: 'observation' },
        ],
      });

      if (!pred) {
        sendError(res, 'Data prediksi tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, pred);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /predictions/child/:childId/latest
   * Prediksi terbaru untuk satu anak
   */
  async getLatestByChild(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childId } = req.params;

      const pred = await Prediction.findOne({
        where: { child_id: childId },
        order: [['created_at', 'DESC']],
        include: [
          { model: Observation, as: 'observation' },
        ],
      });

      if (!pred) {
        sendError(res, 'Belum ada prediksi untuk siswa ini', 404);
        return;
      }

      sendSuccess(res, pred);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /predictions/distribution
   * Distribusi hasil prediksi untuk dashboard (pie/bar chart)
   */
  async getDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.query.class_id as string;
      const childWhere: Record<string, unknown> = {};

      if (req.user?.role === 'guru') {
        const classes = await Class.findAll({
          where: { teacher_id: req.user.userId },
          attributes: ['id'],
        });
        const classIds = classes.map((c) => c.id);
        if (classId) {
          childWhere.class_id = classIds.includes(classId) ? classId : { [Op.in]: [] };
        } else {
          childWhere.class_id = classIds.length > 0 ? { [Op.in]: classIds } : { [Op.in]: [] };
        }
      } else if (classId) {
        childWhere.class_id = classId;
      }

      const hasChildFilter = Object.keys(childWhere).length > 0;

      const predictions = await Prediction.findAll({
        attributes: ['child_id', 'prediction', 'created_at'],
        include: hasChildFilter
          ? [{
              model: Child,
              as: 'child',
              attributes: ['id'],
              where: childWhere,
              required: true,
            }]
          : [],
        order: [['created_at', 'DESC']],
      });

      const distribution: Record<string, number> = {
        Linguistik: 0,
        Seni: 0,
        Kinestetik: 0,
        'Butuh Stimulasi': 0,
      };

      const seen = new Set<string>();
      for (const p of predictions) {
        if (seen.has(p.child_id)) continue;
        seen.add(p.child_id);
        distribution[p.prediction] = (distribution[p.prediction] || 0) + 1;
      }

      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
      const result = Object.entries(distribution).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
      }));

      sendSuccess(res, { distribution: result, total_predicted: total });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /predictions/summary
   * Ringkasan statistik prediksi untuk dashboard guru/admin
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sequelize: sq } = await import('../config/database');

      const [totalPredictions, highConfidence, lowConfidence, avgConfidence] = await Promise.all([
        Prediction.count(),
        Prediction.count({ where: { confidence: { [Op.gte]: 80 } } }),
        Prediction.count({ where: { confidence: { [Op.lt]: 60 } } }),
        Prediction.findOne({
          attributes: [[sq.fn('AVG', sq.col('confidence')), 'avg_confidence']],
          raw: true,
        }),
      ]);

      sendSuccess(res, {
        total_predictions: totalPredictions,
        high_confidence_count: highConfidence,  // >= 80%
        low_confidence_count: lowConfidence,    // < 60%
        avg_confidence: avgConfidence
          ? Math.round(parseFloat(String((avgConfidence as unknown as Record<string, string>)['avg_confidence'])) * 10) / 10
          : 0,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const predictionController = new PredictionController();
