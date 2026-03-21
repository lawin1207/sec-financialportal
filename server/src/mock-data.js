const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }

// Pre-hash passwords synchronously for mock data
const winHash = bcrypt.hashSync('Win@2026!', 12);
const sarahHash = bcrypt.hashSync('Sarah@2026!', 12);
const yunxinHash = bcrypt.hashSync('YunXin@2026!', 12);

const companies = [
  { id: uuid(), name: 'Sian Soon Enterprise Company', short_code: 'SSE', created_at: new Date() },
  { id: uuid(), name: 'Sian Soon Manufacturing Sdn Bhd', short_code: 'SSM', created_at: new Date() },
];

const currencyAccounts = [];
for (const company of companies) {
  for (const currency of ['RM', 'CAD', 'USD', 'AUD', 'EUR']) {
    currencyAccounts.push({ id: uuid(), company_id: company.id, currency, created_at: new Date() });
  }
}

const users = [
  { id: uuid(), username: 'win', display_name: 'Win', password_hash: winHash, role: 'owner', is_active: true },
  { id: uuid(), username: 'sarah', display_name: 'Sarah', password_hash: sarahHash, role: 'admin', is_active: true },
  { id: uuid(), username: 'yunxin', display_name: 'YunXin', password_hash: yunxinHash, role: 'accountant', is_active: true },
];

// Sample documents
const now = new Date();
const sseId = companies[0].id;
const ssmId = companies[1].id;
const sarahId = users[1].id;
const winId = users[0].id;

