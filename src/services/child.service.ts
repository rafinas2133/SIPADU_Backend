import { Op } from 'sequelize';
import { Child, Class, User, Observation, Prediction } from '../models';
import { calculateAge, likertToLabel } from '../utils/helpers';
import { TalentCategory } from '../types';

export class ChildService {
  /**
   * Cari siswa berdasarkan ID dengan data lengkap
   */
  async findById(id: string) {
    return Child.findByPk(id, {
      include: [
        {
          model: Class,
          as: 'class',
          include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
        },
        {
          model: Observation,
          as: 'observations',
          order: [['observation_date', 'DESC']],
          include: [{ model: Prediction, as: 'prediction' }],
        },
      ],
    });
  }

  /**
   * Hitung statistik perkembangan seorang anak
   */
  async getProgressStats(childId: string) {
    const observations = await Observation.findAll({
      where: { child_id: childId, status: 'final' },
      include: [{ model: Prediction, as: 'prediction' }],
      order: [['observation_date', 'ASC']],
    });

    if (observations.length === 0) {
      return { hasData: false };
    }

    const latest = observations[observations.length - 1];
    const latestPred = (latest as Observation & { prediction?: Prediction }).prediction;

    // Rata-rata per aspek
    const avgScores = {
      bahasa: +(observations.reduce((s, o) => s + o.bahasa, 0) / observations.length).toFixed(2),
      motorik_halus: +(observations.reduce((s, o) => s + o.motorik_halus, 0) / observations.length).toFixed(2),
      motorik_kasar: +(observations.reduce((s, o) => s + o.motorik_kasar, 0) / observations.length).toFixed(2),
      kognitif: +(observations.reduce((s, o) => s + o.kognitif, 0) / observations.length).toFixed(2),
      sosial_emosional: +(observations.reduce((s, o) => s + o.sosial_emosional, 0) / observations.length).toFixed(2),
    };

    // Tren: bandingkan first vs last observation
    const first = observations[0];
    const trend = {
      bahasa: latest.bahasa - first.bahasa,
      motorik_halus: latest.motorik_halus - first.motorik_halus,
      motorik_kasar: latest.motorik_kasar - first.motorik_kasar,
      kognitif: latest.kognitif - first.kognitif,
      sosial_emosional: latest.sosial_emosional - first.sosial_emosional,
    };

    // Timeline untuk grafik
    const timeline = observations.map((o) => {
      const p = (o as Observation & { prediction?: Prediction }).prediction;
      return {
        date: o.observation_date,
        bahasa: o.bahasa,
        motorik_halus: o.motorik_halus,
        motorik_kasar: o.motorik_kasar,
        kognitif: o.kognitif,
        sosial_emosional: o.sosial_emosional,
        prediction: p?.prediction || null,
        confidence: p?.confidence || null,
      };
    });

    // Label deskriptif skor terbaru
    const latestLabels = {
      bahasa: likertToLabel(latest.bahasa),
      motorik_halus: likertToLabel(latest.motorik_halus),
      motorik_kasar: likertToLabel(latest.motorik_kasar),
      kognitif: likertToLabel(latest.kognitif),
      sosial_emosional: likertToLabel(latest.sosial_emosional),
    };

    return {
      hasData: true,
      total_observations: observations.length,
      average_scores: avgScores,
      trend,
      latest_scores: {
        bahasa: latest.bahasa,
        motorik_halus: latest.motorik_halus,
        motorik_kasar: latest.motorik_kasar,
        kognitif: latest.kognitif,
        sosial_emosional: latest.sosial_emosional,
      },
      latest_labels: latestLabels,
      latest_prediction: latestPred
        ? { category: latestPred.prediction, confidence: latestPred.confidence }
        : null,
      timeline,
    };
  }

  /**
   * Hitung usia anak dari tanggal lahir
   */
  getChildAge(birthDate: Date) {
    return calculateAge(birthDate);
  }

  /**
   * Cek apakah siswa sudah diobservasi dalam N hari terakhir
   */
  async hasRecentObservation(childId: string, withinDays = 30): Promise<boolean> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - withinDays);

    const count = await Observation.count({
      where: {
        child_id: childId,
        status: 'final',
        observation_date: { [Op.gte]: sinceDate },
      },
    });

    return count > 0;
  }

  /**
   * Cari siswa-siswa yang belum diobservasi sama sekali
   */
  async findUnobserved(classId?: string) {
    const where: Record<string, unknown> = {};
    if (classId) {
      where.class_id = classId;
    }

    const allChildren = await Child.findAll({ where, attributes: ['id', 'name', 'nis', 'class_id'] });
    const allIds = allChildren.map((c) => c.id);

    if (allIds.length === 0) {
      return [];
    }

    const observedIds = (
      await Observation.findAll({
        where: { child_id: { [Op.in]: allIds }, status: 'final' },
        attributes: ['child_id'],
        group: ['child_id'],
      })
    ).map((o) => o.child_id);

    return allChildren.filter((c) => !observedIds.includes(c.id));
  }
}

export const childService = new ChildService();
