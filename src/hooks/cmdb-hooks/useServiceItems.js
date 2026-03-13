import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { io } from 'socket.io-client';

export const useServiceItems = (serviceId, workspaceId) => {
  const [items, setItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupConnections, setGroupConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllRef = useRef(null);

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
        fetchServiceGroupConnections(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchServiceItems, fetchServiceConnections, fetchServiceGroups, fetchServiceGroupConnections, serviceId, workspaceId]);

  // Store fetchAll in ref for socket listener - update it whenever fetchAll changes
  useEffect(() => {
    fetchAllRef.current = fetchAll;
    console.log('🔄 fetchAllRef updated');
  }, [fetchAll]);

  const createServiceGroup = useCallback(async (groupData) => {
    try {
      const res = await api.post('/service-groups', {
        ...groupData,
        service_id: serviceId,
        workspace_id: workspaceId,
      });
      await fetchServiceGroups();
      return res.data;
    } catch (err) {
      console.error('Failed to create service group:', err);
      throw err;
    }
  }, [serviceId, workspaceId, fetchServiceGroups]);

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

  const deleteServiceGroup = useCallback(async (groupId) => {
    try {
      await api.delete(`/service-groups/${groupId}`);
      await fetchAll();
    } catch (err) {
      console.error('Failed to delete service group:', err);
      throw err;
    }
  }, [fetchAll]);

  const saveServiceGroupConnections = useCallback(async (groupId, selectedGroupConns, selectedItemConns) => {
    try {
      // ── GROUP-TO-GROUP connections ──────────────────────────────────────
      // Koneksi tipe ini: source_id = groupId, target_id = group lain
      const currentGroupConns = groupConnections
        .filter(conn => conn.source_id === groupId && conn.target_id !== null)
        .map(conn => conn.target_id);

      const groupsToAdd = selectedGroupConns.filter(id => !currentGroupConns.includes(id));
      for (const targetId of groupsToAdd) {
        await api.post('/service-groups/connections', {
          service_id: serviceId,
          source_id: groupId,
          target_id: targetId,
          workspace_id: workspaceId,
        });
      }

      const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConns.includes(id));
      for (const targetId of groupsToRemove) {
        await api.delete(`/service-groups/connections/${serviceId}/${groupId}/${targetId}`);
      }

      // ── GROUP-TO-ITEM connections ───────────────────────────────────────
      const currentItemConns = groupConnections
        .filter(conn => conn.source_group_id === groupId && conn.target_item_id !== null)
        .map(conn => conn.target_item_id);

      const itemsToAdd = selectedItemConns.filter(id => !currentItemConns.includes(id));
      for (const targetItemId of itemsToAdd) {
        await api.post('/service-groups/connections/to-item', {
          service_id: serviceId,
          source_group_id: groupId,
          target_item_id: targetItemId,   // PERBAIKAN: ganti target_id → target_item_id
          workspace_id: workspaceId,
        });
      }

      const itemsToRemove = currentItemConns.filter(id => !selectedItemConns.includes(id));
      for (const targetItemId of itemsToRemove) {
        await api.delete(`/service-groups/connections/to-item/${serviceId}/${groupId}/${targetItemId}`);
      }

      await fetchServiceGroupConnections();
    } catch (err) {
      console.error('Failed to save service group connections:', err);
      throw err;
    }
  }, [groupConnections, serviceId, workspaceId, fetchServiceGroupConnections]);

  // Socket.io connection for real-time updates
  useEffect(() => {
    if (!serviceId || !workspaceId) return;

    console.log('🔌 Connecting to socket for service:', serviceId, 'workspace:', workspaceId);

    const socket = io(import.meta.env.VITE_CMDB_API_BASE_URL || 'http://localhost:5001', {
      reconnectionAttempts: 5,
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('service_update', (data) => {
      console.log('📡 service_update received:', data);
      console.log('📡 Checking: serviceId=', data.serviceId, 'expected=', serviceId, 'workspaceId=', data.workspaceId, 'expected=', workspaceId);
      // Only refetch if this update is for our service
      if (data.serviceId === serviceId && data.workspaceId === workspaceId) {
        console.log('✅ Match! Fetching all data...');
        // Use ref to get latest fetchAll function
        if (fetchAllRef.current) {
          fetchAllRef.current();
        } else {
          console.warn('⚠️ fetchAllRef.current is null, cannot fetch data');
        }
      } else {
        console.log('❌ No match, ignoring');
      }
    });

    socket.on('service_item_status_update', (data) => {
      console.log('📡 service_item_status_update received:', data);
      console.log('📡 Checking: serviceId=', data.serviceId, 'expected=', serviceId, 'workspaceId=', data.workspaceId, 'expected=', workspaceId);
      // Handle individual service item status updates - only if it's for this service OR same workspace
      // Same workspace check is needed for cross-service external items to update in real-time
      if (data.workspaceId === workspaceId) {
        if (data.serviceId === serviceId) {
          console.log('✅ Service and workspace match! Fetching all data...');
        } else {
          console.log('✅ Workspace match (external service item update)! Fetching all data...');
        }
        // Use ref to get latest fetchAll function
        if (fetchAllRef.current) {
          fetchAllRef.current();
        } else {
          console.warn('⚠️ fetchAllRef.current is null, cannot fetch data');
        }
      } else {
        console.log('❌ No match, ignoring');
      }
    });

    return () => {
      console.log('🔌 Cleaning up socket listeners');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('service_update');
      socket.off('service_item_status_update');
      socket.disconnect();
    };
  }, [serviceId, workspaceId]);

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