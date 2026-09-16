import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FlowBackground, { FlowBackgroundDemo } from '../components/FlowBackground';

describe('FlowBackground Component', () => {
  it('renders aria-hidden background container with flow lines', () => {
    const { container } = render(
      <FlowBackground accentColor="#3b82f6" density={5} speed={10} opacity={0.2} direction="ltr" />
    );

    const rootElement = container.firstChild;
    expect(rootElement).toBeInTheDocument();
    expect(rootElement).toHaveAttribute('aria-hidden', 'true');

    const flowLines = container.querySelectorAll('.flow-line');
    expect(flowLines.length).toBe(5);
  });

  it('renders RTL flow lines correctly when direction is rtl', () => {
    const { container } = render(
      <FlowBackground accentColor="#f97316" density={4} direction="rtl" />
    );

    const flowLines = container.querySelectorAll('.flow-line');
    expect(flowLines.length).toBe(4);
    const lineStyle = window.getComputedStyle(flowLines[0]);
    expect(flowLines[0].style.animation).toContain('flow-travel-rtl');
  });

  it('renders FlowBackgroundDemo without crashing', () => {
    const { container } = render(<FlowBackgroundDemo />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
