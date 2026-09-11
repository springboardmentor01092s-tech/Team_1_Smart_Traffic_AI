// Signup.jsx
// Replaces your existing Signup page. Place in src/pages/Signup.jsx (or wherever
// your current Signup.jsx lives) and update the import paths below to match
// your project structure.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SignalMeter from '../components/SignalMeter';
import FlowVisual from '../components/FlowVisual';
import '../styles/AuthStyles.css';
import { signup } from '../api/authApi';

const ROLES = [
  { id: 'viewer', label: 'Viewer / Analyst' },
  { id: 'operator', label: 'Traffic Operator' },
  { id: 'admin', label: 'Administrator' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requiredFilled = [
    fullName.trim().length > 0,
    email.trim().length > 3,
    password.length >= 6,
  ];
  const filledCount = requiredFilled.filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await signup(fullName, email, password, role);

      if (data?.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tv-stage">
      <div className="tv-panel-form">
        <div className="tv-brand">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="8" y="1" width="8" height="22" rx="4" fill="#1a2138" stroke="var(--line)" />
            <circle cx="12" cy="6" r="2.3" fill="var(--signal-red)" />
            <circle cx="12" cy="12" r="2.3" fill="var(--signal-amber)" />
            <circle cx="12" cy="18" r="2.3" fill="var(--signal-green)" />
          </svg>
          <span className="tv-brand-name">TrafficVision<span className="tv-ai"> AI</span></span>
        </div>

        <h1 className="tv-headline">Create your<br />monitoring account.</h1>
        <p className="tv-subhead">Set up access to live traffic data and alerts.</p>

        <div className="tv-tabs">
          <Link to="/login" className="tv-tab" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Sign In
          </Link>
          <button type="button" className="tv-tab tv-active">Sign Up</button>
        </div>

        {error && <div className="tv-error-banner">{error}</div>}

        <form className="tv-form" onSubmit={handleSubmit}>
          <div className="tv-field">
            <label className="tv-label" htmlFor="fullName">Full name</label>
            <div className="tv-input-row">
              <input
                id="fullName"
                type="text"
                placeholder="Abi Dharani"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="tv-field">
            <label className="tv-label" htmlFor="email">Email address</label>
            <div className="tv-input-row">
              <input
                id="email"
                type="email"
                placeholder="you@trafficvision.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="tv-field">
            <label className="tv-label" htmlFor="password">Password</label>
            <div className="tv-input-row">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="tv-field">
            <label className="tv-label">Role</label>
            <div className="tv-role-toggle">
              {ROLES.map((r) => (
                <div
                  key={r.id}
                  className={`tv-role-opt ${role === r.id ? 'tv-selected' : ''}`}
                  onClick={() => setRole(r.id)}
                >
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          <SignalMeter filledCount={filledCount} total={requiredFilled.length} />

          <button type="submit" className={`tv-submit-btn ${submitting ? 'tv-cycling' : ''}`} disabled={submitting}>
            <span>Sign Up</span>
            {submitting && (
              <span className="tv-cycle-lights">
                <span className="tv-on-red" />
                <span className="tv-on-amber" />
                <span className="tv-on-green" />
              </span>
            )}
          </button>
        </form>

        <p className="tv-switch-line">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <FlowVisual
        headline={<>Real-time flow across <span>128 monitored nodes</span> in the city network.</>}
        stats={[
          { label: 'AVG SPEED', value: '41 km/h' },
          { label: 'CONGESTION', value: 'MODERATE' },
          { label: 'ACTIVE ALERTS', value: '3' },
          { label: 'UPTIME', value: '99.8%' },
        ]}
      />
    </div>
  );
}
