import api from './axios';

export const getLiveTraffic = async (timeframe = 'live') => {
  const response = await api.get('/traffic', { params: { timeframe } });
  return response.data;
};

export const getLatestTrafficData = async () => {
  const response = await api.get('/analytics/busiest-locations?limit=1000');
  return response.data;
};

export const triggerTrafficFetch = async () => {
  const response = await api.get('/traffic/fetch');
  return response.data;
};

