import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(
      res,
      'Validasi gagal',
      422,
      errors.array().map((e) => ({ msg: e.msg, path: e.type }))
    );
    return;
  }
  next();
}
