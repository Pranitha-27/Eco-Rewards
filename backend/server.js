require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./config/db');
const { seedTodaysChallenges, scheduleDailyRefresh } = require('./utils/challengeGenerator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ── API Routes — registered BEFORE static files to prevent shadowing ──
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);

  // Seed today's challenges immediately on startup
  await seedTodaysChallenges(db);

  // Schedule automatic refresh every midnight
  scheduleDailyRefresh(db);
});

// Auto-seed daily challenges
async function seedDailyChallenges() {
  const db = require('./config/db');
  const today = new Date().toISOString().split('T')[0];
  const [existing] = await db.query(
    'SELECT COUNT(*) as count FROM DailyChallenges WHERE active_date = ?', [today]
  );
  if (existing[0].count > 0) return; // already seeded today

  await db.query(`
    INSERT INTO DailyChallenges 
      (challenge_id, title, description, target_value, target_mode, bonus_points, active_date)
    VALUES
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?)`,
    [
      `cycle_5km_${today}`,  'Cycle 5km Today',   'Hop on a bike for at least 5km',    5,   'cycle', 100, today,
      `walk_2km_${today}`,   'Walk 2km Today',    'Take a 2km walk anywhere',          2,   'walk',  50,  today,
      `run_3km_${today}`,    'Run 3km Today',     'Go for a 3km run',                  3,   'run',   75,  today,
      `metro_${today}`,      'Take the Metro',    'Any metro trip counts',             0.1, 'metro', 40,  today,
      `any_trip_${today}`,   'Log Any Eco Trip',  'Any green trip earns bonus points', 0.1, null,    25,  today,
    ]
  );
  console.log(`✅ Daily challenges seeded for ${today}`);
}

// Call it after DB connects
seedDailyChallenges().catch(console.error);