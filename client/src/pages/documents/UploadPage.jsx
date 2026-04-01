import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import CompanySelector from '../../components/common/CompanySelector';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const OWNER_DOCUMENT_TYPES = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'settlement_statement', label: 'Settlement Statement' },
  { value: 'exchange_receipt', label: 'Exchange Receipt' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'invoice', label: 'Invoice' },
];

const ADMIN_DOCUMENT_TYPES = [
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'delivery_order', label: 'Delivery Order' },
  { value: 'invoice', label: 'Invoice' },
];

const CURRENCY_TYPES = ['bank_statement', 'settlement_statement', 'exchange_receipt'];

const UploadPage = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState(null);
  const [currencyAccountId, setCurrencyAccountId] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isOwner = user?.role === 'owner';
  const documentTypes = isOwner ? OWNER_DOCUMENT_TYPES : ADMIN_DOCUMENT_TYPES;
  const showCurrency = CURRENCY_TYPES.includes(documentType);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File size exceeds 20MB limit.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!companyId) {
      setError('Please select a company.');
      return;
    }
    if (!documentType) {
      setError('Please select a document type.');
      return;
    }
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (showCurrency && !currencyAccountId) {
      setError('Please select a currency account.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', companyId);
      formData.append('document_type', documentType);
      if (currencyAccountId) {
        formData.append('currency_account_id', currencyAccountId);
      }

      const result = await api.uploadDocument(formData);
      setSuccess({
        fileName: file.name,
        status: result.status || 'uploaded',
      });
      setFile(null);
      setCurrencyAccountId(null);
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Upload Document</h1>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Company</label>
            <CompanySelector
              value={companyId}
              onChange={(id) => {
                setCompanyId(id);
                setCurrencyAccountId(null);
              }}
              showCurrency={showCurrency}
              onCurrencyChange={setCurrencyAccountId}
              currencyAccountId={currencyAccountId}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Document Type</label>
            <select
              style={styles.select}
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setCurrencyAccountId(null);
              }}
            >
              <option value="">Select document type</option>
              {documentTypes.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>File</label>
            <div style={styles.fileActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.csv"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={styles.cameraButton}
              >
                <span style={{ marginRight: '6px', fontSize: '18px' }}>&#128247;</span>
                Take Photo
              </button>
            </div>
            {file && (
              <p style={styles.fileName}>Selected: {file.name}</p>
            )}
            <p style={styles.hint}>Accepted: PDF, PNG, JPG, JPEG, CSV (max 20MB)</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {success && (
            <div style={styles.success}>
              File <strong>{success.fileName}</strong> uploaded successfully.
              Status: <strong>{success.status}</strong>
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    maxWidth: '600px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
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
  fileActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  fileInput: {
    fontSize: '14px',
    color: '#374151',
  },
  cameraButton: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  fileName: {
    fontSize: '13px',
    color: '#3b82f6',
    marginTop: '6px',
    marginBottom: 0,
    fontWeight: '500',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
    marginBottom: 0,
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  success: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default UploadPage;
