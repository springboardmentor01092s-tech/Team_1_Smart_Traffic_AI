import api from './axios';

export const getAllAlerts = async (status) => {
  const params = status && status !== 'all' ? { status } : {};
  const response = await api.get('/alerts', { params });
  return response.data;
};

export const getAlertsByLocation = async (locationId, status) => {
  const params = status && status !== 'all' ? { status } : {};
  const response = await api.get(`/alerts/${locationId}`, { params });
  return response.data;
};

export const updateAlertStatus = async (alertId, status, bypassValidation = false) => {
  const response = await api.patch(`/alerts/${alertId}/status`, { status, bypassValidation });
  return response.data;
};
