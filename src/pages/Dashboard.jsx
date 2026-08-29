import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import AlertsPanel from '../components/AlertsPanel';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import AnalyticsHeatDashboard from '../components/AnalyticsHeatDashboard';
import RouteInspector from '../components/RouteInspector';
import { getLatestTrafficData, triggerTrafficFetch } from '../api/trafficApi';
import { getDashboardSummary } from '../api/analyticsApi';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [locationsData, setLocationsData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardOverview();
  }, []);

  const fetchDashboardOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [trafficRes, summaryRes] = await Promise.allSettled([
        getLatestTrafficData(),
        getDashboardSummary()
      ]);

      if (trafficRes.status === 'fulfilled') {
        setLocationsData(Array.isArray(trafficRes.value) ? trafficRes.value : []);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
      setError('Could not connect to TrafficVision backend');
    } finally {
      setLoading(false);
    }
  };

  const handleTomTomSync = async () => {
    setSyncing(true);
    try {
      await triggerTrafficFetch();
      await fetchDashboardOverview();
      alert('Traffic data updated successfully!');
    } catch (err) {
      alert(`Sync failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onManualTrigger={handleTomTomSync}
      />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Syncing Indicator */}
        {syncing && (
          <div style={{ padding: '10px 16px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '500' }}>
            🛰️ Syncing live traffic data from TomTom API...
          </div>
        )}

        {/* Top KPI Metrics Bar */}
        {summary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Monitored Locations</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                📍 {summary.total_locations}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Active Disruptions / Alerts</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>
                🚨 {summary.active_alerts_count} <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 'normal' }}>({summary.critical_alerts_count} critical)</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>High Density Congestion</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '4px' }}>
                🔥 {summary.congested_locations_count} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>spots</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Network Avg Speed</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                ⚡ {summary.network_avg_speed_kmph} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>km/h</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 20px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
            ⚠️ {error} <button onClick={fetchDashboardOverview} style={{ marginLeft: '12px', padding: '4px 10px', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'map' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#334155' }}>📍 Real-Time Location Map & Density Highlighting</h3>
              <MapView locations={locationsData} onRefresh={fetchDashboardOverview} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#334155' }}>🚨 Live Alerts Feed</h3>
              <AlertsPanel />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <AlertsPanel />
          </div>
        )}

        {activeTab === 'analytics-heat' && (
          <div>
            <AnalyticsHeatDashboard />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <AnalyticsDashboard />
          </div>
        )}

        {activeTab === 'routes' && (
          <div>
            <RouteInspector />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
