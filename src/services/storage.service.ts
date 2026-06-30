import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function uploadFile(
  file: Express.Multer.File
): Promise<string> {
  if (useBlob) {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;

    const blob = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype,
    });

    logger.debug(`File diupload ke Vercel Blob: ${blob.url}`);
    return blob.url;
  }

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filepath, file.buffer);
  return filename;
}

export function isBlobStorage(): boolean {
  return useBlob;
}
