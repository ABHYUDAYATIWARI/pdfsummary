import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
  if (localStorage.getItem('token')) {
    req.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  }
  return req;
});

// User routes
export const login = (formData) => API.post('/users/login', formData);
export const register = (formData) => API.post('/users/register', formData);
export const getUser = () => API.get('/users/me');

// PDF routes
export const uploadPDF = (formData) => API.post('/pdf', formData);
export const getPDFs = () => API.get('/pdf');
export const getPDFById = (id) => API.get(`/pdf/${id}`);
export const deletePDFById = (id) => API.delete(`/pdf/${id}`);
export const chatWithPDF = (id, message) => API.post(`/pdf/${id}/chat`, { message });