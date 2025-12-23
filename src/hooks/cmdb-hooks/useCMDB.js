import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useCMDB = () => {
  const [items, setItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupConnections, setGroupConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cmdb');
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await api.get('/cmdb/connections');
      setConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  const fetchGroupConnections = useCallback(async () => {
    try {
      const res = await api.get('/groups/connections');
      setGroupConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch group connections:', err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchItems(),
      fetchConnections(),
      fetchGroups(),
      fetchGroupConnections()
    ]);
  }, [fetchItems, fetchConnections, fetchGroups, fetchGroupConnections]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const deleteItem = async (id) => {
    try {
      await api.delete(`/cmdb/${id}`);
      await fetchItems();
      await fetchConnections();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const deleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      await fetchGroups();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  return {
    items,
    connections,
    groups,
    groupConnections,
    loading,
    fetchItems,
    fetchConnections,
    fetchGroups,
    fetchGroupConnections,
    fetchAll,
    deleteItem,
    deleteGroup,
  };
};