require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Default route — redirect root to login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Serve frontend HTML files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes — ALL must be before app.listen() ──
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/points',      require('./routes/points'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/challenges',  require('./routes/challenges'));
app.use('/api/feed',        require('./routes/feed'));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);
});