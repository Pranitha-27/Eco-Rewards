const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const router   = express.Router();

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be 8+ characters' });

    // Check if user already exists
    const [existing] = await db.query(
      'SELECT id FROM Users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username or email already taken' });

    // ✅ Hash password — bcrypt is slow on purpose (harder to crack)
    const hash = await bcrypt.hash(password, 12);

    // Insert new user
    const [result] = await db.query(
      'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    // Create JWT token so user is immediately logged in
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

    // Find user by username
    const [rows] = await db.query(
      'SELECT id, username, password_hash FROM Users WHERE username = ?',
      [username]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user = rows[0];

    // ✅ bcrypt compare — checks hash without storing plain password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password' });

    // Issue a JWT — expires in 7 days
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

module.exports = router;