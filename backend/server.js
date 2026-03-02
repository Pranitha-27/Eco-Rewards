require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ── API Routes — registered BEFORE static files ──
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/points',      require('./routes/points'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/challenges',  require('./routes/challenges'));
app.use('/api/feed',        require('./routes/feed'));

// Default route — redirect root to login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Serve frontend static files (AFTER API routes)
app.use(express.static(path.join(__dirname, '../frontend')));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── AUTO-SEED DAILY CHALLENGES ──
async function seedDailyChallenges() {
  try {
    const db = require('./config/db');

    // Use MySQL's CURDATE() so timezone always matches the database
    const [[{ today }]] = await db.query('SELECT CURDATE() AS today');
    const dateStr = today.toISOString().split('T')[0]; // format: "2026-03-03"

    const [existing] = await db.query(
      'SELECT COUNT(*) AS count FROM DailyChallenges WHERE active_date = ?',
      [dateStr]
    );

    if (existing[0].count > 0) {
      console.log(`✅ Daily challenges already exist for ${dateStr}`);
      return;
    }

    const challenges = [
      [`cycle_5km_${dateStr}`,  'Cycle 5km Today',   'Hop on a bike for at least 5km',    5,   'cycle', 100],
      [`walk_2km_${dateStr}`,   'Walk 2km Today',    'Take a 2km walk anywhere',          2,   'walk',  50 ],
      [`run_3km_${dateStr}`,    'Run 3km Today',     'Go for a 3km run',                  3,   'run',   75 ],
      [`metro_${dateStr}`,      'Take the Metro',    'Any metro trip counts',             0.1, 'metro', 40 ],
      [`any_trip_${dateStr}`,   'Log Any Eco Trip',  'Any green trip earns bonus points', 0.1, null,    25 ],
    ];

    for (const [id, title, description, target_value, target_mode, bonus_points] of challenges) {
      await db.query(
        `INSERT INTO DailyChallenges
           (challenge_id, title, description, target_value, target_mode, bonus_points, active_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, title, description, target_value, target_mode, bonus_points, dateStr]
      );
    }

    console.log(`✅ Daily challenges seeded for ${dateStr}`);

  } catch (err) {
    console.error('Challenge seeding error:', err.message);
  }
}

// Run every hour — checks if today's challenges exist, seeds if not
// This means even if server restarts at any time, challenges will appear within an hour
setInterval(seedDailyChallenges, 60 * 60 * 1000);

// ── START SERVER ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);
  await seedDailyChallenges();
});