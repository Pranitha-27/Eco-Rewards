require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const cron      = require('node-cron');

const app = express();

// ── SECURITY HEADERS ──
app.use(helmet({
  contentSecurityPolicy:     false, // our HTML uses inline scripts + CDN links
  crossOriginEmbedderPolicy: false, // allows Google Fonts and external CDNs
  crossOriginResourcePolicy: false, // allows loading assets cross-origin
}));

// ── REQUEST LOGGING ──
app.use(morgan('dev'));

// ── CORS ──
app.use(cors({
  origin: '*', // open during development — tighten when deploying
  credentials: true,
}));

// ── BODY PARSING ──
app.use(express.json({ limit: '10kb' }));

// ── RATE LIMITING ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.round(process.uptime()) + 's',
    env:       process.env.NODE_ENV || 'development',
  });
});

// ── API ROUTES — registered BEFORE static files ──
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/points',      require('./routes/points'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/challenges',  require('./routes/challenges'));
app.use('/api/feed',        require('./routes/feed'));

// ── DEFAULT ROUTE ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ── SERVE FRONTEND STATIC FILES ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
});

// ═══════════════════════════════════════════
// ── SCHEDULED JOBS ──
// ═══════════════════════════════════════════

const db = require('./config/db');

// ── SEED DAILY CHALLENGES ──
async function seedDailyChallenges() {
  try {
    // Use MySQL CURDATE() so timezone always matches the database
    const [[{ today }]] = await db.query('SELECT CURDATE() AS today');
    const dateStr = today.toISOString().split('T')[0];

    const [existing] = await db.query(
      'SELECT COUNT(*) AS count FROM DailyChallenges WHERE active_date = ?',
      [dateStr]
    );

    if (existing[0].count > 0) {
      console.log(`✅ Daily challenges already exist for ${dateStr}`);
      return;
    }

    const challenges = [
      [`cycle_5km_${dateStr}`, 'Cycle 5km Today',  'Hop on a bike for at least 5km',    5,   'cycle', 100],
      [`walk_2km_${dateStr}`,  'Walk 2km Today',   'Take a 2km walk anywhere',          2,   'walk',  50 ],
      [`run_3km_${dateStr}`,   'Run 3km Today',    'Go for a 3km run',                  3,   'run',   75 ],
      [`metro_${dateStr}`,     'Take the Metro',   'Any metro trip counts',             0.1, 'metro', 40 ],
      [`any_trip_${dateStr}`,  'Log Any Eco Trip', 'Any green trip earns bonus points', 0.1, null,    25 ],
    ];

    for (const [id, title, desc, target_value, target_mode, bonus_points] of challenges) {
      await db.query(
        `INSERT INTO DailyChallenges
           (challenge_id, title, description, target_value, target_mode, bonus_points, active_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, title, desc, target_value, target_mode, bonus_points, dateStr]
      );
    }

    console.log(`✅ Daily challenges seeded for ${dateStr}`);

  } catch (err) {
    console.error('Challenge seeding error:', err.message);
  }
}

// ── REFRESH LEADERBOARD CACHE ──
async function refreshLeaderboardCache() {
  try {
    const periods = ['week', 'month', 'all'];
    const types   = ['points', 'co2', 'distance'];

    for (const period of periods) {
      for (const type of types) {

        let dateFilter = '';
        if (period === 'week')  dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        if (period === 'month') dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

        const scoreCol =
          type === 'points'   ? 'SUM(a.points_earned)' :
          type === 'co2'      ? 'SUM(a.co2_saved)'     :
                                'SUM(a.distance)';

        const [rows] = await db.query(`
          SELECT
            u.username,
            u.current_streak,
            ${scoreCol} AS score
          FROM Activities a
          JOIN Users u ON u.id = a.user_id
          WHERE 1=1 ${dateFilter}
          GROUP BY a.user_id
          ORDER BY score DESC
          LIMIT 20
        `);

        await db.query(`
          INSERT INTO LeaderboardCache (period, type, data, updated_at)
          VALUES (?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()
        `, [period, type, JSON.stringify(rows)]);
      }
    }

    console.log('✅ Leaderboard cache refreshed');
  } catch (err) {
    console.error('Leaderboard cache error:', err.message);
  }
}

// ── CLEAN UP EXPIRED TOKENS ──
async function cleanupExpiredTokens() {
  try {
    const [result] = await db.query(
      'DELETE FROM RefreshTokens WHERE expires_at < NOW()'
    );
    if (result.affectedRows > 0) {
      console.log(`🧹 Cleaned up ${result.affectedRows} expired refresh tokens`);
    }
  } catch (err) {
    // Table may not exist yet — safe to ignore
    if (err.code !== 'ER_NO_SUCH_TABLE') {
      console.error('Token cleanup error:', err.message);
    }
  }
}

// ═══════════════════════════════════════════
// ── CRON SCHEDULE ──
// ═══════════════════════════════════════════

// Seed new challenges every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('🌙 Midnight cron — seeding daily challenges');
  seedDailyChallenges();
}, { timezone: 'Asia/Kolkata' });

// Refresh leaderboard cache every 5 minutes
cron.schedule('*/5 * * * *', () => {
  refreshLeaderboardCache();
});

// Clean up expired tokens every Sunday at 2am
cron.schedule('0 2 * * 0', () => {
  console.log('🧹 Weekly cleanup — removing expired tokens');
  cleanupExpiredTokens();
}, { timezone: 'Asia/Kolkata' });

// ═══════════════════════════════════════════
// ── START SERVER ──
// ═══════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);

  // Run immediately on startup
  await seedDailyChallenges();
  await refreshLeaderboardCache();
  await cleanupExpiredTokens();
});

// ── GRACEFUL SHUTDOWN ──
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason);
});