import bcrypt from 'bcryptjs';
import { User } from '../models';
import { logger } from './logger';

const DEFAULT_ADMIN = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Administrator',
  email: 'admin@sipadu.sch.id',
  password: 'Admin@12345',
  role: 'admin' as const,
};

export async function seedAdmin(): Promise<void> {
  const existing = await User.findOne({ where: { email: DEFAULT_ADMIN.email } });

  if (existing) {
    logger.info('Akun admin sudah ada, skip seeding');
    return;
  }

  const password_hash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);

  await User.create({
    id: DEFAULT_ADMIN.id,
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email,
    password_hash,
    role: DEFAULT_ADMIN.role,
    is_active: true,
  });

  logger.info(`Akun admin dibuat: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
}
