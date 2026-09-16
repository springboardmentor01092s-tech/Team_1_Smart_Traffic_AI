import React from "react";

/**
 * Design Tokens — single source of truth for dashboard styling.
 * Supports light and dark modes via lightTokens and darkTokens.
 */
export const lightTokens = {
  bg: "#f8fafc",
  cardBg: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  borderColor: "rgba(15, 23, 42, 0.06)",
  radius: "14px",
  radiusSmall: "10px",
  shadowResting: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 1px rgba(15, 23, 42, 0.04)",
  shadowRaised: "0 4px 10px -2px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
  shadowHover: "0 12px 24px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.04)",
  headerBg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  controlBg: "#f1f5f9",
};

export const darkTokens = {
  bg: "#0f172a",
  cardBg: "#1e293b",
  textPrimary: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  borderColor: "#334155",
  radius: "14px",
  radiusSmall: "10px",
  shadowResting: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
  shadowRaised: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
  shadowHover: "0 12px 24px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
  headerBg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
  controlBg: "#334155",
};

export const cardTokens = lightTokens;

let currentInjectedTheme = null;

export function injectCardTokens(theme) {
  if (typeof document === "undefined") return;
  const activeTheme = theme || currentInjectedTheme || "light";
  currentInjectedTheme = activeTheme;
  const tokens = activeTheme === "dark" ? darkTokens : lightTokens;
  document.documentElement.setAttribute("data-theme", activeTheme);

  let style = document.getElementById("card-tokens");
  if (!style) {
    style = document.createElement("style");
    style.id = "card-tokens";
    style.setAttribute("data-card-tokens", "true");
    document.head.appendChild(style);
  }
  style.textContent = `
    :root {
      --bg-color: ${tokens.bg};
      --card-bg: ${tokens.cardBg};
      --text-primary: ${tokens.textPrimary};
      --text-secondary: ${tokens.textSecondary};
      --text-muted: ${tokens.textMuted};
      --card-border-color: ${tokens.borderColor};
      --card-radius: ${tokens.radius};
      --card-radius-sm: ${tokens.radiusSmall};
      --card-shadow-resting: ${tokens.shadowResting};
      --card-shadow-raised: ${tokens.shadowRaised};
      --card-shadow-hover: ${tokens.shadowHover};
      --header-bg: ${tokens.headerBg};
      --control-bg: ${tokens.controlBg};
    }
  `;
}

/**
 * Card — unified wrapper for every card-like surface in the dashboard.
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
    background: "var(--card-bg, #ffffff)",
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
        background: "var(--bg-color, #f1f5f9)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Card variant="accent" accentColor="#10b981">
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary, #64748b)" }}>NETWORK AVG SPEED</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "var(--text-primary, #0f172a)" }}>28.17 km/h</div>
      </Card>
      <Card variant="accent" accentColor="#ef4444">
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary, #64748b)" }}>AVG TRAFFIC DENSITY</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "var(--text-primary, #0f172a)" }}>29.6 %</div>
      </Card>
      <Card variant="flat">
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary, #64748b)" }}>ROUTE INSPECTOR</div>
        <div style={{ fontSize: 14, marginTop: 6, color: "var(--text-secondary, #475569)" }}>
          No status color — flat variant keeps it visually quieter.
        </div>
      </Card>
    </div>
  );
}

