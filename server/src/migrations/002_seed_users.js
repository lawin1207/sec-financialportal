const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function seedUsers() {
  const users = [
    { username: 'win', displayName: 'Win', role: 'owner', password: 'Win@2026!' },
    { username: 'sarah', displayName: 'Sarah', role: 'admin', password: 'Sarah@2026!' },
    { username: 'yunxin', displayName: 'YunXin', role: 'accountant', password: 'YunXin@2026!' },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    await pool.query(
      `INSERT INTO users (username, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [user.username, user.displayName, hash, user.role]
    );
    console.log(`  User ${user.username} seeded (password: ${user.password})`);
  }

  console.log('User seeding complete.');
  await pool.end();
}

seedUsers().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
