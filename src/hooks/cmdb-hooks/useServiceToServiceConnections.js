import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useServiceToServiceConnections = (workspaceId) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all service-to-service connections for a workspace
  const fetchConnectionsByWorkspace = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/service-to-service-connections/workspace/${workspaceId}`);
      setConnections(response.data);
    } catch (err) {
      console.error('Failed to fetch service-to-service connections:', err);
      setError(err.response?.data?.error || 'Failed to fetch connections');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Fetch service-to-service connections for a specific CMDB item
  const fetchConnectionsByItemId = useCallback(async (itemId) => {
    if (!itemId || !workspaceId) return [];

    try {
      const response = await api.get(`/service-to-service-connections/item/${itemId}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch service-to-service connections for item ${itemId}:`, err);
      return [];
    }
  }, [workspaceId]);

  // Create a new service-to-service connection
  const createConnection = useCallback(async (connectionData) => {
    try {
      const response = await api.post('/service-to-service-connections', {
        ...connectionData,
        workspace_id: workspaceId
      });
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to create service-to-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [workspaceId, fetchConnectionsByWorkspace]);

  // Update a service-to-service connection
  const updateConnection = useCallback(async (id, updates) => {
    try {
      const response = await api.put(`/service-to-service-connections/${id}`, updates);
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Failed to update service-to-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnectionsByWorkspace]);

  // Delete a service-to-service connection by ID
  const deleteConnection = useCallback(async (id) => {
    try {
      await api.delete(`/service-to-service-connections/${id}`);
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true };
    } catch (err) {
      console.error('Failed to delete service-to-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnectionsByWorkspace]);

  // Delete a service-to-service connection by service IDs
  const deleteConnectionByServices = useCallback(async (sourceServiceId, targetServiceId) => {
    try {
      await api.delete(`/service-to-service-connections/service/${sourceServiceId}/${targetServiceId}`);
      await fetchConnectionsByWorkspace(); // Refresh connections
      return { success: true };
    } catch (err) {
      console.error('Failed to delete service-to-service connection:', err);
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchConnectionsByWorkspace]);

  // Get connections for a specific service
  const getServiceConnections = useCallback(async (serviceId) => {
    try {
      const response = await api.get(`/service-to-service-connections/service/${serviceId}/connections`);
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch connections for service ${serviceId}:`, err);
      return [];
    }
  }, []);

  // Check if connection exists between two services
  const checkConnectionExists = useCallback(async (sourceServiceId, targetServiceId) => {
    try {
      const response = await api.get(`/service-to-service-connections/service/${sourceServiceId}/${targetServiceId}`);
      return response.data; // Returns connection object or 404
    } catch (err) {
      if (err.response?.status === 404) {
        return null; // No connection exists
      }
      console.error('Failed to check connection existence:', err);
      return null;
    }
  }, []);

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
    fetchConnectionsByItemId,
    createConnection,
    updateConnection,
    deleteConnection,
    deleteConnectionByServices,
    getServiceConnections,
    checkConnectionExists
  };
};
