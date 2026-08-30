import React, { useState, useEffect } from 'react';
import KPICard from './KPICard';
import CongestionHeatMap from './CongestionHeatMap';
import TrendChart from './TrendChart';
import SpeedPanel from './SpeedPanel';
import TravelTimeWidget from './TravelTimeWidget';
import CongestedRoutesTable from './CongestedRoutesTable';
import { getDashboardSummary } from '../api/analyticsApi';

/**
 * AnalyticsHeatDashboard Component
 * Single-page interactive Analytics & Heat Map Dashboard module for TrafficVision AI.
 */
const AnalyticsHeatDashboard = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState('');
  const [globalTimeframe, setGlobalTimeframe] = useState('7d');
  const [autoRefreshIntervalSec, setAutoRefreshIntervalSec] = useState(20);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const data = await getDashboardSummary();
      setSummaryData(data);
    } catch (err) {
      console.error('Error loading dashboard summary KPIs:', err);
      setError('Failed to fetch dashboard summary KPIs');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Sparkline mock trends for KPI strip (derived or visually illustrative)
  const sparklines = {
    locations: [8, 9, 9, 10, 10, 10, 10, 10],
    density: [55, 60, 52, 48, 62, 70, 58, 48.5],
    vehicles: [70, 75, 82, 90, 88, 95, 84, 82],
    speed: [32, 34, 30, 28, 33, 36, 35, 35.5],
    travelTime: [18, 17, 19, 21, 16, 15, 14.8, 14.2]
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '8px 0 32px 0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Module Title & Global Control Strip */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            color: '#fff'
          }}>
            🔥
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
              TrafficVision AI Analytics & Heat Map Module
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Real-time congestion heat mapping, speed performance ratios, travel time forecasts & route metrics
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Refresh interval config */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' }}>
            <span>⚡ Refresh Rate:</span>
            <select
              value={autoRefreshIntervalSec}
              onChange={(e) => setAutoRefreshIntervalSec(Number(e.target.value))}
              style={{ border: 'none', background: 'transparent', fontWeight: 'bold', cursor: 'pointer', color: '#0f172a' }}
            >
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <button
            onClick={fetchSummary}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            🔄 Sync All Dashboards
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: '#fef2f2', color: '#991b1b', borderRadius: '10px', border: '1px solid #fecaca', fontSize: '14px' }}>
          ⚠️ {error} <button onClick={fetchSummary} style={{ marginLeft: '12px', padding: '4px 10px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* SECTION 1: TOP SUMMARY CARDS (KPI Strip) */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px'
      }}>
        <KPICard
          title="Monitored Locations"
          value={summaryData?.total_locations ?? 10}
          unit="spots"
          trend={+4.2}
          trendLabel="vs last week"
          sparklineData={sparklines.locations}
          icon="📍"
          accentColor="#3b82f6"
          loading={loadingSummary}
        />
        <KPICard
          title="Avg Traffic Density"
          value={summaryData?.avg_traffic_density ?? 48.5}
          unit="%"
          trend={-3.1}
          trendLabel="density change"
          sparklineData={sparklines.density}
          icon="🔥"
          accentColor="#ef4444"
          isInvertedTrend={true}
          loading={loadingSummary}
        />
        <KPICard
          title="Avg Vehicle Volume"
          value={summaryData?.avg_vehicle_count ?? 82}
          unit="v/loc"
          trend={+5.8}
          trendLabel="vs prior period"
          sparklineData={sparklines.vehicles}
          icon="🚗"
          accentColor="#f59e0b"
          loading={loadingSummary}
        />
        <KPICard
          title="Network Avg Speed"
          value={summaryData?.network_avg_speed_kmph ?? 35.5}
          unit="km/h"
          trend={+2.4}
          trendLabel="speed recovery"
          sparklineData={sparklines.speed}
          icon="⚡"
          accentColor="#10b981"
          loading={loadingSummary}
        />
        <KPICard
          title="Avg Travel Time"
          value={summaryData?.avg_travel_time_mins ?? 14.2}
          unit="mins"
          trend={-1.8}
          trendLabel="trip time decrease"
          sparklineData={sparklines.travelTime}
          icon="⏱️"
          accentColor="#8b5cf6"
          isInvertedTrend={true}
          loading={loadingSummary}
        />
      </section>

      {/* SECTION 2: DYNAMIC CONGESTION HEAT MAP */}
      <section>
        <CongestionHeatMap refreshIntervalSec={autoRefreshIntervalSec} />
      </section>

      {/* SECTION 3: TRAFFIC DENSITY & VEHICLE COUNT CHARTS */}
      <section>
        <TrendChart initialTimeframe={globalTimeframe} />
      </section>

      {/* SECTION 4 & 5: AVERAGE SPEED PANEL & TRAVEL TIME WIDGET (Side-by-Side Grid) */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '24px'
      }}>
        <SpeedPanel />
        <TravelTimeWidget />
      </section>

      {/* SECTION 6: MOST CONGESTED ROUTES TABLE */}
      <section>
        <CongestedRoutesTable limit={15} />
      </section>
    </div>
  );
};

export default AnalyticsHeatDashboard;
