/**
 * Migrate schema (dan opsional seed demo) ke Neon via DATABASE_URL di .env
 *
 * Usage:
 *   node scripts/migrate-to-neon.js           # schema saja
 *   node scripts/migrate-to-neon.js --seed      # schema + data demo
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const withSeed = process.argv.includes('--seed');

const DEMO_ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';

async function prepareDemoSeed(sequelize) {
  const [rows] = await sequelize.query(
    "SELECT id FROM users WHERE email = 'admin@sipadu.sch.id' LIMIT 1"
  );
  if (rows.length === 0) return;

  const currentId = rows[0].id;
  if (currentId === DEMO_ADMIN_ID) return;

  console.log('⚙ Menyesuaikan UUID admin bootstrap agar cocok dengan seed demo...');
  await sequelize.query(
    `UPDATE users SET id = :demoId WHERE email = 'admin@sipadu.sch.id' AND id = :currentId`,
    { replacements: { demoId: DEMO_ADMIN_ID, currentId } }
  );
}

async function runSqlFile(sequelize, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n▶ Menjalankan ${path.basename(filePath)}...`);
  await sequelize.query(sql);
  console.log(`✓ ${path.basename(filePath)} selesai`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL tidak ditemukan di .env');
    process.exit(1);
  }

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  const migrationsDir = path.join(__dirname, '..', 'migrations');

  try {
    await sequelize.authenticate();
    console.log('✓ Terhubung ke Neon');

    const [existing] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'"
    );
    if (existing.length > 0) {
      console.log('⚠ Tabel users sudah ada — skip schema (hapus manual di Neon jika ingin ulang)');
    } else {
      await runSqlFile(sequelize, path.join(migrationsDir, '001_init_schema.sql'));
    }

    if (withSeed) {
      await prepareDemoSeed(sequelize);
      await runSqlFile(sequelize, path.join(migrationsDir, '002_seed_demo.sql'));
    }

    const [tables] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('\nTabel di Neon:', tables.map((t) => t.tablename).join(', '));
    console.log('\nSelesai! Jalankan backend — admin otomatis dibuat saat pertama kali start.');
  } catch (err) {
    console.error('\n✗ Migrasi gagal:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
