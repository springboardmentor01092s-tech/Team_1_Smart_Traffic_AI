import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ activeTab, setActiveTab, onManualTrigger }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.getItem('token') && localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { id: 'map', label: '🗺️ Live Map & Density', icon: '🗺️' },
    { id: 'analytics-heat', label: '🔥 Heat Map & Analytics', icon: '🔥' },
    { id: 'alerts', label: '🚨 Unusual Disruptions', icon: '🚨' },
    { id: 'analytics', label: '📊 Trends Analytics', icon: '📊' },
    { id: 'routes', label: '🛣️ Route Inspector', icon: '🛣️' }
  ];

  return (
    <header style={{
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* View Mode Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '8px' }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === item.id ? '600' : '400',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === item.id ? '#2563eb' : 'transparent',
              color: activeTab === item.id ? '#ffffff' : '#cbd5e1',
              transition: 'all 0.2s ease'
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Action Buttons & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
