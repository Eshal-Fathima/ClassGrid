import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data;
  localStorage.setItem('accessToken', accessToken);
  return user;
}

export async function signup(email: string, password: string) {
  const res = await api.post('/auth/signup', { email, password });
  const { accessToken, user } = res.data;
  localStorage.setItem('accessToken', accessToken);
  return user;
}

export async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function updateTheme(theme: 'light' | 'dark') {
  await api.post('/auth/theme', { theme });
}

