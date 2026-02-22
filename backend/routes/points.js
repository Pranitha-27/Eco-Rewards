const express  = require('express');
const db       = require('../config/db');
const auth     = require('../middleware/auth');
const { calculate } = require('../utils/co2Calculator');
const { updateStreak } = require('../utils/streakHelper');
const { checkAndAwardBadges } = require('../utils/badgeEngine');
const router   = express.Router();

// ── GET /api/points — full user stats + recent activities ──
router.get('/', auth, async (req, res) => {
  try {
    // UPDATED: Added current_streak to the SELECT query
    // Ensure your Users table has columns: points, carbon_saved, total_distance, current_streak
    const [userRows] = await db.query(
      `SELECT points, carbon_saved, total_distance, current_streak 
       FROM Users WHERE id = ?`,
      [req.user.id]
    );

    // If user not found in DB
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'User data not found' });
    }

    const [activities] = await db.query(
      `SELECT distance, mode, points_earned, co2_saved, trees_equivalent, created_at
       FROM Activities
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      ...userRows[0], // This now includes current_streak
      activities
    });

  } catch (err) {
    console.error('GET /points error:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// ── POST /api/points/add — log a new activity ──
router.post('/add', auth, async (req, res) => {
  try {
    const { distance, mode } = req.body;

    // Validate inputs
    if (!distance || !mode) {
      return res.status(400).json({ error: 'Distance and mode are required' });
    }

    const dist = parseFloat(distance);
    if (isNaN(dist) || dist <= 0 || dist > 500) {
      return res.status(400).json({ error: 'Distance must be between 0 and 500 km' });
    }

    // Calculate points and CO₂ using science-backed factors
    const result = calculate(dist, mode);

    // Save activity to database
    await db.query(
      `INSERT INTO Activities
         (user_id, distance, mode, points_earned, co2_saved, trees_equivalent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        result.distance,
        result.mode,
        result.points,
        result.co2_saved,
        result.trees_equivalent
      ]
    );

    // Update user totals — points, carbon saved, total distance
    // Note: Ensure your Users table uses 'carbon_saved' column name
    await db.query(
      `UPDATE Users SET
         points         = points + ?,
         carbon_saved   = carbon_saved + ?,
         total_distance = total_distance + ?
       WHERE id = ?`,
      [result.points, result.co2_saved, result.distance, req.user.id]
    );

    // Update streak
    const currentStreak = await updateStreak(db, req.user.id);

    // Check and award any new badges
    const newBadges = await checkAndAwardBadges(db, req.user.id);

    // Auto-complete any matching daily challenges
    const [challenges] = await db.query(
      `SELECT * FROM DailyChallenges
       WHERE active_date = CURDATE()
       AND (target_mode = ? OR target_mode IS NULL)
       AND target_value <= ?`,
      [result.mode, result.distance]
    );

    let bonusPoints = 0;
    const completedChallenges = [];

    for (const ch of challenges) {
      try {
        await db.query(
          `INSERT IGNORE INTO ChallengeCompletions (user_id, challenge_id)
           VALUES (?, ?)`,
          [req.user.id, ch.challenge_id]
        );
        // Check if it was actually inserted (not a duplicate)
        const [check] = await db.query(
          `SELECT id FROM ChallengeCompletions
           WHERE user_id = ? AND challenge_id = ?
           AND completed_at >= NOW() - INTERVAL 5 SECOND`,
          [req.user.id, ch.challenge_id]
        );
        if (check.length > 0) {
          bonusPoints += ch.bonus_points;
          completedChallenges.push({
            title: ch.title,
            bonus: ch.bonus_points
          });
        }
      } catch (e) {
        // Already completed today — skip silently
      }
    }

    // Award bonus points from challenges
    if (bonusPoints > 0) {
      await db.query(
        'UPDATE Users SET points = points + ? WHERE id = ?',
        [bonusPoints, req.user.id]
      );
    }

    // Send full response back to frontend
    res.json({
      message:             'Activity logged!',
      points:              result.points,
      distance:            result.distance,
      mode:                result.mode,
      co2_saved:           result.co2_saved,
      trees_equivalent:    result.trees_equivalent,
      currentStreak,
      streakMessage:       currentStreak > 1
        ? `🔥 ${currentStreak}-day streak! Keep it up!`
        : '🌱 Streak started! Come back tomorrow!',
      newBadges,
      bonusPoints,
      completedChallenges,
      impact: {
        co2_kg:  result.co2_saved.toFixed(3),
        message: `You saved ${result.co2_saved.toFixed(2)} kg of CO₂!`
      }
    });

  } catch (err) {
    console.error('POST /points/add error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// ── GET /api/points/weekly — data for the weekly chart ──
router.get('/weekly', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         DATE(created_at)      AS day,
         SUM(points_earned)    AS points,
         SUM(co2_saved)        AS co2,
         SUM(distance)         AS distance,
         COUNT(*)              AS trips
       FROM Activities
       WHERE user_id = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /points/weekly error:', err);
    res.status(500).json({ error: 'Failed to load weekly data' });
  }
});

// ── GET /api/points/badges — all badges with earned status ──
router.get('/badges', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT badge_id, earned_at
       FROM UserBadges
       WHERE user_id = ?
       ORDER BY earned_at DESC`,
      [req.user.id]
    );

    const { BADGES } = require('../utils/badgeEngine');
    const earnedIds  = new Set(rows.map(r => r.badge_id));

    const allBadges = BADGES.map(b => ({
      ...b,
      check:     undefined,       // don't expose the check function
      earned:    earnedIds.has(b.id),
      earned_at: rows.find(r => r.badge_id === b.id)?.earned_at || null
    }));

    res.json(allBadges);
  } catch (err) {
    console.error('GET /points/badges error:', err);
    res.status(500).json({ error: 'Failed to load badges' });
  }
});

module.exports = router;