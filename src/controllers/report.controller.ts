import { Request, Response, NextFunction } from 'express';
import { Child, Class, Observation, Prediction } from '../models';
import { reportService } from '../services/report.service';
import { sendSuccess, sendError } from '../utils/response';
import { TalentCategory } from '../types';

const RECOMMENDATIONS: Record<TalentCategory, string[]> = {
  Linguistik: [
    'Perbanyak kegiatan membaca bersama minimal 15 menit per hari',
    'Ajak anak bercerita dan mendongeng secara rutin',
  ],
  Seni: [
    'Sediakan alat menggambar, mewarnai, dan kerajinan tangan',
    'Perkenalkan berbagai jenis musik dan instrumen sederhana',
  ],
  Kinestetik: [
    'Berikan waktu bermain fisik aktif yang cukup setiap hari',
    'Daftarkan pada kegiatan olahraga atau senam anak',
  ],
  'Butuh Stimulasi': [
    'Berikan perhatian ekstra dan stimulasi di semua aspek perkembangan',
    'Konsultasikan dengan tenaga ahli tumbuh kembang anak',
  ],
};

export class ReportController {
  async getChildReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportService.buildReportData(req.params.id);

      if (!data) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getBukuHtml(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { childId } = req.params;
      const note = (req.query.note as string) || '';
      const period = req.query.period as string;

      const data = await reportService.buildReportData(childId, note, period);

      if (!data) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      const html = reportService.generateHTML(data);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  async getBukuData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportService.buildReportData(req.params.childId);

      if (!data) {
        sendError(res, 'Siswa tidak ditemukan', 404);
        return;
      }

      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.query.format as string) || 'json';
      const classId = req.query.class_id as string;

      const where: Record<string, unknown> = {};
      if (classId) where.class_id = classId;

      const children = await Child.findAll({
        where,
        include: [
          { model: Class, as: 'class', attributes: ['name'] },
          {
            model: Observation,
            as: 'observations',
            where: { status: 'final' },
            required: false,
            include: [{ model: Prediction, as: 'prediction' }],
          },
        ],
      });

      const rows = children.map((child) => {
        const c = child as Child & {
          class?: Class;
          observations?: (Observation & { prediction?: Prediction })[];
        };
        const latestObs = c.observations?.[0];
        const latestPred = latestObs?.prediction;
        return {
          nis: child.nis,
          name: child.name,
          class: c.class?.name,
          last_observation: latestObs?.observation_date || null,
          prediction: latestPred?.prediction || null,
          confidence: latestPred?.confidence || null,
        };
      });

      if (format === 'csv') {
        const header = 'NIS,Nama,Kelas,Tanggal Observasi,Prediksi,Confidence\n';
        const csv = rows
          .map((r) =>
            [r.nis, r.name, r.class, r.last_observation, r.prediction, r.confidence]
              .map((v) => `"${v ?? ''}"`)
              .join(',')
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=export-siswa.csv');
        res.send(header + csv);
        return;
      }

      sendSuccess(res, rows);
    } catch (err) {
      next(err);
    }
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.params.category as TalentCategory;
      const recs = RECOMMENDATIONS[category];

      if (!recs) {
        sendError(res, 'Kategori tidak valid', 400);
        return;
      }

      sendSuccess(res, { category, recommendations: recs });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
