import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const useLayanan = (workspaceId, viewAllMode = false) => {
  const [layananItems, setLayananItems] = useState([]);
  const [layananConnections, setLayananConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLayananItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = viewAllMode ? '/layanan' : `/layanan?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setLayananItems(res.data);
    } catch (err) {
      console.error('Failed to fetch layanan items:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, viewAllMode]);

  const fetchLayananConnections = useCallback(async () => {
    try {
      const url = viewAllMode ? '/layanan/connections' : `/layanan/connections?workspace_id=${workspaceId}`;
      const res = await api.get(url);
      setLayananConnections(res.data);
    } catch (err) {
      console.error('Failed to fetch layanan connections:', err);
    }
  }, [workspaceId, viewAllMode]);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchLayananItems(),
      fetchLayananConnections()
    ]);
  }, [fetchLayananItems, fetchLayananConnections]);

  useEffect(() => {
    if (viewAllMode || workspaceId) {
      fetchAll();
    } else {
      setLayananItems([]);
      setLayananConnections([]);
    }
  }, [workspaceId, viewAllMode, fetchAll]);

  const createLayanan = async (data) => {
    try {
      const res = await api.post('/layanan', data);
      await fetchLayananItems();
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const updateLayanan = async (id, data) => {
    try {
      const res = await api.put(`/layanan/${id}`, data);
      await fetchLayananItems();
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const deleteLayanan = async (id) => {
    try {
      await api.delete(`/layanan/${id}`);
      await fetchLayananItems();
      await fetchLayananConnections();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const updateLayananStatus = async (id, status) => {
    try {
      const res = await api.patch(`/layanan/${id}/status`, { status });
      await fetchLayananItems();
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const updateLayananPosition = async (id, position) => {
    try {
      const res = await api.put(`/layanan/${id}/position`, { position });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const createLayananConnection = async (data) => {
    try {
      const res = await api.post('/layanan/connections', data);
      await fetchLayananConnections();
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const deleteLayananConnection = async (id) => {
    try {
      await api.delete(`/layanan/connections/${id}`);
      await fetchLayananConnections();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  return {
    layananItems,
    layananConnections,
    loading,
    fetchLayananItems,
    fetchLayananConnections,
    fetchAll,
    createLayanan,
    updateLayanan,
    deleteLayanan,
    updateLayananStatus,
    updateLayananPosition,
    createLayananConnection,
    deleteLayananConnection,
  };
};
