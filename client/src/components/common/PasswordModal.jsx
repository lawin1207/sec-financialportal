import { useState } from 'react';

export default function PasswordModal({ isOpen, onConfirm, onCancel, title = 'Confirm Action' }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password required'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
      setPassword('');
    } catch (err) {
      setError(err.message || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 400, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>{title}</h3>
        <p style={{ color: '#666', fontSize: 14, margin: '0 0 16px' }}>
          Re-enter your password to confirm this action.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4,
              fontSize: 14, marginBottom: 8, boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#e74c3c', fontSize: 13, margin: '0 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => { onCancel(); setPassword(''); setError(''); }}
              style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 16px', border: 'none', borderRadius: 4, background: '#5e72e4', color: '#fff', cursor: 'pointer' }}>
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
