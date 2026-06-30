import { Request } from 'express';
import { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';

/**
 * Ekstrak parameter paginasi dari query string
 */
export function getPagination(req: Request): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build paginasi meta
 */
export function buildMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}

/**
 * Build where clause pencarian teks iLike untuk beberapa field
 */
export function buildSearchWhere(search: string | undefined, fields: string[]): WhereOptions | undefined {
  if (!search || !search.trim()) return undefined;

  return {
    [Op.or]: fields.map((field) => ({
      [field]: { [Op.iLike]: `%${search.trim()}%` },
    })),
  } as WhereOptions;
}

/**
 * Build filter tanggal dari query param from & to
 */
export function buildDateRangeWhere(
  from: string | undefined,
  to: string | undefined,
  field = 'created_at'
): Record<string, unknown> | undefined {
  if (!from && !to) return undefined;

  const where: Record<string, unknown> = {};
  if (from) where[Op.gte as unknown as string] = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    where[Op.lte as unknown as string] = toDate;
  }

  return { [field]: where };
}

/**
 * Kalkulasi usia dari tanggal lahir
 */
export function calculateAge(birthDate: Date): { years: number; months: number } {
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  return { years, months };
}

/**
 * Konversi skor Likert ke label deskriptif
 */
export function likertToLabel(score: number): string {
  switch (score) {
    case 1: return 'Belum Berkembang (BB)';
    case 2: return 'Mulai Berkembang (MB)';
    case 3: return 'Berkembang Sesuai Harapan (BSH)';
    case 4: return 'Berkembang Sangat Baik (BSB)';
    default: return '-';
  }
}

/**
 * Format confidence ke label kategori
 */
export function confidenceToLabel(confidence: number): string {
  if (confidence >= 90) return 'Sangat tinggi';
  if (confidence >= 75) return 'Tinggi';
  if (confidence >= 60) return 'Sedang';
  return 'Rendah';
}
