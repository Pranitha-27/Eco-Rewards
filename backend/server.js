require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve your HTML files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/points', require('./routes/points'));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ EcoRewards server running on http://localhost:${PORT}`);
});