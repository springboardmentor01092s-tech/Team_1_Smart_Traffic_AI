import React from 'react';

/**
 * KPICard Component
 * Displays key traffic metrics with trend arrows, percentage change, and inline sparkline SVG.
 */
const KPICard = ({
  title,
  value,
  unit = '',
  trend = 0,
  trendLabel = 'vs last period',
  sparklineData = [30, 40, 35, 50, 49, 60, 70, 65, 80],
  icon = '📊',
  accentColor = '#2563eb',
  isInvertedTrend = false, // If true, positive trend is negative (e.g. density/delay)
  loading = false
}) => {
  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        animation: 'pulse 1.5s infinite ease-in-out'
      }}>
        <div style={{ height: '14px', width: '60%', background: '#e2e8f0', borderRadius: '4px' }} />
        <div style={{ height: '28px', width: '40%', background: '#cbd5e1', borderRadius: '6px', margin: '10px 0' }} />
        <div style={{ height: '12px', width: '80%', background: '#f1f5f9', borderRadius: '4px' }} />
      </div>
    );
  }

  // Calculate trend direction & color
  const isPositive = trend > 0;
  const isNeutral = trend === 0;
  
  // Is this trend good or bad?
  let isGood = isPositive;
  if (isInvertedTrend) {
    isGood = !isPositive;
  }

  let trendColor = '#10b981'; // Green for good
  if (!isNeutral && !isGood) {
    trendColor = '#ef4444'; // Red for bad
  } else if (isNeutral) {
    trendColor = '#64748b'; // Gray for neutral
  }

  const arrow = isPositive ? '▲' : isNeutral ? '➔' : '▼';

  // Render SVG Sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const width = 100;
    const height = 32;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData) || 1;
    const range = max - min || 1;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${title.replace(/\s+/g, '')})`} />
        <polyline
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${accentColor}`,
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      {/* Top row: Icon + Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        <span style={{
          fontSize: '18px',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: `${accentColor}15`,
          display: 'flex',
          alignItems: 'center',
          justify: 'center'
        }}>
          {icon}
        </span>
      </div>

      {/* Middle row: Value + Sparkline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 0 10px 0' }}>
        <div>
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>{unit}</span>}
        </div>
        <div style={{ marginLeft: '12px' }}>
          {renderSparkline()}
        </div>
      </div>

      {/* Bottom row: Trend indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 7px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '700',
          background: `${trendColor}18`,
          color: trendColor
        }}>
          {arrow} {Math.abs(trend)}%
        </span>
        <span style={{ color: '#94a3b8', fontSize: '11px' }}>{trendLabel}</span>
      </div>
    </div>
  );
};

export default KPICard;
