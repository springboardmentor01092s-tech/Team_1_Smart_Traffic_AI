import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { injectCardTokens, lightTokens, darkTokens } from '../components/Card';
import Navbar from '../components/Navbar';

// Helper component for testing context
function ThemeConsumer() {
  const { theme, isManual, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-manual">{isManual ? 'true' : 'false'}</span>
      <button onClick={toggleTheme} data-testid="toggle-btn">Toggle</button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark-btn">Set Dark</button>
      <button onClick={() => setTheme('light')} data-testid="set-light-btn">Set Light</button>
    </div>
  );
}

describe('Theme Management & Dark Mode Support', () => {
  let matchMediaListeners = [];

  const setupMatchMediaMock = (matches = false) => {
    matchMediaListeners = [];
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn((listener) => {
        matchMediaListeners.push(listener);
      }),
      removeListener: vi.fn((listener) => {
        matchMediaListeners = matchMediaListeners.filter((l) => l !== listener);
      }),
      addEventListener: vi.fn((event, listener) => {
        if (event === 'change') {
          matchMediaListeners.push(listener);
        }
      }),
      removeEventListener: vi.fn((event, listener) => {
        if (event === 'change') {
          matchMediaListeners = matchMediaListeners.filter((l) => l !== listener);
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  };

  const triggerOSThemeChange = (matches) => {
    act(() => {
      matchMediaListeners.forEach((listener) => {
        listener({ matches, media: '(prefers-color-scheme: dark)' });
      });
    });
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    const existingStyle = document.getElementById('card-tokens');
    if (existingStyle) existingStyle.remove();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('injectCardTokens sets data-theme attribute and CSS custom properties on documentElement', () => {
    injectCardTokens('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const styleEl = document.getElementById('card-tokens');
    expect(styleEl).toBeInTheDocument();
    expect(styleEl.textContent).toContain(`--card-bg: ${darkTokens.cardBg}`);

    injectCardTokens('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(styleEl.textContent).toContain(`--card-bg: ${lightTokens.cardBg}`);
  });

  it('auto-detects OS dark mode preference when no localStorage preference is set', () => {
    setupMatchMediaMock(true); // OS prefers dark mode

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-manual').textContent).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('auto-detects OS light mode preference when no localStorage preference is set', () => {
    setupMatchMediaMock(false); // OS prefers light mode

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(screen.getByTestId('is-manual').textContent).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('uses saved localStorage preference on initial load over OS preference', () => {
    setupMatchMediaMock(false); // OS prefers light mode
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-manual').textContent).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('allows user to toggle theme manually and persists setting in localStorage', () => {
    setupMatchMediaMock(false); // OS is light

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    act(() => {
      fireEvent.click(screen.getByTestId('toggle-btn'));
    });

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(screen.getByTestId('is-manual').textContent).toBe('true');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('listens for live OS theme changes when user has NOT manually set a preference', () => {
    setupMatchMediaMock(false); // OS starts light

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');

    // Simulate OS switching to dark mode
    triggerOSThemeChange(true);

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores live OS theme changes once user has manually chosen a preference', () => {
    setupMatchMediaMock(false); // OS starts light

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // User manually toggles to dark
    act(() => {
      fireEvent.click(screen.getByTestId('toggle-btn'));
    });
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    // OS switches to light mode
    triggerOSThemeChange(false);

    // Should remain dark because user manual choice takes priority
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
  });

  it('renders theme toggle button in Navbar and toggles theme when clicked', () => {
    setupMatchMediaMock(false);

    render(
      <ThemeProvider>
        <MemoryRouter>
          <Navbar activeTab="map" setActiveTab={() => {}} />
        </MemoryRouter>
      </ThemeProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent(/🌙 Dark/i);

    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(toggleBtn).toHaveTextContent(/☀️ Light/i);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
