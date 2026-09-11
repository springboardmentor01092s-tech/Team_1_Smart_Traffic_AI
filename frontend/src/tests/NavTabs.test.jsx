import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NavTabs, { NavTabsDemo } from '../components/NavTabs';

describe('NavTabs Component Tests', () => {
  const mockTabs = [
    { key: 'live-map', label: 'Live Map & Density', icon: '🗺️' },
    { key: 'heat-map', label: 'Heat Map & Analytics', icon: '🔥' },
    { key: 'insights', label: 'AI Insights & Reports', icon: '💡' }
  ];

  it('renders all tab buttons with labels and icons', () => {
    render(<NavTabs tabs={mockTabs} activeKey="heat-map" onChange={() => {}} />);

    expect(screen.getByText('Live Map & Density')).toBeInTheDocument();
    expect(screen.getByText('Heat Map & Analytics')).toBeInTheDocument();
    expect(screen.getByText('AI Insights & Reports')).toBeInTheDocument();
  });

  it('applies active class to active tab button', () => {
    render(<NavTabs tabs={mockTabs} activeKey="heat-map" onChange={() => {}} />);

    const activeBtn = screen.getByText('Heat Map & Analytics').closest('button');
    expect(activeBtn).toHaveClass('nav-tab--active');
  });

  it('triggers onChange when tab button is clicked', () => {
    const handleChange = vi.fn();
    render(<NavTabs tabs={mockTabs} activeKey="heat-map" onChange={handleChange} />);

    const targetBtn = screen.getByText('Live Map & Density').closest('button');
    fireEvent.click(targetBtn);

    expect(handleChange).toHaveBeenCalledWith('live-map');
  });

  it('renders NavTabsDemo without crashing', () => {
    const { container } = render(<NavTabsDemo />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
