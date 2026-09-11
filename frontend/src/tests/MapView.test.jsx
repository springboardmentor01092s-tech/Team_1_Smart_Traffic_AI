import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapView from '../components/MapView';

// Mock react-leaflet components for headless jsdom testing
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position }) => (
    <div data-testid="map-marker" data-lat={position[0]} data-lng={position[1]}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
  Circle: ({ radius }) => <div data-testid="high-density-circle" data-radius={radius} />,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 12 }),
}));

describe('MapView Component Tests', () => {
  const sampleLocations = [
    {
      location_id: 'loc-1',
      name: 'Downtown Intersection',
      latitude: '12.9716',
      longitude: '77.5946',
      average_speed_kmph: '15.00',
      vehicle_count: 140,
      congestion_level: 'severe',
      road_type: 'highway'
    },
    {
      location_id: 'loc-2',
      name: 'Suburban Arterial',
      latitude: '12.9352',
      longitude: '77.6245',
      average_speed_kmph: '55.00',
      vehicle_count: 35,
      congestion_level: 'low',
      road_type: 'arterial'
    }
  ];

  it('renders the map container and filter header', () => {
    render(<MapView locations={sampleLocations} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByText(/Filter Congestion:/i)).toBeInTheDocument();
  });

  it('renders markers for all provided locations', () => {
    render(<MapView locations={sampleLocations} />);
    const markers = screen.getAllByTestId('map-marker');
    expect(markers.length).toBe(2);
  });

  it('renders high-density heat radius circle for severe/high vehicle count locations', () => {
    render(<MapView locations={sampleLocations} />);
    const densityCircles = screen.getAllByTestId('high-density-circle');
    expect(densityCircles.length).toBe(1);
    expect(densityCircles[0]).toHaveAttribute('data-radius', '400');
  });
});
