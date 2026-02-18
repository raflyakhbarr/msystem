import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useServiceItems = (serviceId, workspaceId) => {
  const [items, setItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupConnections, setGroupConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchServiceItems = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    try {
      const res = await api.get(`/service-items/${serviceId}/items?workspace_id=${workspaceId}`);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch service items:', err);
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

  const fetchServiceGroups = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    try {
      const res = await api.get(`/service-groups/${serviceId}?workspace_id=${workspaceId}`);
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch service groups:', err);
    }
  }, [serviceId, workspaceId]);

  const fetchServiceGroupConnections = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    try {
      const res = await api.get(`/service-groups/${serviceId}/connections?workspace_id=${workspaceId}`);
      setGroupConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch service group connections:', err);
    }
  }, [serviceId, workspaceId]);

  const fetchAll = useCallback(async () => {
    if (!serviceId || !workspaceId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchServiceItems(),
        fetchServiceConnections(),
        fetchServiceGroups(),
        fetchServiceGroupConnections()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchServiceItems, fetchServiceConnections, fetchServiceGroups, fetchServiceGroupConnections, serviceId, workspaceId]);

  // Create service group
  const createServiceGroup = useCallback(async (groupData) => {
    try {
      const res = await api.post('/service-groups', {
        ...groupData,
        service_id: serviceId,
        workspace_id: workspaceId
      });
      await fetchServiceGroups();
      return res.data;
    } catch (err) {
      console.error('Failed to create service group:', err);
      throw err;
    }
  }, [serviceId, workspaceId, fetchServiceGroups]);

  // Update service group
  const updateServiceGroup = useCallback(async (groupId, groupData) => {
    try {
      const res = await api.put(`/service-groups/${groupId}`, groupData);
      await fetchServiceGroups();
      return res.data;
    } catch (err) {
      console.error('Failed to update service group:', err);
      throw err;
    }
  }, [fetchServiceGroups]);

  // Delete service group
  const deleteServiceGroup = useCallback(async (groupId) => {
    try {
      await api.delete(`/service-groups/${groupId}`);
      await fetchAll();
    } catch (err) {
      console.error('Failed to delete service group:', err);
      throw err;
    }
  }, [fetchAll]);

  // Save service group connections
  const saveServiceGroupConnections = useCallback(async (groupId, selectedGroupConns, selectedItemConns) => {
    try {
      // Get current group connections
      const currentGroupConns = groupConnections
        .filter(conn => conn.source_id === groupId && conn.target_id)
        .map(conn => conn.target_id);

      // Add new group connections
      const groupsToAdd = selectedGroupConns.filter(id => !currentGroupConns.includes(id));
      for (const targetId of groupsToAdd) {
        await api.post('/service-groups/connections', {
          service_id: serviceId,
          source_id: groupId,
          target_id: targetId,
          workspace_id: workspaceId
        });
      }

      // Remove old group connections
      const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConns.includes(id));
      for (const targetId of groupsToRemove) {
        await api.delete(`/service-groups/connections/${serviceId}/${groupId}/${targetId}`);
      }

      // Get current item connections
      const currentItemConns = groupConnections
        .filter(conn => conn.source_group_id === groupId && conn.target_id)
        .map(conn => conn.target_id);

      // Add new item connections
      const itemsToAdd = selectedItemConns.filter(id => !currentItemConns.includes(id));
      for (const targetId of itemsToAdd) {
        await api.post('/service-groups/connections/to-item', {
          service_id: serviceId,
          source_group_id: groupId,
          target_id: targetId,
          workspace_id: workspaceId
        });
      }

      // Remove old item connections
      const itemsToRemove = currentItemConns.filter(id => !selectedItemConns.includes(id));
      for (const targetId of itemsToRemove) {
        await api.delete(`/service-groups/connections/to-item/${serviceId}/${groupId}/${targetId}`);
      }

      await fetchServiceGroupConnections();
    } catch (err) {
      console.error('Failed to save service group connections:', err);
      throw err;
    }
  }, [groupConnections, serviceId, workspaceId, fetchServiceGroupConnections]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    items,
    connections,
    groups,
    groupConnections,
    loading,
    fetchAll,
    createServiceGroup,
    updateServiceGroup,
    deleteServiceGroup,
    saveServiceGroupConnections,
  };
};
