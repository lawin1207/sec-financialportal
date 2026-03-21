import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const ALERT_TYPE_COLORS = {
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  success: '#28a745',
  overdue: '#dc3545',
  match: '#4c6ef5',
  system: '#6c757d',
};

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
  btn: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#4c6ef5',
    color: '#fff',
  },
  btnSmall: {
    padding: '4px 12px',
    fontSize: '12px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '16px 20px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderLeft: '4px solid #ccc',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '4px',
    color: '#1a1f36',
  },
  alertMessage: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '6px',
    lineHeight: '1.4',
  },
  alertTimestamp: {
    fontSize: '12px',
    color: '#999',
  },
  empty: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '40px',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px',
  },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await api.markAlertRead(alertId);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  };

  const getBorderColor = (alertType) => {
    return ALERT_TYPE_COLORS[alertType] || '#6c757d';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Alerts</h1>
        <button style={styles.btn} onClick={handleMarkAllRead}>
          Mark All Read
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>Loading...</p>
      ) : alerts.length === 0 ? (
        <div style={styles.empty}>No alerts found.</div>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              ...styles.alertCard,
              borderLeftColor: getBorderColor(alert.alert_type),
              opacity: alert.is_read ? 0.6 : 1,
            }}
          >
            <div style={styles.alertContent}>
              <div style={styles.alertTitle}>{alert.title}</div>
              <div style={styles.alertMessage}>{alert.message}</div>
              <div style={styles.alertTimestamp}>{alert.timestamp || alert.created_at}</div>
            </div>
            {!alert.is_read && (
              <button
                style={styles.btnSmall}
                onClick={() => handleMarkRead(alert.id)}
              >
                Mark Read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
