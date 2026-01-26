import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';

export const useWorkspace = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [viewAllMode, setViewAllMode] = useState(false); // TAMBAHKAN
  const [loading, setLoading] = useState(false);

  // Load workspace dari localStorage
  const loadSavedWorkspace = useCallback(() => {
    const saved = localStorage.getItem('cmdb-current-workspace');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse saved workspace:', err);
      }
    }
    return null;
  }, []);

  // Save workspace ke localStorage
  const saveWorkspaceToStorage = useCallback((workspace) => {
    if (workspace) {
      localStorage.setItem('cmdb-current-workspace', JSON.stringify(workspace));
    }
  }, []);

  // Fetch all workspaces
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data);
      
      // Jika tidak ada current workspace, set ke saved atau default
      if (!currentWorkspace && !viewAllMode) {
        const saved = loadSavedWorkspace();
        if (saved) {
          const exists = res.data.find(w => w.id === saved.id);
          if (exists) {
            setCurrentWorkspace(exists);
          } else {
            const defaultWs = res.data.find(w => w.is_default);
            setCurrentWorkspace(defaultWs || res.data[0]);
          }
        } else {
          const defaultWs = res.data.find(w => w.is_default);
          setCurrentWorkspace(defaultWs || res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
      toast.error('Gagal memuat workspace');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, viewAllMode, loadSavedWorkspace]);

  // Switch workspace
  const switchWorkspace = useCallback((workspace) => {
    setCurrentWorkspace(workspace);
    setViewAllMode(false); // Matikan viewAllMode saat pilih workspace tertentu
    saveWorkspaceToStorage(workspace);
    toast.success(`Beralih ke workspace: ${workspace.name}`);
  }, [saveWorkspaceToStorage]);

  // Toggle view all mode - TAMBAHKAN
  const toggleViewAll = useCallback(() => {
    const newViewAllMode = !viewAllMode;
    setViewAllMode(newViewAllMode);
    
    if (newViewAllMode) {
      setCurrentWorkspace(null);
      toast.success('View All Mode: Menampilkan semua workspace');
    } else {
      // Kembali ke workspace terakhir atau default
      const saved = loadSavedWorkspace();
      if (saved) {
        const exists = workspaces.find(w => w.id === saved.id);
        if (exists) {
          setCurrentWorkspace(exists);
        } else {
          const defaultWs = workspaces.find(w => w.is_default);
          setCurrentWorkspace(defaultWs || workspaces[0]);
        }
      }
    }
  }, [viewAllMode, workspaces, loadSavedWorkspace]);

  // Create workspace
  const createWorkspace = useCallback(async (name, description) => {
    try {
      const res = await api.post('/workspaces', { name, description });
      await fetchWorkspaces();
      toast.success('Workspace berhasil dibuat');
      return { success: true, data: res.data };
    } catch (err) {
      console.error('Failed to create workspace:', err);
      toast.error('Gagal membuat workspace');
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchWorkspaces]);

  // Update workspace
  const updateWorkspace = useCallback(async (id, name, description) => {
    try {
      const res = await api.put(`/workspaces/${id}`, { name, description });
      await fetchWorkspaces();
      
      // Update current workspace jika sedang diedit
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(res.data);
        saveWorkspaceToStorage(res.data);
      }
      
      toast.success('Workspace berhasil diperbarui');
      return { success: true, data: res.data };
    } catch (err) {
      console.error('Failed to update workspace:', err);
      toast.error('Gagal memperbarui workspace');
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [currentWorkspace, fetchWorkspaces, saveWorkspaceToStorage]);

  // Delete workspace
  const deleteWorkspace = useCallback(async (id) => {
    try {
      await api.delete(`/workspaces/${id}`);
      
      // Jika menghapus current workspace, switch ke default
      if (currentWorkspace?.id === id) {
        const defaultWs = workspaces.find(w => w.is_default && w.id !== id);
        if (defaultWs) {
          switchWorkspace(defaultWs);
        }
      }
      
      await fetchWorkspaces();
      toast.success('Workspace berhasil dihapus');
      return { success: true };
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      toast.error(err.response?.data?.error || 'Gagal menghapus workspace');
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [currentWorkspace, workspaces, fetchWorkspaces, switchWorkspace]);

  // Set default workspace
  const setDefaultWorkspace = useCallback(async (id) => {
    try {
      await api.patch(`/workspaces/${id}/set-default`);
      await fetchWorkspaces();
      toast.success('Workspace default berhasil diatur');
      return { success: true };
    } catch (err) {
      console.error('Failed to set default workspace:', err);
      toast.error('Gagal mengatur workspace default');
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchWorkspaces]);

  // Duplicate workspace
  const duplicateWorkspace = useCallback(async (id, newName) => {
    try {
      const res = await api.post(`/workspaces/${id}/duplicate`, { name: newName });
      await fetchWorkspaces();
      toast.success('Workspace berhasil diduplikasi');
      return { success: true, data: res.data };
    } catch (err) {
      console.error('Failed to duplicate workspace:', err);
      toast.error('Gagal menduplikasi workspace');
      return { success: false, error: err.response?.data?.error || err.message };
    }
  }, [fetchWorkspaces]);

  // Load workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    currentWorkspace,
    viewAllMode, // EKSPOR
    loading,
    fetchWorkspaces,
    switchWorkspace,
    toggleViewAll, // EKSPOR
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setDefaultWorkspace,
    duplicateWorkspace,
  };
};