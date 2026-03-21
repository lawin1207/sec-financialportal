const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const { companies, currencyAccounts, users, documents, bankEntries, matches, alerts, auditLog } = require('./mock-data');

const app = express();
const JWT_SECRET = 'dev-secret-change-in-production-abc123xyz';
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// --- Auth middleware ---
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.is_active);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, displayName: user.display_name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
});

app.post('/api/auth/verify-password', authenticate, async (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  const valid = await bcrypt.compare(req.body.password, user.password_hash);
  res.json({ valid });
});

// --- Companies ---
app.get('/api/companies', authenticate, (req, res) => {
  res.json({ companies });
});

app.get('/api/companies/:id/currency-accounts', authenticate, (req, res) => {
  res.json({ accounts: currencyAccounts.filter(ca => ca.company_id === req.params.id) });
});

// --- Documents ---
app.get('/api/documents', authenticate, (req, res) => {
  let docs = [...documents];
  if (req.query.company_id) docs = docs.filter(d => d.company_id === req.query.company_id);
  if (req.query.document_type) docs = docs.filter(d => d.document_type === req.query.document_type);
  if (req.query.status) docs = docs.filter(d => d.status === req.query.status);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const start = (page - 1) * limit;
  res.json({ documents: docs.slice(start, start + limit), total: docs.length, page, limit });
});

app.get('/api/documents/:id', authenticate, (req, res) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ document: doc });
});

app.get('/api/documents/:id/download', authenticate, (req, res) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ url: '#', fileName: doc.file_name });
});

app.post('/api/documents/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const company = companies.find(c => c.id === req.body.company_id);
  const newDoc = {
    id: require('crypto').randomUUID(),
    company_id: req.body.company_id,
    currency_account_id: req.body.currency_account_id || null,
    document_type: req.body.document_type,
    status: 'pending',
    file_name: req.file.originalname,
    file_path: `${company?.short_code || 'UNK'}/${req.body.document_type}/${req.file.originalname}`,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
    uploaded_by: req.user.id,
    created_at: new Date(),
    company_name: company?.name,
    company_short_code: company?.short_code,
    uploaded_by_name: req.user.displayName,
  };
  documents.push(newDoc);

  // Simulate AI processing after 1 second
  setTimeout(() => { newDoc.status = 'processed'; }, 1000);

  auditLog.unshift({
    id: require('crypto').randomUUID(),
    user_id: req.user.id, user_name: req.user.displayName,
    action_type: 'UPLOAD', record_type: 'document',
    record_description: `${req.body.document_type} - ${req.file.originalname}`,
    before_value: null, after_value: { document_type: req.body.document_type, file_name: req.file.originalname },
    ip_address: req.ip, created_at: new Date(),
  });

  res.status(201).json({ document: newDoc });
});

app.put('/api/documents/:id', authenticate, async (req, res) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  // Verify password
  if (req.body.password) {
    const user = users.find(u => u.id === req.user.id);
    const valid = await bcrypt.compare(req.body.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
  }

  const before = { supplier_name: doc.supplier_name, amount: doc.amount };
  if (req.body.supplier_name) doc.supplier_name = req.body.supplier_name;
  if (req.body.amount) doc.amount = req.body.amount;
  if (req.body.currency) doc.currency = req.body.currency;

  auditLog.unshift({
    id: require('crypto').randomUUID(),
    user_id: req.user.id, user_name: req.user.displayName,
    action_type: 'MODIFY', record_type: 'document',
    record_description: `${doc.document_type} - ${doc.file_name}`,
    before_value: before, after_value: { supplier_name: doc.supplier_name, amount: doc.amount },
    ip_address: req.ip, created_at: new Date(),
  });

  res.json({ document: doc });
});

// --- Matches ---
app.get('/api/matches', authenticate, (req, res) => {
  let m = [...matches];
  if (req.query.company_id) m = m.filter(x => x.company_id === req.query.company_id);
  if (req.query.status) m = m.filter(x => x.status === req.query.status);
  res.json({ matches: m });
});

app.post('/api/matches/auto-match', authenticate, (req, res) => {
  res.json({ matched: 0, results: [] });
});

app.post('/api/matches/:id/investigate', authenticate, (req, res) => {
  const match = matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Not found' });
  match.ai_reasoning = 'Based on analysis, this invoice likely corresponds to a verbal order. The supplier name and amount pattern match historical transactions. Recommend manual verification with supplier documentation.';
  match.confidence = 78;
  match.status = 'ai_suggested';
  match.ai_model = 'sonnet';
  res.json({ investigation: { suggestion: 'Manual verification recommended', confidence: 78, reasoning: match.ai_reasoning, likely_cause: 'missing_po' } });
});

