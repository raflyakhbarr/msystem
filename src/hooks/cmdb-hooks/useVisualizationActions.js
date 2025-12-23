import { useState, useCallback } from 'react';
import api from '../../services/api';

export const useVisualizationActions = (items, groups, fetchAll) => {
  const [contextMenu, setContextMenu] = useState({
    show: false,
    position: { x: 0, y: 0 },
    node: null,
  });

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      node: node,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ show: false, position: { x: 0, y: 0 }, node: null });
  }, []);

  const handleEditFromVisualization = useCallback((node) => {
    if (node.type === 'group') {
      // Find group data
      const groupId = parseInt(node.id.replace('group-', ''));
      const group = groups.find(g => g.id === groupId);
      return { type: 'group', data: group };
    } else {
      // Find item data
      const itemId = parseInt(node.id);
      const item = items.find(i => i.id === itemId);
      return { type: 'item', data: item };
    }
  }, [items, groups]);

  const handleDeleteFromVisualization = useCallback(async (node) => {
    if (node.type === 'group') {
      const groupId = parseInt(node.id.replace('group-', ''));
      if (!window.confirm('Hapus group ini? Items di dalamnya tidak akan dihapus.')) return false;
      
      try {
        await api.delete(`/groups/${groupId}`);
        await fetchAll();
        return true;
      } catch (err) {
        alert('Gagal menghapus: ' + (err.response?.data?.error || err.message));
        return false;
      }
    } else {
      const itemId = parseInt(node.id);
      if (!window.confirm('Apakah Anda yakin ingin menghapus item ini?')) return false;
      
      try {
        await api.delete(`/cmdb/${itemId}`);
        await fetchAll();
        return true;
      } catch (err) {
        alert('Gagal menghapus: ' + (err.response?.data?.error || err.message));
        return false;
      }
    }
  }, [fetchAll]);

  const handleManageConnectionsFromVisualization = useCallback((node) => {
    const itemId = parseInt(node.id);
    const item = items.find(i => i.id === itemId);
    return item;
  }, [items]);

  return {
    contextMenu,
    handleNodeContextMenu,
    closeContextMenu,
    handleEditFromVisualization,
    handleDeleteFromVisualization,
    handleManageConnectionsFromVisualization,
  };
};