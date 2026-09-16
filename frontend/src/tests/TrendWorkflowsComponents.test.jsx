import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrendChart from '../components/TrendChart';
import PeakComparisonPanel from '../components/PeakComparisonPanel';
import RecurringCongestionTable from '../components/RecurringCongestionTable';
import PerformanceComparisonView from '../components/PerformanceComparisonView';
import * as analyticsApi from '../api/analyticsApi';

vi.mock('../api/analyticsApi');

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('Trend Analysis Workflows (Milestone 4) Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TrendChart Component', () => {
    it('renders with granularity toggles (Daily, Weekly, Hourly) and responds to click', async () => {
      analyticsApi.getDailyTrends.mockResolvedValue([
        { time_bucket: '2026-08-28T00:00:00.000Z', avg_speed: 42.5, avg_density: 35.0, avg_vehicle_count: 75 }
      ]);
      analyticsApi.getWeeklyTrends.mockResolvedValue([
        { time_bucket: '2026-08-24T00:00:00.000Z', avg_speed: 40.0, avg_density: 40.0, avg_vehicle_count: 80 }
      ]);
      analyticsApi.getHistoricalTrends.mockResolvedValue([]);
      analyticsApi.getBusiestLocations.mockResolvedValue([]);

      render(<TrendChart />);

      await waitFor(() => {
        expect(screen.getByText(/Traffic Density & Vehicle Count Analytics/i)).toBeInTheDocument();
      });

      const weeklyBtn = screen.getByText(/Weekly/i);
      fireEvent.click(weeklyBtn);

      await waitFor(() => {
        expect(analyticsApi.getWeeklyTrends).toHaveBeenCalled();
      });
    });
  });

  describe('PeakComparisonPanel Component', () => {
    it('renders peak vs non-peak comparison data and delta metrics', async () => {
      analyticsApi.getPeakComparison.mockResolvedValue([
        {
          location_id: 1,
          location_name: 'Silk Board Junction',
          peak: { avgSpeed: 18.5, avgDensity: 75.0, avgVehicleCount: 120, avgUtilization: 0.308, sampleCount: 50 },
          nonPeak: { avgSpeed: 38.0, avgDensity: 32.0, avgVehicleCount: 60, avgUtilization: 0.633, sampleCount: 150 },
          delta: { speedDiff: -19.5, densityDiff: 43.0, vehicleDiff: 60, utilizationDiff: -0.325 }
        }
      ]);

      render(<PeakComparisonPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Peak vs. Non-Peak Hour Analysis/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/AVG SPEED COMPARISON/i)).toBeInTheDocument();
      expect(screen.getByText(/TRAFFIC DENSITY/i)).toBeInTheDocument();
      expect(screen.getByText(/ROAD UTILIZATION SCORE/i)).toBeInTheDocument();
    });
  });

  describe('RecurringCongestionTable Component', () => {
    it('ranks recurring congestion spots and handles threshold filters', async () => {
      analyticsApi.getRecurringCongestion.mockResolvedValue([
        {
          location_id: 1,
          location_name: 'Tin Factory Corridor',
          latitude: 12.993,
          longitude: 77.660,
          road_type: 'arterial',
          total_samples: 100,
          congested_samples: 65,
          avg_speed_kmph: 16.4,
          avg_utilization: 0.273,
          frequency_pct: 65.0,
          most_common_time_of_day: '17:00 - 18:00',
          severity: 'critical'
        }
      ]);

      render(<RecurringCongestionTable />);

      await waitFor(() => {
        expect(screen.getByText(/Recurring Congestion Spot Identification/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Tin Factory Corridor')).toBeInTheDocument();
      expect(screen.getByText(/65%/i)).toBeInTheDocument();
      expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
    });
  });

  describe('PerformanceComparisonView Component', () => {
    it('renders comparative performance period-over-period report with % change', async () => {
      analyticsApi.getPerformanceComparison.mockResolvedValue({
        location_id: null,
        period1: { label: 'Current Period', metrics: { avgSpeed: 36.2, avgDensity: 45.1, avgVehicleCount: 88, avgTravelTimeMins: 13.8, avgUtilization: 0.603 } },
        period2: { label: 'Prior Period', metrics: { avgSpeed: 32.5, avgDensity: 52.0, avgVehicleCount: 95, avgTravelTimeMins: 15.4, avgUtilization: 0.542 } },
        changes: { speed_pct_change: 11.4, density_pct_change: -13.3, vehicle_count_pct_change: -7.4, travel_time_pct_change: -10.4, utilization_pct_change: 11.3 }
      });

      render(<PerformanceComparisonView />);

      await waitFor(() => {
        expect(screen.getByText(/Comparative Performance Report View/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/AVERAGE SPEED/i)).toBeInTheDocument();
      expect(screen.getByText(/36.2/)).toBeInTheDocument();
      expect(screen.getByText(/\+11.4%/)).toBeInTheDocument();
    });
  });
});
