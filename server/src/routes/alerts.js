const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ alerts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/alerts/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE alerts SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/alerts/mark-all-read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE alerts SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
