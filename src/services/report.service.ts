import { Child, Class, User, Observation, Prediction } from '../models';
import { TalentCategory } from '../types';
import { likertToLabel, calculateAge } from '../utils/helpers';
import { logger } from '../utils/logger';

// ── Stimulation recommendations per category ──────────────────────────────────
const RECOMMENDATIONS: Record<TalentCategory, string[]> = {
  Linguistik: [
    'Perbanyak kegiatan membaca bersama minimal 15 menit per hari',
    'Ajak anak bercerita dan mendongeng secara rutin',
    'Berikan buku bergambar dan buku cerita sesuai usia',
    'Latih permainan kata, teka-teki, dan sajak anak-anak',
    'Diskusi kelompok kecil untuk melatih kemampuan komunikasi',
  ],
  Seni: [
    'Sediakan alat menggambar, mewarnai, dan kerajinan tangan',
    'Perkenalkan berbagai jenis musik dan instrumen sederhana',
    'Daftarkan pada kegiatan seni, tari, atau drama anak',
    'Kunjungi pameran seni atau pertunjukan budaya anak',
    'Berikan kebebasan berekspresi melalui kreasi seni bebas',
  ],
  Kinestetik: [
    'Berikan waktu bermain fisik aktif yang cukup setiap hari',
    'Daftarkan pada kegiatan olahraga atau senam anak',
    'Permainan yang melibatkan koordinasi tubuh dan keseimbangan',
    'Kegiatan menari, berenang, atau bela diri anak',
    'Berikan ruang yang aman untuk eksplorasi gerak bebas',
  ],
  'Butuh Stimulasi': [
    'Berikan perhatian ekstra dan stimulasi di semua aspek perkembangan',
    'Konsultasikan dengan tenaga ahli tumbuh kembang anak',
    'Rutinkan jadwal belajar dan bermain yang terstruktur',
    'Libatkan orang tua secara aktif dalam kegiatan belajar di rumah',
    'Pantau perkembangan secara berkala bersama guru dan orang tua',
  ],
};

export interface ReportData {
  child: {
    id: string;
    name: string;
    nis: string;
    birth_date: Date;
    age: { years: number; months: number };
    gender: string;
    class_name: string;
    teacher_name: string;
  };
  period: string;
  latest_observation: {
    date: Date;
    scores: Record<string, number>;
    score_labels: Record<string, string>;
    note: string | null;
  } | null;
  prediction: {
    category: TalentCategory;
    confidence: number;
    probabilities: Record<TalentCategory, number>;
    model_version: string;
  } | null;
  progress_timeline: Array<{
    date: Date;
    bahasa: number;
    motorik_halus: number;
    motorik_kasar: number;
    kognitif: number;
    sosial_emosional: number;
    prediction: string | null;
  }>;
  average_scores: Record<string, number>;
  recommendations: string[];
  teacher_note: string;
  generated_at: string;
}

