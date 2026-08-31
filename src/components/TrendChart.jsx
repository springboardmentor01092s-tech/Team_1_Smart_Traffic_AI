import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getHistoricalTrends, getBusiestLocations, getDailyTrends, getWeeklyTrends } from '../api/analyticsApi';

/**
 * TrendChart Component
 * Renders line chart of traffic density & speed over time from /api/analytics/trends,
 * supporting Hourly, Daily, and Weekly pattern aggregation toggles.
 */
const TrendChart = ({ initialTimeframe = '7d' }) => {
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'hourly'
  const [trends, setTrends] = useState([]);
  const [busiestLocs, setBusiestLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChartTab, setActiveChartTab] = useState('all'); // 'all' | 'trend' | 'volume'

  useEffect(() => {
    fetchTrendData();
  }, [timeframe, granularity]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError('');
    try {
      let trendsPromise;
      if (granularity === 'daily') {
        trendsPromise = getDailyTrends(null, timeframe);
      } else if (granularity === 'weekly') {
        trendsPromise = getWeeklyTrends(null, timeframe);
      } else {
        trendsPromise = getHistoricalTrends(timeframe);
      }

      const [trendsRes, busiestRes] = await Promise.allSettled([
        trendsPromise,
        getBusiestLocations(10, timeframe)
      ]);

      if (trendsRes.status === 'fulfilled') {
        setTrends(Array.isArray(trendsRes.value) ? trendsRes.value : []);
      }
      if (busiestRes.status === 'fulfilled') {
        setBusiestLocs(Array.isArray(busiestRes.value) ? busiestRes.value : []);
      }
    } catch (err) {
      console.error('Error loading trend charts:', err);
      setError('Failed to load traffic trend data');
    } finally {
      setLoading(false);
    }
  };

  // Format trend data for LineChart
  const formattedTrends = trends.map((item) => {
    let timeStr = 'N/A';
    if (item.time_bucket) {
      const d = new Date(item.time_bucket);
      if (granularity === 'weekly') {
        timeStr = `Week of ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      } else if (granularity === 'daily') {
        timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
      }
    }

    const avgSpeed = parseFloat(item.avg_speed || item.avg_speed_kmph || 0);
    const avgVehicles = parseInt(item.avg_vehicle_count || 0, 10);
    const density = item.avg_density !== undefined
      ? parseFloat(item.avg_density)
      : Math.max(5, Math.min(95, Math.round((1 - Math.min(avgSpeed, 60) / 60) * 100)));

    return {
      time: timeStr,
      speed: avgSpeed,
      vehicles: avgVehicles,
      density: density,
      location: item.location_name || 'Network Average'
    };
  });

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
      {/* Header bar with controls */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            📈 Traffic Density & Vehicle Count Analytics
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Historical trends and high-volume location breakdowns across key timeframes
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Chart View Toggle */}
          <div style={{ background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all', label: '📊 Both Charts' },
              { id: 'trend', label: '📈 Line Trend' },
              { id: 'volume', label: '📊 Location Volume' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeChartTab === tab.id ? '700' : '500',
                  background: activeChartTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeChartTab === tab.id ? '#0f172a' : '#64748b',
                  boxShadow: activeChartTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Granularity Toggle (Daily / Weekly / Hourly) */}
          <div style={{ display: 'flex', gap: '4px', background: '#e0e7ff', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'daily', label: '📅 Daily' },
              { id: 'weekly', label: '🗓️ Weekly' },
              { id: 'hourly', label: '⏱️ Hourly' }
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGranularity(g.id)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: granularity === g.id ? '700' : '500',
                  background: granularity === g.id ? '#4338ca' : 'transparent',
                  color: granularity === g.id ? '#ffffff' : '#3730a3',
                  transition: 'all 0.15s ease'
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {['24h', '7d', '30d', 'all'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: timeframe === tf ? 'bold' : 'normal',
                  background: timeframe === tf ? '#2563eb' : 'transparent',
                  color: timeframe === tf ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading trend charts...
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: activeChartTab === 'all' ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' : '1fr',
          gap: '20px'
        }}>
          {/* Line Chart: Traffic Density & Speed Trend */}
          {(activeChartTab === 'all' || activeChartTab === 'trend') && (
            <div style={{
              background: '#f8fafc',
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>
                  📈 Traffic Density % & Speed Trend ({timeframe.toUpperCase()})
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>From /api/analytics/trends</span>
              </div>

              {formattedTrends.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No historical trend data available for this timeframe
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedTrends.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#ef4444"
                        domain={[0, 100]}
                        label={{ value: 'Density (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#ef4444' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#2563eb"
                        label={{ value: 'Speed (km/h)', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#2563eb' } }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="density"
                        name="Traffic Density (%)"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="speed"
                        name="Avg Speed (km/h)"
                        stroke="#2563eb"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Bar Chart: Vehicle Count by Location */}
          {(activeChartTab === 'all' || activeChartTab === 'volume') && (
            <div style={{
              background: '#f8fafc',
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>
                  📊 Vehicle Count by Monitored Location
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>From /api/analytics/busiest-locations</span>
              </div>

              {busiestLocs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No location volume data available
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={busiestLocs}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="location_name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="avg_vehicle_count" name="Avg Vehicle Count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="congestion_percentage" name="Congestion Rate (%)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendChart;
