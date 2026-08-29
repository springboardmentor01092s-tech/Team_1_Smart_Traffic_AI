import '@testing-library/jest-dom';
import { vi } from 'vitest';
import L from 'leaflet';

// Define Leaflet L globally for plugins like leaflet.heat in jsdom
global.L = L;
window.L = L;
if (!L.heatLayer) {
  L.heatLayer = vi.fn().mockReturnValue({
    addTo: vi.fn().mockReturnThis(),
    setLatLngs: vi.fn(),
    remove: vi.fn()
  });
}

// Mock Leaflet and Canvas for jsdom test runner
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

