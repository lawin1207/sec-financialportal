import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const DOC_TYPE_LABELS = {
  purchase_order: 'Purchase Order',
  delivery_order: 'Delivery Order',
  invoice: 'Invoice',
  bank_statement: 'Bank Statement',
  settlement_statement: 'Settlement Statement',
  exchange_receipt: 'Exchange Receipt',
};

const UploadPage = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`${f.name} exceeds 20MB limit.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid]);
      setError(null);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    setError(null);
    setUploading(true);
    setResults([]);

    const uploadResults = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api.smartUpload(formData);
        uploadResults.push({
          fileName: file.name,
          success: true,
          classification: result.ai_classification,
          document: result.document,
        });
      } catch (err) {
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: err.message || 'Upload failed',
        });
      }
    }

    setResults(uploadResults);
    setFiles([]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Upload Documents</h1>
      <p style={styles.subtitle}>Just upload your files. AI will automatically detect the document type, company, and currency.</p>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.uploadZone}>
            <div style={styles.uploadIcon}>&#128195;</div>
            <p style={styles.uploadText}>Choose files or take a photo</p>
            <p style={styles.uploadHint}>AI will classify each document automatically</p>

            <div style={styles.buttonRow}>
              <label style={styles.chooseButton}>
                Choose Files
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={styles.cameraButton}
              >
                &#128247; Take Photo
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <p style={styles.hint}>Accepted: PDF, PNG, JPG, JPEG, CSV (max 20MB each)</p>
          </div>

          {files.length > 0 && (
            <div style={styles.fileList}>
              <h3 style={styles.fileListTitle}>Files to upload ({files.length})</h3>
              {files.map((f, i) => (
                <div key={i} style={styles.fileItem}>
                  <span style={styles.fileItemName}>{f.name}</span>
                  <span style={styles.fileItemSize}>{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeFile(i)} style={styles.removeButton}>X</button>
                </div>
              ))}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: uploading || files.length === 0 ? 0.6 : 1,
              cursor: uploading || files.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={uploading || files.length === 0}
          >
            {uploading ? 'Uploading & Classifying...' : `Upload ${files.length > 0 ? files.length + ' ' : ''}Document${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div style={styles.resultsCard}>
          <h2 style={styles.resultsTitle}>Upload Results</h2>
          {results.map((r, i) => (
            <div key={i} style={{ ...styles.resultItem, borderLeft: `4px solid ${r.success ? '#10b981' : '#ef4444'}` }}>
              <div style={styles.resultHeader}>
                <span style={{ ...styles.resultStatus, color: r.success ? '#10b981' : '#ef4444' }}>
                  {r.success ? 'Success' : 'Failed'}
                </span>
                <span style={styles.resultFileName}>{r.fileName}</span>
              </div>
              {r.success && r.classification && (
                <div style={styles.resultDetails}>
                  <div style={styles.resultTag}>
                    <span style={styles.tagLabel}>Type:</span>
                    <span style={styles.tagValue}>{DOC_TYPE_LABELS[r.classification.document_type] || r.classification.document_type}</span>
                  </div>
                  <div style={styles.resultTag}>
                    <span style={styles.tagLabel}>Company:</span>
                    <span style={styles.tagValue}>{r.classification.detected_company}</span>
                  </div>
                  <div style={styles.resultTag}>
                    <span style={styles.tagLabel}>Currency:</span>
                    <span style={styles.tagValue}>{r.classification.currency}</span>
                  </div>
                  <div style={styles.resultTag}>
                    <span style={styles.tagLabel}>Confidence:</span>
                    <span style={styles.tagValue}>{Math.round((r.classification.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              )}
              {!r.success && <p style={styles.resultError}>{r.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { color: '#1a1f36' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a1f36', marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: '#6b7280', marginBottom: '24px' },
  card: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', maxWidth: '700px',
  },
  uploadZone: {
    border: '2px dashed #d1d5db', borderRadius: '12px', padding: '40px 20px',
    textAlign: 'center', marginBottom: '20px', backgroundColor: '#f9fafb',
  },
  uploadIcon: { fontSize: '48px', marginBottom: '8px' },
  uploadText: { fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '4px' },
  uploadHint: { fontSize: '13px', color: '#9ca3af', marginBottom: '16px' },
  buttonRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  chooseButton: {
    display: 'inline-flex', alignItems: 'center', backgroundColor: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  cameraButton: {
    display: 'inline-flex', alignItems: 'center', backgroundColor: '#10b981', color: '#fff',
    border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  hint: { fontSize: '12px', color: '#9ca3af', margin: 0 },
  fileList: { marginBottom: '20px' },
  fileListTitle: { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
  fileItem: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px',
    backgroundColor: '#f3f4f6', borderRadius: '6px', marginBottom: '4px', fontSize: '14px',
  },
  fileItemName: { flex: 1, color: '#1f2937', fontWeight: '500' },
  fileItemSize: { color: '#6b7280', fontSize: '12px' },
  removeButton: {
    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
    fontWeight: '700', fontSize: '14px', padding: '2px 6px',
  },
  error: {
    backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px',
    borderRadius: '6px', fontSize: '14px', marginBottom: '16px',
  },
  submitButton: {
    width: '100%', backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '14px 24px', fontSize: '16px', fontWeight: '600',
  },
  resultsCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', maxWidth: '700px', marginTop: '24px',
  },
  resultsTitle: { fontSize: '20px', fontWeight: '700', color: '#1a1f36', marginBottom: '16px' },
  resultItem: {
    padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px',
  },
  resultHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  resultStatus: { fontWeight: '700', fontSize: '14px' },
  resultFileName: { fontWeight: '500', color: '#374151', fontSize: '14px' },
  resultDetails: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  resultTag: {
    display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e0e7ff',
    borderRadius: '4px', padding: '4px 10px', fontSize: '13px',
  },
  tagLabel: { color: '#6366f1', fontWeight: '600' },
  tagValue: { color: '#312e81' },
  resultError: { color: '#ef4444', fontSize: '13px', margin: '4px 0 0 0' },
};

export default UploadPage;
