const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getProperties = async () => {
  const res = await fetch(`${API_BASE_URL}/properties`);
  if (!res.ok) throw new Error('Failed to fetch properties');
  return res.json();
};

export const getProperty = async (id) => {
  const res = await fetch(`${API_BASE_URL}/properties/${id}`);
  if (!res.ok) throw new Error('Failed to fetch property');
  return res.json();
};

export const createProperty = async (propertyData) => {
  const res = await fetch(`${API_BASE_URL}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(propertyData)
  });
  if (!res.ok) throw new Error('Failed to create property');
  return res.json();
};

export const getAgents = async () => {
  const res = await fetch(`${API_BASE_URL}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
};
