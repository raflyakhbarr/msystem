import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useCrossServiceConnections = (workspaceId) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all cross-service connections for a workspace
  const fetchConnectionsByWorkspace = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
      setConnections(response.data);
    } catch (err) {
      console.error('Failed to fetch cross-service connections:', err);
      setError(err.response?.data?.error || 'Failed to fetch connections');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Create a new cross-service connection
  const createConnection = useCallback(async (connectionData) => {
    try {
      const response = await api.post('/cross-service-connections', {
        ...connectionData,
        workspace_id: workspaceId
      });
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to create cross-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [workspaceId, fetchConnectionsByWorkspace]);

  // Update a cross-service connection
  const updateConnection = useCallback(async (id, updates) => {
    try {
      const response = await api.put(`/cross-service-connections/${id}`, updates);
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to update cross-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnectionsByWorkspace]);

  // Delete a cross-service connection by ID
  const deleteConnection = useCallback(async (id) => {
    try {
      await api.delete(`/cross-service-connections/${id}`);
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true };
    } catch (err) {
      console.error('Failed to delete cross-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnectionsByWorkspace]);

  // Fetch connections on mount or workspace change
  useEffect(() => {
    if (workspaceId) {
      fetchConnectionsByWorkspace();
    } else {
      setConnections([]);
    }
  }, [workspaceId, fetchConnectionsByWorkspace]);

  return {
    connections,
    loading,
    error,
    fetchConnectionsByWorkspace,
    createConnection,
    updateConnection,
    deleteConnection
  };
};
