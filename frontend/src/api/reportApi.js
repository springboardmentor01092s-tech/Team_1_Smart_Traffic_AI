import api from './axios';

export const getLatestReport = async () => {
  const response = await api.get('/reports/traffic-prediction');
  return response.data;
};

export const getReportHistory = async (limit = 10) => {
  const response = await api.get('/reports/traffic-prediction/history', { params: { limit } });
  return response.data;
};

export const generateReportOnDemand = async () => {
  const response = await api.post('/reports/traffic-prediction/generate');
  return response.data;
};
