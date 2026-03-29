require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── SECURITY HEADERS ──
app.use(helmet({
  contentSecurityPolicy:         false, // our HTML uses inline scripts + CDN links
  crossOriginEmbedderPolicy:     false, // allows Google Fonts and external CDNs
  crossOriginResourcePolicy:     false, // allows loading assets cross-origin
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
// Very generous limits so normal usage is never blocked
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per 15 min (plenty for dev)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,                   // 50 login attempts per 15 min
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

// ── AUTO-SEED DAILY CHALLENGES ──
async function seedDailyChallenges() {
  try {
    const db = require('./config/db');

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

// Check every hour
setInterval(seedDailyChallenges, 60 * 60 * 1000);

// ── START SERVER ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);
  await seedDailyChallenges();
});

// ── GRACEFUL SHUTDOWN ──
process.on('SIGTERM', () => {
  console.log('Server shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});