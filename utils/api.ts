import { auth } from '@/firebaseConfig';
import { PortfolioItem, UserProfile } from '@/types';
import axios from 'axios';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const PY_API_URL = process.env.EXPO_PUBLIC_PY_API_URL || 'http://localhost:8000';

const pyApi = axios.create({
  baseURL: PY_API_URL,
});

// Add an interceptor to include the auth token in requests
pyApi.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// --- User Profile ---
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await pyApi.get(`/users/${userId}/profile`);
  return response.data;
};

export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<any> => {
  const response = await pyApi.post(`/users/${userId}/profile`, profile);
  return response.data;
};


// --- Portfolio ---
export const getPortfolio = async (userId: string): Promise<PortfolioItem[]> => {
  const response = await pyApi.get(`/users/${userId}/portfolio`);
  return response.data;
};

export const addPortfolioItem = async (userId: string, item: Omit<PortfolioItem, 'id'>): Promise<PortfolioItem> => {
  const response = await pyApi.post(`/users/${userId}/portfolio`, item);
  return response.data;
};

export const updatePortfolioItem = async (userId: string, itemId: number, item: Omit<PortfolioItem, 'id'>): Promise<any> => {
  const response = await pyApi.put(`/users/${userId}/portfolio/${itemId}`, item);
  return response.data;
};

export const deletePortfolioItem = async (userId: string, itemId: number): Promise<any> => {
  const response = await pyApi.delete(`/users/${userId}/portfolio/${itemId}`);
  return response.data;
};

// --- Recommendations ---
export const getRecommendations = async (userId: string): Promise<any[]> => {
  const response = await pyApi.post(`/recommendations/${userId}`);
  return response.data.recommendations || [];
};

// --- Analytics ---
export const getPortfolioAnalytics = async (userId: string): Promise<any> => {
  const response = await pyApi.get(`/users/${userId}/analytics`);
  return response.data;
};

// --- Explore ---
export const getPopularFunds = async (limit: number = 20): Promise<any[]> => {
  const response = await pyApi.get(`/funds/popular?limit=${limit}`);
  return response.data;
};
