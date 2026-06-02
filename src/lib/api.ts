import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    const data = err.response?.data;
    if (data?.message) {
      const msg = Array.isArray(data.message) ? data.message[0] : data.message;
      return Promise.reject(msg);
    }
    return Promise.reject(err.message ?? 'Something went wrong');
  },
);

export default api;
