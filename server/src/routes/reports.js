const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/payment-schedule
router.get('/payment-schedule', authenticate, async (req, res) => {
  const { company_id } = req.query;

  try {
    let query = `
      SELECT d.id, d.supplier_name, d.document_number as invoice_number,
             d.amount, d.currency, d.document_date as invoice_date,
             d.due_date, d.payment_terms, d.status,
             c.name as company_name,
             CASE
               WHEN d.due_date < CURRENT_DATE AND d.status != 'matched' THEN
                 EXTRACT(DAY FROM CURRENT_DATE - d.due_date)::int
               ELSE 0
             END as days_overdue
      FROM documents d
      JOIN companies c ON d.company_id = c.id
      WHERE d.document_type = 'invoice' AND d.due_date IS NOT NULL
    `;
    const params = [];
    if (company_id) {
      query += ' AND d.company_id = $1';
      params.push(company_id);
    }
    query += ' ORDER BY d.due_date ASC';

    const { rows } = await pool.query(query, params);
    res.json({ schedule: rows });
  } catch (err) {
    console.error('Payment schedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/aging
router.get('/aging', authenticate, async (req, res) => {
  const { company_id } = req.query;

  try {
    let query = `
      SELECT
        c.name as company_name,
        d.currency,
        COUNT(*) FILTER (WHERE d.due_date >= CURRENT_DATE) as current_count,
        COALESCE(SUM(d.amount) FILTER (WHERE d.due_date >= CURRENT_DATE), 0) as current_amount,
        COUNT(*) FILTER (WHERE d.due_date < CURRENT_DATE AND d.due_date >= CURRENT_DATE - INTERVAL '30 days') as due_30_count,
        COALESCE(SUM(d.amount) FILTER (WHERE d.due_date < CURRENT_DATE AND d.due_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as due_30_amount,
        COUNT(*) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '30 days' AND d.due_date >= CURRENT_DATE - INTERVAL '60 days') as due_60_count,
        COALESCE(SUM(d.amount) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '30 days' AND d.due_date >= CURRENT_DATE - INTERVAL '60 days'), 0) as due_60_amount,
        COUNT(*) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '60 days' AND d.due_date >= CURRENT_DATE - INTERVAL '90 days') as due_90_count,
        COALESCE(SUM(d.amount) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '60 days' AND d.due_date >= CURRENT_DATE - INTERVAL '90 days'), 0) as due_90_amount,
        COUNT(*) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '90 days') as due_over_90_count,
        COALESCE(SUM(d.amount) FILTER (WHERE d.due_date < CURRENT_DATE - INTERVAL '90 days'), 0) as due_over_90_amount
      FROM documents d
      JOIN companies c ON d.company_id = c.id
      WHERE d.document_type = 'invoice' AND d.due_date IS NOT NULL AND d.status != 'matched'
    `;
    const params = [];
    if (company_id) {
      query += ' AND d.company_id = $1';
      params.push(company_id);
    }
    query += ' GROUP BY c.name, d.currency';

    const { rows } = await pool.query(query, params);
    res.json({ aging: rows });
  } catch (err) {
    console.error('Aging report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/cash-flow
router.get('/cash-flow', authenticate, authorize('owner'), async (req, res) => {
  const { company_id } = req.query;

  try {
    // Get upcoming payments for next 3 months
    let query = `
      SELECT
        DATE_TRUNC('month', d.due_date) as month,
        c.name as company_name,
        d.currency,
        COALESCE(SUM(d.amount), 0) as total_outgoing
      FROM documents d
      JOIN companies c ON d.company_id = c.id
      WHERE d.document_type = 'invoice'
        AND d.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months'
        AND d.status != 'matched'
    `;
    const params = [];
    if (company_id) {
      query += ' AND d.company_id = $1';
      params.push(company_id);
    }
    query += ' GROUP BY DATE_TRUNC(\'month\', d.due_date), c.name, d.currency ORDER BY month';

    const { rows } = await pool.query(query, params);
    res.json({ cashFlow: rows });
  } catch (err) {
    console.error('Cash flow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/transactions
router.get('/transactions', authenticate, async (req, res) => {
  const { company_id, currency, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT bse.*, c.name as company_name,
        d.file_name as statement_file,
        md.document_number as matched_doc_number
      FROM bank_statement_entries bse
      JOIN companies c ON bse.company_id = c.id
      JOIN documents d ON bse.document_id = d.id
      LEFT JOIN documents md ON bse.matched_document_id = md.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (company_id) { query += ` AND bse.company_id = $${idx++}`; params.push(company_id); }
    if (currency) { query += ` AND bse.currency = $${idx++}`; params.push(currency); }
    if (type) { query += ` AND bse.entry_type = $${idx++}`; params.push(type); }

    query += ` ORDER BY bse.entry_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    res.json({ transactions: rows });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/dashboard-summary
router.get('/dashboard-summary', authenticate, async (req, res) => {
  const { company_id } = req.query;

  try {
    const companyFilter = company_id ? 'AND company_id = $1' : '';
    const params = company_id ? [company_id] : [];

    const [docCounts, pendingMatches, overdueInvoices, recentAlerts] = await Promise.all([
      pool.query(
        `SELECT document_type, status, COUNT(*) as count FROM documents WHERE 1=1 ${companyFilter} GROUP BY document_type, status`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM document_matches WHERE status IN ('needs_review', 'ai_suggested') ${companyFilter}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM documents WHERE document_type = 'invoice' AND due_date < CURRENT_DATE AND status != 'matched' ${companyFilter}`,
        params
      ),
      pool.query(
        `SELECT * FROM alerts WHERE is_read = false ${company_id ? '' : ''} ORDER BY created_at DESC LIMIT 10`
      ),
    ]);

    res.json({
      documentCounts: docCounts.rows,
      pendingMatches: parseInt(pendingMatches.rows[0].count),
      overdueInvoices: parseInt(overdueInvoices.rows[0].count),
      recentAlerts: recentAlerts.rows,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
