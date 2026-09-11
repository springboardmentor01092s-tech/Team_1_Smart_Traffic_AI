import api from './axios';

export const getAllRoutes = async () => {
  const response = await api.get('/routes');
  return response.data;
};

export const getRouteById = async (routeId) => {
  const response = await api.get(`/routes/${routeId}`);
  return response.data;
};

export const getRouteAnalysis = async (routeId) => {
  const response = await api.get(`/routes/${routeId}/analysis`);
  return response.data;
};

export const getRouteTravelTime = async (routeId) => {
  const response = await api.get(`/routes/${routeId}/travel-time`);
  return response.data;
};

export const createRoute = async (routeData) => {
  const response = await api.post('/routes', routeData);
  return response.data;
};
