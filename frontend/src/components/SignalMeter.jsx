// SignalMeter.jsx
// The signature UI element: 3 dots (red/amber/green) that light up
// progressively as required fields are filled in.
// Place in e.g. src/components/SignalMeter.jsx

export default function SignalMeter({ filledCount, total }) {
  let label = 'FORM STATUS: EMPTY';
  let lit = 0;

  if (filledCount === 0) {
    lit = 1;
  } else if (filledCount < total) {
    lit = 2;
    label = 'FORM STATUS: IN PROGRESS';
  } else {
    lit = 3;
    label = 'FORM STATUS: READY';
  }

  return (
    <div className="tv-signal-meter">
      <div className="tv-dots">
        <div className={`tv-signal-dot ${lit >= 1 ? 'tv-lit-red' : ''}`} />
        <div className={`tv-signal-dot ${lit >= 2 ? 'tv-lit-amber' : ''}`} />
        <div className={`tv-signal-dot ${lit >= 3 ? 'tv-lit-green' : ''}`} />
      </div>
      <span className="tv-signal-label">{label}</span>
    </div>
  );
}
