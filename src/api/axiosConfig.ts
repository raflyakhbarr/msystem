import axios from 'axios';
import { authManager } from '../context/AuthManager';
import { hashPassword } from '../utils/hash';

const API_BASE_URL = '';

const TOKEN_ENDPOINT = import.meta.env.VITE_API_TOKEN_ENDPOINT;

let isRefreshing = false;
interface QueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const renewToken = async () => {
  const { username, password } = authManager.getCredentials();

  if (!username || !password) {
    throw new Error('No stored credentials for token renewal');
  }

  const renewalClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
  });

  const hashedPassword = hashPassword(password);

  const response = await renewalClient.post(import.meta.env.VITE_API_TOKEN_ENDPOINT, {
    username,
    password: hashedPassword
  });

  if (response.data.token) {
    authManager.updateToken(response.data.token, response.data.expired || null);

    return response.data.token;
  }

  throw new Error('No token received from renewal');
};

const shouldRenewToken = () => {
  const token = authManager.getToken();
  if (!token) return false;

  const tokenExpiry = authManager.getTokenExpiry();
  if (!tokenExpiry) return false;

  try {
    const [datePart, timePart] = tokenExpiry.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    const expiryDate = new Date(year, month - 1, day, hours, minutes, seconds);
    const now = new Date();

    const timeUntilExpiry = expiryDate.getTime() - now.getTime();

    const twoMinutesInMs = 2 * 60 * 1000;

    return timeUntilExpiry <= twoMinutesInMs && timeUntilExpiry > 0;
  } catch {
    return false;
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = authManager.getToken();

    if (token) {
      if (shouldRenewToken()) {
        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const newToken = await renewToken();

            config.headers.Authorization = `Bearer ${newToken}`;

            processQueue(null, newToken);
            isRefreshing = false;
          } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;

            authManager.clearAuth();

            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
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
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }

    const { status, data } = error.response;
    let errorMessage = data?.message || `HTTP ${status}`;

    const isTokenEndpoint = originalRequest.url?.includes('/auth/token') ||
                            originalRequest.url === TOKEN_ENDPOINT;
    if (status === 401 && !originalRequest._retry && !isTokenEndpoint) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const newToken = await renewToken();
          
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          isRefreshing = false;
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;

          authManager.clearAuth();

          window.location.href = '/login';

          return Promise.reject(refreshError);
        }
      } else {
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

    if (status === 401) {
      if (!isTokenEndpoint) {
        authManager.clearAuth();
        errorMessage = 'Session expired. Please login again.';
      }
    }

    throw new Error(errorMessage);
  }
);

export default apiClient;