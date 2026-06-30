import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';
import { sendError } from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET!;

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Token autentikasi diperlukan', 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    sendError(res, 'Token tidak valid atau kedaluwarsa', 401);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Token autentikasi diperlukan', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.', 403);
      return;
    }

    next();
  };
}
