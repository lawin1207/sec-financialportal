import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CompanySelector from '../../components/common/CompanySelector';

const DashboardPage = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [summary, setSummary] = useState({
    documentCounts: [],
    pendingMatches: 0,
    overdueInvoices: 0,
    recentAlerts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await api.getDashboardSummary(companyId);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [companyId]);

  const totalInvoices = summary.documentCounts
    .filter((d) => d.document_type === 'invoice')
    .reduce((sum, d) => sum + parseInt(d.count), 0);

  const totalPurchaseOrders = summary.documentCounts
    .filter((d) => d.document_type === 'purchase_order')
    .reduce((sum, d) => sum + parseInt(d.count), 0);

  const summaryCards = [
    {
      label: 'Pending Matches',
      value: summary.pendingMatches,
      borderColor: '#3b82f6',
    },
    {
      label: 'Overdue Invoices',
      value: summary.overdueInvoices,
      borderColor: '#ef4444',
    },
    {
      label: 'Total Invoices',
      value: totalInvoices,
      borderColor: '#22c55e',
    },
    {
      label: 'Purchase Orders',
      value: totalPurchaseOrders,
      borderColor: '#f97316',
    },
  ];

  const documentTypes = [...new Set(summary.documentCounts.map((d) => d.document_type))];

  const getCountByTypeAndStatus = (type, status) => {
    const entry = summary.documentCounts.find(
      (d) => d.document_type === type && d.status === status
    );
    return entry ? parseInt(entry.count) : 0;
  };

  const getTotalByType = (type) => {
    return summary.documentCounts
      .filter((d) => d.document_type === type)
      .reduce((sum, d) => sum + parseInt(d.count), 0);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <CompanySelector value={companyId} onChange={setCompanyId} />
      </div>

      {loading ? (
        <p style={styles.loadingText}>Loading dashboard...</p>
      ) : (
        <>
          <div style={styles.cardsRow}>
            {summaryCards.map((card) => (
              <div
                key={card.label}
                style={{
                  ...styles.card,
                  borderLeft: `4px solid ${card.borderColor}`,
                }}
              >
                <div style={styles.cardLabel}>{card.label}</div>
                <div style={styles.cardValue}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Document Overview</h2>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Matched</th>
                    <th style={styles.th}>Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.map((type) => (
                    <tr key={type}>
                      <td style={styles.td}>{type.replace(/_/g, ' ')}</td>
                      <td style={styles.td}>{getTotalByType(type)}</td>
                      <td style={styles.td}>{getCountByTypeAndStatus(type, 'matched')}</td>
                      <td style={styles.td}>{getCountByTypeAndStatus(type, 'flagged')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Alerts</h2>
            {summary.recentAlerts.length === 0 ? (
              <p style={styles.noAlerts}>No recent alerts.</p>
            ) : (
              <ul style={styles.alertList}>
                {summary.recentAlerts.map((alert, index) => (
                  <li key={index} style={styles.alertItem}>
                    <span style={styles.alertMessage}>{alert.message}</span>
                    <span style={styles.alertDate}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    color: '#1a1f36',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
  },
  loadingText: {
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: '40px',
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    color: '#1a1f36',
  },
  cardLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
    color: '#1a1f36',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '16px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    textTransform: 'capitalize',
  },
  alertList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  alertMessage: {
    fontSize: '14px',
  },
  alertDate: {
    fontSize: '12px',
    color: '#6b7280',
  },
  noAlerts: {
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default DashboardPage;
