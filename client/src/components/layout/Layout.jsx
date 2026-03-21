import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import secLogo from '../../assets/sec-logo.jpg';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ['owner', 'admin', 'accountant'] },
  { to: '/documents', label: 'Documents', roles: ['owner', 'admin', 'accountant'] },
  { to: '/upload', label: 'Upload', roles: ['owner', 'admin'] },
  { to: '/matches', label: 'Matching', roles: ['owner', 'admin'] },
  { to: '/transactions', label: 'Transactions', roles: ['owner', 'admin', 'accountant'] },
  { to: '/payment-schedule', label: 'Payment Schedule', roles: ['owner', 'admin', 'accountant'] },
  { to: '/aging-report', label: 'Aging Report', roles: ['owner', 'admin', 'accountant'] },
  { to: '/cash-flow', label: 'Cash Flow', roles: ['owner'] },
  { to: '/audit-log', label: 'Audit Log', roles: ['owner'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    api.getUnreadCount().then(d => setUnreadAlerts(d.count)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then(d => setUnreadAlerts(d.count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <aside style={{
        width: sidebarOpen ? 240 : 60, background: '#1a1f36', color: '#fff',
        transition: 'width 0.2s', display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #2d3352', textAlign: sidebarOpen ? 'center' : 'center' }}>
          <img src={secLogo} alt="SEC Logo" style={{ width: sidebarOpen ? 60 : 36, height: 'auto', marginBottom: sidebarOpen ? 8 : 0, background: '#fff', borderRadius: 6, padding: 4 }} />
          {sidebarOpen && (
            <h2 style={{ fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', margin: 0 }}>
              Financial Portal
            </h2>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#8892b0', cursor: 'pointer', fontSize: 18, padding: '4px 0' }}>
            {sidebarOpen ? '\u2190' : '\u2192'}
          </button>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {filteredNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 16px',
                color: isActive ? '#fff' : '#8892b0',
                background: isActive ? '#2d3352' : 'transparent',
                textDecoration: 'none', fontSize: 14,
                borderLeft: isActive ? '3px solid #5e72e4' : '3px solid transparent',
                overflow: 'hidden', whiteSpace: 'nowrap',
              })}>
              {sidebarOpen ? item.label : item.label[0]}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #2d3352' }}>
          {sidebarOpen && (
            <>
              <div style={{ fontSize: 13, color: '#8892b0', marginBottom: 4 }}>{user?.display_name || user?.displayName}</div>
              <div style={{ fontSize: 11, color: '#5e72e4', textTransform: 'capitalize', marginBottom: 8 }}>{user?.role}</div>
            </>
          )}
          <button onClick={handleLogout}
            style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 12, width: '100%' }}>
            {sidebarOpen ? 'Logout' : 'X'}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          background: '#fff', padding: '12px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #e4e8ee', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 14, color: '#666' }}>Sian Soon Financial Portal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {unreadAlerts > 0 && (
              <NavLink to="/alerts" style={{
                background: '#e74c3c', color: '#fff', borderRadius: 12,
                padding: '4px 10px', fontSize: 12, textDecoration: 'none',
              }}>
                {unreadAlerts} alerts
              </NavLink>
            )}
          </div>
        </header>
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
