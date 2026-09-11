import api from './axios';

export const getBottleneckPatterns = async (limit = 10, range = '30d') => {
  const response = await api.get(`/analytics/bottlenecks?limit=${limit}&range=${range}`);
  return response.data;
};

export const getRouteRecommendation = async (routeId = '', origin = '', destination = '') => {
  let url = '/routes/recommendations';
  const params = [];
  if (routeId) params.push(`routeId=${encodeURIComponent(routeId)}`);
  if (origin) params.push(`origin=${encodeURIComponent(origin)}`);
  if (destination) params.push(`destination=${encodeURIComponent(destination)}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await api.get(url);
  return response.data;
};

export const getRecommendationHistory = async (limit = 10) => {
  const response = await api.get(`/routes/recommendations/history?limit=${limit}`);
  return response.data;
};

export const getLatestReportWithPlainSummary = async () => {
  const response = await api.get('/reports/traffic-prediction');
  return response.data;
};
