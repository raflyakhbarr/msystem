import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useServiceItems = (serviceId, workspaceId) => {
  const [items, setItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchServiceItems = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    setLoading(true);
    try {
      const res = await api.get(`/service-items/${serviceId}/items?workspace_id=${workspaceId}`);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch service items:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceId, workspaceId]);

  const fetchServiceConnections = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    try {
      const res = await api.get(`/service-items/${serviceId}/connections?workspace_id=${workspaceId}`);
      setConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch service connections:', err);
    }
  }, [serviceId, workspaceId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchServiceItems(),
      fetchServiceConnections()
    ]);
  }, [fetchServiceItems, fetchServiceConnections]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    items,
    connections,
    loading,
    fetchAll,
  };
};
