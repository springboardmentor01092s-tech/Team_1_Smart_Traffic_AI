import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * NavTabs — replaces a flat "active tab = solid blue fill" navbar with a
 * sliding underline indicator that smoothly glides to whichever tab is
 * active, the way most modern dashboard navs (Linear, Vercel, Stripe)
 * handle tab switching.
 *
 * Drop-in for your current Navbar.jsx tab row:
 *
 *   <NavTabs
 *     tabs={[
 *       { key: "live-map", label: "Live Map & Density", icon: "🗺️" },
 *       { key: "heat-map", label: "Heat Map & Analytics", icon: "🔥" },
 *       { key: "insights", label: "AI Insights & Reports", icon: "💡" },
 *       { key: "disruptions", label: "Disruptions", icon: "🚧" },
 *       { key: "trends", label: "Trends Analytics", icon: "📊" },
 *       { key: "route", label: "Route Inspector", icon: "🧭" },
 *     ]}
 *     activeKey={activeTab}
 *     onChange={setActiveTab}
 *     accentColor="#3b82f6"
 *   />
 *
 * The underline width/position is measured off the actual DOM node of the
 * active tab (via refs), so it stays correct even if labels wrap, resize,
 * or the tab list changes — no hardcoded widths.
 */
export default function NavTabs({ tabs, activeKey, onChange, accentColor = "#3b82f6" }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const activeEl = tabRefs.current[activeKey];
    const containerEl = containerRef.current;
    if (!activeEl || !containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setIndicator({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabs]);

  useEffect(() => {
    // Re-measure on resize (e.g. sidebar collapse, window resize, mobile rotation)
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        gap: "4px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <style>{`
        .nav-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.65);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 180ms ease;
          white-space: nowrap;
        }
        .nav-tab:hover {
          color: rgba(255,255,255,0.95);
        }
        .nav-tab--active {
          color: #ffffff;
        }
      `}</style>

      {tabs.map((tab) => {
        const tabKey = tab.key || tab.id;
        const isActive = activeKey === tabKey;
        return (
          <button
            key={tabKey}
            ref={(el) => (tabRefs.current[tabKey] = el)}
            className={`nav-tab ${isActive ? "nav-tab--active" : ""}`}
            onClick={() => onChange(tabKey)}
            type="button"
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}

      {/* Sliding underline indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          height: "3px",
          borderRadius: "3px 3px 0 0",
          background: accentColor,
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.ready ? 1 : 0,
          transition:
            "left 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo — mirrors your actual navbar's six tabs                        */
/* ------------------------------------------------------------------ */
export function NavTabsDemo() {
  const [active, setActive] = useState("heat-map");

  const tabs = [
    { key: "live-map", label: "Live Map & Density", icon: "🗺️" },
    { key: "heat-map", label: "Heat Map & Analytics", icon: "🔥" },
    { key: "insights", label: "AI Insights & Reports", icon: "💡" },
    { key: "disruptions", label: "Disruptions", icon: "🚧" },
    { key: "trends", label: "Trends Analytics", icon: "📊" },
    { key: "route", label: "Route Inspector", icon: "🧭" },
  ];

  return (
    <div style={{ background: "#0f172a", padding: "8px 16px", fontFamily: "system-ui, sans-serif" }}>
      <NavTabs tabs={tabs} activeKey={active} onChange={setActive} accentColor="#3b82f6" />
    </div>
  );
}
