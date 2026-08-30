import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import PulsingMarker from './PulsingMarker';
import MapVignette from './MapVignette';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { getLiveTraffic } from '../api/trafficApi';

// Heatmap gradient matching traffic signal colors:
// 0.2: Green (Low), 0.45: Yellow (Moderate), 0.7: Orange (High), 1.0: Red (Severe)
const HEATMAP_GRADIENT = {
  0.25: '#10b981', // Green - Low
  0.50: '#f59e0b', // Yellow - Moderate
  0.75: '#f97316', // Orange - High
  1.00: '#ef4444'  // Red - Severe
};

// Component that manages L.heatLayer on Leaflet map instance with smooth interpolation animation
const HeatmapLayer = ({ points, radius = 30, blur = 18 }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  const animRef = useRef(null);
  const currentPointsRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    const layerOptions = {
      radius: radius,
      blur: blur,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.35,
      gradient: HEATMAP_GRADIENT
    };

    if (!heatLayerRef.current) {
      heatLayerRef.current = L.heatLayer(points, layerOptions).addTo(map);
      currentPointsRef.current = points;
    } else {
      // Smoothly animate intensity changes when polled updates arrive
      const startPoints = currentPointsRef.current;
      const targetPoints = points;

      if (startPoints.length !== targetPoints.length) {
        heatLayerRef.current.setLatLngs(targetPoints);
        currentPointsRef.current = targetPoints;
      } else {
        const startTime = performance.now();
        const duration = 800; // 800ms smooth lerp animation

        const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);

          const interpolated = targetPoints.map((target, idx) => {
            const start = startPoints[idx] || target;
            const lat = start[0] + (target[0] - start[0]) * progress;
            const lng = start[1] + (target[1] - start[1]) * progress;
            const intensity = start[2] + (target[2] - start[2]) * progress;
            return [lat, lng, intensity];
          });

          if (heatLayerRef.current) {
            heatLayerRef.current.setLatLngs(interpolated);
          }

          if (progress < 1) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            currentPointsRef.current = targetPoints;
          }
        };

        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(animate);
      }
    }
  }, [map, points, radius, blur]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map]);

  return null;
};

// Map Recenter Helper
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

