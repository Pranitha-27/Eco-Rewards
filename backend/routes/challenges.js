const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/challenges — today's challenges with completion status
router.get('/', auth, async (req, res) => {
  try {
    const [challenges] = await db.query(`
      SELECT
        dc.*,
        CASE WHEN cc.id IS NOT NULL THEN 1 ELSE 0 END AS completed
      FROM DailyChallenges dc
      LEFT JOIN ChallengeCompletions cc
        ON cc.challenge_id = dc.challenge_id AND cc.user_id = ?
      WHERE dc.active_date = CURDATE()`,
      [req.user.id]
    );
    res.json(challenges);
  } catch (err) {
    console.error('Challenges error:', err);
    res.status(500).json({ error: 'Failed to load challenges' });
  }
});

module.exports = router;