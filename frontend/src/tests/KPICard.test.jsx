import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KPICard from '../components/KPICard';

describe('KPICard Component', () => {
  it('renders KPI metric, unit, trend percentage, and title correctly', () => {
    render(
      <KPICard
        title="Network Avg Speed"
        value={42.5}
        unit="km/h"
        trend={3.2}
        trendLabel="vs last week"
        icon="⚡"
        accentColor="#10b981"
      />
    );

    expect(screen.getByText(/Network Avg Speed/i)).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
    expect(screen.getByText(/3.2%/i)).toBeInTheDocument();
    expect(screen.getByText(/vs last week/i)).toBeInTheDocument();
  });

  it('renders loading skeleton when loading prop is true', () => {
    const { container } = render(
      <KPICard
        title="Avg Traffic Density"
        value={65.0}
        loading={true}
      />
    );

    expect(screen.queryByText('65.0')).not.toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles inverted trend colors correctly for negative metrics (e.g. density)', () => {
    render(
      <KPICard
        title="Traffic Density"
        value={75.0}
        trend={-5.4}
        isInvertedTrend={true}
        accentColor="#ef4444"
      />
    );

    expect(screen.getByText(/Traffic Density/i)).toBeInTheDocument();
    expect(screen.getByText(/5.4%/i)).toBeInTheDocument();
  });
});
