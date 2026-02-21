import axios from 'axios';

const CMDB_API_BASE_URL = import.meta.env.VITE_CMDB_API_BASE_URL || 'http://localhost:5001';

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

// ==================== SHARE LINK API ====================

/**
 * Generate a new share link for a workspace (requires auth)
 */
export const generateShareLink = async ({ workspace_id, expiration = 'never', password }) => {
  const response = await api.post('/share/generate', {
    workspace_id,
    expiration,
    password: password || undefined,
  });
  return response.data;
};

/**
 * Verify password for a protected share link (public endpoint - no auth required)
 */
export const verifySharePassword = async (token, password) => {
  const response = await fetch(`${CMDB_API_BASE_URL}/api/cmdb/shared/${token}/verify-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

/**
 * Get all share links for a workspace (requires auth)
 */
export const getWorkspaceShareLinks = async (workspaceId) => {
  const response = await api.get(`/share/workspace/${workspaceId}`);
  return response.data;
};

/**
 * Get share link by ID (requires auth)
 */
export const getShareLink = async (id) => {
  const response = await api.get(`/share/${id}`);
  return response.data;
};

/**
 * Update share link (requires auth)
 */
export const updateShareLink = async (id, updates) => {
  const response = await api.put(`/share/${id}`, updates);
  return response.data;
};

/**
 * Delete share link (requires auth)
 */
export const deleteShareLink = async (id) => {
  await api.delete(`/share/${id}`);
};

/**
 * Get access logs for a share link (requires auth)
 */
export const getShareAccessLogs = async (id, limit = 50) => {
  const response = await api.get(`/share/${id}/logs?limit=${limit}`);
  return response.data;
};

/**
 * Get share link stats (requires auth)
 */
export const getShareStats = async (id) => {
  const response = await api.get(`/share/${id}/stats`);
  return response.data;
};

/**
 * Get shared CMDB data (public endpoint - no auth required)
 */
export const getSharedCmdb = async (token) => {
  const response = await fetch(`${CMDB_API_BASE_URL}/api/cmdb/shared/${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json();
};

export default api;