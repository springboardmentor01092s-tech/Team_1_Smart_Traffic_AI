import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AlertsPanel from '../components/AlertsPanel';
import * as alertApi from '../api/alertApi';

vi.mock('../api/alertApi');

describe('AlertsPanel Component Tests', () => {
  const sampleAlerts = [
    {
      alert_id: 'alert-1',
      location_id: '11111111-1111-1111-1111-111111111111',
      severity: 'critical',
      message: 'Severe bottleneck gridlock detected on Expressway',
      status: 'active',
      created_at: '2026-08-22T10:00:00.000Z'
    },
    {
      alert_id: 'alert-2',
      location_id: '22222222-2222-2222-2222-222222222222',
      severity: 'warning',
      message: 'Moderate slow down near Downtown',
      status: 'active',
      created_at: '2026-08-22T09:30:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then displays alerts sorted by severity', async () => {
    alertApi.getAllAlerts.mockResolvedValue(sampleAlerts);

    render(<AlertsPanel />);
    expect(screen.getByText(/Loading live alerts.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Severe bottleneck gridlock detected on Expressway/i)).toBeInTheDocument();
      expect(screen.getByText(/Moderate slow down near Downtown/i)).toBeInTheDocument();
    });

    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('renders empty fallback message when no alerts are returned', async () => {
    alertApi.getAllAlerts.mockResolvedValue([]);

    render(<AlertsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/No unusual disruptions or active alerts matching criteria/i)).toBeInTheDocument();
    });
  });

  it('filters alerts when severity filter buttons are clicked', async () => {
    alertApi.getAllAlerts.mockResolvedValue(sampleAlerts);

    render(<AlertsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Severe bottleneck gridlock detected on Expressway/i)).toBeInTheDocument();
    });

    const warningBtn = screen.getByRole('button', { name: /warning/i });
    fireEvent.click(warningBtn);

    expect(screen.queryByText(/Severe bottleneck gridlock detected on Expressway/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Moderate slow down near Downtown/i)).toBeInTheDocument();
  });
});
