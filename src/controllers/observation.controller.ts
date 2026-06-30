import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Observation, Prediction, Child, User } from '../models';
import { mlService } from '../services/ml.service';
import { uploadFile } from '../services/storage.service';
import { getModelMetrics } from '../model/cart.predictor';
import { ModelHistory } from '../models';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { ObservationScores } from '../types';

export class ObservationController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const childId = req.query.child_id as string;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (childId) where.child_id = childId;
      if (status) where.status = status;

      // Guru hanya melihat observasi yang dia buat
      if (req.user?.role === 'guru') {
        where.teacher_id = req.user.userId;
      }

      const { count, rows } = await Observation.findAndCountAll({
        where,
        include: [
          { model: Child, as: 'child', attributes: ['id', 'name', 'nis'] },
          { model: User, as: 'teacher', attributes: ['id', 'name'] },
          { model: Prediction, as: 'prediction' },
        ],
        limit,
        offset,
        order: [['observation_date', 'DESC']],
        distinct: true,
      });

      const meta = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
      sendSuccess(res, rows, 'Data observasi berhasil diambil', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const obs = await Observation.findByPk(req.params.id, {
        include: [
          { model: Child, as: 'child' },
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Prediction, as: 'prediction' },
        ],
      });

      if (!obs) {
        sendError(res, 'Data observasi tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, obs);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        child_id, observation_date,
        bahasa, motorik_halus, motorik_kasar, kognitif, sosial_emosional,
        note, status = 'final',
      } = req.body;

      const attachment_path = req.file ? await uploadFile(req.file) : null;

      const obs = await Observation.create({
        child_id,
        teacher_id: req.user!.userId,
        observation_date,
        bahasa, motorik_halus, motorik_kasar, kognitif, sosial_emosional,
        note: note || null,
        attachment_path,
        status,
      });

      // Jika status final, langsung prediksi
      if (status === 'final') {
        await this._runPrediction(obs);
      }

      const result = await Observation.findByPk(obs.id, {
        include: [
          { model: Child, as: 'child', attributes: ['id', 'name', 'nis'] },
          { model: Prediction, as: 'prediction' },
        ],
      });

      sendCreated(res, result, 'Observasi berhasil disimpan');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const obs = await Observation.findByPk(req.params.id);
      if (!obs) {
        sendError(res, 'Data observasi tidak ditemukan', 404);
        return;
      }

      // Hanya guru pemilik atau admin yang bisa edit
      if (req.user?.role === 'guru' && obs.teacher_id !== req.user.userId) {
        sendError(res, 'Anda tidak berhak mengubah observasi ini', 403);
        return;
      }

      const {
        bahasa, motorik_halus, motorik_kasar, kognitif, sosial_emosional,
        note, status, observation_date,
      } = req.body;

      await obs.update({
        ...(observation_date && { observation_date }),
        ...(bahasa && { bahasa }),
        ...(motorik_halus && { motorik_halus }),
        ...(motorik_kasar && { motorik_kasar }),
        ...(kognitif && { kognitif }),
        ...(sosial_emosional && { sosial_emosional }),
        ...(note !== undefined && { note }),
        ...(status && { status }),
      });

      // Re-prediksi jika data aspek diubah
      if (bahasa || motorik_halus || motorik_kasar || kognitif || sosial_emosional) {
        await Prediction.destroy({ where: { observation_id: obs.id } });
        if (obs.status === 'final') {
          await this._runPrediction(obs);
        }
      }

      sendSuccess(res, obs, 'Observasi diperbarui');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const obs = await Observation.findByPk(req.params.id);
      if (!obs) {
        sendError(res, 'Data observasi tidak ditemukan', 404);
        return;
      }

      await obs.destroy();
      sendSuccess(res, null, 'Observasi berhasil dihapus');
    } catch (err) {
      next(err);
    }
  }

  // ── Prediksi manual (trigger ulang) ───────────────────────────────────────

  async predict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const obs = await Observation.findByPk(req.params.id);
      if (!obs) {
        sendError(res, 'Observasi tidak ditemukan', 404);
        return;
      }

      await Prediction.destroy({ where: { observation_id: obs.id } });
      const prediction = await this._runPrediction(obs);

      sendSuccess(res, prediction, 'Prediksi berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  }

  // ── Internal helper ───────────────────────────────────────────────────────

  private async _runPrediction(obs: Observation): Promise<Prediction> {
    const scores: ObservationScores = {
      bahasa: obs.bahasa,
      motorik_halus: obs.motorik_halus,
      motorik_kasar: obs.motorik_kasar,
      kognitif: obs.kognitif,
      sosial_emosional: obs.sosial_emosional,
    };

    const result = await mlService.predict(scores);

    // Ambil versi model aktif
    const activeModel = await ModelHistory.findOne({ where: { is_active: true } });
    const modelVersion = activeModel?.version || getModelMetrics().version;

    const prediction = await Prediction.create({
      observation_id: obs.id,
      child_id: obs.child_id,
      prediction: result.prediction,
      confidence: result.confidence,
      probabilities: result.probabilities,
      model_version: modelVersion,
    });

    return prediction;
  }
}

export const observationController = new ObservationController();
