import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api-url.com', // replace with your API URL
  timeout: 1000,
});

// Error handling middleware
const handleError = (error) => {
  // Log the error or handle it as appropriate for your application
  console.error('API Error:', error);
  throw error;
};

// Method to get all properties
export const getProperties = async () => {
  try {
    const response = await api.get('/properties');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// Method to get a specific property by ID
export const getProperty = async (id) => {
  try {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// Method to create a new property
export const createProperty = async (property) => {
  try {
    const response = await api.post('/properties', property);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// Method to get all agents
export const getAgents = async () => {
  try {
    const response = await api.get('/agents');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// Method to update a property
export const updateProperty = async (id, property) => {
  try {
    const response = await api.put(`/properties/${id}`, property);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
