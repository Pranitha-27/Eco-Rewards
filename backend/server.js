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