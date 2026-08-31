import React, { useEffect, useState } from 'react';
import { getAllRoutes, getRouteAnalysis, getRouteTravelTime } from '../api/routeApi';

const RouteInspector = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const data = await getAllRoutes();
      const list = Array.isArray(data) ? data : [];
      setRoutes(list);
      if (list.length > 0) {
        setSelectedRouteId(list[0].route_id);
        inspectRoute(list[0].route_id);
      }
    } catch (err) {
      console.error('Failed to fetch routes:', err);
      setError('Failed to fetch routes list');
    }
  };

  const inspectRoute = async (routeId) => {
    if (!routeId) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    setTravelTimeData(null);

    try {
      const [analysisRes, travelRes] = await Promise.allSettled([
        getRouteAnalysis(routeId),
        getRouteTravelTime(routeId)
      ]);

      if (analysisRes.status === 'fulfilled') {
        setAnalysis(analysisRes.value);
      } else {
        console.warn('Analysis error:', analysisRes.reason);
      }

      if (travelRes.status === 'fulfilled') {
        setTravelTimeData(travelRes.value);
      } else {
        console.warn('Travel time error:', travelRes.reason);
      }
    } catch (err) {
      console.error('Route inspection failed:', err);
      setError('Could not inspect route details');
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (e) => {
    const id = e.target.value;
    setSelectedRouteId(id);
    inspectRoute(id);
  };

  const getLevelBadge = (level) => {
    const lvl = (level || 'low').toLowerCase();
    let bg = '#d1fae5';
    let text = '#065f46';
    if (lvl === 'moderate') { bg = '#fef3c7'; text = '#92400e'; }
    if (lvl === 'high' || lvl === 'severe') { bg = '#fee2e2'; text = '#991b1b'; }

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        background: bg,
        color: text,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '12px'
      }}>
        {lvl}
      </span>
    );
  };

  const selectedRouteObj = routes.find(r => r.route_id === selectedRouteId);

  return (
    <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>🛣️ Route Analysis & Travel Time Inspector</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Select Corridor:</label>
          <select
            value={selectedRouteId}
            onChange={handleRouteSelect}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: '500' }}
          >
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                {r.name || `Route ${r.route_id.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Computing route analysis and travel time...</div>}

      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Analysis Summary Card */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Route Congestion Analysis</h4>
            {analysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Congestion Score:</span><br />
                  <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
                    {typeof analysis.congestionScore === 'number' ? analysis.congestionScore.toFixed(2) : analysis.congestionScore}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}> / 3.00</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Route Status Level:</span><br />
                  <div style={{ marginTop: '4px' }}>{getLevelBadge(analysis.level)}</div>
                </div>
                {travelTimeData && (
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Estimated Travel Time:</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb' }}>
                      ⏱️ {travelTimeData.estimatedTravelTimeMinutes} mins
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      Distance: <strong>{travelTimeData.totalDistanceKm} km</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>No analysis data available for this route</div>
            )}
          </div>

          {/* Segment Travel Times Breakdown */}
          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Segment Travel Time Breakdown</h4>
            {travelTimeData && travelTimeData.segments && travelTimeData.segments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#e5e7eb', color: '#374151' }}>
                      <th style={{ padding: '8px' }}>From</th>
                      <th style={{ padding: '8px' }}>To</th>
                      <th style={{ padding: '8px' }}>Distance</th>
                      <th style={{ padding: '8px' }}>Current Speed</th>
                      <th style={{ padding: '8px' }}>Est. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelTimeData.segments.map((seg, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                        <td style={{ padding: '8px', fontWeight: '500' }}>{seg.fromLocationName || seg.fromLocationId}</td>
                        <td style={{ padding: '8px', fontWeight: '500' }}>{seg.toLocationName || seg.toLocationId}</td>
                        <td style={{ padding: '8px' }}>{seg.distanceKm} km</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: seg.speedKmph < 25 ? '#ef4444' : '#10b981' }}>
                            {seg.speedKmph} km/h
                          </span>
                        </td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>{seg.estimatedTimeMinutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#9ca3af', padding: '20px 0' }}>
                Select a route with at least 2 connected locations to view segment travel time breakdown.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteInspector;
