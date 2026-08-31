import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import MapVignette from './MapVignette';
import 'leaflet/dist/leaflet.css';
import { generatePrediction } from '../api/predictionApi';

// Helper for icon styling based on congestion level & high density
const getMarkerIcon = (level, isHighDensity) => {
  let color = '#10B981'; // green for low
  let shadowColor = 'rgba(16, 185, 129, 0.4)';

  if (level === 'moderate') {
    color = '#F59E0B'; // yellow
    shadowColor = 'rgba(245, 158, 11, 0.4)';
  } else if (level === 'high') {
    color = '#F97316'; // orange
    shadowColor = 'rgba(249, 115, 22, 0.5)';
  } else if (level === 'severe') {
    color = '#EF4444'; // red
    shadowColor = 'rgba(239, 68, 68, 0.6)';
  }

  const pulseAnimation = isHighDensity
    ? `animation: marker-pulse 1.5s infinite ease-in-out;`
    : '';

  const size = isHighDensity ? 32 : 24;

  const html = `
    <div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 0 10px ${shadowColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${isHighDensity ? '14px' : '10px'};
      ${pulseAnimation}
    ">
      ${isHighDensity ? '🔥' : ''}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Component to dynamically adjust map center when location data changes
const MapRecenter = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const MapView = ({ locations = [], onRefresh }) => {
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictingLocId, setPredictingLocId] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');

  // Compute map center from locations list
  const validCoords = locations.filter(l => l.latitude && l.longitude);
  const defaultCenter = validCoords.length > 0
    ? [parseFloat(validCoords[0].latitude), parseFloat(validCoords[0].longitude)]
    : [12.9716, 77.5946]; // Default fallback

  const filteredLocations = filterLevel === 'all'
    ? locations
    : locations.filter(loc => {
        const lvl = (loc.congestion_level || loc.latest_congestion_level || 'low').toLowerCase();
        return lvl === filterLevel;
      });

  const handlePredict = async (locationId) => {
    setPredictingLocId(locationId);
    try {
      const result = await generatePrediction(locationId);
      setPredictionResult({
        locationId,
        data: result
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Prediction error: ${err.response?.data?.error || err.message}`);
    } finally {
      setPredictingLocId(null);
    }
  };

  return (
    <div className="map-view-container" style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {/* Map Control Header */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Filter Congestion:</span>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }}
        >
          <option value="all">All Levels ({locations.length})</option>
          <option value="low">🟢 Low</option>
          <option value="moderate">🟡 Moderate</option>
          <option value="high">🟠 High</option>
          <option value="severe">🔴 Severe</option>
        </select>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={defaultCenter} />

        {filteredLocations.map((loc) => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const level = (loc.congestion_level || loc.latest_congestion_level || 'low').toLowerCase();
          const vehicleCount = parseInt(loc.vehicle_count || loc.avg_vehicle_count || 0, 10);
          
          // Refined Heat Radius Logic:
          // Trigger heat radius for high/severe congestion, or when vehicle_count >= 100 on non-low roads.
          const isHighDensity = (level === 'high' || level === 'severe') || (vehicleCount >= 100 && level !== 'low');

          return (
            <React.Fragment key={loc.location_id || `${lat}-${lng}`}>
              {/* Render high-density heat radius circle */}
              {isHighDensity && (
                <Circle
                  center={[lat, lng]}
                  radius={400}
                  pathOptions={{
                    color: level === 'severe' ? '#EF4444' : '#F97316',
                    fillColor: level === 'severe' ? '#EF4444' : '#F97316',
                    fillOpacity: 0.25,
                    weight: 2
                  }}
                />
              )}

              <Marker
                position={[lat, lng]}
                icon={getMarkerIcon(level, isHighDensity)}
              >
                <Popup>
                  <div style={{ minWidth: '200px', fontFamily: 'sans-serif' }}>
                    <div style={{ borderBottom: '1px solid #e5e7eb', pb: '6px', mb: '8px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#111827' }}>
                        {loc.location_name || loc.name || 'Monitored Location'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>
                        Road Type: {loc.road_type || 'N/A'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Speed:</span><br />
                        <strong>{loc.avg_speed_kmph ?? loc.average_speed_kmph ?? loc.current_speed ?? 'N/A'} km/h</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Vehicles:</span><br />
                        <strong>{loc.avg_vehicle_count ?? loc.vehicle_count ?? 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Congestion:</span><br />
                        <span className={`badge badge-${level}`} style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                          {level}
                        </span>
                      </div>
                      {isHighDensity && (
                        <div>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔥 High Density</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handlePredict(loc.location_id)}
                      disabled={predictingLocId === loc.location_id}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {predictingLocId === loc.location_id ? 'Generating Prediction...' : '🤖 Predict Next 15m'}
                    </button>

                    {predictionResult && predictionResult.locationId === loc.location_id && (
                      <div style={{ marginTop: '8px', padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px' }}>
                        <strong>Predicted Congestion:</strong>{' '}
                        <span style={{ textTransform: 'uppercase', color: '#1d4ed8' }}>
                          {predictionResult.data?.prediction?.predicted_congestion}
                        </span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
      <MapVignette cardColor="#ffffff" strength="medium" />
    </div>
  );
};

export default MapView;
