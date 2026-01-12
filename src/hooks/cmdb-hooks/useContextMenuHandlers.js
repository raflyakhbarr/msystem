import { useCallback } from 'react';

export function useContextMenuHandlers({
  contextMenu,
  handleEditFromVisualization,
  handleManageConnectionsFromVisualization,
  handleDeleteFromVisualization,
  onEditItem,
  onEditGroup,
  onOpenConnectionModal,
  onOpenGroupConnectionModal,
  toggleNodeVisibility,
  groups,
}) {
  const handleContextEdit = useCallback(() => {
    const editData = handleEditFromVisualization(contextMenu.node);
    if (editData.type === 'group') {
      onEditGroup(editData.data);
    } else {
      onEditItem(editData.data);
    }
  }, [contextMenu.node, handleEditFromVisualization, onEditGroup, onEditItem]);

  const handleContextDelete = useCallback(async () => {
    await handleDeleteFromVisualization(contextMenu.node);
  }, [contextMenu.node, handleDeleteFromVisualization]);

  const handleContextManageConnections = useCallback(() => {
    const item = handleManageConnectionsFromVisualization(contextMenu.node);
    if (item) {
      onOpenConnectionModal(item);
    }
  }, [contextMenu.node, handleManageConnectionsFromVisualization, onOpenConnectionModal]);

  const handleContextManageGroupConnections = useCallback(() => {
    if (!contextMenu.node || contextMenu.node.type !== 'group') return;
    
    const groupId = parseInt(contextMenu.node.id.replace('group-', ''));
    const group = groups.find(g => g.id === groupId);
    
    if (group) {
      onOpenGroupConnectionModal(group);
    }
  }, [contextMenu.node, groups, onOpenGroupConnectionModal]);

  const handleContextToggleVisibility = useCallback(() => {
    toggleNodeVisibility(contextMenu.node.id);
  }, [contextMenu.node, toggleNodeVisibility]);

  return {
    handleContextEdit,
    handleContextDelete,
    handleContextManageConnections,
    handleContextManageGroupConnections,
    handleContextToggleVisibility,
  };
}