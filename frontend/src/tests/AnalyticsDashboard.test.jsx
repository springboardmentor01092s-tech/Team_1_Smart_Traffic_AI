import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import * as analyticsApi from '../api/analyticsApi';

vi.mock('../api/analyticsApi');

// Mock Recharts components for headless jsdom testing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('AnalyticsDashboard Resilience Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders analytics headers and handles empty data gracefully without crashing', async () => {
    analyticsApi.getHistoricalTrends.mockResolvedValue([]);
    analyticsApi.getBusiestLocations.mockResolvedValue([]);
    analyticsApi.getMostCongestedRoutes.mockResolvedValue([]);
    analyticsApi.getAlertStats.mockResolvedValue({ by_severity: {}, total_alerts: 0 });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/System Traffic Analytics/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No historical trend data available/i)).toBeInTheDocument();
    expect(screen.getByText(/No location congestion data/i)).toBeInTheDocument();
    expect(screen.getByText(/No route congestion data available/i)).toBeInTheDocument();
  });

  it('renders charts cleanly when provided with full backend analytics data', async () => {
    analyticsApi.getHistoricalTrends.mockResolvedValue([
      { time_bucket: '2026-08-22T10:00:00.000Z', avg_speed_kmph: '45.0', avg_vehicle_count: '80', location_name: 'Loc 1' }
    ]);
    analyticsApi.getBusiestLocations.mockResolvedValue([
      { location_id: '1', location_name: 'Downtown', avg_speed_kmph: '20.0', congestion_percentage: '85.0' }
    ]);
    analyticsApi.getMostCongestedRoutes.mockResolvedValue([
      { route_id: 'r1', route_name: 'Expressway', route_avg_speed_kmph: '22.5', congested_segments_count: 3 }
    ]);
    analyticsApi.getAlertStats.mockResolvedValue({
      by_severity: { critical: 2, warning: 5, info: 10 },
      total_alerts: 17
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Speed & Volume Trends/i)).toBeInTheDocument();
    });

    const charts = screen.getAllByTestId('responsive-container');
    expect(charts.length).toBeGreaterThanOrEqual(4);
  });
});
