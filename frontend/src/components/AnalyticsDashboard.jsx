import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  getHistoricalTrends, getBusiestLocations, getMostCongestedRoutes, getAlertStats
} from '../api/analyticsApi';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

const AnalyticsDashboard = () => {
  const [trends, setTrends] = useState([]);
  const [busiestLocs, setBusiestLocs] = useState([]);
  const [congestedRoutes, setCongestedRoutes] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trendsRes, busiestRes, routesRes, alertsRes] = await Promise.allSettled([
        getHistoricalTrends(timeframe),
        getBusiestLocations(8, timeframe),
        getMostCongestedRoutes(8),
        getAlertStats()
      ]);

      if (trendsRes.status === 'fulfilled') {
        setTrends(Array.isArray(trendsRes.value) ? trendsRes.value : []);
      }
      if (busiestRes.status === 'fulfilled') {
        setBusiestLocs(Array.isArray(busiestRes.value) ? busiestRes.value : []);
      }
      if (routesRes.status === 'fulfilled') {
        setCongestedRoutes(Array.isArray(routesRes.value) ? routesRes.value : []);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlertStats(alertsRes.value || null);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setError('Failed to load some analytics components');
    } finally {
      setLoading(false);
    }
  };

  // Format historical trends data for chart
  const formattedTrends = trends.map(item => ({
    time: item.time_bucket ? new Date(item.time_bucket).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : 'N/A',
    speed: parseFloat(item.avg_speed_kmph || 0),
    vehicles: parseInt(item.avg_vehicle_count || 0, 10),
    location: item.location_name || 'Location'
  }));

  // Format alert stats pie chart data
  const severityPieData = alertStats?.by_severity
    ? Object.entries(alertStats.by_severity).map(([sev, count]) => ({
        name: sev.toUpperCase(),
        value: parseInt(count, 10) || 0
      }))
    : [];

  return (
    <div className="analytics-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Timeframe Filter Bar */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>📊 System Traffic Analytics</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Time Range:</span>
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
                background: timeframe === tf ? '#2563eb' : '#f3f4f6',
                color: timeframe === tf ? 'white' : '#374151'
              }}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>Loading visual analytics...</div>}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
          {/* Chart 1: Historical Traffic Speed & Vehicle Volume Trends */}
          <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#374151' }}>📈 Speed & Volume Trends ({timeframe})</h4>
            {formattedTrends.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No historical trend data available</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedTrends.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#2563eb" label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'Vehicles', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="speed" name="Avg Speed (km/h)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="vehicles" name="Avg Vehicles" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Busiest Monitored Locations */}
          <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#374151' }}>📍 Busiest Monitored Locations</h4>
            {busiestLocs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No location congestion data</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={busiestLocs}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="location_name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_speed_kmph" name="Avg Speed (km/h)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="congestion_percentage" name="Congestion %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Most Congested Corridors / Routes */}
          <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#374151' }}>🛣️ Most Congested Routes</h4>
            {congestedRoutes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No route congestion data available</div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={congestedRoutes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="route_name" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="route_avg_speed_kmph" name="Route Avg Speed (km/h)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="congested_segments_count" name="Congested Segments" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 4: Disruption Alerts Severity Distribution */}
          <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#374151' }}>🚨 Disruption Alerts Breakdown</h4>
            {severityPieData.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No alert statistics available</div>
            ) : (
              <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {severityPieData.map((entry, index) => {
                        let fill = COLORS[index % COLORS.length];
                        if (entry.name === 'CRITICAL') fill = '#ef4444';
                        if (entry.name === 'WARNING') fill = '#f59e0b';
                        if (entry.name === 'INFO') fill = '#3b82f6';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
