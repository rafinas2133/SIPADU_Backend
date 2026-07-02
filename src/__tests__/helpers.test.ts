import {
  getPagination,
  buildMeta,
  calculateAge,
  likertToLabel,
  confidenceToLabel,
} from '../utils/helpers';
import { Request } from 'express';

// ─── getPagination ────────────────────────────────────────────────────────────

describe('getPagination', () => {
  function mockReq(query: Record<string, string>) {
    return { query } as unknown as Request;
  }

  it('returns defaults when no query params', () => {
    const { page, limit, offset } = getPagination(mockReq({}));
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(offset).toBe(0);
  });

  it('calculates offset correctly', () => {
    const { page, limit, offset } = getPagination(mockReq({ page: '3', limit: '10' }));
    expect(page).toBe(3);
    expect(limit).toBe(10);
    expect(offset).toBe(20);
  });

  it('clamps limit to max 100', () => {
    const { limit } = getPagination(mockReq({ limit: '500' }));
    expect(limit).toBe(100);
  });

  it('clamps page to min 1', () => {
    const { page } = getPagination(mockReq({ page: '-5' }));
    expect(page).toBe(1);
  });
});

// ─── buildMeta ────────────────────────────────────────────────────────────────

describe('buildMeta', () => {
  it('calculates totalPages correctly', () => {
    const meta = buildMeta(50, 1, 20);
    expect(meta.total).toBe(50);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(false);
  });

  it('sets hasPrevPage true when on last page', () => {
    const meta = buildMeta(50, 3, 20);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });
});

// ─── calculateAge ─────────────────────────────────────────────────────────────

describe('calculateAge', () => {
  it('calculates age correctly for a 6-year-old', () => {
    // Lahir 5 tahun lalu + 3 bulan
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 5);
    birthDate.setMonth(birthDate.getMonth() - 3);
    const { years, months } = calculateAge(birthDate);
    expect(years).toBe(5);
    expect(months).toBe(3);
  });

  it('returns 0 years 0 months for today', () => {
    const { years, months } = calculateAge(new Date());
    expect(years).toBe(0);
    expect(months).toBe(0);
  });

  it('accepts DATEONLY string from Sequelize', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 5);
    birthDate.setMonth(birthDate.getMonth() - 3);
    const isoDate = birthDate.toISOString().slice(0, 10);
    const { years, months } = calculateAge(isoDate);
    expect(years).toBe(5);
    expect(months).toBe(3);
  });
});

// ─── likertToLabel ────────────────────────────────────────────────────────────

describe('likertToLabel', () => {
  const cases: [number, string][] = [
    [1, 'Belum Berkembang (BB)'],
    [2, 'Mulai Berkembang (MB)'],
    [3, 'Berkembang Sesuai Harapan (BSH)'],
    [4, 'Berkembang Sangat Baik (BSB)'],
    [5, '-'],
    [0, '-'],
  ];

  test.each(cases)('score %i → "%s"', (score, expected) => {
    expect(likertToLabel(score)).toBe(expected);
  });
});

// ─── confidenceToLabel ────────────────────────────────────────────────────────

describe('confidenceToLabel', () => {
  it('labels >= 90 as "Sangat tinggi"', () => {
    expect(confidenceToLabel(90)).toBe('Sangat tinggi');
    expect(confidenceToLabel(100)).toBe('Sangat tinggi');
  });

  it('labels 75-89 as "Tinggi"', () => {
    expect(confidenceToLabel(75)).toBe('Tinggi');
    expect(confidenceToLabel(89)).toBe('Tinggi');
  });

  it('labels 60-74 as "Sedang"', () => {
    expect(confidenceToLabel(60)).toBe('Sedang');
    expect(confidenceToLabel(74)).toBe('Sedang');
  });

  it('labels < 60 as "Rendah"', () => {
    expect(confidenceToLabel(59)).toBe('Rendah');
    expect(confidenceToLabel(0)).toBe('Rendah');
  });
});
