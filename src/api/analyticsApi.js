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
