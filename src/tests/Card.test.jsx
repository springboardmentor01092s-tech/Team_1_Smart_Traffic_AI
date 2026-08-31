import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card, { cardTokens, CardDemo } from '../components/Card';

describe('Card Component Tests', () => {
  it('exports cardTokens design tokens correctly', () => {
    expect(cardTokens.radius).toBe('14px');
    expect(cardTokens.radiusSmall).toBe('10px');
    expect(cardTokens.shadowResting).toBeDefined();
    expect(cardTokens.shadowHover).toBeDefined();
  });

  it('renders flat variant with border and resting shadow', () => {
    const { container } = render(
      <Card variant="flat">
        <div>Flat Card Content</div>
      </Card>
    );

    expect(screen.getByText('Flat Card Content')).toBeInTheDocument();
    const cardEl = container.firstChild;
    expect(cardEl).toHaveClass('unified-card');
    expect(cardEl.style.borderLeft).toBe('');
  });

  it('renders accent variant with left border color', () => {
    const { container } = render(
      <Card variant="accent" accentColor="#ef4444">
        <div>Accent Card Content</div>
      </Card>
    );

    const cardEl = container.firstChild;
    expect(cardEl.style.borderLeft).toMatch(/4px solid/);
  });

  it('renders CardDemo without crashing', () => {
    const { container } = render(<CardDemo />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
