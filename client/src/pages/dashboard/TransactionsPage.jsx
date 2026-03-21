import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import CompanySelector from '../../components/common/CompanySelector';

const CURRENCY_OPTIONS = ['', 'RM', 'CAD', 'USD', 'AUD', 'EUR'];
const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
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
    minWidth: '140px',
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [currency, setCurrency] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (companyId) params.company_id = companyId;
      if (currency) params.currency = currency;
      if (type) params.type = type;
      const res = await api.getTransactions(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [companyId, currency, type]);

  const formatAmount = (amount) => {
    if (amount == null) return '—';
    return parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Transactions</h1>

      <div style={styles.card}>
        <div style={styles.filters}>
          <CompanySelector value={companyId} onChange={setCompanyId} />
          <select
            style={styles.select}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="">All Currencies</option>
            {CURRENCY_OPTIONS.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            style={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Currency</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Debit</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Credit</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Balance</th>
                  <th style={styles.th}>Matched</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, idx) => (
                  <tr key={txn.id || idx}>
                    <td style={styles.td}>{txn.entry_date || txn.date}</td>
                    <td style={styles.td}>{txn.company_name}</td>
                    <td style={styles.td}>{txn.description}</td>
                    <td style={styles.td}>{txn.currency}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#dc3545', fontWeight: txn.entry_type === 'debit' ? '600' : '400' }}>
                      {txn.entry_type === 'debit' ? formatAmount(txn.amount) : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#28a745', fontWeight: txn.entry_type === 'credit' ? '600' : '400' }}>
                      {txn.entry_type === 'credit' ? formatAmount(txn.amount) : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>
                      {formatAmount(txn.balance)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: txn.matched ? '#28a745' : '#dc3545', fontWeight: '600' }}>
                        {txn.matched ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#888' }} colSpan={8}>
                      No transactions found.
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
