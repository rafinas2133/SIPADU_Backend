import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { bootstrap } from '../src/bootstrap';
import 'pg';
import 'pg-hstore';

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    await bootstrap();
    initialized = true;
  }
  return app(req, res);
}
