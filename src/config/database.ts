import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
import pg from 'pg';

const isServerless = Boolean(process.env.VERCEL || process.env.DATABASE_URL);

const commonOptions = {
  dialect: 'postgres' as const,
  logging: process.env.NODE_ENV === 'development' ? (msg: string) => logger.debug(msg) : false,
  pool: {
    max: isServerless ? 1 : 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      ...commonOptions,
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: {
        ssl: process.env.DB_SSL !== 'false' ? { require: true, rejectUnauthorized: false } : undefined,
      },
    })
  : new Sequelize({
      ...commonOptions,
      dialect: 'postgres',
      dialectModule: pg,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'sipadu_cart',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

export async function connectDB(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Koneksi database berhasil');

  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    await sequelize.sync({ alter: false });
    logger.info('Model database tersinkronisasi');
  }
}
