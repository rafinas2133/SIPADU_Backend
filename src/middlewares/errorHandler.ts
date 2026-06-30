import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function notFound(_req: Request, res: Response): void {
  sendError(res, 'Endpoint tidak ditemukan', 404);
}

export function errorHandler(
  err: Error & { status?: number; errors?: Array<{ msg: string; path?: string }> },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, { stack: err.stack });

  if (err.name === 'ValidationError' && err instanceof ValidationError) {
    sendError(res, 'Validasi gagal', 422);
    return;
  }

  if (err.errors) {
    sendError(res, err.message || 'Validasi gagal', 422, err.errors);
    return;
  }

  const status = err.status || 400;
  sendError(res, err.message || 'Terjadi kesalahan server', status);
}
