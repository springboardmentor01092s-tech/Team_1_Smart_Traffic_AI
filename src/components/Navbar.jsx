import React from 'react';
import { useNavigate } from 'react-router-dom';
import FlowBackground from './FlowBackground';
import NavTabs from './NavTabs';

const Navbar = ({ activeTab, setActiveTab, onManualTrigger }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.getItem('token') && localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { key: 'map', label: 'Live Map & Density', icon: '🗺️' },
    { key: 'analytics-heat', label: 'Heat Map & Analytics', icon: '🔥' },
    { key: 'insights', label: 'AI Insights & Reports', icon: '💡' },
    { key: 'alerts', label: 'Disruptions', icon: '🚨' },
    { key: 'analytics', label: 'Trends Analytics', icon: '📊' },
    { key: 'routes', label: 'Route Inspector', icon: '🛣️' }
  ];

  return (
    <header style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#ffffff',
      padding: '14px 24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      justify: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <FlowBackground accentColor="#3b82f6" density={7} speed={12} opacity={0.25} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: '20px',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
        }}>
          🚦
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            TrafficVision <span style={{ color: '#60a5fa' }}>AI</span>
          </h1>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Smart Prediction & Congestion Management</span>
        </div>
      </div>

      {/* Sliding Underline Navigation Tabs */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <NavTabs
          tabs={navItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          accentColor="#3b82f6"
        />
      </div>

      {/* Action Buttons & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
        {onManualTrigger && (
          <button
            onClick={onManualTrigger}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Fetch latest traffic data from TomTom API"
          >
            🛰️ Sync TomTom Data
          </button>
        )}

        <button
          onClick={handleLogout}
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            background: '#ef4444',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
