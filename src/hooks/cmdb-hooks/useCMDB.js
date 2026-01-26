import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useCMDB = (workspaceId, viewAllMode = false) => {
  const [items, setItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupConnections, setGroupConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // Jika viewAllMode, ambil semua data tanpa filter workspace
      const url = viewAllMode ? '/cmdb' : `/cmdb?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, viewAllMode]);

  const fetchConnections = useCallback(async () => {
    try {
      const url = viewAllMode ? '/cmdb/connections' : `/cmdb/connections?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  }, [workspaceId, viewAllMode]);

  const fetchGroups = useCallback(async () => {
    try {
      const url = viewAllMode ? '/groups' : `/groups?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, [workspaceId, viewAllMode]);

  const fetchGroupConnections = useCallback(async () => {
    try {
      const url = viewAllMode ? '/groups/connections' : `/groups/connections?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setGroupConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch group connections:', err);
    }
  }, [workspaceId, viewAllMode]);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchItems(),
      fetchConnections(),
      fetchGroups(),
      fetchGroupConnections()
    ]);
  }, [fetchItems, fetchConnections, fetchGroups, fetchGroupConnections]);

  useEffect(() => {
    // Fetch data jika viewAllMode aktif ATAU ada workspaceId
    if (viewAllMode || workspaceId) {
      fetchAll();
    } else {
      // Reset data jika tidak ada workspace dan viewAllMode off
      setItems([]);
      setConnections([]);
      setGroups([]);
      setGroupConnections([]);
    }
  }, [workspaceId, viewAllMode, fetchAll]);

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
