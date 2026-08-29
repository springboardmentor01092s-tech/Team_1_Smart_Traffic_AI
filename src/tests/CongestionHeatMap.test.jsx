import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CongestionHeatMap from '../components/CongestionHeatMap';
import * as trafficApi from '../api/trafficApi';

vi.mock('../api/trafficApi');

vi.mock('leaflet', () => ({
  default: {
    heatLayer: () => ({
      addTo: vi.fn().mockReturnThis(),
      setLatLngs: vi.fn(),
      remove: vi.fn()
    }),
    divIcon: () => ({})
  },
  heatLayer: () => ({
    addTo: vi.fn().mockReturnThis(),
    setLatLngs: vi.fn(),
    remove: vi.fn()
  }),
  divIcon: () => ({})
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 12,
    removeLayer: vi.fn()
  })
}));

describe('CongestionHeatMap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heat map header, map container, and controls on initial load', async () => {
    trafficApi.getLiveTraffic.mockResolvedValue([
      {
        location_id: 'loc-1',
        location_name: 'Downtown Arterial',
        latitude: '12.9716',
        longitude: '77.5946',
        current_speed: '25.0',
        free_flow_speed: '50.0',
        vehicle_count: 85,
        congestion_level: 'high'
      }
    ]);

    render(<CongestionHeatMap refreshIntervalSec={30} />);

    await waitFor(() => {
      expect(screen.getByText(/Dynamic Congestion Heat Map/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByText(/Congestion Intensity Legend/i)).toBeInTheDocument();
  });

  it('handles loading state during traffic data fetch', () => {
    trafficApi.getLiveTraffic.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<CongestionHeatMap />);

    expect(screen.getByText(/Rendering Traffic Heat Map/i)).toBeInTheDocument();
  });

  it('renders error banner gracefully on API failure', async () => {
    trafficApi.getLiveTraffic.mockRejectedValue(new Error('Network error'));

    render(<CongestionHeatMap />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch heat map traffic data/i)).toBeInTheDocument();
    });
  });
});
