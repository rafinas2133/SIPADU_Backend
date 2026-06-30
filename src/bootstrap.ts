import { connectDB } from './config/database';
import { seedAdmin } from './utils/seeder';
import { logger } from './utils/logger';

let ready: Promise<void> | null = null;

export async function bootstrap(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectDB();
      await seedAdmin();
      logger.info('Bootstrap selesai');
    })();
  }
  return ready;
}