export class ReportService {
  /**
   * Kumpulkan semua data yang dibutuhkan untuk buku penghubung
   */
  async buildReportData(childId: string, teacherNote = '', period?: string): Promise<ReportData | null> {
    const child = await Child.findByPk(childId, {
      include: [
        {
          model: Class,
          as: 'class',
          include: [{ model: User, as: 'teacher', attributes: ['id', 'name'] }],
        },
        {
          model: Observation,
          as: 'observations',
          where: { status: 'final' },
          required: false,
          order: [['observation_date', 'DESC']],
          include: [{ model: Prediction, as: 'prediction' }],
          limit: 12, // maks 12 observasi untuk timeline
        },
      ],
    });

    if (!child) {
      return null;
    }

    const c = child as Child & {
      class?: Class & { teacher?: User };
      observations?: (Observation & { prediction?: Prediction })[];
    };

    const observations = c.observations || [];
    const latestObs    = observations[0] || null;
    const latestPred   = latestObs?.prediction || null;

    // Rata-rata skor
    const avgScores =
      observations.length > 0
        ? {
            bahasa:           +(observations.reduce((s, o) => s + o.bahasa, 0) / observations.length).toFixed(2),
            motorik_halus:    +(observations.reduce((s, o) => s + o.motorik_halus, 0) / observations.length).toFixed(2),
            motorik_kasar:    +(observations.reduce((s, o) => s + o.motorik_kasar, 0) / observations.length).toFixed(2),
            kognitif:         +(observations.reduce((s, o) => s + o.kognitif, 0) / observations.length).toFixed(2),
            sosial_emosional: +(observations.reduce((s, o) => s + o.sosial_emosional, 0) / observations.length).toFixed(2),
          }
        : { bahasa: 0, motorik_halus: 0, motorik_kasar: 0, kognitif: 0, sosial_emosional: 0 };

    const age = calculateAge(child.birth_date);

    const reportData: ReportData = {
      child: {
        id:           child.id,
        name:         child.name,
        nis:          child.nis,
        birth_date:   child.birth_date,
        age,
        gender:       child.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        class_name:   c.class?.name || '-',
        teacher_name: c.class?.teacher?.name || '-',
      },
      period: period || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      latest_observation: latestObs
        ? {
            date: latestObs.observation_date,
            scores: {
              bahasa:           latestObs.bahasa,
              motorik_halus:    latestObs.motorik_halus,
              motorik_kasar:    latestObs.motorik_kasar,
              kognitif:         latestObs.kognitif,
              sosial_emosional: latestObs.sosial_emosional,
            },
            score_labels: {
              bahasa:           likertToLabel(latestObs.bahasa),
              motorik_halus:    likertToLabel(latestObs.motorik_halus),
              motorik_kasar:    likertToLabel(latestObs.motorik_kasar),
              kognitif:         likertToLabel(latestObs.kognitif),
              sosial_emosional: likertToLabel(latestObs.sosial_emosional),
            },
            note: latestObs.note,
          }
        : null,
      prediction: latestPred
        ? {
            category:      latestPred.prediction as TalentCategory,
            confidence:    latestPred.confidence,
            probabilities: latestPred.probabilities,
            model_version: latestPred.model_version,
          }
        : null,
      progress_timeline: [...observations].reverse().map((o) => ({
        date:             o.observation_date,
        bahasa:           o.bahasa,
        motorik_halus:    o.motorik_halus,
        motorik_kasar:    o.motorik_kasar,
        kognitif:         o.kognitif,
        sosial_emosional: o.sosial_emosional,
        prediction:       o.prediction?.prediction || null,
      })),
      average_scores: avgScores,
      recommendations: latestPred
        ? RECOMMENDATIONS[latestPred.prediction as TalentCategory] || []
        : [],
      teacher_note: teacherNote,
      generated_at: new Date().toISOString(),
    };

    return reportData;
  }

