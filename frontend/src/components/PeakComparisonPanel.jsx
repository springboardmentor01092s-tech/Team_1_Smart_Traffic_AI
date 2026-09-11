import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getPeakComparison } from '../api/analyticsApi';

/**
 * PeakComparisonPanel Component
 * Displays side-by-side comparison of Peak vs. Non-Peak traffic performance metrics
 * (Speed, Density, Road Utilization) driven by /api/analytics/peak-comparison.
 */
const PeakComparisonPanel = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('30d');
  const [selectedLocId, setSelectedLocId] = useState('all');

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPeakComparison(null, range);
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error loading peak comparison:', err);
      setError('Failed to fetch Peak vs Non-Peak comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Filter or aggregate data for display
  const activeLocation = selectedLocId === 'all'
    ? null
    : data.find(item => item.location_id === selectedLocId);

  // Compute aggregate numbers if 'all' selected
  let summary = {
    peakSpeed: 0,
    nonPeakSpeed: 0,
    peakDensity: 0,
    nonPeakDensity: 0,
    peakUtilization: 0,
    nonPeakUtilization: 0,
    speedDelta: 0,
    densityDelta: 0,
    utilizationDelta: 0
  };

  if (activeLocation) {
    summary = {
      peakSpeed: activeLocation.peak.avgSpeed,
      nonPeakSpeed: activeLocation.nonPeak.avgSpeed,
      peakDensity: activeLocation.peak.avgDensity,
      nonPeakDensity: activeLocation.nonPeak.avgDensity,
      peakUtilization: activeLocation.peak.avgUtilization,
      nonPeakUtilization: activeLocation.nonPeak.avgUtilization,
      speedDelta: activeLocation.delta.speedDiff,
      densityDelta: activeLocation.delta.densityDiff,
      utilizationDelta: activeLocation.delta.utilizationDiff
    };
  } else if (data.length > 0) {
    const total = data.length;
    const peakSpeedSum = data.reduce((acc, curr) => acc + (curr.peak.avgSpeed || 0), 0);
    const nonPeakSpeedSum = data.reduce((acc, curr) => acc + (curr.nonPeak.avgSpeed || 0), 0);
    const peakDensitySum = data.reduce((acc, curr) => acc + (curr.peak.avgDensity || 0), 0);
    const nonPeakDensitySum = data.reduce((acc, curr) => acc + (curr.nonPeak.avgDensity || 0), 0);
    const peakUtilSum = data.reduce((acc, curr) => acc + (curr.peak.avgUtilization || 0), 0);
    const nonPeakUtilSum = data.reduce((acc, curr) => acc + (curr.nonPeak.avgUtilization || 0), 0);

    const peakSpeed = parseFloat((peakSpeedSum / total).toFixed(2));
    const nonPeakSpeed = parseFloat((nonPeakSpeedSum / total).toFixed(2));
    const peakDensity = parseFloat((peakDensitySum / total).toFixed(1));
    const nonPeakDensity = parseFloat((nonPeakDensitySum / total).toFixed(1));
    const peakUtilization = parseFloat((peakUtilSum / total).toFixed(3));
    const nonPeakUtilization = parseFloat((nonPeakUtilSum / total).toFixed(3));

    summary = {
      peakSpeed,
      nonPeakSpeed,
      peakDensity,
      nonPeakDensity,
      peakUtilization,
      nonPeakUtilization,
      speedDelta: parseFloat((peakSpeed - nonPeakSpeed).toFixed(2)),
      densityDelta: parseFloat((peakDensity - nonPeakDensity).toFixed(1)),
      utilizationDelta: parseFloat((peakUtilization - nonPeakUtilization).toFixed(3))
    };
  }

  // Format chart data
  const chartData = (selectedLocId === 'all' ? data.slice(0, 8) : [activeLocation].filter(Boolean)).map(item => ({
    name: item.location_name.length > 15 ? item.location_name.substring(0, 14) + '…' : item.location_name,
    'Peak Speed (km/h)': item.peak.avgSpeed,
    'Non-Peak Speed (km/h)': item.nonPeak.avgSpeed,
    'Peak Density (%)': item.peak.avgDensity,
    'Non-Peak Density (%)': item.nonPeak.avgDensity
  }));

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
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            ⏰ Peak vs. Non-Peak Hour Analysis
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Configurable Peak Windows (08:00–10:00 & 17:00–20:00) performance comparison
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Location Selector */}
          <select
            value={selectedLocId}
            onChange={(e) => setSelectedLocId(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <option value="all">📍 All Monitored Locations</option>
            {data.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>

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

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Analyzing peak hours...</div>}
      {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

      {!loading && !error && (
        <>
          {/* Metric Delta Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600' }}>AVG SPEED COMPARISON</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', marginTop: '4px' }}>
                {summary.peakSpeed} km/h <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>vs {summary.nonPeakSpeed} km/h</span>
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px', color: summary.speedDelta < 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                {summary.speedDelta < 0 ? '📉' : '📈'} Peak Delta: {summary.speedDelta > 0 ? `+${summary.speedDelta}` : summary.speedDelta} km/h
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: '600' }}>TRAFFIC DENSITY</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#7f1d1d', marginTop: '4px' }}>
                {summary.peakDensity}% <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>vs {summary.nonPeakDensity}%</span>
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px', color: summary.densityDelta > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                {summary.densityDelta > 0 ? '🔥' : '✅'} Density Surge: {summary.densityDelta > 0 ? `+${summary.densityDelta}` : summary.densityDelta}%
              </div>
            </div>

            <div style={{ background: '#fffbe6', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600' }}>ROAD UTILIZATION SCORE</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#78350f', marginTop: '4px' }}>
                {(summary.peakUtilization * 100).toFixed(1)}% <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>vs {(summary.nonPeakUtilization * 100).toFixed(1)}%</span>
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px', color: '#d97706', fontWeight: 'bold' }}>
                ⚡ Speed-Ratio: {summary.peakUtilization} (Peak)
              </div>
            </div>
          </div>

          {/* Side-by-Side Recharts BarChart */}
          <div style={{ width: '100%', height: 280, background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar dataKey="Peak Speed (km/h)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Non-Peak Speed (km/h)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default PeakComparisonPanel;
