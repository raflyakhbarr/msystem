// Axios configuration for API requests
import axios from 'axios';

// API base URL from environment variables
const API_BASE_URL = '';  // Empty string to use Vite proxy

// Token renewal variables
let isRefreshing = false;
interface QueueItem {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}
let failedQueue: QueueItem[] = [];

// Process the queue of failed requests
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Silent token renewal function
const renewToken = async () => {
  try {
    // Get stored credentials
    const username = localStorage.getItem('username');
    const hashedPassword = localStorage.getItem('hashedPassword');
    
    if (!username || !hashedPassword) {
      throw new Error('No stored credentials for token renewal');
    }
    
    // Create a new axios instance for token renewal to avoid interceptor loops
    const renewalClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      withCredentials: true,
    });
    
    // Make silent login request
    const response = await renewalClient.post(import.meta.env.VITE_API_TOKEN_ENDPOINT, {
      username,
      password: hashedPassword
    });
    
    if (response.data.token) {
      // Update stored token
      localStorage.setItem('token', response.data.token);
      
      // Calculate new expiry time
      const expiryTime = response.data.expiresIn ?
        new Date().getTime() + (response.data.expiresIn * 1000) :
        new Date().getTime() + (60 * 60 * 1000); // Default 1 hour
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      // Track last renewal time for testing
      localStorage.setItem('lastRenewal', new Date().getTime().toString());
      
      return response.data.token;
    }
    
    throw new Error('No token received from renewal');
  } catch (error) {
    throw error;
  }
};

// Check if token needs renewal
const shouldRenewToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  // For testing: always renew every 2 minutes regardless of expiry
  const lastRenewal = Number(localStorage.getItem('lastRenewal')) || 0;
  const now = new Date().getTime();
  
  // Force renewal every 2 minutes for testing
  if (now - lastRenewal >= 3 * 60 * 1000) {
    return true;
  }
  
  return false;
};

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Include cookies if needed
});

// Request interceptor to add auth token and handle renewal
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Check if token needs renewal
      if (shouldRenewToken()) {
        if (!isRefreshing) {
          isRefreshing = true;
          
          try {
            const newToken = await renewToken();
            
            // Update request header with new token
            config.headers.Authorization = `Bearer ${newToken}`;
            
            // Process the queue
            processQueue(null, newToken);
            isRefreshing = false;
          } catch (refreshError) {
            // Refresh failed, clear storage and redirect to login
            processQueue(refreshError, null);
            isRefreshing = false;
            
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('hashedPassword');
            localStorage.removeItem('tokenExpiry');
            
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          // If already refreshing, add this request to the queue
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            config.headers.Authorization = `Bearer ${token}`;
            return config;
          }).catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        // Token is still valid, use it
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle network errors
    if (!error.response) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    
    // Handle HTTP errors
    const { status, data } = error.response;
    let errorMessage = data?.message || `HTTP ${status}`;
    
    // If 401 and not already retried, try to refresh token
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const newToken = await renewToken();
          
          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Process the queue
          processQueue(null, newToken);
          isRefreshing = false;
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed
          processQueue(refreshError, null);
          isRefreshing = false;
          
          // Clear storage and redirect
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('hashedPassword');
          localStorage.removeItem('tokenExpiry');
          
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        }
      } else {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
    }
    
    // For other 401 cases, clear storage
    if (status === 401) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('hashedPassword');
      localStorage.removeItem('tokenExpiry');
      errorMessage = 'Session expired. Please login again.';
    }
    
    throw new Error(errorMessage);
  }
);

export default apiClient;