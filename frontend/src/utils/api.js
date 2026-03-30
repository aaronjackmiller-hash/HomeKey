const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
};

// Properties
export const getProperties = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/properties${query ? `?${query}` : ''}`).then(handleResponse);
};

export const getProperty = (id) =>
  fetch(`${API_BASE}/properties/${id}`).then(handleResponse);

export const createProperty = (data) =>
  fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const updateProperty = (id, data) =>
  fetch(`${API_BASE}/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const deleteProperty = (id) =>
  fetch(`${API_BASE}/properties/${id}`, { method: 'DELETE' }).then(handleResponse);

// Agents
export const getAgents = () =>
  fetch(`${API_BASE}/agents`).then(handleResponse);

export const getAgent = (id) =>
  fetch(`${API_BASE}/agents/${id}`).then(handleResponse);
