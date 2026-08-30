import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIInsightsPanel from '../components/AIInsightsPanel';
import * as recApi from '../api/recommendationsApi';
import * as routeApi from '../api/routeApi';

vi.mock('../api/recommendationsApi');
vi.mock('../api/routeApi');

describe('AIInsightsPanel Component Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "You\'re already on the fastest route" badge when status is already_optimal', async () => {
    recApi.getBottleneckPatterns.mockResolvedValue([]);
    routeApi.getAllRoutes.mockResolvedValue([
      { route_id: 'r1', name: 'Route A' }
    ]);
    recApi.getRecommendationHistory.mockResolvedValue([]);
    recApi.getLatestReportWithPlainSummary.mockResolvedValue({
      plain_summary: {
        sections: {
          congestion_trends: 'Smooth traffic',
          incidents: 'No incidents',
          road_performance: 'Normal speeds',
          ai_recommendations: 'Current routes optimal'
        }
      }
    });

    recApi.getRouteRecommendation.mockResolvedValue({
      status: 'already_optimal',
      recommendedRouteId: 'r1',
      recommendedRouteName: 'Route A',
      insteadOfRouteId: 'r1',
      insteadOfRouteName: 'Route A',
      originalEtaMins: 12.0,
      recommendedEtaMins: 12.0,
      minutesSaved: 0,
      congestionScoreOriginal: 1.5,
      congestionScoreRecommended: 1.5,
      improvementPct: 0,
      reason: 'Current route (Route A) is optimal; no alternate route offers a >= 15% lower congestion score.'
    });

    render(<AIInsightsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('recommendation-badge')).toBeInTheDocument();
    });

    expect(screen.getByText(/You're already on the fastest route/i)).toBeInTheDocument();
  });

  it('renders "Save ~X min via Route B" badge when status is alternate_available', async () => {
    recApi.getBottleneckPatterns.mockResolvedValue([]);
    routeApi.getAllRoutes.mockResolvedValue([
      { route_id: 'r1', name: 'Route A' }
    ]);
    recApi.getRecommendationHistory.mockResolvedValue([]);
    recApi.getLatestReportWithPlainSummary.mockResolvedValue(null);

    recApi.getRouteRecommendation.mockResolvedValue({
      status: 'alternate_available',
      recommendedRouteId: 'r2',
      recommendedRouteName: 'Route B',
      insteadOfRouteId: 'r1',
      insteadOfRouteName: 'Route A',
      originalEtaMins: 20.0,
      recommendedEtaMins: 12.0,
      minutesSaved: 8.0,
      congestionScoreOriginal: 2.8,
      congestionScoreRecommended: 1.8,
      improvementPct: 35.7,
      reason: 'Take Route B instead of Route A to avoid congestion.'
    });

    render(<AIInsightsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('recommendation-badge')).toBeInTheDocument();
    });

    expect(screen.getByText(/Save ~8 min via Route B/i)).toBeInTheDocument();
  });
});
