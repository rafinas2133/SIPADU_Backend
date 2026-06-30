import winston from 'winston';

const isVercel = Boolean(process.env.VERCEL);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sipadu-backend' },
  transports: [],
});

if (process.env.NODE_ENV === 'test') {
  logger.add(new winston.transports.Console({ silent: true }));
} else if (isVercel || process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console());
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${extra}`;
        })
      ),
    })
  );

  if (!isVercel) {
    const path = require('path') as typeof import('path');
    const fs = require('fs') as typeof import('fs');
    const logDir = process.env.LOG_DIR || 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    logger.add(new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }));
    logger.add(new winston.transports.File({ filename: path.join(logDir, 'combined.log') }));
  }
}

export { logger };
