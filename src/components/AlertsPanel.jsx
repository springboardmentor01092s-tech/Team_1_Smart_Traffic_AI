import React, { useEffect, useState } from 'react';
import { getAllAlerts } from '../api/alertApi';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAlerts = async () => {
    try {
      const data = await getAllAlerts();
      setAlerts(Array.isArray(data) ? data : []);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Could not load disruption alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh alerts every 20 seconds to match data refresh cycle
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  // Sort function: critical > warning > info, then newest first
  const severityOrder = { critical: 1, warning: 2, info: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    const orderA = severityOrder[a.severity] || 4;
    const orderB = severityOrder[b.severity] || 4;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const filteredAlerts = filterSeverity === 'all'
    ? sortedAlerts
    : sortedAlerts.filter(a => (a.severity || 'info').toLowerCase() === filterSeverity);

  const getSeverityBadgeClass = (severity) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical':
        return 'severity-badge badge-critical';
      case 'warning':
        return 'severity-badge badge-warning';
      default:
        return 'severity-badge badge-info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="alerts-panel-card">
      <div className="alerts-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🚨</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Unusual Disruptions</h3>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              Auto-refreshing (Last updated: {lastUpdated.toLocaleTimeString()})
            </span>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          className="btn-refresh"
          title="Manual Refresh"
          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="alerts-filters" style={{ display: 'flex', gap: '6px', margin: '12px 0 16px 0' }}>
        {['all', 'critical', 'warning', 'info'].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: filterSeverity === sev ? 'bold' : 'normal',
              background: filterSeverity === sev ? '#2563eb' : '#e5e7eb',
              color: filterSeverity === sev ? 'white' : '#374151',
              textTransform: 'capitalize'
            }}
          >
            {sev} ({sev === 'all' ? alerts.length : alerts.filter(a => (a.severity || 'info').toLowerCase() === sev).length})
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading live alerts...</div>}
      
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && !error && filteredAlerts.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #e5e7eb' }}>
          ✅ No unusual disruptions or active alerts matching criteria.
        </div>
      )}

      {!loading && !error && filteredAlerts.length > 0 && (
        <div className="alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.alert_id || alert.id}
              className={`alert-item alert-border-${(alert.severity || 'info').toLowerCase()}`}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                borderLeft: `4px solid ${
                  alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                }`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span>{getSeverityIcon(alert.severity)}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: alert.severity === 'critical' ? '#fee2e2' : alert.severity === 'warning' ? '#fef3c7' : '#dbeafe',
                      color: alert.severity === 'critical' ? '#991b1b' : alert.severity === 'warning' ? '#92400e' : '#1e40af'
                    }}
                  >
                    {alert.severity || 'info'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>• {new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                  {alert.message || `Unusual congestion detected at location ${alert.location_id}`}
                </p>
                {alert.location_id && (
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    Location ID: <code>{alert.location_id.substring(0, 8)}...</code>
                  </span>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: alert.status === 'active' ? '#d1fae5' : '#f3f4f6',
                    color: alert.status === 'active' ? '#065f46' : '#6b7280',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  {alert.status || 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
