import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import CompanySelector from '../../components/common/CompanySelector';

const AGING_COLUMNS = [
  { amountKey: 'current_amount', countKey: 'current_count', label: 'Current', color: '#333' },
  { amountKey: 'due_30_amount', countKey: 'due_30_count', label: '1-30 Days', color: '#856404' },
  { amountKey: 'due_60_amount', countKey: 'due_60_count', label: '31-60 Days', color: '#e67e22' },
  { amountKey: 'due_90_amount', countKey: 'due_90_count', label: '61-90 Days', color: '#dc3545' },
  { amountKey: 'due_over_90_amount', countKey: 'due_over_90_count', label: '90+ Days', color: '#a71d2a' },
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
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'right',
    padding: '12px 8px',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#555',
    fontSize: '13px',
  },
  thLeft: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#555',
    fontSize: '13px',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    textAlign: 'right',
  },
  tdLeft: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    textAlign: 'left',
  },
};

export default function AgingReportPage() {
  const [report, setReport] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getAgingReport(companyId);
      setReport(res.aging || []);
    } catch (err) {
      console.error('Failed to fetch aging report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [companyId]);

  const formatCell = (amount, count) => {
    const amt = parseFloat(amount || 0);
    if (amt === 0 && (count == null || count === 0)) return '—';
    const formatted = amt.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return count ? `${formatted} (${count})` : formatted;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Aging Report</h1>

      <div style={styles.card}>
        <div style={styles.filters}>
          <CompanySelector value={companyId} onChange={setCompanyId} />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thLeft}>Company</th>
                  <th style={styles.thLeft}>Currency</th>
                  {AGING_COLUMNS.map((col) => (
                    <th key={col.key} style={styles.th}>{col.label}</th>
                  ))}
                  <th style={{ ...styles.th, fontWeight: '700' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td style={styles.tdLeft}>{row.company_name}</td>
                    <td style={styles.tdLeft}>{row.currency}</td>
                    {AGING_COLUMNS.map((col) => (
                      <td key={col.amountKey} style={{ ...styles.td, color: col.color }}>
                        {formatCell(row[col.amountKey], row[col.countKey])}
                      </td>
                    ))}
                    <td style={{ ...styles.td, fontWeight: '700' }}>
                      {formatCell(
                        AGING_COLUMNS.reduce((sum, col) => sum + parseFloat(row[col.amountKey] || 0), 0),
                        AGING_COLUMNS.reduce((sum, col) => sum + (row[col.countKey] || 0), 0)
                      )}
                    </td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td style={{ ...styles.tdLeft, textAlign: 'center', color: '#888' }} colSpan={8}>
                      No aging report data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
