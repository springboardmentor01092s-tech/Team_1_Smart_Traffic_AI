// FlowVisual.jsx
// Shared right-hand visual panel used by both Login.jsx and Signup.jsx.
// Place in e.g. src/components/FlowVisual.jsx

import { useEffect, useRef } from 'react';

const LANE_COLORS = ['#34d399', '#f5a623', '#f5484c', '#34d399', '#f5a623'];

export default function FlowVisual({ headline, stats }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.innerHTML = '';

    for (let i = 0; i < 14; i++) {
      const lane = document.createElement('div');
      lane.className = 'tv-lane';
      const top = 6 + Math.random() * 88;
      const width = 120 + Math.random() * 220;
      const dur = 3 + Math.random() * 4;
      const delay = Math.random() * 5;
      const color = LANE_COLORS[i % LANE_COLORS.length];
      lane.style.top = `${top}%`;
      lane.style.left = '0';
      lane.style.width = `${width}px`;
      lane.style.color = color;
      lane.style.animationDuration = `${dur}s`;
      lane.style.animationDelay = `${delay}s`;
      wrap.appendChild(lane);
    }
  }, []);

  return (
    <div className="tv-panel-visual">
      <div className="tv-grid-overlay" />
      <div ref={wrapRef} />
      <div className="tv-readouts">
        <div className="tv-readout-head">{headline}</div>
        <div className="tv-stat-row">
          {stats.map((s) => (
            <div className="tv-stat-chip" key={s.label}>
              <span className="tv-dot" />
              {s.label} <b>{s.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
