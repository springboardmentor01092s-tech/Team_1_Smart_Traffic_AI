import React from "react";

/**
 * MapVignette — a decorative overlay that sits on top of your Leaflet map
 * container and fades its four edges into the surrounding card background,
 * so the map reads as part of the card rather than a hard-cut rectangle
 * dropped on top of it.
 *
 * Pure CSS, no dependency on Leaflet internals — it's just an absolutely
 * positioned sibling layer above the map, so it works regardless of your
 * MapContainer setup.
 *
 * Usage — wrap your existing map container (don't touch the MapContainer
 * itself, just add this as a sibling inside a relatively-positioned parent):
 *
 *   <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden" }}>
 *     <MapContainer ...>...</MapContainer>
 *     <MapVignette cardColor="#ffffff" strength="medium" />
 *   </div>
 *
 * Props:
 *   cardColor - the background color of the card the map sits in (must
 *               match exactly, or the fade will show a visible seam)
 *   strength  - "subtle" | "medium" | "strong" — how far the fade reaches
 *               inward from each edge (default "medium")
 *   corners   - if true (default), also softens the four corners with a
 *               radial fade, useful when the card has rounded corners
 *               larger than the map's own border-radius
 */
const STRENGTH_STOPS = {
  subtle: "6%",
  medium: "10%",
  strong: "16%",
};

export default function MapVignette({
  cardColor = "#ffffff",
  strength = "medium",
  corners = true,
}) {
  const stop = STRENGTH_STOPS[strength] || STRENGTH_STOPS.medium;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 400, // above Leaflet's default panes (max ~650 for popups, but below controls at ~1000)
      }}
    >
      {/* Top edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: stop,
          background: `linear-gradient(to bottom, ${cardColor}, transparent)`,
        }}
      />
      {/* Bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: stop,
          background: `linear-gradient(to top, ${cardColor}, transparent)`,
        }}
      />
      {/* Left edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: stop,
          background: `linear-gradient(to right, ${cardColor}, transparent)`,
        }}
      />
      {/* Right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: stop,
          background: `linear-gradient(to left, ${cardColor}, transparent)`,
        }}
      />

      {corners && (
        <>
          {/* Corner radial fades — softer & more contained than a full-edge
              gradient, so they only kick in right at the rounded corners */}
          {[
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                ...pos,
                width: "22%",
                height: "22%",
                background: `radial-gradient(circle at ${
                  pos.left !== undefined ? "0%" : "100%"
                } ${pos.top !== undefined ? "0%" : "100%"}, ${cardColor} 0%, transparent 70%)`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo: a mock "map" (solid color block standing in for MapContainer) */
/* with the vignette applied, so you can preview the fade without      */
/* needing a live Leaflet instance                                     */
/* ------------------------------------------------------------------ */
export function MapVignetteDemo() {
  return (
    <div style={{ padding: "24px", background: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#fff",
          padding: "12px",
          boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: "10px",
            overflow: "hidden",
            height: "280px",
          }}
        >
          {/* Stand-in for <MapContainer> */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(45deg, #d9e4d3 0 20px, #cfe0c8 20px 40px)",
            }}
          />
          <MapVignette cardColor="#ffffff" strength="medium" />
        </div>
      </div>
    </div>
  );
}
