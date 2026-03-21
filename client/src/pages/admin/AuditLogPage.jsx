import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'upload', label: 'Upload' },
  { value: 'match', label: 'Match' },
];

const styles = {
  container: {
    color: '#333',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    minWidth: '160px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  label: {
    fontSize: '13px',
    color: '#555',
    marginRight: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#555',
    fontSize: '12px',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    verticalAlign: 'top',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: '#4c6ef5',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  jsonCell: {
    fontFamily: 'monospace',
    fontSize: '11px',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#555',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#555',
  },
  accessDenied: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '40px',
    textAlign: 'center',
    color: '#dc3545',
    fontSize: '16px',
    fontWeight: '600',
  },
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [actionType, setActionType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const isOwner = user?.role === 'owner';

  const fetchLogs = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const params = { page };
      if (actionType) params.action_type = actionType;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await api.getAuditLog(params);
      setLogs(res.logs || []);
      setTotalPages(Math.ceil((res.total || 0) / 50) || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionType, fromDate, toDate, page]);

  const formatJson = (value) => {
    if (!value) return '—';
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  if (!isOwner) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Audit Log</h1>
        <div style={styles.accessDenied}>Access restricted to owners only.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Audit Log</h1>

      <div style={styles.card}>
        <div style={styles.filters}>
          <select
            style={styles.select}
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
          >
            {ACTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div>
            <label style={styles.label}>From:</label>
            <input
              type="date"
              style={styles.input}
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label style={styles.label}>To:</label>
            <input
              type="date"
              style={styles.input}
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading...</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date/Time</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Record</th>
                    <th style={styles.th}>Before</th>
                    <th style={styles.th}>After</th>
                    <th style={styles.th}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td style={styles.td}>{log.timestamp || log.created_at}</td>
                      <td style={styles.td}>{log.user_name || log.user}</td>
                      <td style={styles.td}>
                        <span style={styles.badge}>{log.action_type || log.action}</span>
                      </td>
                      <td style={styles.td}>
                        {log.record_type && <span style={{ fontWeight: '600' }}>{log.record_type}</span>}
                        {log.record_description && <span> — {log.record_description}</span>}
                      </td>
                      <td style={{ ...styles.td, ...styles.jsonCell }} title={formatJson(log.before_value)}>
                        {formatJson(log.before_value)}
                      </td>
                      <td style={{ ...styles.td, ...styles.jsonCell }} title={formatJson(log.after_value)}>
                        {formatJson(log.after_value)}
                      </td>
                      <td style={styles.td}>{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#888' }} colSpan={7}>
                        No audit log entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageBtn,
                  ...(page <= 1 ? styles.pageBtnDisabled : {}),
                }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                style={{
                  ...styles.pageBtn,
                  ...(page >= totalPages ? styles.pageBtnDisabled : {}),
                }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
