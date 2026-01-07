import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
          // Create separate instance to avoid loop
          const authClient = axios.create({
            headers: { 'Content-Type': 'application/json' }
          });
          
          const response = await authClient.post(
            import.meta.env.VITE_API_TOKEN_ENDPOINT,
            { username, password: hashedPassword }
          );
          
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;