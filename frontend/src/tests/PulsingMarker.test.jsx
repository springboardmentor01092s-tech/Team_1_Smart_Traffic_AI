import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PulsingMarker from '../components/PulsingMarker';

vi.mock('react-leaflet', () => ({
  Marker: ({ children, position, icon }) => (
    <div data-testid="pulsing-marker" data-lat={position[0]} data-lng={position[1]}>
      <div data-testid="marker-icon">{icon?.options?.html}</div>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
}));

describe('PulsingMarker Component Tests', () => {
  it('renders leaflet marker with expanding-ring CSS pulse icon for severe severity', () => {
    render(
      <PulsingMarker position={[12.9716, 77.5946]} severity="severe">
        <span>Severe Bottleneck</span>
      </PulsingMarker>
    );

    const marker = screen.getByTestId('pulsing-marker');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-lat', '12.9716');
    expect(marker).toHaveAttribute('data-lng', '77.5946');

    const iconHtml = screen.getByTestId('marker-icon').textContent;
    expect(iconHtml).toContain('pulsing-marker');
    expect(iconHtml).toContain('pulsing-marker__ring');
    expect(iconHtml).toContain('#ef4444'); // Red for severe
    expect(iconHtml).toContain('1.4s'); // Faster 1.4s pulse for severe
    expect(screen.getByText('Severe Bottleneck')).toBeInTheDocument();
  });

  it('renders orange pulse icon with 2.2s duration for high severity', () => {
    render(
      <PulsingMarker position={[12.9352, 77.6245]} severity="high">
        <span>High Congestion Spot</span>
      </PulsingMarker>
    );

    const iconHtml = screen.getByTestId('marker-icon').textContent;
    expect(iconHtml).toContain('#f97316'); // Orange for high
    expect(iconHtml).toContain('2.2s');
  });
});
