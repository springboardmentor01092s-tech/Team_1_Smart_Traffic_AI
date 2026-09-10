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
  const [showRightFade, setShowRightFade] = useState(false);

  const checkScroll = () => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const hasMoreRight = containerEl.scrollWidth - containerEl.scrollLeft - containerEl.clientWidth > 4;
    setShowRightFade(hasMoreRight);
  };

  const measure = () => {
    const activeEl = tabRefs.current[activeKey];
    const containerEl = containerRef.current;
    if (!activeEl || !containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setIndicator({
      left: activeRect.left - containerRect.left + containerEl.scrollLeft,
      width: activeRect.width,
      ready: true,
    });
    checkScroll();
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabs]);

  useEffect(() => {
    const activeEl = tabRefs.current[activeKey];
    const containerEl = containerRef.current;
    if (activeEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
        if (typeof activeEl.scrollIntoView === 'function') {
          activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        }
      }
    }
  }, [activeKey]);

  useEffect(() => {
    checkScroll();
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', measure);
      return () => {
        containerEl.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', measure);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabs]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <style>{`
        .nav-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .nav-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.7) !important;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 180ms ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nav-tab:hover {
          color: rgba(255,255,255,0.95) !important;
        }
        .nav-tab--active {
          color: #ffffff !important;
        }
        @media (max-width: 576px) {
          .nav-tab {
            padding: 10px 12px;
            font-size: 12px;
            gap: 4px;
          }
        }
      `}</style>

      {/* Fade-out gradient indicator at right edge to visually signal off-screen scrollable tabs */}
      {showRightFade && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '36px',
            background: 'linear-gradient(to right, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.95))',
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      <div
        ref={containerRef}
        className="nav-tabs-scroll"
        style={{
          position: "relative",
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
          width: "100%",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          boxSizing: "border-box"
        }}
      >
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
