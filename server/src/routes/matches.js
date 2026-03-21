const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize, requirePasswordReentry } = require('../middleware/auth');
const { autoMatchDocuments, investigateMismatch } = require('../services/ai/documentProcessor');
const { logAction } = require('../services/auditLog');

const router = express.Router();

// GET /api/matches - List matches with filters
router.get('/', authenticate, async (req, res) => {
  const { company_id, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT dm.*,
      c.name as company_name,
      po.document_number as po_number, po.supplier_name as po_supplier, po.amount as po_amount,
      d_do.document_number as do_number,
      inv.document_number as inv_number, inv.supplier_name as inv_supplier, inv.amount as inv_amount,
      inv.due_date as inv_due_date,
      resolver.display_name as resolved_by_name
    FROM document_matches dm
    JOIN companies c ON dm.company_id = c.id
    LEFT JOIN documents po ON dm.purchase_order_id = po.id
    LEFT JOIN documents d_do ON dm.delivery_order_id = d_do.id
    LEFT JOIN documents inv ON dm.invoice_id = inv.id
    LEFT JOIN users resolver ON dm.resolved_by = resolver.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (company_id) { query += ` AND dm.company_id = $${idx++}`; params.push(company_id); }
  if (status) { query += ` AND dm.status = $${idx++}`; params.push(status); }

  query += ` ORDER BY dm.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);
    res.json({ matches: rows });
  } catch (err) {
    console.error('List matches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matches/auto-match - Trigger auto-matching for a company
router.post('/auto-match', authenticate, authorize('owner', 'admin'), async (req, res) => {
  const { company_id } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id required' });

  try {
    const results = await autoMatchDocuments(company_id);

    for (const match of results) {
      await pool.query(
        `INSERT INTO document_matches (company_id, purchase_order_id, delivery_order_id, invoice_id, status, confidence, ai_model, has_mismatch, mismatch_type)
         VALUES ($1, $2, $3, $4, $5, $6, 'haiku', $7, $8)`,
        [company_id, match.purchase_order_id, match.delivery_order_id, match.invoice_id,
         match.has_mismatch ? 'needs_review' : 'auto_matched',
         match.confidence, match.has_mismatch, match.mismatch_type]
      );

      // Update document statuses
      if (!match.has_mismatch) {
        const docIds = [match.invoice_id, match.purchase_order_id, match.delivery_order_id].filter(Boolean);
        for (const id of docIds) {
          await pool.query("UPDATE documents SET status = 'matched' WHERE id = $1", [id]);
        }
      }

      // Create alert for mismatches
      if (match.has_mismatch) {
        const { rows: admins } = await pool.query("SELECT id FROM users WHERE role IN ('owner', 'admin')");
        for (const admin of admins) {
          await pool.query(
            `INSERT INTO alerts (user_id, alert_type, title, message, reference_type)
             VALUES ($1, 'mismatch', 'Document mismatch detected', $2, 'match')`,
            [admin.id, `Amount mismatch between PO and Invoice for ${match.purchase_order_id}`]
          );
        }
      }
    }

    res.json({ matched: results.length, results });
  } catch (err) {
    console.error('Auto-match error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matches/:id/investigate - Sonnet investigation
router.post('/:id/investigate', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const result = await investigateMismatch(req.params.id);
    if (!result) return res.status(404).json({ error: 'Match not found' });

    await pool.query(
      `UPDATE document_matches SET ai_reasoning = $1, confidence = $2, ai_model = 'sonnet', status = 'ai_suggested'
       WHERE id = $3`,
      [result.reasoning, result.confidence, req.params.id]
    );

    res.json({ investigation: result });
  } catch (err) {
    console.error('Investigate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/matches/:id/resolve - Resolve a match (requires password)
router.put('/:id/resolve', authenticate, authorize('owner', 'admin'), requirePasswordReentry, async (req, res) => {
  const { resolution_note, action } = req.body; // action: 'approve' or 'reject'

  try {
    const newStatus = action === 'approve' ? 'resolved' : 'rejected';
    const { rows } = await pool.query(
      `UPDATE document_matches SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_note = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [newStatus, req.user.id, resolution_note, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    // Update linked document statuses
    if (action === 'approve') {
      const match = rows[0];
      const docIds = [match.invoice_id, match.purchase_order_id, match.delivery_order_id].filter(Boolean);
      for (const id of docIds) {
        await pool.query("UPDATE documents SET status = 'matched' WHERE id = $1", [id]);
      }
    }

    await logAction({
      userId: req.user.id,
      userName: req.user.displayName,
      actionType: action === 'approve' ? 'APPROVE_MATCH' : 'REJECT_MATCH',
      recordType: 'match',
      recordId: req.params.id,
      recordDescription: `Match ${action}d`,
      afterValue: { status: newStatus, resolution_note },
      ipAddress: req.ip,
    });

    res.json({ match: rows[0] });
  } catch (err) {
    console.error('Resolve match error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/matches/manual-link - Manual linking by Sarah
router.post('/manual-link', authenticate, authorize('owner', 'admin'), requirePasswordReentry, async (req, res) => {
  const { company_id, purchase_order_id, delivery_order_id, invoice_id, bank_entry_id, note } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO document_matches (company_id, purchase_order_id, delivery_order_id, invoice_id, bank_entry_id, status, resolution_note, resolved_by, resolved_at)
       VALUES ($1, $2, $3, $4, $5, 'manual', $6, $7, NOW()) RETURNING *`,
      [company_id, purchase_order_id || null, delivery_order_id || null, invoice_id || null, bank_entry_id || null, note, req.user.id]
    );

    // Update document statuses
    const docIds = [purchase_order_id, delivery_order_id, invoice_id].filter(Boolean);
    for (const id of docIds) {
      await pool.query("UPDATE documents SET status = 'matched' WHERE id = $1", [id]);
    }

    await logAction({
      userId: req.user.id,
      userName: req.user.displayName,
      actionType: 'MANUAL_LINK',
      recordType: 'match',
      recordId: rows[0].id,
      recordDescription: 'Manual document linking',
      afterValue: { purchase_order_id, delivery_order_id, invoice_id, note },
      ipAddress: req.ip,
    });

    res.json({ match: rows[0] });
  } catch (err) {
    console.error('Manual link error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
