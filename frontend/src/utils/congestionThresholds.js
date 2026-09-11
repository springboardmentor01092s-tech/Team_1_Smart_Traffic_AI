/**
 * TrafficVision AI — Centralized Congestion Threshold Utilities
 * 
 * Defines system-wide congestion level standards, speed ratio thresholds,
 * color mappings, and helper functions.
 */

export const CONGESTION_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  SEVERE: 'severe'
};

// Signal Color Palette
export const CONGESTION_COLORS = {
  low: '#10b981',      // Green
  moderate: '#f59e0b', // Yellow
  high: '#f97316',     // Orange
  severe: '#ef4444'    // Red
};

/**
 * Determine categorical congestion level from speed ratio (current_speed / free_flow_speed)
 * - ratio >= 0.80 -> Low (Green)
 * - 0.50 <= ratio < 0.80 -> Moderate (Yellow)
 * - 0.30 <= ratio < 0.50 -> High (Orange)
 * - ratio < 0.30 -> Severe (Red)
 */
export const getCongestionLevelFromRatio = (ratio) => {
  if (ratio === undefined || ratio === null || isNaN(ratio)) return CONGESTION_LEVELS.LOW;
  if (ratio >= 0.80) return CONGESTION_LEVELS.LOW;
  if (ratio >= 0.50) return CONGESTION_LEVELS.MODERATE;
  if (ratio >= 0.30) return CONGESTION_LEVELS.HIGH;
  return CONGESTION_LEVELS.SEVERE;
};

/**
 * SpeedPanel & Dashboard Congestion Flag Threshold (ratio < 0.60)
 * Locations where speed drops below 60% of free flow speed (40%+ delay) are flagged as congested.
 */
export const CONGESTION_FLAG_THRESHOLD = 0.60;

export const isCongestionFlagged = (ratio) => {
  if (ratio === undefined || ratio === null || isNaN(ratio)) return false;
  return ratio < CONGESTION_FLAG_THRESHOLD;
};
