import api from './axios';

export const getLatestTrafficData = async () => {
  // Fetch all monitored locations (up to 1000) enriched with coordinates, names, and latest congestion metrics
  const response = await api.get('/analytics/busiest-locations?limit=1000');
  return response.data;
};

export const triggerTrafficFetch = async () => {
  const response = await api.get('/traffic/fetch');
  return response.data;
};
