const express  = require('express');
const db       = require('../config/db');
const auth     = require('../middleware/auth');
const router   = express.Router();

// Point values per transport mode
const POINTS_PER_KM = {
  walk:   25,
  run:    20,
  cycle:  35,
  bus:    30,
  ev:     50,
  metro:  45,
};

// GET /api/points — get user's total points + activities
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT points, carbon_saved FROM Users WHERE id = ?',
      [req.user.id]
    );
    const [activities] = await db.query(
      'SELECT distance, mode, points_earned, created_at FROM Activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ ...rows[0], activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load points' });
  }
});

// POST /api/points/add — log a new activity
router.post('/add', auth, async (req, res) => {
  try {
    const { distance, mode } = req.body;

    if (!distance || !mode || !POINTS_PER_KM[mode])
      return res.status(400).json({ error: 'Valid distance and mode required' });

    const dist = parseFloat(distance);
    if (isNaN(dist) || dist <= 0 || dist > 500)
      return res.status(400).json({ error: 'Distance must be between 0 and 500 km' });

    const points = Math.round(dist * POINTS_PER_KM[mode]);

    // Save activity and update user points in one transaction
    await db.query(
      'INSERT INTO Activities (user_id, distance, mode, points_earned) VALUES (?, ?, ?, ?)',
      [req.user.id, dist, mode, points]
    );
    await db.query(
      'UPDATE Users SET points = points + ?, carbon_saved = carbon_saved + ? WHERE id = ?',
      [points, dist * 0.21, req.user.id] // 0.21 kg CO2 per km (avg car emission)
    );

    res.json({ message: 'Points added!', points });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save activity' });
  }
});

module.exports = router;