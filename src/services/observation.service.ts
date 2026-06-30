import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Observation, Prediction, Child, Class, User } from '../models';
import { ObservationScores, TalentCategory } from '../types';
import { logger } from '../utils/logger';

export class ObservationService {
  /**
   * Preprocessing: validasi & normalisasi input sebelum disimpan
   */
  validateScores(scores: Partial<ObservationScores>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const fields: Array<keyof ObservationScores> = [
      'bahasa', 'motorik_halus', 'motorik_kasar', 'kognitif', 'sosial_emosional',
    ];

    for (const field of fields) {
      const val = scores[field];
      if (val === undefined || val === null) {
        errors.push(`${field} wajib diisi`);
      } else if (!Number.isInteger(val) || val < 1 || val > 4) {
        errors.push(`${field} harus berupa bilangan bulat antara 1 dan 4`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Hitung statistik observasi per kelas (untuk dashboard)
   */
  async getClassObservationStats(classId: string) {
    const children = await Child.findAll({
      where: { class_id: classId },
      attributes: ['id'],
    });
    const childIds = children.map((c) => c.id);

    if (childIds.length === 0) {
      return { total: 0, observed: 0, unobserved: 0, percentage: 0 };
    }

    const observedIds = (
      await Observation.findAll({
        where: { child_id: { [Op.in]: childIds }, status: 'final' },
        attributes: ['child_id'],
        group: ['child_id'],
      })
    ).map((o) => o.child_id);

    return {
      total: childIds.length,
      observed: observedIds.length,
      unobserved: childIds.length - observedIds.length,
      percentage: Math.round((observedIds.length / childIds.length) * 100),
    };
  }

  /**
   * Ambil rata-rata skor aspek perkembangan per kelas
   */
  async getAverageScoresByClass(classId: string) {
    const children = await Child.findAll({
      where: { class_id: classId },
      attributes: ['id'],
    });
    const childIds = children.map((c) => c.id);

    if (childIds.length === 0) {
      return null;
    }

    const result = await Observation.findOne({
      where: { child_id: { [Op.in]: childIds }, status: 'final' },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('bahasa')),           'avg_bahasa'],
        [sequelize.fn('AVG', sequelize.col('motorik_halus')),    'avg_motorik_halus'],
        [sequelize.fn('AVG', sequelize.col('motorik_kasar')),    'avg_motorik_kasar'],
        [sequelize.fn('AVG', sequelize.col('kognitif')),         'avg_kognitif'],
        [sequelize.fn('AVG', sequelize.col('sosial_emosional')), 'avg_sosial_emosional'],
      ],
      raw: true,
    }) as Record<string, string> | null;

    if (!result) {
      return null;
    }

    return {
      bahasa:           +parseFloat(result['avg_bahasa'] || '0').toFixed(2),
      motorik_halus:    +parseFloat(result['avg_motorik_halus'] || '0').toFixed(2),
      motorik_kasar:    +parseFloat(result['avg_motorik_kasar'] || '0').toFixed(2),
      kognitif:         +parseFloat(result['avg_kognitif'] || '0').toFixed(2),
      sosial_emosional: +parseFloat(result['avg_sosial_emosional'] || '0').toFixed(2),
    };
  }

  /**
   * Ambil data training untuk retrain model
   * Returns: array of ObservationScores + label dari prediction yang sudah ada
   */
  async getTrainingData(): Promise<{
    features: ObservationScores[];
    labels: TalentCategory[];
    count: number;
  }> {
    const observations = await Observation.findAll({
      where: { status: 'final' },
      include: [{ model: Prediction, as: 'prediction', required: true }],
      order: [['observation_date', 'ASC']],
    });

    const features: ObservationScores[] = [];
    const labels: TalentCategory[]     = [];

    for (const obs of observations) {
      const pred = (obs as Observation & { prediction?: Prediction }).prediction;
      if (pred) {
        features.push({
          bahasa:           obs.bahasa,
          motorik_halus:    obs.motorik_halus,
          motorik_kasar:    obs.motorik_kasar,
          kognitif:         obs.kognitif,
          sosial_emosional: obs.sosial_emosional,
        });
        labels.push(pred.prediction as TalentCategory);
      }
    }

    logger.info(`Data training disiapkan: ${features.length} sampel`);
    return { features, labels, count: features.length };
  }

  /**
   * Distribusi prediksi terbaru per anak (satu prediksi per anak)
   */
  async getTalentDistribution(classId?: string): Promise<Record<TalentCategory, number>> {
    const children = classId
      ? await Child.findAll({ where: { class_id: classId }, attributes: ['id'] })
      : await Child.findAll({ attributes: ['id'] });

    const childIds = children.map((c) => c.id);
    const distribution: Record<TalentCategory, number> = {
      Linguistik: 0, Seni: 0, Kinestetik: 0, 'Butuh Stimulasi': 0,
    };

    if (childIds.length === 0) {
      return distribution;
    }

    // Prediksi terbaru per anak
    for (const childId of childIds) {
      const pred = await Prediction.findOne({
        where: { child_id: childId },
        order: [['created_at', 'DESC']],
        attributes: ['prediction'],
      });
      if (pred) {
        const cat = pred.prediction as TalentCategory;
        distribution[cat] = (distribution[cat] || 0) + 1;
      }
    }

    return distribution;
  }
}

export const observationService = new ObservationService();
