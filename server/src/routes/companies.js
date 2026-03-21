const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/companies
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY name');
    res.json({ companies: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/companies/:id/currency-accounts
router.get('/:id/currency-accounts', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM currency_accounts WHERE company_id = $1 ORDER BY currency',
      [req.params.id]
    );
    res.json({ accounts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
