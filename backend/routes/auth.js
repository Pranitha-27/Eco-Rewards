const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const router   = express.Router();

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be 8+ characters' });

    const [existing] = await db.query(
      'SELECT id FROM Users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username or email already taken' });

    const hash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Registered!', token, username });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const [rows] = await db.query(
      'SELECT id, username, password_hash FROM Users WHERE username = ?',
      [username]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful!', token, username: user.username });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/auth/clear-data — wipe all user activity & reset stats ──
router.delete('/clear-data', require('../middleware/auth'), async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query('DELETE FROM activities           WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM userbadges           WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM challengecompletions WHERE user_id = ?', [userId]);

    await db.query(
      `UPDATE Users SET
         points             = 0,
         carbon_saved       = 0,
         total_distance     = 0,
         current_streak     = 0,
         longest_streak     = 0,
         last_activity_date = NULL,
         last_active_date   = NULL
       WHERE id = ?`,
      [userId]
    );

    res.json({ message: 'Data cleared successfully' });

  } catch (err) {
    console.error('Clear data error:', err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

module.exports = router;