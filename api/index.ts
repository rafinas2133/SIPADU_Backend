import 'pg';
import 'pg-hstore';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { bootstrap } from '../src/bootstrap';

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!initialized) {
      await bootstrap();
      initialized = true;
    }
    return app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
