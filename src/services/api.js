import axios from 'axios';
import { authManager } from '../context/AuthManager';
import { hashPassword } from '../utils/hash';

const CMDB_API_BASE_URL = import.meta.env.VITE_CMDB_API_BASE_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${CMDB_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to all requests using authManager (in-memory auth)
api.interceptors.request.use(
  (config) => {
    const token = authManager.getToken();

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
      console.warn('[API Request] No token found in authManager for:', config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses - use authManager for token renewal
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to get fresh token from authManager
      const { username, password } = authManager.getCredentials();

      if (username && password) {
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

          const hashedPassword = hashPassword(password);
          const response = await authClient.post(
            tokenEndpoint,
            { username, password: hashedPassword }
          );

          if (response.data.token) {
            // Update token in authManager
            authManager.updateToken(response.data.token, response.data.expired || null);
            console.log('[Token Refresh] New token received');

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('[Token Refresh] Failed:', refreshError.response?.data || refreshError.message);
          authManager.clearAuth();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        console.error('[Token Refresh] No credentials found in authManager');
        authManager.clearAuth();
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

// ==================== SERVICE API CALLS ====================

/**
 * Get all services for a workspace (as independent nodes)
 */
export const getWorkspaceServices = async (workspaceId) => {
  const response = await api.get(`/services/workspace/${workspaceId}`);
  return response.data;
};

/**
 * Update service position
 */
export const updateServicePosition = async (serviceId, position, options = {}) => {
  const { skipEmit = false } = options;
  const response = await api.put(`/services/${serviceId}/position`, {
    position,
    skipEmit
  });
  return response.data;
};

/**
 * Update service dimensions
 */
export const updateServiceDimensions = async (serviceId, width, height) => {
  const response = await api.put(`/services/${serviceId}/dimensions`, {
    width,
    height
  });
  return response.data;
};

/**
 * Toggle service expanded state
 */
export const toggleServiceExpanded = async (serviceId) => {
  const response = await api.patch(`/services/${serviceId}/toggle-expanded`);
  return response.data;
};

/**
 * Get services by CMDB item ID
 */
export const getServicesByItemId = async (itemId) => {
  const response = await api.get(`/services/${itemId}`);
  return response.data;
};

/**
 * Get service by ID
 */
export const getServiceById = async (serviceId) => {
  const response = await api.get(`/services/single/${serviceId}`);
  return response.data;
};

/**
 * Create new service
 */
export const createService = async (cmdbItemId, serviceData) => {
  const response = await api.post('/services', {
    cmdb_item_id: cmdbItemId,
    ...serviceData
  });
  return response.data;
};

/**
 * Update service
 */
export const updateService = async (serviceId, serviceData) => {
  const response = await api.put(`/services/${serviceId}`, serviceData);
  return response.data;
};

/**
 * Update service status
 */
export const updateServiceStatus = async (serviceId, status) => {
  const response = await api.patch(`/services/${serviceId}/status`, { status });
  return response.data;
};

/**
 * Delete service
 */
export const deleteService = async (serviceId) => {
  const response = await api.delete(`/services/${serviceId}`);
  return response.data;
};

/**
 * Upload service icon
 */
export const uploadServiceIcon = async (serviceId, iconFile) => {
  const formData = new FormData();
  formData.append('icon', iconFile);

  const response = await api.post(`/services/${serviceId}/upload-icon`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Manually trigger recursive propagation from a service
 */
export const propagateServiceStatus = async (serviceId, status, maxDepth = 10) => {
  const response = await api.post(`/services/${serviceId}/propagate-status`, {
    status,
    max_depth: maxDepth
  });
  return response.data;
};

/**
 * Get propagation preview (show what would be affected without actually propagating)
 */
export const getPropagationPreview = async (serviceId, status) => {
  const response = await api.get(`/services/${serviceId}/propagation-preview?status=${status}`);
  return response.data;
};

export default api;