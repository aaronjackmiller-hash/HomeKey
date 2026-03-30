const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const handleResponse = (res) => {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
};

export const getProperties = () =>
    fetch(`${API_BASE}/properties`).then(handleResponse);

export const getProperty = (id) =>
    fetch(`${API_BASE}/properties/${id}`).then(handleResponse);

export const createProperty = (data) =>
    fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(handleResponse);

export const getAgents = () =>
    fetch(`${API_BASE}/agents`).then(handleResponse);
