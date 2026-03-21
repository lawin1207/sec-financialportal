const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  get(endpoint) { return this.request(endpoint); }

  post(endpoint, body) {
    if (body instanceof FormData) {
      return this.request(endpoint, { method: 'POST', body });
    }
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  login(username, password) { return this.post('/auth/login', { username, password }); }
  getMe() { return this.get('/auth/me'); }
  verifyPassword(password) { return this.post('/auth/verify-password', { password }); }

  getCompanies() { return this.get('/companies'); }
  getCurrencyAccounts(companyId) { return this.get(`/companies/${companyId}/currency-accounts`); }

  getDocuments(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/documents?${qs}`);
  }
  getDocument(id) { return this.get(`/documents/${id}`); }
  getDocumentDownloadUrl(id) { return this.get(`/documents/${id}/download`); }
  uploadDocument(formData) { return this.post('/documents/upload', formData); }
  updateDocument(id, data) { return this.put(`/documents/${id}`, data); }

  getMatches(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/matches?${qs}`);
  }
  triggerAutoMatch(companyId) { return this.post('/matches/auto-match', { company_id: companyId }); }
  investigateMatch(id) { return this.post(`/matches/${id}/investigate`); }
  resolveMatch(id, data) { return this.put(`/matches/${id}/resolve`, data); }
  manualLink(data) { return this.post('/matches/manual-link', data); }

  getPaymentSchedule(companyId) { return this.get(`/reports/payment-schedule${companyId ? `?company_id=${companyId}` : ''}`); }
  getAgingReport(companyId) { return this.get(`/reports/aging${companyId ? `?company_id=${companyId}` : ''}`); }
  getCashFlow(companyId) { return this.get(`/reports/cash-flow${companyId ? `?company_id=${companyId}` : ''}`); }
  getTransactions(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/reports/transactions?${qs}`);
  }
  getDashboardSummary(companyId) { return this.get(`/reports/dashboard-summary${companyId ? `?company_id=${companyId}` : ''}`); }

  getAuditLog(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/audit?${qs}`);
  }

  getAlerts() { return this.get('/alerts'); }
  getUnreadCount() { return this.get('/alerts/unread-count'); }
  markAlertRead(id) { return this.put(`/alerts/${id}/read`); }
  markAllAlertsRead() { return this.put('/alerts/mark-all-read'); }
}

export const api = new ApiService();
