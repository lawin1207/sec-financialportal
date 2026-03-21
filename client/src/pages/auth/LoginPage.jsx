import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import secLogo from '../../assets/sec-logo.jpg';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1f36 0%, #2d3352 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 40, width: 400, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={secLogo} alt="SEC Logo" style={{ width: 120, height: 'auto', marginBottom: 12 }} />
          <h1 style={{ fontSize: 24, color: '#1a1f36', margin: '0 0 8px' }}>Financial Portal</h1>
          <p style={{ color: '#8892b0', fontSize: 14, margin: 0 }}>Sian Soon Enterprise & Manufacturing</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username" autoFocus
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 16 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', background: '#5e72e4', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
