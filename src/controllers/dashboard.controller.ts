import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { User, Class, Child, Observation, Prediction, ModelHistory, AuditLog } from '../models';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  /**
   * GET /dashboard/guru
   * Statistik untuk dashboard guru — hanya kelas & siswa miliknya
   */
  async getGuruStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.userId;

      // Kelas yang diajar guru ini
      const classes = await Class.findAll({ where: { teacher_id: teacherId } });
      const classIds = classes.map((c) => c.id);

      // Siswa di kelas tersebut
      const children = await Child.findAll({
        where: classIds.length > 0 ? { class_id: { [Op.in]: classIds } } : { id: { [Op.eq]: null as unknown as string } },
        attributes: ['id'],
      });
      const childIds = children.map((c) => c.id);

      // Observasi yang dibuat guru ini
      const [totalObservations, draftObservations] = await Promise.all([
        Observation.count({ where: { teacher_id: teacherId, status: 'final' } }),
        Observation.count({ where: { teacher_id: teacherId, status: 'draft' } }),
      ]);

      // Siswa yang sudah diprediksi
      const predictedChildIds = childIds.length > 0
        ? (await Prediction.findAll({
            attributes: ['child_id'],
            where: { child_id: { [Op.in]: childIds } },
            group: ['child_id'],
          })).map((p) => p.child_id)
        : [];

      // Model aktif
      const activeModel = await ModelHistory.findOne({ where: { is_active: true } });

      // Distribusi bakat kelas ini
      const distribution = childIds.length > 0
        ? await Prediction.findAll({
            attributes: [
              'prediction',
              [sequelize.fn('COUNT', sequelize.col('Prediction.id')), 'count'],
            ],
            where: { child_id: { [Op.in]: childIds } },
            group: ['prediction'],
            raw: true,
          })
        : [];

      // Observasi 30 hari terakhir (untuk grafik aktivitas)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentObservations = await Observation.findAll({
        where: {
          teacher_id: teacherId,
          created_at: { [Op.gte]: thirtyDaysAgo },
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('observation_date')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('observation_date'))],
        order: [[sequelize.fn('DATE', sequelize.col('observation_date')), 'ASC']],
        raw: true,
      });

      sendSuccess(res, {
        overview: {
          total_classes: classes.length,
          total_students: childIds.length,
          observed_students: predictedChildIds.length,
          unobserved_students: childIds.length - predictedChildIds.length,
          total_observations: totalObservations,
          draft_observations: draftObservations,
          observed_percentage: childIds.length > 0
            ? Math.round((predictedChildIds.length / childIds.length) * 100)
            : 0,
        },
        active_model: activeModel
          ? {
              version: activeModel.version,
              accuracy: activeModel.accuracy,
              f1_score: activeModel.f1_score,
            }
          : null,
        talent_distribution: distribution,
        recent_activity_chart: recentObservations,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/admin
   * Statistik sistem lengkap untuk admin
   */
  async getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        totalGuru,
        totalOrangTua,
        totalClasses,
        totalChildren,
        totalObservations,
        totalPredictions,
        observedStudents,
        activeModel,
        modelHistory,
        recentLogs,
        talentDist,
        usersByRole,
      ] = await Promise.all([
        User.count({ where: { is_active: true } }),
        User.count({ where: { role: 'guru', is_active: true } }),
        User.count({ where: { role: 'orang_tua', is_active: true } }),
        Class.count(),
        Child.count(),
        Observation.count({ where: { status: 'final' } }),
        Prediction.count(),
        Prediction.count({ distinct: true, col: 'child_id' }),
        ModelHistory.findOne({ where: { is_active: true } }),
        ModelHistory.findAll({ order: [['created_at', 'DESC']], limit: 5 }),
        AuditLog.findAll({
          include: [{ model: User, as: 'user', attributes: ['name', 'role'] }],
          order: [['created_at', 'DESC']],
          limit: 8,
        }),
        Prediction.findAll({
          attributes: [
            'prediction',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['prediction'],
          raw: true,
        }),
        User.findAll({
          attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          where: { is_active: true },
          group: ['role'],
          raw: true,
        }),
      ]);

      sendSuccess(res, {
        overview: {
          total_users: totalUsers,
          total_guru: totalGuru,
          total_orang_tua: totalOrangTua,
          total_classes: totalClasses,
          total_children: totalChildren,
          total_students: totalChildren,
          observed_students: observedStudents,
          unobserved_students: totalChildren - observedStudents,
          total_observations: totalObservations,
          total_predictions: totalPredictions,
          observed_percentage: totalChildren > 0
            ? Math.round((observedStudents / totalChildren) * 100)
            : 0,
        },
        active_model: activeModel
          ? {
              version: activeModel.version,
              accuracy: activeModel.accuracy,
              precision: activeModel.precision,
              recall: activeModel.recall,
              f1_score: activeModel.f1_score,
              training_samples: activeModel.training_samples,
            }
          : null,
        model_history: modelHistory,
        talent_distribution: talentDist,
        users_by_role: usersByRole,
        recent_activity: recentLogs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/parent
   * Statistik untuk orang tua — hanya anak mereka sendiri
   */
  async getParentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parentId = req.user!.userId;

      const children = await Child.findAll({
        where: { parent_user_id: parentId },
        include: [
          { model: Class, as: 'class', attributes: ['id', 'name'] },
          {
            model: Observation,
            as: 'observations',
            limit: 1,
            order: [['observation_date', 'DESC']],
            include: [{ model: Prediction, as: 'prediction' }],
          },
        ],
      });

      sendSuccess(res, {
        children: children.map((child) => {
          const c = child as Child & {
            class?: Class;
            observations?: (Observation & { prediction?: Prediction })[];
          };
          const latestObs = c.observations?.[0];
          const latestPred = latestObs?.prediction;
          return {
            id: c.id,
            name: c.name,
            nis: c.nis,
            class: c.class,
            latest_prediction: latestPred?.prediction || null,
            latest_confidence: latestPred?.confidence || null,
            last_observed: latestObs?.observation_date || null,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
