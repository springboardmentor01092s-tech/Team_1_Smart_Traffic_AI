import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsHeatDashboard from '../components/AnalyticsHeatDashboard';
import * as analyticsApi from '../api/analyticsApi';
import * as trafficApi from '../api/trafficApi';
import * as routeApi from '../api/routeApi';

vi.mock('../api/analyticsApi');
vi.mock('../api/trafficApi');
vi.mock('../api/routeApi');

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
  useMap: () => ({ setView: vi.fn(), getZoom: () => 12, removeLayer: vi.fn() })
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  Area: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('AnalyticsHeatDashboard Main Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders module title and KPI cards with mock summary data', async () => {
    analyticsApi.getDashboardSummary.mockResolvedValue({
      total_locations: 12,
      avg_traffic_density: 52.4,
      avg_vehicle_count: 94,
      network_avg_speed_kmph: 38.2,
      avg_travel_time_mins: 15.6,
      congested_locations_count: 3
    });

    trafficApi.getLiveTraffic.mockResolvedValue([]);
    analyticsApi.getHistoricalTrends.mockResolvedValue([]);
    analyticsApi.getBusiestLocations.mockResolvedValue([]);
    analyticsApi.getMostCongestedRoutes.mockResolvedValue([]);
    routeApi.getAllRoutes.mockResolvedValue([]);

    render(<AnalyticsHeatDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/TrafficVision AI Analytics & Heat Map Module/i)).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('52.4')).toBeInTheDocument();
    expect(screen.getByText('94')).toBeInTheDocument();
    expect(screen.getByText('38.2')).toBeInTheDocument();
  });

  it('displays error message when summary fetch fails', async () => {
    analyticsApi.getDashboardSummary.mockRejectedValue(new Error('KPI fetch failed'));
    trafficApi.getLiveTraffic.mockResolvedValue([]);
    analyticsApi.getHistoricalTrends.mockResolvedValue([]);
    analyticsApi.getBusiestLocations.mockResolvedValue([]);
    analyticsApi.getMostCongestedRoutes.mockResolvedValue([]);
    routeApi.getAllRoutes.mockResolvedValue([]);

    render(<AnalyticsHeatDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch dashboard summary KPIs/i)).toBeInTheDocument();
    });
  });
});
