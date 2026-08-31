import React, { useEffect, useState } from 'react';
import {
  getBottleneckPatterns,
  getRouteRecommendation,
  getRecommendationHistory,
  getLatestReportWithPlainSummary
} from '../api/recommendationsApi';
import { getAllRoutes } from '../api/routeApi';

const AIInsightsPanel = () => {
  const [bottlenecks, setBottlenecks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [activeRecommendation, setActiveRecommendation] = useState(null);
  const [recommendationHistory, setRecommendationHistory] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState('');
  const [showFullReportModal, setShowFullReportModal] = useState(false);

  useEffect(() => {
    loadInitialData();

    // Auto-refresh polling every 30 seconds
    const intervalId = setInterval(() => {
      loadInsightsSilently();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patternsRes, routesRes, historyRes, reportRes] = await Promise.allSettled([
        getBottleneckPatterns(10, '30d'),
        getAllRoutes(),
        getRecommendationHistory(5),
        getLatestReportWithPlainSummary()
      ]);

      if (patternsRes.status === 'fulfilled') {
        setBottlenecks(patternsRes.value || []);
      }
      if (routesRes.status === 'fulfilled' && Array.isArray(routesRes.value)) {
        setRoutes(routesRes.value);
        if (routesRes.value.length > 0) {
          const defaultId = routesRes.value[0].route_id;
          setSelectedRouteId(defaultId);
          fetchRecommendationForRoute(defaultId);
        }
      }
      if (historyRes.status === 'fulfilled') {
        setRecommendationHistory(historyRes.value || []);
      }
      if (reportRes.status === 'fulfilled') {
        setReportData(reportRes.value || null);
      }
    } catch (err) {
      console.error('Failed to load AI Insights:', err);
      setError('Could not load AI Insights data');
    } finally {
      setLoading(false);
    }
  };

  const loadInsightsSilently = async () => {
    try {
      const [patternsRes, historyRes, reportRes] = await Promise.allSettled([
        getBottleneckPatterns(10, '30d'),
        getRecommendationHistory(5),
        getLatestReportWithPlainSummary()
      ]);

      if (patternsRes.status === 'fulfilled') setBottlenecks(patternsRes.value || []);
      if (historyRes.status === 'fulfilled') setRecommendationHistory(historyRes.value || []);
      if (reportRes.status === 'fulfilled') setReportData(reportRes.value || null);
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  };

  const fetchRecommendationForRoute = async (routeId) => {
    if (!routeId) return;
    setRecommending(true);
    try {
      const rec = await getRouteRecommendation(routeId);
      setActiveRecommendation(rec);
    } catch (err) {
      console.error('Failed to fetch recommendation for route:', err);
    } finally {
      setRecommending(false);
    }
  };

  const handleRouteSelectChange = (e) => {
    const rId = e.target.value;
    setSelectedRouteId(rId);
    fetchRecommendationForRoute(rId);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖 Analyzing Traffic Patterns & Routing...</div>
        <p style={{ margin: 0, fontSize: '14px' }}>Computing real-time bottlenecks, time-saved estimates, and performance summaries.</p>
      </div>
    );
  }

  const plainSummary = reportData?.plain_summary || reportData?.summary?.plain_summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        padding: '24px 28px',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              AI Recommendations & Performance Insights
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 34px', fontSize: '13px', color: '#c7d2fe', maxWidth: '700px' }}>
            Real-time route optimization with time-saved metrics and plain-language automated performance intelligence.
          </p>
        </div>

        <button
          onClick={loadInitialData}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(4px)'
          }}
        >
          🔄 Refresh Insights
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', background: '#fef2f2', color: '#991b1b', borderRadius: '10px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid Row 1: AI Route Recommendation Engine */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧭 AI Route Recommendation Engine
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Select a target corridor to evaluate live alternate routes & time saved</span>
          </div>

          {routes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Inspect Route:</label>
              <select
                value={selectedRouteId}
                onChange={handleRouteSelectChange}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: '500',
                  outline: 'none'
                }}
              >
                {routes.map(r => (
                  <option key={r.route_id} value={r.route_id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {recommending ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            ⚡ Evaluating live congestion & travel times...
          </div>
        ) : activeRecommendation ? (
          <div style={{
            background: activeRecommendation.status === 'already_optimal' || activeRecommendation.minutesSaved === 0
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            borderRadius: '12px',
            padding: '24px',
            border: activeRecommendation.status === 'already_optimal' || activeRecommendation.minutesSaved === 0
              ? '2px solid #22c55e'
              : '2px solid #10b981',
            position: 'relative'
          }}>
            {/* Prominent Badge for Time Saved / Already Optimal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    data-testid="recommendation-badge"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '700',
                      background: activeRecommendation.status === 'already_optimal' || activeRecommendation.minutesSaved === 0 ? '#16a34a' : '#10b981',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    {activeRecommendation.status === 'already_optimal' || activeRecommendation.minutesSaved === 0
                      ? "✅ You're already on the fastest route"
                      : `⚡ Save ~${activeRecommendation.minutesSaved} min via ${activeRecommendation.recommendedRouteName}`}
                  </span>

                  {activeRecommendation.improvementPct > 0 && activeRecommendation.status !== 'already_optimal' && (
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: '#d1fae5', color: '#065f46' }}>
                      📉 {activeRecommendation.improvementPct}% Less Congested
                    </span>
                  )}
                </div>

                <p style={{ margin: '14px 0 0 0', fontSize: '14px', color: '#1e293b', lineHeight: '1.5', fontWeight: '500' }}>
                  {activeRecommendation.reason}
                </p>
              </div>

              {/* Travel Time Comparison Metric Cards */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', minWidth: '130px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Target Corridor</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: activeRecommendation.status === 'already_optimal' ? '#16a34a' : '#ef4444', marginTop: '4px' }}>
                    {activeRecommendation.originalEtaMins} <span style={{ fontSize: '12px', color: '#64748b' }}>min</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Score: {activeRecommendation.congestionScoreOriginal}</div>
                </div>

                {activeRecommendation.status !== 'already_optimal' && (
                  <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #10b981', textAlign: 'center', minWidth: '130px' }}>
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: '600', textTransform: 'uppercase' }}>Recommended</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                      {activeRecommendation.recommendedEtaMins} <span style={{ fontSize: '12px', color: '#64748b' }}>min</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>Score: {activeRecommendation.congestionScoreRecommended}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>
            No recommendation calculated for this route yet.
          </div>
        )}
      </div>

      {/* Grid Row 2: Bottleneck Patterns & Plain Language Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Task 1: Top Bottleneck Patterns */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚨 Top Recurring Bottlenecks
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px' }}>
              Rolling 30-Day Window
            </span>
          </div>

          {bottlenecks.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No severe recurring bottlenecks detected.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bottlenecks.slice(0, 5).map((b, idx) => (
                <div key={b.locationId || idx} style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${b.bottleneckScore > 60 ? '#ef4444' : b.bottleneckScore > 35 ? '#f59e0b' : '#3b82f6'}`
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{b.locationName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      🕒 Peak Window: <strong>{b.typicalTimeWindows}</strong> | Avg Speed: <strong>{b.avgSpeedKmph} km/h</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: b.bottleneckScore > 60 ? '#dc2626' : b.bottleneckScore > 35 ? '#d97706' : '#2563eb'
                    }}>
                      Score: {b.bottleneckScore}/100
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Congested: <strong>{b.frequencyPct}%</strong> of readings
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task 3: Plain-Language Performance Summary */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📝 Plain-Language Performance Summary
            </h3>
            <button
              onClick={() => setShowFullReportModal(true)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#2563eb',
                cursor: 'pointer'
              }}
            >
              📖 View Full Report
            </button>
          </div>

          {plainSummary?.sections ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #10b981' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#047857', textTransform: 'uppercase', marginBottom: '4px' }}>
                  📈 Congestion Trends
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
                  {plainSummary.sections.congestion_trends}
                </div>
              </div>

              <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🚨 Incidents & Disruptions
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
                  {plainSummary.sections.incidents}
                </div>
              </div>

              <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🏎️ Road Performance
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
                  {plainSummary.sections.road_performance}
                </div>
              </div>

              <div style={{ background: '#faf5ff', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #8b5cf6' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#6d28d9', textTransform: 'uppercase', marginBottom: '4px' }}>
                  💡 AI Recommendations Impact
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
                  {plainSummary.sections.ai_recommendations}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
              No automated plain summary generated yet. Click "Refresh Insights" or trigger report generation.
            </div>
          )}
        </div>
      </div>

      {/* Full Report Modal */}
      {showFullReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', pb: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '700' }}>
                  📑 Traffic Performance & Prediction Report
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Generated: {reportData?.generated_at ? new Date(reportData.generated_at).toLocaleString() : 'Recent'}
                </span>
              </div>
              <button
                onClick={() => setShowFullReportModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}
              >
                ✖
              </button>
            </div>

            {plainSummary?.sections ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>📈 1. Congestion Trends</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>{plainSummary.sections.congestion_trends}</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>🚨 2. Traffic Incidents & Alerts</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>{plainSummary.sections.incidents}</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>🏎️ 3. Road Network Performance</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>{plainSummary.sections.road_performance}</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>💡 4. AI Route Recommendations & Time Saved</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>{plainSummary.sections.ai_recommendations}</p>
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>No detailed plain report data available.</p>
            )}

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                onClick={() => setShowFullReportModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
