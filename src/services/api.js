import axios from 'axios';

const CMDB_API_BASE_URL = import.meta.env.VITE_CMDB_API_BASE_URL;

const api = axios.create({
  baseURL: `${CMDB_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      // Debug: Log token payload (without sensitive data)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = new Date(payload.exp * 1000);
        const now = new Date();
        const timeLeft = expiryTime - now;

        if (timeLeft < 60000) { // Less than 1 minute left
          console.warn(`[API Request] Token expires in ${(timeLeft / 1000).toFixed(0)}s`, {
            url: config.url,
            expiry: expiryTime.toISOString(),
            now: now.toISOString()
          });
        }
      } catch (e) {
        console.error('[API Request] Failed to parse token:', e);
      }
    } else {
      console.warn('[API Request] No token found in localStorage for:', config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to get fresh token
      const username = localStorage.getItem('username');
      const hashedPassword = localStorage.getItem('hashedPassword');

      if (username && hashedPassword) {
        try {
          // Build full URL for token endpoint
          const tokenEndpoint = import.meta.env.VITE_API_TOKEN_ENDPOINT.startsWith('http')
            ? import.meta.env.VITE_API_TOKEN_ENDPOINT
            : `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_TOKEN_ENDPOINT}`;

          console.log('[Token Refresh] Fetching new token from:', tokenEndpoint);

          // Create separate instance to avoid loop
          const authClient = axios.create({
            headers: { 'Content-Type': 'application/json' }
          });

          const response = await authClient.post(
            tokenEndpoint,
            { username, password: hashedPassword }
          );

          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            console.log('[Token Refresh] New token received');

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('[Token Refresh] Failed:', refreshError.response?.data || refreshError.message);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        console.error('[Token Refresh] No credentials found in localStorage');
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;