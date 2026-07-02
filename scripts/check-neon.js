require('dotenv').config();
const { Sequelize } = require('sequelize');

async function main() {
  const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
  try {
    await s.authenticate();
    const [rows] = await s.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('Neon connected OK');
    console.log('Tables:', rows.length ? rows.map((r) => r.tablename).join(', ') : '(kosong)');
  } catch (e) {
    console.error('Neon error:', e.message);
    process.exit(1);
  } finally {
    await s.close();
  }
}

main();
