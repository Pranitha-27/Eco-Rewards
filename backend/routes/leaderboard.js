const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/leaderboard?type=points|co2|distance&period=week|month|all
router.get('/', auth, async (req, res) => {
  try {
    const type   = ['points', 'co2', 'distance'].includes(req.query.type)
      ? req.query.type : 'points';
    const period = req.query.period || 'week';

    let dateFilter = '';
    if (period === 'week')  dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (period === 'month') dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const colMap = {
      points:   'SUM(a.points_earned)',
      co2:      'SUM(a.co2_saved)',
      distance: 'SUM(a.distance)',
    };

    const [rows] = await db.query(`
      SELECT
        u.username,
        u.current_streak,
        ${colMap[type]} AS score
      FROM Users u
      JOIN Activities a ON a.user_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id
      ORDER BY score DESC
      LIMIT 20`);

    // Find current user's rank
    const myRank = rows.findIndex(r => r.username === req.user.username) + 1;

    res.json({ leaderboard: rows, myRank, type, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;