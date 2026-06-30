import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { sendError } from '../utils/response';

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function handleUploadError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    sendError(res, `Upload gagal: ${err.message}`, 400);
    return;
  }
  if (err) {
    sendError(res, err.message, 400);
    return;
  }
  next();
}