app.put('/api/matches/:id/resolve', authenticate, async (req, res) => {
  const match = matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Not found' });
  if (req.body.password) {
    const user = users.find(u => u.id === req.user.id);
    const valid = await bcrypt.compare(req.body.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
  }
  match.status = req.body.action === 'approve' ? 'resolved' : 'rejected';
  match.resolution_note = req.body.resolution_note;
  res.json({ match });
});

app.post('/api/matches/manual-link', authenticate, (req, res) => {
  res.json({ match: { id: require('crypto').randomUUID(), status: 'manual' } });
});

// --- Reports ---
app.get('/api/reports/payment-schedule', authenticate, (req, res) => {
  let invoices = documents.filter(d => d.document_type === 'invoice' && d.due_date);
  if (req.query.company_id) invoices = invoices.filter(d => d.company_id === req.query.company_id);
  const schedule = invoices.map(d => ({
    ...d,
    invoice_number: d.document_number,
    invoice_date: d.document_date,
    days_overdue: d.due_date && new Date(d.due_date) < new Date() && d.status !== 'matched'
      ? Math.floor((new Date() - new Date(d.due_date)) / 86400000) : 0,
  }));
  res.json({ schedule });
});

app.get('/api/reports/aging', authenticate, (req, res) => {
  const now = new Date();
  let invoices = documents.filter(d => d.document_type === 'invoice' && d.due_date && d.status !== 'matched');
  if (req.query.company_id) invoices = invoices.filter(d => d.company_id === req.query.company_id);

  const groups = {};
  for (const inv of invoices) {
    const key = `${inv.company_name}|${inv.currency}`;
    if (!groups[key]) groups[key] = { company_name: inv.company_name, currency: inv.currency, current_amount: 0, current_count: 0, due_30_amount: 0, due_30_count: 0, due_60_amount: 0, due_60_count: 0, due_90_amount: 0, due_90_count: 0, due_over_90_amount: 0, due_over_90_count: 0 };
    const g = groups[key];
    const due = new Date(inv.due_date);
    const days = Math.floor((now - due) / 86400000);
    const amt = parseFloat(inv.amount) || 0;
    if (days <= 0) { g.current_amount += amt; g.current_count++; }
    else if (days <= 30) { g.due_30_amount += amt; g.due_30_count++; }
    else if (days <= 60) { g.due_60_amount += amt; g.due_60_count++; }
    else if (days <= 90) { g.due_90_amount += amt; g.due_90_count++; }
    else { g.due_over_90_amount += amt; g.due_over_90_count++; }
  }
  res.json({ aging: Object.values(groups) });
});

app.get('/api/reports/cash-flow', authenticate, (req, res) => {
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 86400000);
  let invoices = documents.filter(d => d.document_type === 'invoice' && d.due_date && d.status !== 'matched');
  if (req.query.company_id) invoices = invoices.filter(d => d.company_id === req.query.company_id);
  invoices = invoices.filter(d => {
    const due = new Date(d.due_date);
    return due >= now && due <= threeMonths;
  });

  const groups = {};
  for (const inv of invoices) {
    const month = new Date(inv.due_date).toISOString().slice(0, 7) + '-01';
    const key = `${month}|${inv.company_name}|${inv.currency}`;
    if (!groups[key]) groups[key] = { month, company_name: inv.company_name, currency: inv.currency, total_outgoing: 0 };
    groups[key].total_outgoing += parseFloat(inv.amount) || 0;
  }
  res.json({ cashFlow: Object.values(groups).sort((a, b) => a.month.localeCompare(b.month)) });
});

app.get('/api/reports/transactions', authenticate, (req, res) => {
  let txns = [...bankEntries];
  if (req.query.company_id) txns = txns.filter(t => t.company_id === req.query.company_id);
  if (req.query.currency) txns = txns.filter(t => t.currency === req.query.currency);
  if (req.query.type) txns = txns.filter(t => t.entry_type === req.query.type);
  res.json({ transactions: txns });
});

app.get('/api/reports/dashboard-summary', authenticate, (req, res) => {
  let docs = [...documents];
  if (req.query.company_id) docs = docs.filter(d => d.company_id === req.query.company_id);

  const documentCounts = [];
  const types = ['purchase_order', 'delivery_order', 'invoice', 'bank_statement', 'settlement_statement'];
  const statuses = ['pending', 'processed', 'matched', 'flagged'];
  for (const t of types) {
    for (const s of statuses) {
      const count = docs.filter(d => d.document_type === t && d.status === s).length;
      if (count > 0) documentCounts.push({ document_type: t, status: s, count: String(count) });
    }
  }

  const pendingMatches = matches.filter(m => ['needs_review', 'ai_suggested'].includes(m.status)).length;
  const overdueInvoices = docs.filter(d => d.document_type === 'invoice' && d.due_date && new Date(d.due_date) < new Date() && d.status !== 'matched').length;
  const userAlerts = alerts.filter(a => a.user_id === req.user.id && !a.is_read).slice(0, 10);

  res.json({ documentCounts, pendingMatches, overdueInvoices, recentAlerts: userAlerts });
});

// --- Audit Log ---
app.get('/api/audit', authenticate, (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  let logs = [...auditLog];
  if (req.query.action_type) logs = logs.filter(l => l.action_type === req.query.action_type);
  if (req.query.from_date) logs = logs.filter(l => new Date(l.created_at) >= new Date(req.query.from_date));
  if (req.query.to_date) logs = logs.filter(l => new Date(l.created_at) <= new Date(req.query.to_date));
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const start = (page - 1) * limit;
  res.json({ logs: logs.slice(start, start + limit), total: logs.length });
});

// --- Alerts ---
app.get('/api/alerts', authenticate, (req, res) => {
  res.json({ alerts: alerts.filter(a => a.user_id === req.user.id) });
});

app.get('/api/alerts/unread-count', authenticate, (req, res) => {
  res.json({ count: alerts.filter(a => a.user_id === req.user.id && !a.is_read).length });
});

app.put('/api/alerts/:id/read', authenticate, (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) alert.is_read = true;
  res.json({ success: true });
});

app.put('/api/alerts/mark-all-read', authenticate, (req, res) => {
  alerts.filter(a => a.user_id === req.user.id).forEach(a => { a.is_read = true; });
  res.json({ success: true });
});

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', mode: 'mock' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log('Login credentials:');
  console.log('  win / Win@2026!     (Owner)');
  console.log('  sarah / Sarah@2026! (Admin)');
  console.log('  yunxin / YunXin@2026! (Accountant)');
});
