import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 60000,
  withCredentials: true,
});

const normalizeRequestPath = (urlValue = '') => {
  const raw = String(urlValue || '').trim();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname;
  } catch (_err) {
    // Fall through to relative-path parsing.
  }
  const withoutOrigin = raw.replace(/^[a-z]+:\/\/[^/]+/i, '');
  const [pathname] = withoutOrigin.split('?');
  if (!pathname) return '';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const isProtectedRequestPath = (method = 'GET', requestPath = '') => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  const path = String(requestPath || '');
  const isReadOnlyMethod = normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
  if (!path) return false;
  if (path.startsWith('/alerts')) return !isReadOnlyMethod;
  if (path.startsWith('/users')) return !isReadOnlyMethod;
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/auth/passkeys/register')) return true;
  if (path.startsWith('/auth/me')) return true;
  if (/^\/properties\/[^/]+\/engagement$/.test(path)) return true;
  if (path === '/properties' && normalizedMethod !== 'GET') return true;
  if (/^\/properties\/[^/]+$/.test(path) && (normalizedMethod === 'PUT' || normalizedMethod === 'DELETE')) return true;
  return false;
};

const getAuthorizationHeaderValue = (headers) => {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return String(headers.get('Authorization') || headers.get('authorization') || '');
  }
  return String(headers.Authorization || headers.authorization || '');
};

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const language = String(localStorage.getItem('homekey:language') || '').trim().toLowerCase();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (language === 'he' || language === 'en') {
    config.headers['Accept-Language'] = language;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const apiMessage = String(error?.response?.data?.message || '');
    const isTokenAuthFailure = status === 401 && /token (invalid|expired)/i.test(apiMessage);
    const requestPath = normalizeRequestPath(error?.config?.url || '');
    const requestMethod = String(error?.config?.method || 'GET').toUpperCase();
    const authHeaderValue = getAuthorizationHeaderValue(error?.config?.headers);
    const hadBearerAuthHeader = /^Bearer\s+/i.test(authHeaderValue);
    const shouldExpireSession = isTokenAuthFailure
      && hadBearerAuthHeader
      && isProtectedRequestPath(requestMethod, requestPath);
    if (shouldExpireSession && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('homekey:auth-session-expired'));
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const getMyAccount = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateMyAccount = async (data) => {
  const response = await api.put('/auth/me', data);
  return response.data;
};

export const getOAuthConfig = async () => {
  const response = await api.get('/auth/oauth/config');
  return response.data;
};

export const loginWithGoogle = async ({ idToken, name }) => {
  const response = await api.post('/auth/oauth/google', {
    idToken,
    credential: idToken,
    name,
  });
  return response.data;
};

export const loginWithApple = async ({ idToken, name }) => {
  const response = await api.post('/auth/oauth/apple', { idToken, name });
  return response.data;
};

export const getPasskeyRegistrationOptions = async () => {
  const response = await api.post('/auth/passkeys/register/options');
  return response.data;
};

export const verifyPasskeyRegistration = async (credential) => {
  const response = await api.post('/auth/passkeys/register/verify', { credential });
  return response.data;
};

export const getPasskeyAuthenticationOptions = async (email) => {
  const response = await api.post('/auth/passkeys/authenticate/options', { email });
  return response.data;
};

export const verifyPasskeyAuthentication = async ({ email, credential }) => {
  const response = await api.post('/auth/passkeys/authenticate/verify', { email, credential });
  return response.data;
};

export const requestPasswordReset = async ({ email }) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async ({ newPassword, token, email }) => {
  const payload = { newPassword };
  if (typeof token === 'string' && token.trim()) {
    payload.token = token.trim();
  }
  if (typeof email === 'string' && email.trim()) {
    payload.email = email.trim().toLowerCase();
  }
  const response = await api.post('/auth/reset-password', payload);
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

export const createPropertyInquiry = async (id, inquiry) => {
  const response = await api.post(`/properties/${id}/inquiries`, inquiry);
  return response.data;
};

export const registerShowingAttendee = async (id, showingId, attendee) => {
  const response = await api.post(`/properties/${id}/showings/${showingId}/attendees`, attendee);
  return response.data;
};

export const getPropertyEngagement = async (id) => {
  const response = await api.get(`/properties/${id}/engagement`);
  return response.data;
};

// Instant alerts
export const getMyInstantAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const updateMyInstantAlertSettings = async (settings) => {
  const response = await api.put('/alerts/settings', settings);
  return response.data;
};

export const upsertMyInstantAlertSearch = async (payload) => {
  const response = await api.post('/alerts/searches', payload);
  return response.data;
};

export const saveMyCurrentSearchAlert = async (payload) => {
  const response = await api.post('/alerts/searches', {
    ...payload,
    autoFromSearch: true,
  });
  return response.data;
};

export const deleteMyInstantAlertSearch = async (searchId) => {
  const response = await api.delete(`/alerts/searches/${searchId}`);
  return response.data;
};

export const getMyInstantAlertInbox = async (params) => {
  const response = await api.get('/alerts/inbox', { params });
  return response.data;
};

export const markMyInstantAlertReadState = async (alertId, read = true) => {
  const response = await api.put(`/alerts/inbox/${alertId}/read`, { read });
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

export const runYad2SyncNowForUser = async () => {
  const response = await api.post('/sync/yad2/run', {});
  return response.data;
};

export const getYad2SyncStatus = async () => {
  const response = await api.get('/admin/sync/yad2/status');
  return response.data;
};

export const getPublicYad2SyncStatus = async () => {
  const response = await api.get('/sync/yad2/status');
  return response.data;
};

// Agents
export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export default api;
