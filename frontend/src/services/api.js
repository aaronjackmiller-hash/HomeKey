import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 60000,
  withCredentials: true,
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const requestPasswordReset = async ({ email }) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async ({ newPassword }) => {
  const response = await api.post('/auth/reset-password', { newPassword });
  return response.data;
};

// Properties
export const getProperties = async (params) => {
  const response = await api.get('/properties', { params });
  return response.data;
};

export const getProperty = async (id) => {
  const response = await api.get(`/properties/${id}`);
  return response.data;
};

export const createProperty = async (property) => {
  const response = await api.post('/properties', property);
  return response.data;
};

export const updateProperty = async (id, property) => {
  const response = await api.put(`/properties/${id}`, property);
  return response.data;
};

export const deleteProperty = async (id) => {
  const response = await api.delete(`/properties/${id}`);
  return response.data;
};

export const importYad2ListingsBatch = async ({
  items,
  sourceTag = 'yad2',
  upsert = true,
  adminSecret,
  adminImportSecret,
}) => {
  const headers = {};
  if (typeof adminSecret === 'string' && adminSecret.trim()) {
    headers['X-Admin-Secret'] = adminSecret.trim();
  }
  if (typeof adminImportSecret === 'string' && adminImportSecret.trim()) {
    headers['X-Admin-Import-Secret'] = adminImportSecret.trim();
  }

  const response = await api.post(
    '/admin/import/yad2',
    { items, sourceTag, upsert },
    Object.keys(headers).length > 0 ? { headers } : undefined
  );
  return response.data;
};

export const runYad2SyncNow = async ({
  adminSecret,
  adminImportSecret,
} = {}) => {
  const headers = {};
  if (typeof adminSecret === 'string' && adminSecret.trim()) {
    headers['X-Admin-Secret'] = adminSecret.trim();
  }
  if (typeof adminImportSecret === 'string' && adminImportSecret.trim()) {
    headers['X-Admin-Import-Secret'] = adminImportSecret.trim();
  }

  const response = await api.post(
    '/admin/sync/yad2',
    {},
    Object.keys(headers).length > 0 ? { headers } : undefined
  );
  return response.data;
};

export const getYad2SyncStatus = async () => {
  const response = await api.get('/admin/sync/yad2/status');
  return response.data;
};

// Agents
export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export default api;
