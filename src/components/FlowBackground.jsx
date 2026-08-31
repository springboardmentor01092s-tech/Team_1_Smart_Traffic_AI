import React, { useMemo } from "react";

/**
 * FlowBackground — reusable ambient "traffic flow" background texture,
 * distilled from your Login/Signup FlowVisual.jsx concept so the same
 * visual identity carries into the dashboard (navbar, heat map header,
 * or any section header).
 *
 * It's a pure decorative layer: absolutely positioned, pointer-events
 * disabled, meant to sit behind real content via a wrapping container
 * with `position: relative`.
 *
 * Usage:
 *   <div style={{ position: "relative", overflow: "hidden" }}>
 *     <FlowBackground accentColor="#f97316" density={6} />
 *     <div style={{ position: "relative", zIndex: 1 }}>
 *       ...your real navbar / header content...
 *     </div>
 *   </div>
 *
 * Props:
 *   accentColor  - base color for the flow lines (matches section theme,
 *                  e.g. orange for Heat Map, blue for Live Map)
 *   density      - how many lines to draw (more = busier, default 6)
 *   speed        - seconds per full traverse, lower = faster (default 14)
 *   opacity      - overall layer opacity (default 0.18, keep it subtle —
 *                  this is texture, not a feature)
 *   direction    - "ltr" | "rtl", which way traffic flows
 */
export default function FlowBackground({
  accentColor = "#f97316",
  density = 6,
  speed = 14,
  opacity = 0.18,
  direction = "ltr",
}) {
  // Generate deterministic-but-varied line configs once per mount
  const lines = useMemo(() => {
    return Array.from({ length: density }).map((_, i) => {
      const seed = i * 37.13; // arbitrary spread
      return {
        id: i,
        y: 8 + ((seed * 13) % 84), // vertical position %, 8–92
        widthPct: 18 + ((seed * 7) % 42), // dash length %
        delay: (seed % speed) * -1, // negative delay = already in progress
        duration: speed + ((seed % 5) - 2), // slight speed variance
        thickness: 1.5 + ((i % 3) * 0.8),
        laneOpacity: 0.4 + ((i % 4) * 0.15),
      };
    });
  }, [density, speed]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity,
        zIndex: 0,
      }}
    >
      <style>{`
        @keyframes flow-travel-ltr {
          from { transform: translateX(-30%); }
          to   { transform: translateX(130%); }
        }
        @keyframes flow-travel-rtl {
          from { transform: translateX(130%); }
          to   { transform: translateX(-30%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .flow-line { animation: none !important; }
        }
      `}</style>

      {lines.map((line) => (
        <div
          key={line.id}
          className="flow-line"
          style={{
            position: "absolute",
            top: `${line.y}%`,
            left: 0,
            width: `${line.widthPct}%`,
            height: `${line.thickness}px`,
            borderRadius: "999px",
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            opacity: line.laneOpacity,
            animation: `${
              direction === "ltr" ? "flow-travel-ltr" : "flow-travel-rtl"
            } ${line.duration}s linear infinite`,
            animationDelay: `${line.delay}s`,
            filter: "blur(0.3px)",
          }}
        />
      ))}

      {/* Soft radial glow to anchor the flow lines, matching the accent */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 100% at 15% 0%, ${accentColor}22, transparent 60%)`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo: shows it behind a navbar-style header and a heat map header,  */
/* each themed with a different accent to match their dashboard tab   */
/* ------------------------------------------------------------------ */
export function FlowBackgroundDemo() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar example */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0f172a",
          padding: "18px 28px",
        }}
      >
        <FlowBackground accentColor="#3b82f6" density={7} speed={12} />
        <div style={{ position: "relative", zIndex: 1, color: "#fff", fontWeight: 700 }}>
          TrafficVision AI — Navbar
        </div>
      </div>

      {/* Heat map header example */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          borderRadius: "14px",
          padding: "20px 24px",
          margin: "16px",
        }}
      >
        <FlowBackground accentColor="#f97316" density={5} speed={16} opacity={0.22} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "18px", color: "#7c2d12" }}>
            🔥 Dynamic Congestion Heat Map
          </div>
          <div style={{ fontSize: "13px", color: "#9a3412", marginTop: "4px" }}>
            Real-time heat intensity derived from speed ratio & vehicle count.
          </div>
        </div>
      </div>
    </div>
  );
}