const CongestionHeatMap = ({ refreshIntervalSec = 20 }) => {
  const [timeframe, setTimeframe] = useState('live'); // 'live' | '1h' | '24h'
  const [trafficPoints, setTrafficPoints] = useState([]);
  const [rawLocations, setRawLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [countdown, setCountdown] = useState(refreshIntervalSec);
  const [showMarkers, setShowMarkers] = useState(true);
  const [heatmapRadius, setHeatmapRadius] = useState(30);

  // Fetch live traffic data
  const fetchTraffic = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await getLiveTraffic(timeframe);
      const rows = Array.isArray(data) ? data : [];
      setRawLocations(rows);

      // Compute heatmap intensity for each point
      // Intensity = derived from speedRatio (current_speed / free_flow_speed) + vehicle_count weighting
      const parsedPoints = rows.map((loc) => {
        const lat = parseFloat(loc.latitude);
        const lng = parseFloat(loc.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;

        const currentSpeed = parseFloat(loc.current_speed ?? loc.average_speed_kmph ?? 30);
        const freeFlowSpeed = parseFloat(loc.free_flow_speed ?? 60);
        const vehicleCount = parseInt(loc.vehicle_count ?? 50, 10);

        // Calculate ratio (0 = gridlock, 1 = free flow)
        const ratio = freeFlowSpeed > 0 ? Math.min(1.0, Math.max(0.05, currentSpeed / freeFlowSpeed)) : 0.5;

        // Congestion score (1.0 = maximum congestion)
        let congestionScore = 1.0 - ratio;

        // Fallback or tweak by congestion_level string if present
        const level = (loc.congestion_level || '').toLowerCase();
        if (level === 'severe') congestionScore = Math.max(congestionScore, 0.85);
        if (level === 'high') congestionScore = Math.max(congestionScore, 0.65);
        if (level === 'moderate') congestionScore = Math.max(congestionScore, 0.40);
        if (level === 'low') congestionScore = Math.min(congestionScore, 0.25);

        // Vehicle count weight factor (0.0 to 1.0)
        const volumeWeight = Math.min(1.0, vehicleCount / 200.0);

        // Combined intensity formula (70% congestion ratio + 30% volume weight)
        const intensity = Math.min(1.0, Math.max(0.12, congestionScore * 0.75 + volumeWeight * 0.25));

        return [lat, lng, parseFloat(intensity.toFixed(3))];
      }).filter(Boolean);

      setTrafficPoints(parsedPoints);
      setLastRefreshed(new Date());
      setCountdown(refreshIntervalSec);
      setError('');
    } catch (err) {
      console.error('Heatmap traffic load error:', err);
      setError('Failed to fetch heat map traffic data');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Poll timer setup
  useEffect(() => {
    console.log(`[CongestionHeatMap] Mounted polling interval: ${refreshIntervalSec}s (timeframe=${timeframe})`);
    fetchTraffic(true);

    const pollInterval = setInterval(() => {
      console.log(`[CongestionHeatMap] Polling internal /api/traffic (timeframe=${timeframe})...`);
      fetchTraffic(false);
    }, refreshIntervalSec * 1000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : refreshIntervalSec));
    }, 1000);

    return () => {
      console.log(`[CongestionHeatMap] Cleared polling interval timers (${refreshIntervalSec}s)`);
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  }, [timeframe, refreshIntervalSec]);

  // Center calculation
  const mapCenter = useMemo(() => {
    if (trafficPoints.length > 0) {
      return [trafficPoints[0][0], trafficPoints[0][1]];
    }
    return [12.9716, 77.5946]; // Default fallback center (e.g. Bangalore)
  }, [trafficPoints]);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '14px',
      padding: '20px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 Dynamic Congestion Heat Map
            <span style={{ fontSize: '12px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
              LIVE POLL ({refreshIntervalSec}s)
            </span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Real-time heat intensity derived from speed ratio & vehicle count. Smoothly updates every {refreshIntervalSec} seconds.
          </p>
        </div>

        {/* Timeframe selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Time-range toggle */}
          <div style={{ background: '#f1f5f9', padding: '3px', borderRadius: '8px', display: 'flex', gap: '2px' }}>
            {[
              { id: 'live', label: '🔴 Live' },
              { id: '1h', label: '⏱️ Last 1h' },
              { id: '24h', label: '📅 Last 24h' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: timeframe === t.id ? '700' : '500',
                  background: timeframe === t.id ? '#2563eb' : 'transparent',
                  color: timeframe === t.id ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Toggle markers */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: showMarkers ? '#eff6ff' : '#ffffff',
              color: showMarkers ? '#1d4ed8' : '#475569',
              cursor: 'pointer'
            }}
          >
            {showMarkers ? '📍 Hide Markers' : '📍 Show Markers'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchTraffic(false)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            🔄 Sync ({countdown}s)
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Map Container */}
      <div style={{ position: 'relative', width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛰️</div>
            <div>Rendering Traffic Heat Map...</div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapRecenter center={mapCenter} />

            {/* Heatmap Layer overlay */}
            {trafficPoints.length > 0 && (
              <HeatmapLayer points={trafficPoints} radius={heatmapRadius} blur={20} />
            )}

            {/* Location Markers with detailed traffic Popups */}
            {showMarkers && rawLocations.map((loc) => {
              const lat = parseFloat(loc.latitude);
              const lng = parseFloat(loc.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;

              const currSpeed = loc.current_speed ?? loc.average_speed_kmph ?? 30;
              const freeSpeed = loc.free_flow_speed ?? 60;
              const ratio = freeSpeed > 0 ? (currSpeed / freeSpeed).toFixed(2) : '1.0';
              const level = (loc.congestion_level || 'low').toLowerCase();
              let badgeBg = '#10b981';
              if (level === 'moderate') badgeBg = '#f59e0b';
              if (level === 'high') badgeBg = '#f97316';
              if (level === 'severe') badgeBg = '#ef4444';

              const popupContent = (
                <Popup>
                  <div style={{ fontFamily: 'sans-serif', minWidth: '180px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>
                      {loc.location_name || 'Location'}
                    </h4>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
                      <div>Current Speed: <strong>{currSpeed} km/h</strong></div>
                      <div>Free Flow Speed: <strong>{freeSpeed} km/h</strong></div>
                      <div>Speed Ratio: <strong>{ratio}</strong></div>
                      <div>Vehicles: <strong>{loc.vehicle_count ?? 50}</strong></div>
                      <div>Congestion: <span style={{ background: badgeBg, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>{level}</span></div>
                    </div>
                  </div>
                </Popup>
              );

              if (level === 'high' || level === 'severe') {
                return (
                  <PulsingMarker
                    key={loc.location_id || `${lat}-${lng}`}
                    position={[lat, lng]}
                    severity={level}
                  >
                    {popupContent}
                  </PulsingMarker>
                );
              }

              const icon = L.divIcon({
                html: `
                  <div style="
                    background: ${badgeBg};
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 6px ${badgeBg};
                  "></div>
                `,
                className: 'heat-point-marker',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });

              return (
                <Marker key={loc.location_id || `${lat}-${lng}`} position={[lat, lng]} icon={icon}>
                  {popupContent}
                </Marker>
              );
            })}
          </MapContainer>
        )}
        <MapVignette cardColor="#ffffff" strength="medium" />

        {/* Heat Map Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(6px)',
          padding: '10px 14px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '11px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '220px'
        }}>
          <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
            <span>Congestion Intensity Legend</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Color Gradient Bar */}
          <div style={{
            height: '10px',
            borderRadius: '5px',
            background: 'linear-gradient(to right, #10b981 0%, #f59e0b 35%, #f97316 70%, #ef4444 100%)',
            width: '100%'
          }} />

          {/* Legend categories */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontWeight: '600' }}>
            <span style={{ color: '#059669' }}>🟢 Low (&lt;0.35)</span>
            <span style={{ color: '#d97706' }}>🟡 Mod (0.35-0.6)</span>
            <span style={{ color: '#ea580c' }}>🟠 High (0.6-0.8)</span>
            <span style={{ color: '#dc2626' }}>🔴 Severe (&gt;0.8)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CongestionHeatMap;
