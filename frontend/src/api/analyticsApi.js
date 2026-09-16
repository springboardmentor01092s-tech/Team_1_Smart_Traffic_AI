import api from './axios';

export const getHistoricalTrends = async (timeframe = '7d', interval = 'hour', locationId = null) => {
  const params = { timeframe, interval };
  if (locationId) params.location_id = locationId;
  const response = await api.get('/analytics/trends', { params });
  return response.data;
};

export const getBusiestLocations = async (limit = 10, timeframe = '7d') => {
  const response = await api.get('/analytics/busiest-locations', { params: { limit, timeframe } });
  return response.data;
};

export const getMostCongestedRoutes = async (limit = 10) => {
  const response = await api.get('/analytics/most-congested-routes', { params: { limit } });
  return response.data;
};

export const getAlertStats = async () => {
  const response = await api.get('/analytics/alert-stats');
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await api.get('/analytics/dashboard-summary');
  return response.data;
};

export const getDailyTrends = async (locationId = null, range = '30d') => {
  const params = { range };
  if (locationId) params.location_id = locationId;
  const response = await api.get('/analytics/trends/daily', { params });
  return response.data;
};

export const getWeeklyTrends = async (locationId = null, range = '90d') => {
  const params = { range };
  if (locationId) params.location_id = locationId;
  const response = await api.get('/analytics/trends/weekly', { params });
  return response.data;
};

export const getPeakComparison = async (locationId = null, range = '30d') => {
  const params = { range };
  if (locationId) params.location_id = locationId;
  const response = await api.get('/analytics/peak-comparison', { params });
  return response.data;
};

export const getRecurringCongestion = async (limit = 10, range = '30d', threshold = 0.40) => {
  const params = { limit, range, threshold };
  const response = await api.get('/analytics/recurring-congestion', { params });
  return response.data;
};

export const getPerformanceComparison = async (
  range1Start = null,
  range1End = null,
  range2Start = null,
  range2End = null,
  locationId = null
) => {
  const params = {};
  if (range1Start) params.range1_start = range1Start;
  if (range1End) params.range1_end = range1End;
  if (range2Start) params.range2_start = range2Start;
  if (range2End) params.range2_end = range2End;
  if (locationId) params.location_id = locationId;
  const response = await api.get('/analytics/performance-comparison', { params });
  return response.data;
};
