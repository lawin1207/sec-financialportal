import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CompanySelector from '../../components/common/CompanySelector';
import PasswordModal from '../../components/common/PasswordModal';

const STATUS_COLORS = {
  auto_matched: '#28a745',
  ai_suggested: '#17a2b8',
  needs_review: '#ffc107',
  resolved: '#28a745',
  rejected: '#dc3545',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'ai_suggested', label: 'AI Suggested' },
  { value: 'auto_matched', label: 'Auto Matched' },
  { value: 'resolved', label: 'Resolved' },
];

const styles = {
  container: {
    color: '#333',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1f36',
    margin: 0,
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
    minWidth: '160px',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#4c6ef5',
    color: '#fff',
  },
  btnSuccess: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  btnDanger: {
    backgroundColor: '#dc3545',
    color: '#fff',
  },
  btnInfo: {
    backgroundColor: '#17a2b8',
    color: '#fff',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: '12px',
    marginRight: '4px',
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
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
};

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (companyId) params.company_id = companyId;
      if (statusFilter) params.status = statusFilter;
      const res = await api.getMatches(params);
      setMatches(res.matches || []);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [companyId, statusFilter]);

  const handleAutoMatch = async () => {
    try {
      await api.triggerAutoMatch(companyId);
      fetchMatches();
    } catch (err) {
      console.error('Auto-match failed', err);
    }
  };

  const handleInvestigate = async (matchId) => {
    try {
      await api.investigateMatch(matchId);
      fetchMatches();
    } catch (err) {
      console.error('Investigation failed', err);
    }
  };

  const handleActionClick = (matchId, action) => {
    setPendingAction({ matchId, action });
    setResolutionNote('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (password) => {
    if (!pendingAction) return;
    try {
      await api.resolveMatch(pendingAction.matchId, {
        password,
        action: pendingAction.action,
        resolution_note: resolutionNote,
      });
      setShowPasswordModal(false);
      setPendingAction(null);
      setResolutionNote('');
      fetchMatches();
    } catch (err) {
      console.error('Resolve failed', err);
    }
  };

  const handleViewReasoning = (reasoning) => {
    alert(reasoning || 'No AI reasoning available.');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Document Matches</h1>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleAutoMatch}
        >
          Run Auto-Match
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.filters}>
          <CompanySelector value={companyId} onChange={setCompanyId} />
          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
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
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>PO#</th>
                  <th style={styles.th}>DO#</th>
                  <th style={styles.th}>Invoice#</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Confidence%</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td style={styles.td}>{match.company_name}</td>
                    <td style={styles.td}>{match.po_number || '—'}</td>
                    <td style={styles.td}>{match.do_number || '—'}</td>
                    <td style={styles.td}>{match.inv_number || '—'}</td>
                    <td style={styles.td}>{match.po_supplier || match.inv_supplier || '—'}</td>
                    <td style={styles.td}>{match.confidence != null ? `${match.confidence}%` : '—'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: STATUS_COLORS[match.status] || '#6c757d',
                        }}
                      >
                        {match.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.btn, ...styles.btnInfo, ...styles.btnSmall }}
                        onClick={() => handleInvestigate(match.id)}
                      >
                        AI Investigate
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.btnSuccess, ...styles.btnSmall }}
                        onClick={() => handleActionClick(match.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                        onClick={() => handleActionClick(match.id, 'reject')}
                      >
                        Reject
                      </button>
                      {match.ai_reasoning && (
                        <button
                          style={{ ...styles.btn, ...styles.btnSmall, backgroundColor: '#6c757d', color: '#fff' }}
                          onClick={() => handleViewReasoning(match.ai_reasoning)}
                        >
                          View AI Reasoning
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {matches.length === 0 && (
                  <tr>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#888' }} colSpan={8}>
                      No matches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={handlePasswordSubmit}
          onClose={() => {
            setShowPasswordModal(false);
            setPendingAction(null);
          }}
          extraContent={
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>
                Resolution Note
              </label>
              <textarea
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', minHeight: '60px' }}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter resolution note..."
              />
            </div>
          }
        />
      )}
    </div>
  );
}
