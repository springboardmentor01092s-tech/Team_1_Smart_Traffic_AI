import api from './axios';

export const generatePrediction = async (locationId) => {
  const response = await api.post(`/predictions/${locationId}`);
  return response.data;
};

export const getLatestPrediction = async (locationId) => {
  const response = await api.get(`/predictions/${locationId}`);
  return response.data;
};
