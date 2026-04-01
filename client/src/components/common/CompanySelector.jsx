import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function CompanySelector({ value, onChange, showCurrency = false, currencyValue, currencyAccountId, onCurrencyChange }) {
  const selectedCurrency = currencyValue || currencyAccountId || '';
  const [companies, setCompanies] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    api.getCompanies().then(d => setCompanies(d.companies)).catch(() => {});
  }, []);

  useEffect(() => {
    if (value) {
      api.getCurrencyAccounts(value).then(d => setCurrencies(d.accounts)).catch(() => {});
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' }}>Company</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}>
          <option value="">Select company...</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {showCurrency && value && (
        <div style={{ width: 120 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' }}>Currency</label>
          <select value={selectedCurrency} onChange={(e) => onCurrencyChange(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}>
            <option value="">Select...</option>
            {currencies.map(ca => (
              <option key={ca.id} value={ca.id}>{ca.currency}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
