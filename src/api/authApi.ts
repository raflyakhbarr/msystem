// Authentication API
import { hashPassword } from '../utils/hash';
import apiClient from './axiosConfig';
import { authManager } from '../context/AuthManager';

const TOKEN_ENDPOINT = import.meta.env.VITE_API_TOKEN_ENDPOINT

export const loginApi = async (username: string, password: string) => {
  try {
    const hashedPassword = hashPassword(password);

    const requestBody = {
      username,
      password: hashedPassword
    };

    const response = await apiClient.post(TOKEN_ENDPOINT, requestBody);


    return response.data;
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const logoutApi = async () => {
  authManager.clearAuth();
  return { message: 'Logout successful' };
};