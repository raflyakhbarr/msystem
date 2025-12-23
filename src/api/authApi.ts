// Authentication API
import { hashPassword } from '../utils/hash';
import apiClient from './axiosConfig';

const TOKEN_ENDPOINT = import.meta.env.VITE_API_TOKEN_ENDPOINT

export const loginApi = async (username: string, password: string) => {
  try {
    const hashedPassword = hashPassword(password);
    
    const requestBody = {
      username,
      password: hashedPassword
    };
    
    const response = await apiClient.post(TOKEN_ENDPOINT, requestBody);
    
    // Store credentials for silent renewal
    if (response.data.token) {
      localStorage.setItem('username', username);
      localStorage.setItem('hashedPassword', hashedPassword);
      
      // Calculate and store token expiry
      const expiryTime = response.data.expiresIn ?
        new Date().getTime() + (response.data.expiresIn * 1000) :
        new Date().getTime() + (60 * 60 * 1000); // Default 1 hour
      localStorage.setItem('tokenExpiry', expiryTime.toString());
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const logoutApi = async () => {
  // Clear all stored data
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('hashedPassword');
  localStorage.removeItem('tokenExpiry');
  
  return { message: 'Logout successful' };
};