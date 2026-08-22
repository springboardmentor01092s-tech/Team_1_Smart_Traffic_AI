import api from './axios';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (name, email, password, role = 'viewer') => {
  const response = await api.post('/auth/signup', { name, email, password, role });
  return response.data;
};