  /**
   * Generate HTML untuk buku penghubung (siap di-render atau di-convert ke PDF)
   */
  generateHTML(data: ReportData): string {
    const scoreBar = (score: number) => {
      const pct = (score / 4) * 100;
      const color = score >= 3 ? '#1baf7a' : score === 2 ? '#eda100' : '#e34948';
      return `<div style="width:100%;background:#eee;border-radius:4px;height:8px;margin-top:3px">
        <div style="width:${pct}%;background:${color};border-radius:4px;height:8px"></div></div>`;
    };

    const predColor = data.prediction
      ? { Linguistik: '#2a78d6', Seni: '#1baf7a', Kinestetik: '#eda100', 'Butuh Stimulasi': '#e34948' }[
          data.prediction.category
        ] || '#333'
      : '#333';

    const scoresTable = data.latest_observation
      ? Object.entries(data.latest_observation.scores)
          .map(([key, val]) => {
            const label = {
              bahasa: 'Bahasa', motorik_halus: 'Motorik Halus',
              motorik_kasar: 'Motorik Kasar', kognitif: 'Kognitif',
              sosial_emosional: 'Sosial Emosional',
            }[key] || key;
            return `
            <tr>
              <td style="padding:6px 8px;font-weight:500;color:#333">${label}</td>
              <td style="padding:6px 8px;text-align:center">${val}/4</td>
              <td style="padding:6px 8px;color:#555;font-size:11px">${data.latest_observation!.score_labels[key]}</td>
              <td style="padding:6px 8px;width:100px">${scoreBar(val)}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="4" style="text-align:center;color:#999;padding:12px">Belum ada observasi</td></tr>';

    const recommendations = data.recommendations
      .map((r, i) => `<li style="margin-bottom:4px">${i + 1}. ${r}</li>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buku Penghubung — ${data.child.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #222; background: #fff; }
  .page { max-width: 794px; margin: 0 auto; padding: 32px 40px; }
  .header { text-align: center; border-bottom: 3px solid #2a78d6; padding-bottom: 16px; margin-bottom: 20px; }
  .school-name { font-size: 18px; font-weight: 700; color: #2a78d6; }
  .doc-title { font-size: 14px; color: #555; margin-top: 4px; }
  .period { font-size: 12px; color: #888; margin-top: 2px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 700; color: #2a78d6; border-left: 4px solid #2a78d6;
    padding-left: 8px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .04em; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .info-row { display: flex; gap: 8px; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #eee; }
  .info-label { color: #888; min-width: 110px; flex-shrink: 0; }
  .info-value { color: #222; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0f6ff; text-align: left; padding: 7px 8px; color: #444; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  .result-box { background: #f0f6ff; border: 2px solid #2a78d6; border-radius: 10px;
    padding: 16px 20px; display: flex; align-items: center; gap: 20px; }
  .result-label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .result-value { font-size: 26px; font-weight: 700; color: ${predColor}; }
  .result-conf { font-size: 12px; color: #555; margin-top: 4px; }
  .rec-list { list-style: none; }
  .rec-list li { padding: 5px 0; border-bottom: 1px dashed #eee; font-size: 12px; color: #333; }
  .note-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;
    padding: 12px 16px; font-size: 12px; color: #444; white-space: pre-line; }
  .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1px solid #333; margin-top: 48px; padding-top: 4px; font-size: 11px; }
  .generated { font-size: 10px; color: #bbb; text-align: center; margin-top: 24px; }
  @media print {
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="school-name">🌱 TK / PAUD HARAPAN BANGSA</div>
    <div class="doc-title">BUKU PENGHUBUNG PERKEMBANGAN ANAK</div>
    <div class="period">Periode: ${data.period}</div>
  </div>

  <div class="section">
    <div class="section-title">Identitas Siswa</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nama</span><span class="info-value">${data.child.name}</span></div>
      <div class="info-row"><span class="info-label">NIS</span><span class="info-value">${data.child.nis}</span></div>
      <div class="info-row"><span class="info-label">Jenis Kelamin</span><span class="info-value">${data.child.gender}</span></div>
      <div class="info-row"><span class="info-label">Tanggal Lahir</span><span class="info-value">${new Date(data.child.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="info-row"><span class="info-label">Usia</span><span class="info-value">${data.child.age.years} tahun ${data.child.age.months} bulan</span></div>
      <div class="info-row"><span class="info-label">Kelas</span><span class="info-value">${data.child.class_name}</span></div>
      <div class="info-row"><span class="info-label">Guru Kelas</span><span class="info-value">${data.child.teacher_name}</span></div>
      <div class="info-row"><span class="info-label">Tgl. Observasi</span><span class="info-value">${data.latest_observation ? new Date(data.latest_observation.date).toLocaleDateString('id-ID') : '-'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Hasil Observasi Perkembangan</div>
    <table>
      <thead><tr><th>Aspek Perkembangan</th><th style="text-align:center">Nilai</th><th>Keterangan</th><th>Indikator</th></tr></thead>
      <tbody>${scoresTable}</tbody>
    </table>
  </div>

  ${
    data.prediction
      ? `<div class="section">
    <div class="section-title">Hasil Analisis CART</div>
    <div class="result-box">
      <div>
        <div class="result-label">Bakat & Minat Teridentifikasi</div>
        <div class="result-value">🌟 ${data.prediction.category}</div>
        <div class="result-conf">Tingkat kepercayaan model: ${data.prediction.confidence.toFixed(1)}% | Versi model: ${data.prediction.model_version}</div>
      </div>
      <div style="flex:1;text-align:right;font-size:11px;color:#666">
        ${Object.entries(data.prediction.probabilities)
          .map(([k, v]) => `${k}: ${v.toFixed(1)}%`)
          .join('<br>')}
      </div>
    </div>
  </div>`
      : ''
  }

  ${
    data.recommendations.length > 0
      ? `<div class="section">
    <div class="section-title">Rekomendasi Stimulasi di Rumah</div>
    <ul class="rec-list">${recommendations}</ul>
  </div>`
      : ''
  }

  ${
    data.teacher_note
      ? `<div class="section">
    <div class="section-title">Catatan Guru</div>
    <div class="note-box">${data.teacher_note}</div>
  </div>`
      : ''
  }

  <div class="footer">
    <div class="sign-box">
      <div style="font-size:12px;color:#555">Mengetahui,</div>
      <div class="sign-line">Orang Tua / Wali</div>
    </div>
    <div class="sign-box">
      <div style="font-size:12px;color:#555">Guru Kelas,</div>
      <div class="sign-line">${data.child.teacher_name}</div>
    </div>
  </div>

  <div class="generated">Dicetak: ${new Date(data.generated_at).toLocaleString('id-ID')} | SIPADU CART v1.0</div>
</div>
</body>
</html>`;
  }
}

export const reportService = new ReportService();
