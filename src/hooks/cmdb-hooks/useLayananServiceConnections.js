import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useLayananServiceConnections = (workspaceId) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const response = await api.get('/layanan-service-connections', {
        params: { workspace_id: workspaceId }
      });
      setConnections(response.data);
    } catch (err) {
      console.error('Failed to fetch layanan service connections:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchConnectionsByLayananId = useCallback(async (layananId) => {
    try {
      const response = await api.get(`/layanan-service-connections/layanan/${layananId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch layanan service connections by layanan ID:', err);
      return [];
    }
  }, []);

  const createConnection = useCallback(async (connectionData) => {
    try {
      const response = await api.post('/layanan-service-connections', connectionData);
      await fetchConnections();
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnections]);

  const updateConnection = useCallback(async (id, updates) => {
    try {
      const response = await api.put(`/layanan-service-connections/${id}`, updates);
      await fetchConnections();
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnections]);

  const deleteConnection = useCallback(async (id) => {
    try {
      await api.delete(`/layanan-service-connections/${id}`);
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnections]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    loading,
    fetchConnections,
    fetchConnectionsByLayananId,
    createConnection,
    updateConnection,
    deleteConnection,
  };
};
