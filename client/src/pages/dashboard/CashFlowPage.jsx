import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CompanySelector from '../../components/common/CompanySelector';

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
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center',
  },
  monthCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '16px',
  },
  monthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  monthName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1f36',
  },
  totalOutgoing: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#dc3545',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#555',
    fontSize: '13px',
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #eee',
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

export default function CashFlowPage() {
  const { user } = useAuth();
  const [cashFlow, setCashFlow] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = user?.role === 'owner';

  const fetchCashFlow = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const res = await api.getCashFlow(companyId);
      setCashFlow(res.cashFlow || []);
    } catch (err) {
      console.error('Failed to fetch cash flow', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [companyId]);

  const formatAmount = (amount) => {
    if (amount == null) return '—';
    return parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!isOwner) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Cash Flow Forecast</h1>
        <div style={styles.accessDenied}>Access restricted to owners only.</div>
      </div>
    );
  }

  // Group data by month
  const groupedByMonth = {};
  cashFlow.forEach((item) => {
    const month = item.month || 'Unknown';
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = { items: [], totalOutgoing: 0 };
    }
    groupedByMonth[month].items.push(item);
    groupedByMonth[month].totalOutgoing += parseFloat(item.total_outgoing || 0);
  });

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Cash Flow Forecast</h1>

      <div style={styles.filters}>
        <CompanySelector value={companyId} onChange={setCompanyId} />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>Loading...</p>
      ) : Object.keys(groupedByMonth).length === 0 ? (
        <div style={styles.monthCard}>
          <p style={{ textAlign: 'center', color: '#888' }}>No cash flow data found.</p>
        </div>
      ) : (
        Object.entries(groupedByMonth).map(([month, data]) => (
          <div key={month} style={styles.monthCard}>
            <div style={styles.monthHeader}>
              <span style={styles.monthName}>{month}</span>
              <span style={styles.totalOutgoing}>
                Total Outgoing: {formatAmount(data.totalOutgoing)}
              </span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Currency</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>{item.company_name}</td>
                    <td style={styles.td}>{item.currency}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#dc3545', fontWeight: '600' }}>
                      {formatAmount(item.total_outgoing)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
