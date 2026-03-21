const express = require('express');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticate, authorize, requirePasswordReentry } = require('../middleware/auth');
const { uploadFile, getSignedDownloadUrl, buildS3Key } = require('../services/s3');
const { extractDocumentData, processBankStatement } = require('../services/ai/documentProcessor');
const { logAction } = require('../services/auditLog');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/documents - List documents with filters
router.get('/', authenticate, async (req, res) => {
  const { company_id, document_type, status, supplier, from_date, to_date, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT d.*, c.name as company_name, c.short_code as company_short_code,
           u.display_name as uploaded_by_name
    FROM documents d
    JOIN companies c ON d.company_id = c.id
    JOIN users u ON d.uploaded_by = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (company_id) { query += ` AND d.company_id = $${paramIdx++}`; params.push(company_id); }
  if (document_type) { query += ` AND d.document_type = $${paramIdx++}`; params.push(document_type); }
  if (status) { query += ` AND d.status = $${paramIdx++}`; params.push(status); }
  if (supplier) { query += ` AND d.supplier_name ILIKE $${paramIdx++}`; params.push(`%${supplier}%`); }
  if (from_date) { query += ` AND d.document_date >= $${paramIdx++}`; params.push(from_date); }
  if (to_date) { query += ` AND d.document_date <= $${paramIdx++}`; params.push(to_date); }

  query += ` ORDER BY d.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM documents d WHERE 1=1';
    const countParams = [];
    let cIdx = 1;
    if (company_id) { countQuery += ` AND d.company_id = $${cIdx++}`; countParams.push(company_id); }
    if (document_type) { countQuery += ` AND d.document_type = $${cIdx++}`; countParams.push(document_type); }
    if (status) { countQuery += ` AND d.status = $${cIdx++}`; countParams.push(status); }

    const { rows: countRows } = await pool.query(countQuery, countParams);

    res.json({ documents: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, c.name as company_name, c.short_code as company_short_code
       FROM documents d JOIN companies c ON d.company_id = c.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT file_path, file_name FROM documents WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    const url = await getSignedDownloadUrl(rows[0].file_path);
    res.json({ url, fileName: rows[0].file_name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents/upload - Upload a document
router.post('/upload', authenticate, authorize('owner', 'admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { company_id, currency_account_id, document_type } = req.body;
  if (!company_id || !document_type) {
    return res.status(400).json({ error: 'company_id and document_type required' });
  }

  // Enforce role-based upload restrictions
  const ownerOnlyTypes = ['bank_statement', 'settlement_statement', 'exchange_receipt'];
  if (ownerOnlyTypes.includes(document_type) && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can upload this document type' });
  }

  try {
    // Get company short code
    const { rows: companies } = await pool.query('SELECT short_code FROM companies WHERE id = $1', [company_id]);
    if (companies.length === 0) return res.status(400).json({ error: 'Invalid company' });

    const s3Key = buildS3Key(companies[0].short_code, document_type, req.file.originalname);

    // Upload to S3
    await uploadFile(req.file.buffer, s3Key, req.file.mimetype);

    // Insert document record
    const { rows: docs } = await pool.query(
      `INSERT INTO documents (company_id, currency_account_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, currency_account_id || null, document_type, req.file.originalname, s3Key, req.file.size, req.file.mimetype, req.user.id]
    );

    const doc = docs[0];

    // Log the upload
    await logAction({
      userId: req.user.id,
      userName: req.user.displayName,
      actionType: 'UPLOAD',
      recordType: 'document',
      recordId: doc.id,
      recordDescription: `${document_type} - ${req.file.originalname}`,
      afterValue: { document_type, file_name: req.file.originalname, company_id },
      ipAddress: req.ip,
    });

    // Process with AI (async - don't block the response)
    processDocumentAsync(doc.id, req.file.buffer, req.file.mimetype, document_type, company_id);

    res.status(201).json({ document: doc });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Background AI processing
async function processDocumentAsync(docId, fileBuffer, mimeType, documentType, selectedCompanyId) {
  try {
    const base64 = fileBuffer.toString('base64');

    if (documentType === 'bank_statement') {
      const result = await processBankStatement(base64, mimeType);

      // Get currency account
      const { rows: company } = await pool.query('SELECT id, name FROM companies WHERE id = $1', [selectedCompanyId]);
      const companyName = company[0]?.name;

      // Insert bank statement entries
      if (result.entries && result.entries.length > 0) {
        const { rows: currAcct } = await pool.query(
          'SELECT id FROM currency_accounts WHERE company_id = $1 AND currency = $2',
          [selectedCompanyId, result.currency || 'RM']
        );
        const currencyAccountId = currAcct[0]?.id;

        for (const entry of result.entries) {
          await pool.query(
            `INSERT INTO bank_statement_entries (document_id, company_id, currency_account_id, entry_date, description, entry_type, amount, balance, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [docId, selectedCompanyId, currencyAccountId, entry.date, entry.description, entry.type, entry.amount, entry.balance, result.currency || 'RM']
          );
        }
      }

      await pool.query(
        `UPDATE documents SET status = 'processed', extracted_data = $1, ai_detected_company = $2, processed_at = NOW() WHERE id = $3`,
        [JSON.stringify(result), result.company, docId]
      );
    } else {
      const result = await extractDocumentData(base64, mimeType, documentType);

      // Check company mismatch
      const { rows: selectedCompany } = await pool.query('SELECT name FROM companies WHERE id = $1', [selectedCompanyId]);
      const mismatch = result.detected_company !== 'unknown' &&
        result.detected_company !== selectedCompany[0]?.name;

      await pool.query(
        `UPDATE documents SET
          status = $1, extracted_data = $2, ai_detected_company = $3,
          company_mismatch = $4,
          document_number = $5, supplier_name = $6, amount = $7,
          currency = $8, document_date = $9, processed_at = NOW()
        WHERE id = $10`,
        [
          mismatch ? 'flagged' : 'processed',
          JSON.stringify(result.extracted_data),
          result.detected_company,
          mismatch,
          result.extracted_data?.invoice_number || result.extracted_data?.po_number || result.extracted_data?.do_number,
          result.extracted_data?.supplier_name,
          result.extracted_data?.total_amount || result.extracted_data?.amount,
          result.extracted_data?.currency,
          result.extracted_data?.date,
          docId,
        ]
      );

      // Create company mismatch alert if needed
      if (mismatch) {
        // Alert Win (owner)
        const { rows: owners } = await pool.query("SELECT id FROM users WHERE role = 'owner'");
        for (const owner of owners) {
          await pool.query(
            `INSERT INTO alerts (user_id, alert_type, title, message, reference_id, reference_type)
             VALUES ($1, 'company_mismatch', $2, $3, $4, 'document')`,
            [owner.id, 'Company mismatch detected',
             `Document detected as "${result.detected_company}" but was uploaded under "${selectedCompany[0]?.name}"`,
             docId]
          );
        }
      }
    }
  } catch (err) {
    console.error('AI processing error:', err);
    await pool.query("UPDATE documents SET status = 'error' WHERE id = $1", [docId]);
  }
}

// PUT /api/documents/:id - Update document (requires password re-entry)
router.put('/:id', authenticate, authorize('owner', 'admin'), requirePasswordReentry, async (req, res) => {
  const { supplier_name, amount, currency, document_date, document_number, payment_terms, due_date } = req.body;

  try {
    // Get before value
    const { rows: before } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (before.length === 0) return res.status(404).json({ error: 'Document not found' });

    const { rows } = await pool.query(
      `UPDATE documents SET
        supplier_name = COALESCE($1, supplier_name),
        amount = COALESCE($2, amount),
        currency = COALESCE($3, currency),
        document_date = COALESCE($4, document_date),
        document_number = COALESCE($5, document_number),
        payment_terms = COALESCE($6, payment_terms),
        due_date = COALESCE($7, due_date),
        updated_at = NOW()
      WHERE id = $8 RETURNING *`,
      [supplier_name, amount, currency, document_date, document_number, payment_terms, due_date, req.params.id]
    );

    await logAction({
      userId: req.user.id,
      userName: req.user.displayName,
      actionType: 'MODIFY',
      recordType: 'document',
      recordId: req.params.id,
      recordDescription: `${before[0].document_type} - ${before[0].file_name}`,
      beforeValue: { supplier_name: before[0].supplier_name, amount: before[0].amount, currency: before[0].currency },
      afterValue: { supplier_name, amount, currency },
      ipAddress: req.ip,
    });

    res.json({ document: rows[0] });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
