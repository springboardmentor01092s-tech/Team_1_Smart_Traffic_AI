import React, { useState, useEffect, useMemo } from 'react';
import { getMostCongestedRoutes } from '../api/analyticsApi';

/**
 * CongestedRoutesTable Component
 * Displays a sortable table of most congested corridors / routes from /api/analytics/most-congested-routes.
 * Includes color-coded severity chips, column sorting, and search filtering.
 */
const CongestedRoutesTable = ({ limit = 15 }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('route_avg_speed_kmph');
  const [sortAsc, setSortAsc] = useState(true); // Default speed ascending (slowest first)

  useEffect(() => {
    fetchRoutes();
  }, [limit]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMostCongestedRoutes(limit);
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching congested routes table:', err);
      setError('Failed to fetch congested routes table data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Congestion rank weight for sorting severity strings
  const severityWeight = { severe: 4, high: 3, moderate: 2, low: 1 };

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    return routes
      .filter((r) => {
        if (!searchQuery) return true;
        const name = (r.route_name || r.name || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'route_overall_congestion') {
          valA = severityWeight[valA] || 0;
          valB = severityWeight[valB] || 0;
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [routes, searchQuery, sortField, sortAsc]);

  // Severity chip renderer
  const renderSeverityChip = (severity) => {
    const level = (severity || 'low').toLowerCase();
    let bg = '#d1fae5';
    let color = '#065f46';
    let icon = '🟢';

    if (level === 'moderate') {
      bg = '#fef3c7';
      color = '#92400e';
      icon = '🟡';
    } else if (level === 'high') {
      bg = '#ffedd5';
      color = '#c2410c';
      icon = '🟠';
    } else if (level === 'severe') {
      bg = '#fee2e2';
      color = '#991b1b';
      icon = '🔴';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '800',
        background: bg,
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '0.3px'
      }}>
        {icon} {level}
      </span>
    );
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
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            🛣️ Most Congested Routes & Corridors
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Ranked by overall corridor average speed and congested segment density
          </p>
        </div>

        {/* Search input & refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="🔍 Search route name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              width: '200px',
              outline: 'none'
            }}
          />
          <button
            onClick={fetchRoutes}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading congested routes table...</div>}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th
                  onClick={() => handleSort('route_name')}
                  style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Route Name {sortField === 'route_name' ? (sortAsc ? '▲' : '▼') : '↕️'}
                </th>
                <th
                  onClick={() => handleSort('total_locations')}
                  style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Total Segments {sortField === 'total_locations' ? (sortAsc ? '▲' : '▼') : '↕️'}
                </th>
                <th
                  onClick={() => handleSort('route_avg_speed_kmph')}
                  style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Avg Speed (km/h) {sortField === 'route_avg_speed_kmph' ? (sortAsc ? '▲' : '▼') : '↕️'}
                </th>
                <th
                  onClick={() => handleSort('congested_segments_count')}
                  style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Congested Segments {sortField === 'congested_segments_count' ? (sortAsc ? '▲' : '▼') : '↕️'}
                </th>
                <th
                  onClick={() => handleSort('route_overall_congestion')}
                  style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Severity Chip {sortField === 'route_overall_congestion' ? (sortAsc ? '▲' : '▼') : '↕️'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No congested routes found matching search query
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((route, idx) => {
                  const avgSpeed = parseFloat(route.route_avg_speed_kmph || 0);
                  const isVerySlow = avgSpeed < 25;

                  return (
                    <tr
                      key={route.route_id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>
                        🛣️ {route.route_name || route.name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {route.total_locations || 0} locations
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: isVerySlow ? '#dc2626' : '#2563eb' }}>
                        {avgSpeed} km/h
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: parseInt(route.congested_segments_count, 10) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: parseInt(route.congested_segments_count, 10) > 0 ? '#b45309' : '#64748b',
                          fontWeight: '700'
                        }}>
                          {route.congested_segments_count || 0} bottleneck(s)
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {renderSeverityChip(route.route_overall_congestion)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CongestedRoutesTable;
