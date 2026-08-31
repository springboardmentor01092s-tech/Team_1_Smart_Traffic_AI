import React from "react";

/**
 * cardTokens — single source of truth for border-radius and shadow depth
 * across the whole dashboard. Import these instead of hardcoding values
 * in individual components (KPICard, AlertsPanel, AnalyticsDashboard
 * panels, Heat Map card, etc.) so a future design tweak only happens
 * in one place.
 *
 * Usage as CSS variables (recommended — inject once at app root):
 *
 *   import { injectCardTokens } from "./Card";
 *   injectCardTokens(); // call once in App.jsx / main.jsx
 *
 * Then in any component's CSS/inline styles:
 *   border-radius: var(--card-radius);
 *   box-shadow: var(--card-shadow-resting);
 *
 * Or use the <Card> wrapper directly for new/refactored components.
 */
export const cardTokens = {
  radius: "14px", // unified across KPI cards, panels, heat map card, alerts list
  radiusSmall: "10px", // nested elements inside a card (e.g. map corners, chips)
  shadowResting: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 1px rgba(15, 23, 42, 0.04)",
  shadowRaised: "0 4px 10px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
  shadowHover: "0 12px 24px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)",
  borderColor: "rgba(15, 23, 42, 0.06)", // for cards WITHOUT a colored accent border
};

let injected = false;
export function injectCardTokens() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-card-tokens", "true");
  style.textContent = `
    :root {
      --card-radius: ${cardTokens.radius};
      --card-radius-sm: ${cardTokens.radiusSmall};
      --card-shadow-resting: ${cardTokens.shadowResting};
      --card-shadow-raised: ${cardTokens.shadowRaised};
      --card-shadow-hover: ${cardTokens.shadowHover};
      --card-border-color: ${cardTokens.borderColor};
    }
  `;
  document.head.appendChild(style);
  injected = true;
}

/**
 * Card — unified wrapper for every card-like surface in the dashboard.
 * Two visual variants so intent stays explicit instead of every card
 * quietly picking its own random treatment:
 *
 *   variant="flat"   — plain border + resting shadow (metric summary
 *                       cards without a status color, e.g. a KPI card
 *                       for a neutral metric)
 *   variant="accent" — colored left border (4px) for cards that carry a
 *                       status/category color, e.g. KPICard, an alert
 *                       severity card, the Heat Map module card
 *
 * All cards, regardless of variant, share the same radius and get the
 * same hover elevation — the ONLY things that should differ between
 * cards from here on are content and accentColor.
 *
 * Usage:
 *   <Card variant="accent" accentColor="#10b981" hoverable>
 *     ...KPI card content...
 *   </Card>
 *
 *   <Card variant="flat">
 *     ...a panel with no status color, e.g. Route Inspector results...
 *   </Card>
 */
export default function Card({
  children,
  variant = "flat",
  accentColor = "#3b82f6",
  hoverable = true,
  padding = "18px 20px",
  style = {},
  className = "",
  ...rest
}) {
  injectCardTokens();

  const baseStyle = {
    position: "relative",
    background: "#ffffff",
    borderRadius: "var(--card-radius)",
    padding,
    boxShadow: "var(--card-shadow-resting)",
    border: variant === "flat" ? "1px solid var(--card-border-color)" : "none",
    borderLeft: variant === "accent" ? `4px solid ${accentColor}` : undefined,
    transition: hoverable
      ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)"
      : undefined,
    ...style,
  };

  return (
    <div
      className={`unified-card ${hoverable ? "unified-card--hoverable" : ""} ${className}`}
      style={baseStyle}
      {...rest}
    >
      <style>{`
        .unified-card--hoverable:hover {
          transform: translateY(-3px);
          box-shadow: var(--card-shadow-hover);
        }
      `}</style>
      {children}
    </div>
  );
}

export function CardDemo() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        padding: "24px",
        background: "#f1f5f9",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Card variant="accent" accentColor="#10b981">
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>NETWORK AVG SPEED</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>28.17 km/h</div>
      </Card>
      <Card variant="accent" accentColor="#ef4444">
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>AVG TRAFFIC DENSITY</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>29.6 %</div>
      </Card>
      <Card variant="flat">
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>ROUTE INSPECTOR</div>
        <div style={{ fontSize: 14, marginTop: 6, color: "#475569" }}>
          No status color — flat variant keeps it visually quieter.
        </div>
      </Card>
    </div>
  );
}
