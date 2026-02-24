const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

const MODE_EMOJI = {
  walk: '🚶', run: '🏃', cycle: '🚴',
  bus: '🚌', metro: '🚇', ev: '⚡'
};

// GET /api/feed — recent activity across all users
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.username,
        a.distance, a.mode, a.points_earned, a.co2_saved,
        a.created_at
      FROM Activities a
      JOIN Users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 30`);

    const feed = rows.map(r => ({
      ...r,
      emoji:   MODE_EMOJI[r.mode] || '🌿',
      timeAgo: timeAgo(new Date(r.created_at)),
      message: `${r.username} ${MODE_EMOJI[r.mode] || '🌿'} ${r.mode}d ${r.distance}km — saved ${parseFloat(r.co2_saved || 0).toFixed(2)}kg CO₂`
    }));

    res.json(feed);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Feed unavailable' });
  }
});

function timeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

module.exports = router;