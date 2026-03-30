const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function getProperties() {
  const res = await fetch(`${BASE_URL}/properties`);
  if (!res.ok) throw new Error('Failed to fetch properties');
  return res.json();
}

export async function getProperty(id) {
  const res = await fetch(`${BASE_URL}/properties/${id}`);
  if (!res.ok) throw new Error('Failed to fetch property');
  return res.json();
}

export async function createProperty(data) {
  const res = await fetch(`${BASE_URL}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create property');
  return res.json();
}

export async function getAgents() {
  const res = await fetch(`${BASE_URL}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}
