import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getPerformanceComparison } from '../api/analyticsApi';

/**
 * PerformanceComparisonView Component
 * Renders period-over-period comparative analysis (e.g., This Week vs. Last Week)
 * with percentage changes across speed, density, vehicle volume, and travel time.
 */
const PerformanceComparisonView = () => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState('7d_vs_prior'); // '7d_vs_prior' | '30d_vs_prior'

  useEffect(() => {
    fetchComparisonData();
  }, [preset]);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError('');
    try {
      let r1Start, r1End, r2Start, r2End;

      if (preset === '7d_vs_prior') {
        r1Start = "NOW() - INTERVAL '7 days'";
        r1End = "NOW()";
        r2Start = "NOW() - INTERVAL '14 days'";
        r2End = "NOW() - INTERVAL '7 days'";
      } else {
        r1Start = "NOW() - INTERVAL '30 days'";
        r1End = "NOW()";
        r2Start = "NOW() - INTERVAL '60 days'";
        r2End = "NOW() - INTERVAL '30 days'";
      }

      const res = await getPerformanceComparison(r1Start, r1End, r2Start, r2End, null);
      setComparison(res);
    } catch (err) {
      console.error('Error loading performance comparison:', err);
      setError('Failed to load performance comparison data');
    } finally {
      setLoading(false);
    }
  };

  const p1 = comparison?.period1?.metrics || { avgSpeed: 0, avgDensity: 0, avgVehicleCount: 0, avgTravelTimeMins: 0, avgUtilization: 0 };
  const p2 = comparison?.period2?.metrics || { avgSpeed: 0, avgDensity: 0, avgVehicleCount: 0, avgTravelTimeMins: 0, avgUtilization: 0 };
  const changes = comparison?.changes || { speed_pct_change: 0, density_pct_change: 0, vehicle_count_pct_change: 0, travel_time_pct_change: 0, utilization_pct_change: 0 };

  const chartData = [
    { metric: 'Avg Speed (km/h)', 'Current Period': p1.avgSpeed, 'Prior Period': p2.avgSpeed },
    { metric: 'Avg Density (%)', 'Current Period': p1.avgDensity, 'Prior Period': p2.avgDensity },
    { metric: 'Avg Vehicles', 'Current Period': p1.avgVehicleCount, 'Prior Period': p2.avgVehicleCount },
    { metric: 'Travel Time (mins)', 'Current Period': p1.avgTravelTimeMins, 'Prior Period': p2.avgTravelTimeMins }
  ];

  const renderDeltaBadge = (pct, isInverted = false) => {
    const isGood = isInverted ? pct < 0 : pct > 0;
    const color = isGood ? '#10b981' : '#ef4444';
    const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '▬';
    return (
      <span style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color,
        background: isGood ? '#ecfdf5' : '#fef2f2',
        padding: '2px 8px',
        borderRadius: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px'
      }}>
        {arrow} {pct > 0 ? `+${pct}` : pct}%
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
            📊 Comparative Performance Report View
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Period-over-period system benchmark comparison with metric percentage deltas
          </p>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {[
            { id: '7d_vs_prior', label: '7 Days vs Prior 7 Days' },
            { id: '30d_vs_prior', label: '30 Days vs Prior 30 Days' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: preset === item.id ? 'bold' : 'normal',
                background: preset === item.id ? '#2563eb' : 'transparent',
                color: preset === item.id ? '#ffffff' : '#475569'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Computing comparative metrics...</div>}
      {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* Summary Metric Cards with Deltas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px'
          }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>AVERAGE SPEED</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                {p1.avgSpeed} <span style={{ fontSize: '12px', color: '#64748b' }}>km/h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Prior: {p2.avgSpeed} km/h</span>
                {renderDeltaBadge(changes.speed_pct_change, false)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>TRAFFIC DENSITY</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                {p1.avgDensity} <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Prior: {p2.avgDensity}%</span>
                {renderDeltaBadge(changes.density_pct_change, true)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>AVG VEHICLE VOLUME</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                {p1.avgVehicleCount} <span style={{ fontSize: '12px', color: '#64748b' }}>v/loc</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Prior: {p2.avgVehicleCount}</span>
                {renderDeltaBadge(changes.vehicle_count_pct_change, false)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>AVG TRAVEL TIME</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                {p1.avgTravelTimeMins} <span style={{ fontSize: '12px', color: '#64748b' }}>mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Prior: {p2.avgTravelTimeMins} m</span>
                {renderDeltaBadge(changes.travel_time_pct_change, true)}
              </div>
            </div>
          </div>

          {/* Bar Chart Comparison Visual */}
          <div style={{ width: '100%', height: 260, background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar dataKey="Current Period" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prior Period" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceComparisonView;
