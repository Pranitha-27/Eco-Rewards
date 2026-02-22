// ============================================================
// backend/config/db.js  — with verbose connection error logging
// ============================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

// Log what we're connecting with (safe — no password shown)
console.log('🔌 DB config:', {
  host:     process.env.DB_HOST     || 'localhost (default)',
  user:     process.env.DB_USER     || 'root (default)',
  database: process.env.DB_NAME     || 'EcoRewards (default)',
  password: process.env.DB_PASS ? '***set***' : '❌ NOT SET',
});

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'EcoRewards',
  waitForConnections: true,
  connectionLimit: 10,
});

// Test the connection immediately on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection FAILED:', err.message);
    console.error('');
    console.error('Common fixes:');
    console.error('  1. Is MySQL running?  →  Run: mysql -u root -p');
    console.error('  2. Wrong password?    →  Check DB_PASS in your .env file');
    console.error('  3. Wrong database?    →  Run in MySQL: SHOW DATABASES;');
    console.error('  4. .env not found?    →  Make sure .env is in the /backend folder');
    console.error('');
  });

module.exports = pool;