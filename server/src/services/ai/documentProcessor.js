const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../../config/database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMPANIES = ['Sian Soon Enterprise Company', 'Sian Soon Manufacturing Sdn Bhd'];

// Extract data from a document using Haiku
async function extractDocumentData(base64Content, mimeType, documentType) {
  const typePrompts = {
    purchase_order: 'Extract: supplier name, PO number, date, items (description, quantity, unit price), total amount, currency, and which company this PO is addressed to.',
    delivery_order: 'Extract: supplier name, DO number, date, items delivered (description, quantity), PO reference if present, and which company this DO is addressed to.',
    invoice: 'Extract: supplier name, invoice number, date, items (description, quantity, unit price), subtotal, tax, total amount, currency, payment terms, and which company this invoice is addressed to.',
    bank_statement: 'Extract all transactions as a table with columns: Date, Description, Debit, Credit, Balance. Also identify the account holder company name and currency.',
    settlement_statement: 'Extract: auction house name, settlement date, currency, total amount, list of items sold with individual amounts, and the beneficiary company name.',
    exchange_receipt: 'Extract: original currency, original amount, converted currency (should be RM), converted amount, exchange rate, date of exchange, and the account holder company name.',
  };

  const prompt = typePrompts[documentType] || 'Extract all relevant financial data from this document.';

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Content },
        },
        {
          type: 'text',
          text: `You are a financial document processor. ${prompt}

Also determine which of these two companies this document belongs to:
1. Sian Soon Enterprise Company (short code: SSE)
2. Sian Soon Manufacturing Sdn Bhd (short code: SSM)

Return your response as JSON with the following structure:
{
  "detected_company": "Sian Soon Enterprise Company" or "Sian Soon Manufacturing Sdn Bhd" or "unknown",
  "confidence": 0.0 to 1.0,
  "extracted_data": { ... all extracted fields ... }
}`,
        },
      ],
    }],
  });

  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return { detected_company: 'unknown', confidence: 0, extracted_data: {} };
}

// Process bank statement into structured entries
async function processBankStatement(base64Content, mimeType) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Content },
        },
        {
          type: 'text',
          text: `Extract all transactions from this bank statement. Return JSON:
{
  "company": "detected company name",
  "currency": "currency code",
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "type": "debit" or "credit",
      "amount": number,
      "balance": number or null
    }
  ]
}`,
        },
      ],
    }],
  });

  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse bank statement AI response:', e);
  }
  return { company: 'unknown', currency: 'RM', entries: [] };
}

// Auto-match invoices using Haiku
async function autoMatchDocuments(companyId) {
  // Get unmatched invoices
  const { rows: invoices } = await pool.query(
    `SELECT id, document_number, supplier_name, amount, currency, document_date
     FROM documents
     WHERE company_id = $1 AND document_type = 'invoice' AND status = 'processed'`,
    [companyId]
  );

  const matches = [];
  for (const invoice of invoices) {
    // Find matching PO
    const { rows: pos } = await pool.query(
      `SELECT id, document_number, amount FROM documents
       WHERE company_id = $1 AND document_type = 'purchase_order'
       AND (supplier_name ILIKE $2 OR document_number = $3)
       AND status IN ('processed', 'matched')`,
      [companyId, `%${invoice.supplier_name}%`, invoice.document_number]
    );

    // Find matching DO
    const { rows: dos } = await pool.query(
      `SELECT id, document_number FROM documents
       WHERE company_id = $1 AND document_type = 'delivery_order'
       AND supplier_name ILIKE $2
       AND status IN ('processed', 'matched')`,
      [companyId, `%${invoice.supplier_name}%`]
    );

    if (pos.length > 0 || dos.length > 0) {
      const po = pos[0] || null;
      const dOrder = dos[0] || null;
      const hasMismatch = po && po.amount && invoice.amount &&
        Math.abs(parseFloat(po.amount) - parseFloat(invoice.amount)) > 0.01;

      matches.push({
        invoice_id: invoice.id,
        purchase_order_id: po?.id || null,
        delivery_order_id: dOrder?.id || null,
        has_mismatch: hasMismatch,
        mismatch_type: hasMismatch ? 'amount_difference' : null,
        confidence: po && dOrder ? 95 : po || dOrder ? 70 : 50,
      });
    }
  }

  return matches;
}

// Sonnet investigation for mismatches
async function investigateMismatch(matchId) {
  const { rows } = await pool.query(
    `SELECT dm.*,
       po.extracted_data as po_data, po.document_number as po_number, po.amount as po_amount,
       d_do.extracted_data as do_data, d_do.document_number as do_number,
       inv.extracted_data as inv_data, inv.document_number as inv_number, inv.amount as inv_amount
     FROM document_matches dm
     LEFT JOIN documents po ON dm.purchase_order_id = po.id
     LEFT JOIN documents d_do ON dm.delivery_order_id = d_do.id
     LEFT JOIN documents inv ON dm.invoice_id = inv.id
     WHERE dm.id = $1`,
    [matchId]
  );

  if (rows.length === 0) return null;
  const match = rows[0];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a financial document analyst investigating a document mismatch.

Purchase Order: ${JSON.stringify(match.po_data)}
PO Number: ${match.po_number}, Amount: ${match.po_amount}

Delivery Order: ${JSON.stringify(match.do_data)}
DO Number: ${match.do_number}

Invoice: ${JSON.stringify(match.inv_data)}
Invoice Number: ${match.inv_number}, Amount: ${match.inv_amount}

Mismatch type: ${match.mismatch_type}
Mismatch details: ${JSON.stringify(match.mismatch_details)}

Investigate this mismatch. Consider common scenarios:
- 2 invoices combined into 1 payment
- Partial payment
- Invoice number typos
- Missing PO or DO
- Amount differences between PO and invoice

Provide your analysis as JSON:
{
  "suggestion": "your suggested resolution",
  "confidence": 0-100,
  "reasoning": "detailed explanation",
  "likely_cause": "one of the common scenarios above or other"
}`,
    }],
  });

  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse Sonnet response:', e);
  }
  return { suggestion: 'Unable to determine', confidence: 0, reasoning: 'AI processing failed' };
}

module.exports = {
  extractDocumentData,
  processBankStatement,
  autoMatchDocuments,
  investigateMismatch,
};
