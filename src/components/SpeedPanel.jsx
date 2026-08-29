import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { getLiveTraffic } from '../api/trafficApi';

/**
 * SpeedPanel Component
 * Line/Area chart comparing current_speed vs free_flow_speed per location.
 * Highlights locations where the ratio drops below 0.6 (flagged as congested).
 */
const SpeedPanel = () => {
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCongestedOnly, setFilterCongestedOnly] = useState(false);

  useEffect(() => {
    fetchSpeedData();
  }, []);

  const fetchSpeedData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLiveTraffic('live');
      const rows = Array.isArray(data) ? data : [];
      setTrafficData(rows);
    } catch (err) {
      console.error('SpeedPanel fetch error:', err);
      setError('Failed to fetch speed performance data');
    } finally {
      setLoading(false);
    }
  };

  // Process speed metrics & ratio per location
  const processedData = trafficData.map((loc) => {
    const currentSpeed = parseFloat(loc.current_speed ?? loc.average_speed_kmph ?? 30);
    const freeFlowSpeed = parseFloat(loc.free_flow_speed ?? 60);
    const ratio = freeFlowSpeed > 0 ? parseFloat((currentSpeed / freeFlowSpeed).toFixed(2)) : 0.5;
    const isCongested = ratio < 0.6; // Flagged as congested if ratio drops below 0.6

    return {
      id: loc.location_id,
      name: loc.location_name || 'Location',
      currentSpeed,
      freeFlowSpeed,
      speedDrop: parseFloat(Math.max(0, freeFlowSpeed - currentSpeed).toFixed(1)),
      ratio,
      ratioPercent: Math.round(ratio * 100),
      isCongested,
      roadType: loc.road_type || 'Urban',
      vehicleCount: loc.vehicle_count ?? 0
    };
  });

  // Filtered view
  const displayData = filterCongestedOnly
    ? processedData.filter((d) => d.isCongested)
    : processedData;

  const congestedCount = processedData.filter((d) => d.isCongested).length;

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
      {/* Header with Title & Filter Controls */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Average Speed vs Free Flow Speed
            {congestedCount > 0 && (
              <span style={{
                fontSize: '12px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '600'
              }}>
                ⚠️ {congestedCount} Flagged (&lt; 0.6 Speed Ratio)
              </span>
            )}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Comparing current observed speeds against free-flow speeds. Locations below 0.6 speed ratio are flagged for sub-optimal flow (&lt;0.5 indicates severe bottleneck).
          </p>
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setFilterCongestedOnly(!filterCongestedOnly)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '8px',
              border: filterCongestedOnly ? '1px solid #ef4444' : '1px solid #cbd5e1',
              background: filterCongestedOnly ? '#fef2f2' : '#ffffff',
              color: filterCongestedOnly ? '#991b1b' : '#334155',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {filterCongestedOnly ? '🚨 Showing Congested Only (<0.6)' : '📊 Show All Locations'}
          </button>
          <button
            onClick={fetchSpeedData}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading speed metrics...</div>}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Main Chart */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {displayData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No locations match the speed filter criteria
              </div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="freeFlowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="currentSpeedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{data.name}</div>
                              <div style={{ color: '#2563eb' }}>Current Speed: <strong>{data.currentSpeed} km/h</strong></div>
                              <div style={{ color: '#059669' }}>Free Flow Speed: <strong>{data.freeFlowSpeed} km/h</strong></div>
                              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                                Speed Ratio: <strong style={{ color: data.isCongested ? '#dc2626' : '#059669' }}>{data.ratio} ({data.ratioPercent}%)</strong>
                              </div>
                              {data.isCongested && (
                                <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '2px' }}>
                                  ⚠️ Flagged as Congested (&lt;0.6 Ratio)
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="freeFlowSpeed" name="Free Flow Speed (km/h)" stroke="#10b981" fillOpacity={1} fill="url(#freeFlowGrad)" strokeWidth={2} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="currentSpeed" name="Current Speed (km/h)" stroke="#2563eb" fillOpacity={1} fill="url(#currentSpeedGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Congestion Flagged Grid Cards */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}>
              📍 Speed Ratio Status Breakdown
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px'
            }}>
              {processedData.map((item) => (
                <div
                  key={item.id || item.name}
                  style={{
                    background: item.isCongested ? '#fff5f5' : '#ffffff',
                    border: item.isCongested ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{item.name}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '800',
                      background: item.isCongested ? '#dc2626' : '#10b981',
                      color: '#ffffff'
                    }}>
                      {item.isCongested ? '⚠️ CONGESTED' : '✅ NORMAL'}
                    </span>
                  </div>

                  {/* Speed Progress Bar */}
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>{item.currentSpeed} / {item.freeFlowSpeed} km/h</span>
                    <strong>Ratio: {item.ratio}</strong>
                  </div>

                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, item.ratioPercent)}%`,
                      background: item.isCongested ? '#ef4444' : '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpeedPanel;
