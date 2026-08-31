import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

/**
 * PulsingMarker — react-leaflet marker that renders an expanding-ring
 * pulse for high-severity congestion locations on your Dynamic Congestion
 * Heat Map, so the eye is drawn to what matters without needing to scan
 * every marker on the map.
 *
 * Built with a Leaflet divIcon (pure CSS animation, no extra JS libs) so
 * it stays lightweight and works alongside your existing color-coded
 * markers / leaflet.heat layer.
 *
 * Usage — replace your existing high/severe marker with this:
 *
 *   {locations.map((loc) =>
 *     loc.level === "high" || loc.level === "severe" ? (
 *       <PulsingMarker
 *         key={loc.id}
 *         position={[loc.lat, loc.lng]}
 *         severity={loc.level}
 *       >
 *         <Popup>Existing Popup Content</Popup>
 *       </PulsingMarker>
 *     ) : (
 *       <Marker key={loc.id} position={[loc.lat, loc.lng]}>...</Marker>
 *     )
 *   )}
 *
 * Note: severity color mapping matches your unified thresholds
 * (amber/orange = high, red = severe) — adjust SEVERITY_COLORS if your
 * hex values differ.
 */
const SEVERITY_COLORS = {
  moderate: "#f59e0b", // amber
  high: "#f97316", // orange
  severe: "#ef4444", // red
};

let stylesInjected = false;
function ensurePulseStylesInjected() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-pulsing-marker-styles", "true");
  style.textContent = `
    .pulsing-marker {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .pulsing-marker__core {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: var(--pm-color);
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      z-index: 3;
    }
    .pulsing-marker__ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: var(--pm-color);
      opacity: 0.55;
      animation: pulsing-marker-expand var(--pm-duration) ease-out infinite;
    }
    .pulsing-marker__ring--delay {
      animation-delay: calc(var(--pm-duration) / 2);
    }
    @keyframes pulsing-marker-expand {
      0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
      100% { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pulsing-marker__ring { animation: none; opacity: 0.25; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Builds the Leaflet divIcon HTML/CSS for a given severity.
 * `speed` controls pulse duration in seconds — severe pulses faster,
 * so urgency is legible at a glance even before reading a popup.
 */
function buildPulseIcon(severity) {
  ensurePulseStylesInjected();
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.high;
  const duration = severity === "severe" ? "1.4s" : "2.2s";

  const html = `
    <div class="pulsing-marker" style="--pm-color:${color}; --pm-duration:${duration};">
      <div class="pulsing-marker__ring"></div>
      <div class="pulsing-marker__ring pulsing-marker__ring--delay"></div>
      <div class="pulsing-marker__core"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "pulsing-marker-icon", // keep empty of default leaflet styles
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

export default function PulsingMarker({
  position,
  severity = "high",
  children,
  ...markerProps
}) {
  const icon = useMemo(() => buildPulseIcon(severity), [severity]);

  return (
    <Marker position={position} icon={icon} {...markerProps}>
      {children}
    </Marker>
  );
}
