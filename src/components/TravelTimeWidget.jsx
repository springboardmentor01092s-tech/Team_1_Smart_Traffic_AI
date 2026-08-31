import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { getAllRoutes, getRouteTravelTime } from '../api/routeApi';

const SEGMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

/**
 * TravelTimeWidget Component
 * Dropdown selector for routes, calling /api/routes/:id/travel-time
 * Renders total travel time, distance, and per-segment breakdown as a horizontal stacked bar.
 */
const TravelTimeWidget = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [travelTimeData, setTravelTimeData] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingTravelTime, setLoadingTravelTime] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoadingRoutes(true);
    setError('');
    try {
      const data = await getAllRoutes();
      const list = Array.isArray(data) ? data : [];
      setRoutes(list);

      if (list.length > 0) {
        setSelectedRouteId(list[0].route_id);
        fetchTravelTime(list[0].route_id);
      }
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to fetch route list');
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchTravelTime = async (routeId) => {
    if (!routeId) return;
    setLoadingTravelTime(true);
    setError('');
    try {
      const data = await getRouteTravelTime(routeId);
      setTravelTimeData(data);
    } catch (err) {
      console.error('Error fetching travel time:', err);
      setError(err.response?.data?.message || 'Failed to calculate travel time for selected route');
      setTravelTimeData(null);
    } finally {
      setLoadingTravelTime(false);
    }
  };

  const handleRouteSelect = (e) => {
    const routeId = e.target.value;
    setSelectedRouteId(routeId);
    fetchTravelTime(routeId);
  };

  // Format segments for horizontal stacked bar representation
  const stackedChartData = travelTimeData?.segments ? [
    travelTimeData.segments.reduce((acc, seg, idx) => {
      acc[`segment_${idx}`] = seg.estimatedTimeMinutes;
      acc[`segment_name_${idx}`] = `${seg.fromLocationName} ➔ ${seg.toLocationName}`;
      acc[`segment_speed_${idx}`] = seg.speedKmph;
      return acc;
    }, { name: 'Route Breakdown' })
  ] : [];

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
      {/* Header & Dropdown */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            ⏱️ Corridor Travel Time Estimator
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Calculates estimated trip duration and segment delays for monitored corridors
          </p>
        </div>

        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Select Route:</span>
          {loadingRoutes ? (
            <span style={{ fontSize: '12px', color: '#64748b' }}>Loading routes...</span>
          ) : (
            <select
              value={selectedRouteId}
              onChange={handleRouteSelect}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                minWidth: '220px'
              }}
            >
              {routes.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  🛣️ {r.name || r.route_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {loadingTravelTime && (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          Calculating corridor travel time and segment metrics...
        </div>
      )}

      {!loadingTravelTime && travelTimeData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #2563eb' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#1d4ed8', textTransform: 'uppercase' }}>Total Estimated Time</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e40af', marginTop: '2px' }}>
                ⏱️ {travelTimeData.estimatedTravelTimeMinutes} <span style={{ fontSize: '14px', fontWeight: '500' }}>mins</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#15803d', textTransform: 'uppercase' }}>Total Distance</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                📏 {travelTimeData.totalDistanceKm} <span style={{ fontSize: '14px', fontWeight: '500' }}>km</span>
              </div>
            </div>

            <div style={{ background: '#fef3c7', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#b45309', textTransform: 'uppercase' }}>Total Segments</span>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#92400e', marginTop: '2px' }}>
                📍 {travelTimeData.segments?.length || 0} <span style={{ fontSize: '14px', fontWeight: '500' }}>legs</span>
              </div>
            </div>
          </div>

          {/* Horizontal Stacked Segment Chart */}
          {travelTimeData.segments && travelTimeData.segments.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>
                📊 Per-Segment Travel Time Breakdown (Horizontal Stacked Bar)
              </h4>

              <div style={{ width: '100%', height: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={stackedChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" unit=" min" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Segment Time Contribution</div>
                              {payload.map((entry, idx) => (
                                <div key={idx} style={{ color: entry.color, margin: '2px 0' }}>
                                  <strong>Leg {idx + 1}:</strong> {entry.value} mins
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {travelTimeData.segments.map((seg, idx) => (
                      <Bar
                        key={idx}
                        dataKey={`segment_${idx}`}
                        name={`Leg ${idx + 1}: ${seg.fromLocationName} ➔ ${seg.toLocationName}`}
                        stackId="a"
                        fill={SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}
                        radius={idx === travelTimeData.segments.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Segment List Breakdown Table */}
              <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#e2e8f0', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Leg #</th>
                      <th style={{ padding: '8px 12px' }}>From Location</th>
                      <th style={{ padding: '8px 12px' }}>To Location</th>
                      <th style={{ padding: '8px 12px' }}>Distance</th>
                      <th style={{ padding: '8px 12px' }}>Avg Speed</th>
                      <th style={{ padding: '8px 12px' }}>Est. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelTimeData.segments.map((seg, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length], marginRight: '6px' }} />
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>{seg.fromLocationName}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>{seg.toLocationName}</td>
                        <td style={{ padding: '8px 12px' }}>{seg.distanceKm} km</td>
                        <td style={{ padding: '8px 12px', color: seg.speedKmph < 25 ? '#dc2626' : '#166534', fontWeight: 'bold' }}>
                          {seg.speedKmph} km/h
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#2563eb' }}>
                          {seg.estimatedTimeMinutes} mins
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TravelTimeWidget;
