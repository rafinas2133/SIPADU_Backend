import app from './app';
import { bootstrap } from './bootstrap';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3000');

async function startServer(): Promise<void> {
  try {
    await bootstrap();

    app.listen(PORT, () => {
      logger.info(`Server berjalan di http://localhost:${PORT}`);
      logger.info(`API tersedia di http://localhost:${PORT}/api`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Gagal menjalankan server:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