const documents = [
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'purchase_order', status: 'matched', file_name: 'PO-2026-001.pdf', file_path: 'SSE/purchase-orders/2026-03/PO-2026-001.pdf', file_size: 245000, mime_type: 'application/pdf', document_number: 'PO-2026-001', supplier_name: 'Timber World Sdn Bhd', amount: 12500.00, currency: 'RM', document_date: '2026-02-15', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'delivery_order', status: 'matched', file_name: 'DO-2026-001.pdf', file_path: 'SSE/delivery-orders/2026-03/DO-2026-001.pdf', file_size: 180000, mime_type: 'application/pdf', document_number: 'DO-2026-001', supplier_name: 'Timber World Sdn Bhd', amount: null, currency: 'RM', document_date: '2026-02-18', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'invoice', status: 'matched', file_name: 'INV-2026-045.pdf', file_path: 'SSE/invoices/2026-03/INV-2026-045.pdf', file_size: 310000, mime_type: 'application/pdf', document_number: 'INV-2026-045', supplier_name: 'Timber World Sdn Bhd', amount: 12500.00, currency: 'RM', document_date: '2026-02-20', due_date: '2026-03-22', payment_terms: 'Net 30', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'invoice', status: 'flagged', file_name: 'INV-2026-052.pdf', file_path: 'SSE/invoices/2026-03/INV-2026-052.pdf', file_size: 290000, mime_type: 'application/pdf', document_number: 'INV-2026-052', supplier_name: 'KL Steel Works', amount: 8750.00, currency: 'RM', document_date: '2026-03-01', due_date: '2026-04-01', payment_terms: 'Net 30', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah', company_mismatch: false },
  { id: uuid(), company_id: ssmId, currency_account_id: currencyAccounts[5].id, document_type: 'purchase_order', status: 'processed', file_name: 'PO-SSM-2026-003.pdf', file_path: 'SSM/purchase-orders/2026-03/PO-SSM-2026-003.pdf', file_size: 220000, mime_type: 'application/pdf', document_number: 'PO-SSM-003', supplier_name: 'Pacific Hardware Ltd', amount: 5200.00, currency: 'RM', document_date: '2026-03-05', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Manufacturing Sdn Bhd', company_short_code: 'SSM', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[2].id, document_type: 'invoice', status: 'processed', file_name: 'INV-CAN-2026-012.pdf', file_path: 'SSE/invoices/2026-03/INV-CAN-2026-012.pdf', file_size: 275000, mime_type: 'application/pdf', document_number: 'INV-CAN-012', supplier_name: 'Ontario Supplies Inc', amount: 3400.00, currency: 'CAD', document_date: '2026-03-10', due_date: '2026-04-10', payment_terms: 'Net 30', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'bank_statement', status: 'processed', file_name: 'BankStmt-SSE-RM-Feb2026.pdf', file_path: 'SSE/bank-statements/2026-02/BankStmt-Feb2026.pdf', file_size: 450000, mime_type: 'application/pdf', document_number: null, supplier_name: null, amount: null, currency: 'RM', document_date: '2026-02-28', uploaded_by: winId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Win' },
  { id: uuid(), company_id: ssmId, currency_account_id: currencyAccounts[7].id, document_type: 'settlement_statement', status: 'processed', file_name: 'Settlement-Christies-Mar2026.pdf', file_path: 'SSM/settlements/2026-03/Settlement-Christies.pdf', file_size: 380000, mime_type: 'application/pdf', document_number: 'SETT-2026-008', supplier_name: null, amount: 15800.00, currency: 'USD', document_date: '2026-03-12', uploaded_by: winId, created_at: now, company_name: 'Sian Soon Manufacturing Sdn Bhd', company_short_code: 'SSM', uploaded_by_name: 'Win' },
  { id: uuid(), company_id: sseId, currency_account_id: currencyAccounts[0].id, document_type: 'invoice', status: 'pending', file_name: 'INV-2026-061.pdf', file_path: 'SSE/invoices/2026-03/INV-2026-061.pdf', file_size: 195000, mime_type: 'application/pdf', document_number: 'INV-2026-061', supplier_name: 'MegaChem Industries', amount: 6300.00, currency: 'RM', document_date: '2026-03-15', due_date: '2026-02-10', payment_terms: 'Net 30', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Enterprise Company', company_short_code: 'SSE', uploaded_by_name: 'Sarah' },
  { id: uuid(), company_id: ssmId, currency_account_id: currencyAccounts[5].id, document_type: 'invoice', status: 'processed', file_name: 'INV-SSM-2026-019.pdf', file_path: 'SSM/invoices/2026-03/INV-SSM-2026-019.pdf', file_size: 230000, mime_type: 'application/pdf', document_number: 'INV-SSM-019', supplier_name: 'Ace Machinery Co', amount: 22000.00, currency: 'RM', document_date: '2026-03-08', due_date: '2026-04-08', payment_terms: 'Net 30', uploaded_by: sarahId, created_at: now, company_name: 'Sian Soon Manufacturing Sdn Bhd', company_short_code: 'SSM', uploaded_by_name: 'Sarah' },
];

const bankEntries = [
  { id: uuid(), document_id: documents[6].id, company_id: sseId, currency_account_id: currencyAccounts[0].id, entry_date: '2026-02-03', description: 'Payment to Timber World Sdn Bhd', entry_type: 'debit', amount: 12500.00, balance: 87500.00, currency: 'RM', matched: true, company_name: 'Sian Soon Enterprise Company', statement_file: 'BankStmt-SSE-RM-Feb2026.pdf' },
  { id: uuid(), document_id: documents[6].id, company_id: sseId, currency_account_id: currencyAccounts[0].id, entry_date: '2026-02-10', description: 'Transfer from HSBC CAD account', entry_type: 'credit', amount: 45000.00, balance: 132500.00, currency: 'RM', matched: false, company_name: 'Sian Soon Enterprise Company', statement_file: 'BankStmt-SSE-RM-Feb2026.pdf' },
  { id: uuid(), document_id: documents[6].id, company_id: sseId, currency_account_id: currencyAccounts[0].id, entry_date: '2026-02-15', description: 'Payment to KL Steel Works', entry_type: 'debit', amount: 8750.00, balance: 123750.00, currency: 'RM', matched: false, company_name: 'Sian Soon Enterprise Company', statement_file: 'BankStmt-SSE-RM-Feb2026.pdf' },
  { id: uuid(), document_id: documents[6].id, company_id: sseId, currency_account_id: currencyAccounts[0].id, entry_date: '2026-02-20', description: 'Utility bill - TNB', entry_type: 'debit', amount: 2340.00, balance: 121410.00, currency: 'RM', matched: false, company_name: 'Sian Soon Enterprise Company', statement_file: 'BankStmt-SSE-RM-Feb2026.pdf' },
  { id: uuid(), document_id: documents[6].id, company_id: sseId, currency_account_id: currencyAccounts[0].id, entry_date: '2026-02-25', description: 'Customer payment - ABC Trading', entry_type: 'credit', amount: 18200.00, balance: 139610.00, currency: 'RM', matched: false, company_name: 'Sian Soon Enterprise Company', statement_file: 'BankStmt-SSE-RM-Feb2026.pdf' },
];

const matches = [
  { id: uuid(), company_id: sseId, company_name: 'Sian Soon Enterprise Company', purchase_order_id: documents[0].id, delivery_order_id: documents[1].id, invoice_id: documents[2].id, status: 'auto_matched', confidence: 95, ai_model: 'haiku', has_mismatch: false, po_number: 'PO-2026-001', do_number: 'DO-2026-001', inv_number: 'INV-2026-045', po_supplier: 'Timber World Sdn Bhd', inv_supplier: 'Timber World Sdn Bhd', po_amount: 12500, inv_amount: 12500, created_at: now },
  { id: uuid(), company_id: sseId, company_name: 'Sian Soon Enterprise Company', purchase_order_id: null, delivery_order_id: null, invoice_id: documents[3].id, status: 'needs_review', confidence: 45, ai_model: 'haiku', has_mismatch: true, mismatch_type: 'missing_po', po_number: null, do_number: null, inv_number: 'INV-2026-052', inv_supplier: 'KL Steel Works', inv_amount: 8750, created_at: now },
  { id: uuid(), company_id: sseId, company_name: 'Sian Soon Enterprise Company', purchase_order_id: null, delivery_order_id: null, invoice_id: documents[5].id, status: 'ai_suggested', confidence: 72, ai_model: 'sonnet', has_mismatch: true, mismatch_type: 'amount_difference', ai_reasoning: 'The invoice INV-CAN-012 from Ontario Supplies Inc for CAD 3,400 likely corresponds to a verbal order placed in February. The supplier name matches previous transactions and the amount is within the typical range for this supplier. However, no formal PO was found in the system. Recommend creating a retroactive PO to complete the documentation.', po_number: null, do_number: null, inv_number: 'INV-CAN-012', inv_supplier: 'Ontario Supplies Inc', inv_amount: 3400, created_at: now },
];

const alerts = [
  { id: uuid(), user_id: users[0].id, alert_type: 'mismatch', title: 'Document mismatch detected', message: 'Invoice INV-2026-052 from KL Steel Works has no matching PO or DO', is_read: false, created_at: new Date(Date.now() - 3600000) },
  { id: uuid(), user_id: users[0].id, alert_type: 'payment_due', title: 'Payment due in 14 days', message: 'Invoice INV-2026-045 for RM 12,500 to Timber World Sdn Bhd due on 22 Mar 2026', is_read: false, created_at: new Date(Date.now() - 7200000) },
  { id: uuid(), user_id: users[0].id, alert_type: 'overdue', title: 'Overdue payment', message: 'Invoice INV-2026-061 for RM 6,300 to MegaChem Industries was due on 10 Feb 2026', is_read: false, created_at: new Date(Date.now() - 86400000) },
  { id: uuid(), user_id: users[1].id, alert_type: 'mismatch', title: 'Document mismatch detected', message: 'Invoice INV-2026-052 from KL Steel Works has no matching PO or DO — please review', is_read: false, created_at: new Date(Date.now() - 3600000) },
  { id: uuid(), user_id: users[0].id, alert_type: 'company_mismatch', title: 'AI company mismatch', message: 'Settlement-Christies-Mar2026.pdf was uploaded under SSM but AI detected SSE', is_read: true, created_at: new Date(Date.now() - 172800000) },
];

const auditLog = [
  { id: uuid(), user_id: sarahId, user_name: 'Sarah', action_type: 'UPLOAD', record_type: 'document', record_description: 'purchase_order - PO-2026-001.pdf', before_value: null, after_value: { document_type: 'purchase_order', file_name: 'PO-2026-001.pdf' }, ip_address: '192.168.1.10', created_at: new Date(Date.now() - 604800000) },
  { id: uuid(), user_id: sarahId, user_name: 'Sarah', action_type: 'UPLOAD', record_type: 'document', record_description: 'delivery_order - DO-2026-001.pdf', before_value: null, after_value: { document_type: 'delivery_order', file_name: 'DO-2026-001.pdf' }, ip_address: '192.168.1.10', created_at: new Date(Date.now() - 518400000) },
  { id: uuid(), user_id: sarahId, user_name: 'Sarah', action_type: 'UPLOAD', record_type: 'document', record_description: 'invoice - INV-2026-045.pdf', before_value: null, after_value: { document_type: 'invoice', file_name: 'INV-2026-045.pdf' }, ip_address: '192.168.1.10', created_at: new Date(Date.now() - 432000000) },
  { id: uuid(), user_id: winId, user_name: 'Win', action_type: 'UPLOAD', record_type: 'document', record_description: 'bank_statement - BankStmt-SSE-RM-Feb2026.pdf', before_value: null, after_value: { document_type: 'bank_statement', file_name: 'BankStmt-SSE-RM-Feb2026.pdf' }, ip_address: '192.168.1.5', created_at: new Date(Date.now() - 345600000) },
  { id: uuid(), user_id: sarahId, user_name: 'Sarah', action_type: 'MODIFY', record_type: 'document', record_description: 'invoice - INV-2026-052.pdf', before_value: { supplier_name: 'KL Steel Work' }, after_value: { supplier_name: 'KL Steel Works' }, ip_address: '192.168.1.10', created_at: new Date(Date.now() - 259200000) },
  { id: uuid(), user_id: winId, user_name: 'Win', action_type: 'APPROVE_MATCH', record_type: 'match', record_description: 'Match approved - PO-2026-001 + INV-2026-045', before_value: { status: 'auto_matched' }, after_value: { status: 'resolved' }, ip_address: '192.168.1.5', created_at: new Date(Date.now() - 172800000) },
];

module.exports = { companies, currencyAccounts, users, documents, bankEntries, matches, alerts, auditLog };
