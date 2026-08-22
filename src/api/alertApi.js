import api from './axios';

export const getAllAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const getAlertsByLocation = async (locationId) => {
  const response = await api.get(`/alerts/${locationId}`);
  return response.data;
};
