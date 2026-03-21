import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CompanySelector from '../../components/common/CompanySelector';

const STATUS_COLORS = {
  pending: '#ffc107',
  processed: '#17a2b8',
  matched: '#28a745',
  flagged: '#dc3545',
};

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'settlement_statement', label: 'Settlement Statement' },
  { value: 'exchange_receipt', label: 'Exchange Receipt' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'matched', label: 'Matched' },
  { value: 'flagged', label: 'Flagged' },
];

const PAGE_SIZE = 20;

const DocumentsPage = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [status, setStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: PAGE_SIZE,
        };
        if (companyId) params.company_id = companyId;
        if (documentType) params.document_type = documentType;
        if (status) params.status = status;

        const data = await api.getDocuments(params);
        setDocuments(data.documents || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [companyId, documentType, status, page]);

  const handleDownload = async (documentId) => {
    try {
      const { url } = await api.getDocumentDownloadUrl(documentId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Documents</h1>

      <div style={styles.filtersRow}>
        <div style={styles.filterItem}>
          <CompanySelector
            value={companyId}
            onChange={(id) => {
              setCompanyId(id);
              handleFilterChange();
            }}
          />
        </div>
        <div style={styles.filterItem}>
          <select
            style={styles.select}
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value);
              handleFilterChange();
            }}
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterItem}>
          <select
            style={styles.select}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              handleFilterChange();
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <p style={styles.loadingText}>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p style={styles.emptyText}>No documents found.</p>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>File</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.fileName}>{doc.file_name}</div>
                        {doc.document_number && (
                          <div style={styles.docNumber}>{doc.document_number}</div>
                        )}
                      </td>
                      <td style={styles.td}>{doc.company_short_code || '-'}</td>
                      <td style={styles.td}>
                        <span style={styles.typeLabel}>
                          {(doc.document_type || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={styles.td}>{doc.supplier_name || '-'}</td>
                      <td style={styles.td}>
                        {doc.total_amount != null
                          ? `${doc.currency || ''} ${Number(doc.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: STATUS_COLORS[doc.status] || '#6b7280',
                          }}
                        >
                          {doc.status}
                        </span>
                        {doc.status === 'flagged' && doc.company_mismatch && (
                          <div style={styles.mismatchIndicator}>Company mismatch</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.downloadButton}
                          onClick={() => handleDownload(doc.id)}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <button
                style={{
                  ...styles.pageButton,
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                style={{
                  ...styles.pageButton,
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    color: '#1a1f36',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1f36',
    marginBottom: '24px',
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterItem: {
    minWidth: '180px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1a1f36',
    outline: 'none',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
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
    padding: '14px 12px',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1a1f36',
    verticalAlign: 'middle',
  },
  fileName: {
    fontWeight: '500',
    fontSize: '14px',
  },
  docNumber: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  typeLabel: {
    textTransform: 'capitalize',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mismatchIndicator: {
    fontSize: '11px',
    color: '#dc3545',
    marginTop: '4px',
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  pageButton: {
    backgroundColor: '#f3f4f6',
    color: '#1a1f36',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  emptyText: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
};

export default DocumentsPage;
