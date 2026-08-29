import React, { useEffect, useState } from 'react';
import { getAllAlerts, updateAlertStatus } from '../api/alertApi';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAlerts = async () => {
    try {
      const data = await getAllAlerts(filterStatus);
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
  }, [filterStatus]);

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      setUpdatingId(alertId);
      await updateAlertStatus(alertId, newStatus);
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert status:', err);
      const msg = err.response?.data?.error || 'Failed to update alert status';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Sort function: critical > warning > info, then newest first
  const severityOrder = { critical: 1, warning: 2, info: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    const orderA = severityOrder[a.severity] || 4;
    const orderB = severityOrder[b.severity] || 4;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const filteredAlerts = sortedAlerts.filter(a => {
    const matchesSeverity = filterSeverity === 'all' || (a.severity || 'info').toLowerCase() === filterSeverity;
    const matchesStatus = filterStatus === 'all' || (a.status || 'Active').toLowerCase() === filterStatus.toLowerCase();
    return matchesSeverity && matchesStatus;
  });

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

  const getStatusBadgeStyle = (status) => {
    const normStatus = (status || 'Active').toLowerCase();
    switch (normStatus) {
      case 'active':
        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }; // red
      case 'notified':
        return { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' }; // orange
      case 'acknowledged':
        return { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }; // blue
      case 'resolved':
        return { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }; // green
      default:
        return { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
    }
  };

  const renderActionButton = (alert) => {
    const currentStatus = (alert.status || 'Active').toLowerCase();
    const alertId = alert.alert_id || alert.id;
    const isUpdating = updatingId === alertId;

    if (currentStatus === 'active') {
      return (
        <button
          className="btn-action-notify"
          disabled={isUpdating}
          onClick={() => handleStatusUpdate(alertId, 'Notified')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            borderRadius: '6px',
            border: 'none',
            background: '#ea580c',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {isUpdating ? 'Updating...' : '📢 Mark Notified'}
        </button>
      );
    }
    if (currentStatus === 'notified') {
      return (
        <button
          className="btn-action-acknowledge"
          disabled={isUpdating}
          onClick={() => handleStatusUpdate(alertId, 'Acknowledged')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            borderRadius: '6px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {isUpdating ? 'Updating...' : '👁️ Acknowledge'}
        </button>
      );
    }
    if (currentStatus === 'acknowledged') {
      return (
        <button
          className="btn-action-resolve"
          disabled={isUpdating}
          onClick={() => handleStatusUpdate(alertId, 'Resolved')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            borderRadius: '6px',
            border: 'none',
            background: '#059669',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {isUpdating ? 'Updating...' : '✅ Resolve'}
        </button>
      );
    }
    return null;
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
      <div className="alerts-filters-container" style={{ margin: '12px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Severity Filter Row */}
        <div className="alerts-filters severity-filters" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>Severity:</span>
          {['all', 'critical', 'warning', 'info'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '16px',
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

        {/* Status Filter Row */}
        <div className="alerts-filters status-filters" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>Status:</span>
          {['all', 'Active', 'Notified', 'Acknowledged', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: filterStatus === st ? 'bold' : 'normal',
                background: filterStatus === st ? '#4b5563' : '#f3f4f6',
                color: filterStatus === st ? 'white' : '#374151'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading live alerts...</div>}

      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
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
          {filteredAlerts.map((alert) => {
            const badgeStyle = getStatusBadgeStyle(alert.status);
            return (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
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
                    <span
                      className="status-badge"
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        ...badgeStyle
                      }}
                    >
                      {alert.status || 'Active'}
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

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  {renderActionButton(alert)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
