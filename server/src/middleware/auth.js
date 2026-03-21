const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// Verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Password re-entry for sensitive actions (add, modify, update)
async function requirePasswordReentry(req, res, next) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password re-entry required for this action' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Remove password from body so it doesn't get stored
    delete req.body.password;
    next();
  } catch (err) {
    console.error('Password re-entry check failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { authenticate, authorize, requirePasswordReentry };
