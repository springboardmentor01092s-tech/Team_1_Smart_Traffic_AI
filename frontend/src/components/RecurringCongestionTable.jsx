import React, { useState, useEffect } from 'react';
import { getRecurringCongestion } from '../api/analyticsApi';

/**
 * RecurringCongestionTable Component
 * Identifies and ranks top recurring congestion spots where speed_ratio < 0.5
 * recurs above a user-selected frequency threshold.
 */
const RecurringCongestionTable = ({ defaultLimit = 10 }) => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('30d');
  const [threshold, setThreshold] = useState(0.40); // 40% default

  useEffect(() => {
    fetchRecurringSpots();
  }, [range, threshold]);

  const fetchRecurringSpots = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRecurringCongestion(defaultLimit, range, threshold);
      setSpots(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error loading recurring congestion spots:', err);
      setError('Failed to load recurring congestion spots');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    if (severity === 'critical') {
      return <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>🚨 CRITICAL</span>;
    }
    if (severity === 'warning') {
      return <span style={{ background: '#fffbe6', color: '#92400e', border: '1px solid #fef08a', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>⚠️ WARNING</span>;
    }
    return <span style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>ℹ️ INFO</span>;
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '14px',
      padding: '20px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header controls */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            🎯 Recurring Congestion Spot Identification
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Ranked locations recurring in congestion state (speed_ratio &lt; 0.5) above frequency threshold
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Threshold selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <span style={{ fontWeight: '600' }}>Threshold:</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              <option value={0.20}>&gt;= 20% Recurrence</option>
              <option value={0.30}>&gt;= 30% Recurrence</option>
              <option value={0.40}>&gt;= 40% Recurrence</option>
              <option value={0.50}>&gt;= 50% Recurrence</option>
              <option value={0.60}>&gt;= 60% Recurrence</option>
            </select>
          </div>

          {/* Time range */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: range === r ? 'bold' : 'normal',
                  background: range === r ? '#2563eb' : 'transparent',
                  color: range === r ? '#ffffff' : '#475569'
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Scanning recurring congestion patterns...</div>}
      {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          {spots.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No location found exceeding {threshold * 100}% congestion recurrence in range {range.toUpperCase()}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Rank</th>
                  <th style={{ padding: '10px 12px' }}>Location Name</th>
                  <th style={{ padding: '10px 12px' }}>Road Type</th>
                  <th style={{ padding: '10px 12px' }}>Congestion Frequency</th>
                  <th style={{ padding: '10px 12px' }}>Peak Time-of-Day</th>
                  <th style={{ padding: '10px 12px' }}>Avg Speed</th>
                  <th style={{ padding: '10px 12px' }}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {spots.map((spot, idx) => (
                  <tr key={spot.location_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                      {spot.location_name}
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>
                        {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', textTransform: 'capitalize' }}>
                      {spot.road_type || 'Arterial'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(spot.frequency_pct, 100)}%`,
                            height: '100%',
                            background: spot.frequency_pct >= 60 ? '#ef4444' : spot.frequency_pct >= 40 ? '#f59e0b' : '#3b82f6'
                          }} />
                        </div>
                        <span style={{ fontWeight: '700', color: spot.frequency_pct >= 60 ? '#dc2626' : '#d97706' }}>
                          {spot.frequency_pct}%
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        ({spot.congested_samples}/{spot.total_samples} samples)
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: '500', color: '#334155' }}>
                      🕒 {spot.most_common_time_of_day}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>
                      {spot.avg_speed_kmph} km/h
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {getSeverityBadge(spot.severity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurringCongestionTable;
