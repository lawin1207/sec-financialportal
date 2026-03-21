const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit - Only Win (owner) can access
router.get('/', authenticate, authorize('owner'), async (req, res) => {
  const { user_id, action_type, from_date, to_date, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  let idx = 1;

  if (user_id) { query += ` AND user_id = $${idx++}`; params.push(user_id); }
  if (action_type) { query += ` AND action_type = $${idx++}`; params.push(action_type); }
  if (from_date) { query += ` AND created_at >= $${idx++}`; params.push(from_date); }
  if (to_date) { query += ` AND created_at <= $${idx++}`; params.push(to_date); }

  query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM audit_log');
    res.json({ logs: rows, total: parseInt(countRows[0].count) });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
