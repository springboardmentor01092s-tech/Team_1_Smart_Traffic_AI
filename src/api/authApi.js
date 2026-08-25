import api from './axios';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (fullNameOrName, email, password, role = 'viewer') => {
  let payload;
  if (typeof fullNameOrName === 'object' && fullNameOrName !== null) {
    const { fullName, name, email: e, password: p, role: r } = fullNameOrName;
    const displayName = fullName || name;
    payload = { fullName: displayName, name: displayName, email: e, password: p, role: r || 'viewer' };
  } else {
    payload = { fullName: fullNameOrName, name: fullNameOrName, email, password, role };
  }
  const response = await api.post('/auth/signup', payload);
  return response.data;
};

