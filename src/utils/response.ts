import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Berhasil',
  status = 200,
  meta?: Record<string, unknown>
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T, message = 'Berhasil dibuat'): void {
  sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message: string,
  status = 400,
  errors?: Array<{ msg: string; path?: string }>
): void {
  const body: ApiResponse = { success: false, message };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}
