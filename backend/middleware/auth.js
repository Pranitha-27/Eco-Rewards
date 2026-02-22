const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Token comes in the Authorization header as: "Bearer "
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token)
    return res.status(401).json({ error: 'Access denied. Please log in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};