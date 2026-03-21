import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import UploadPage from './pages/documents/UploadPage';
import MatchesPage from './pages/documents/MatchesPage';
import TransactionsPage from './pages/dashboard/TransactionsPage';
import PaymentSchedulePage from './pages/dashboard/PaymentSchedulePage';
import AgingReportPage from './pages/dashboard/AgingReportPage';
import CashFlowPage from './pages/dashboard/CashFlowPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import AlertsPage from './pages/dashboard/AlertsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="upload" element={<ProtectedRoute roles={['owner', 'admin']}><UploadPage /></ProtectedRoute>} />
        <Route path="matches" element={<ProtectedRoute roles={['owner', 'admin']}><MatchesPage /></ProtectedRoute>} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="payment-schedule" element={<PaymentSchedulePage />} />
        <Route path="aging-report" element={<AgingReportPage />} />
        <Route path="cash-flow" element={<ProtectedRoute roles={['owner']}><CashFlowPage /></ProtectedRoute>} />
        <Route path="audit-log" element={<ProtectedRoute roles={['owner']}><AuditLogPage /></ProtectedRoute>} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
