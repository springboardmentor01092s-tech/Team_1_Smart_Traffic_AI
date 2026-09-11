import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MapVignette, { MapVignetteDemo } from '../components/MapVignette';

describe('MapVignette Component Tests', () => {
  it('renders aria-hidden overlay with 4 edge gradient divs and corner fades', () => {
    const { container } = render(
      <div style={{ position: 'relative' }}>
        <MapVignette cardColor="#ffffff" strength="medium" corners={true} />
      </div>
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay.children.length).toBe(8); // 4 edges + 4 corners
  });

  it('renders without corners when corners prop is false', () => {
    const { container } = render(
      <div style={{ position: 'relative' }}>
        <MapVignette cardColor="#0f172a" strength="strong" corners={false} />
      </div>
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay.children.length).toBe(4); // 4 edges only
  });

  it('renders MapVignetteDemo without crashing', () => {
    const { container } = render(<MapVignetteDemo />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
