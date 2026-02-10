/**
 * MySQL connection pool. Raw SQL only, no ORM.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'classgrid',
  waitForConnections: true,
  connectionLimit: 10,
});

/** Create tables if they do not exist. Call once on startup. */
async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS UserProfile (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      reg_id VARCHAR(100) NOT NULL UNIQUE,
      semester VARCHAR(100)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS Subject (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_profile_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        total_hours INT DEFAULT 0,
        FOREIGN KEY (user_profile_id) REFERENCES UserProfile(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS Timetable (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_profile_id INT NOT NULL,
        day VARCHAR(20) NOT NULL,
        period INT NOT NULL,
        subject_id INT NOT NULL,
        FOREIGN KEY (user_profile_id) REFERENCES UserProfile(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES Subject(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS Attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        subject_id INT NOT NULL,
        status ENUM('attended','missed','holiday','exam') NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES Subject(id) ON DELETE CASCADE,
        UNIQUE KEY (subject_id, date)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS AttendanceRule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_profile_id INT NOT NULL UNIQUE,
        minimum_percentage INT NOT NULL,
        semester_start DATE NOT NULL,
        semester_end DATE NOT NULL,
        FOREIGN KEY (user_profile_id) REFERENCES UserProfile(id) ON DELETE CASCADE
      )
    `);
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDb };
