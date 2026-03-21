import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
  },
};

export default function PaymentSchedulePage() {
  const [payments, setPayments] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.getPaymentSchedule(companyId);
      setPayments(res.schedule || []);
    } catch (err) {
      console.error('Failed to fetch payment schedule', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [companyId]);

  const formatAmount = (amount) => {
    if (amount == null) return '—';
    return parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isOverdue = (daysOverdue) => daysOverdue != null && daysOverdue > 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Payment Schedule</h1>

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
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Invoice#</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                  <th style={styles.th}>Currency</th>
                  <th style={styles.th}>Invoice Date</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => (
                  <tr
                    key={payment.id || idx}
                    style={{
                      backgroundColor: isOverdue(payment.days_overdue) ? '#fff5f5' : 'transparent',
                    }}
                  >
                    <td style={styles.td}>{payment.supplier_name || payment.supplier}</td>
                    <td style={styles.td}>{payment.invoice_number}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{formatAmount(payment.amount)}</td>
                    <td style={styles.td}>{payment.currency}</td>
                    <td style={styles.td}>{payment.invoice_date}</td>
                    <td style={styles.td}>{payment.due_date}</td>
                    <td style={styles.td}>{payment.status}</td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: 'right',
                        color: isOverdue(payment.days_overdue) ? '#dc3545' : '#333',
                        fontWeight: isOverdue(payment.days_overdue) ? '700' : '400',
                      }}
                    >
                      {payment.days_overdue != null ? payment.days_overdue : '—'}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#888' }} colSpan={8}>
                      No payment schedule data found.
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
