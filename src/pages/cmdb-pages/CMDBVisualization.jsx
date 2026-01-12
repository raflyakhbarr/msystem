import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  reconnectEdge,
} from 'reactflow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import 'reactflow/dist/style.css';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

import { useCMDB } from '@/hooks/cmdb-hooks/useCMDB';
import { useFlowData } from '@/hooks/cmdb-hooks/useFlowData';
import { useImageUpload } from '@/hooks/cmdb-hooks/useImageUpload';
import { useVisualizationActions } from '@/hooks/cmdb-hooks/useVisualizationActions';
import { useUndoRedo } from '@/hooks/cmdb-hooks/useUndoRedo';
import { useAutoSave } from '@/hooks/cmdb-hooks/useAutoSave';
import { useNodeRelationships } from '@/hooks/cmdb-hooks/useNodeRelationship';
import { useStateManagement } from '@/hooks/cmdb-hooks/useStateManagement';
import { useDragAndDrop } from '@/hooks/cmdb-hooks/useDragAndDrop';
import { useSelectionMode } from '@/hooks/cmdb-hooks/useSelectionMode';
import { usePositionSaving } from '@/hooks/cmdb-hooks/usePositionSaving';
import { useExportVisualization } from '@/hooks/cmdb-hooks/useExportVisualization';
import { useKeyboardShortcuts } from '@/hooks/cmdb-hooks/useKeyboardShortcuts';
import { useContextMenuHandlers } from '@/hooks/cmdb-hooks/useContextMenuHandlers';

import CustomNode from '@/components/cmdb-components/CustomNode';
import CustomGroupNode from '@/components/cmdb-components/CustomGroupNode';
import VisualizationNavbar from '@/components/cmdb-components/VisualizationNavbar';
import NodeContextMenu from '@/components/cmdb-components/NodeContextMenu';
import ItemFormModal from '@/components/cmdb-components/ItemFormModal';
import ConnectionModal from '@/components/cmdb-components/ConnectionModal';
import GroupModal from '@/components/cmdb-components/GroupModal';
import GroupConnectionModal from '@/components/cmdb-components/GroupConnectionModal';
import ExportModal from '@/components/cmdb-components/ExportModal';
import VisibilityPanel from '@/components/cmdb-components/panels/VisibilityPanel';
import SelectionRectangle from '@/components/cmdb-components/overlays/SelectionRectangle';
import DragHoverIndicator from '@/components/cmdb-components/overlays/DragHoverIndicator';
import SelectionModeIndicator from '@/components/cmdb-components/overlays/SelectionModeIndicator';
import HighlightModeIndicator from '@/components/cmdb-components/overlays/HighlightModeIndicator';

import api from '@/services/api';
import { loadEdgeHandles, saveEdgeHandle } from '@/utils/cmdb-utils/flowHelpers';
import { INITIAL_ITEM_FORM } from '@/utils/cmdb-utils/constants';
import { processNodes } from '@/utils/cmdb-utils/nodeProcessors';
import { processEdges } from '@/utils/cmdb-utils/edgeProcessors';

const nodeTypes = {
  custom: CustomNode,
  group: CustomGroupNode,
};

export default function CMDBVisualization() {
  const navigate = useNavigate();

  // Refs
  const reactFlowInstance = useRef(null);
  const reactFlowWrapper = useRef(null);
  const socketRef = useRef(null);

  // Core state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [edgeHandles, setEdgeHandles] = useState({});
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('cmdb-autosave-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Custom hooks for state management
  const { state, actions } = useStateManagement();
  const { items, connections, groups, groupConnections, fetchAll } = useCMDB();
  const { transformToFlowData } = useFlowData(items, connections, groups, groupConnections, edgeHandles, state.hiddenNodes);
  
  // Image upload
  const {
    selectedFiles,
    imagePreviews,
    existingImages,
    handleFileSelect,
    handleRemoveNewImage,
    handleRemoveExistingImage,
    setImages,
    resetImages,
  } = useImageUpload();

  // Visualization actions
  const {
    contextMenu,
    handleNodeContextMenu,
    closeContextMenu,
    handleEditFromVisualization,
    handleDeleteFromVisualization,
    handleManageConnectionsFromVisualization,
    alertDialog,
    closeAlert,
  } = useVisualizationActions(items, groups, fetchAll);

  // Node relationships
  const {
    highlightedNodeId,
    relatedNodes,
    relatedEdges,
    highlightNode,
    clearHighlight,
  } = useNodeRelationships(nodes, edges);

  // Undo/Redo
  const {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo(50);

  // Drag and drop
  const {
    draggedNode,
    hoverPosition,
    nodesRef,
    handlers: dragHandlers,
  } = useDragAndDrop(nodes, setNodes, fetchAll);

  // Selection mode
  const {
    selectionRect,
    handlers: selectionHandlers,
  } = useSelectionMode(state, actions, reactFlowWrapper, reactFlowInstance, nodes);

  // Position saving
  const {
    isSaving,
    isAutoSaving,
    changedNodesRef,
    handleSavePositions,
    autoSavePositions,
    trackNodeChange,
  } = usePositionSaving(nodes);

  // Export
  const { exportVisualization } = useExportVisualization(
    reactFlowInstance,
    state.hiddenNodes,
    actions.setHiddenNodes
  );

  // Context menu handlers
  const contextMenuHandlers = useContextMenuHandlers({
    contextMenu,
    handleEditFromVisualization,
    handleManageConnectionsFromVisualization,
    handleDeleteFromVisualization,
    onEditItem: (item) => {
      actions.openItemModal({
        name: item.name || '',
        type: item.type || '',
        description: item.description || '',
        status: item.status || 'active',
        ip: item.ip || '',
        category: item.category || 'internal',
        location: item.location || '',
        group_id: item.group_id || null,
        env_type: item.env_type || 'fisik',
      }, true, item.id);
      setImages(item.images);
    },
    onEditGroup: (group) => {
      actions.openGroupModal({
        name: group.name || '',
        description: group.description || '',
        color: group.color || '#e0e7ff'
      }, true, group.id);
    },
    onOpenConnectionModal: (item) => {
      const existingItemConns = connections
        .filter(conn => conn.source_id === item.id && conn.target_id)
        .map(conn => conn.target_id);
      
      const existingGroupConns = connections
        .filter(conn => conn.source_id === item.id && conn.target_group_id)
        .map(conn => conn.target_group_id);
      
      actions.openConnectionModal(item, existingItemConns, existingGroupConns);
    },
    onOpenGroupConnectionModal: (group) => {
      const existingGroupConns = groupConnections
        .filter(conn => conn.source_id === group.id)
        .map(conn => conn.target_id);
      
      const existingItemConns = connections
        .filter(conn => conn.source_group_id === group.id)
        .map(conn => conn.target_id);
      
      actions.openGroupConnectionModal(group, existingGroupConns, existingItemConns);
    },
    toggleNodeVisibility: actions.toggleNodeVisibility,
    groups,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    canUndo,
    canRedo,
    undo,
    redo,
    setNodes,
    handleSavePositions,
    highlightMode: state.highlightMode,
    highlightedNodeId,
    clearHighlight,
  });

  // Auto-save
  useAutoSave(nodes, autoSavePositions, 2000, isAutoSaveEnabled);

  // Processed nodes and edges
  const processedNodes = useMemo(() => {
    return processNodes(nodes, {
      selectedForHiding: state.selectedForHiding,
      highlightMode: state.highlightMode,
      highlightedNodeId,
      relatedNodes,
    });
  }, [nodes, state.selectedForHiding, state.highlightMode, highlightedNodeId, relatedNodes]);

  const processedEdges = useMemo(() => {
    return processEdges(edges, {
      highlightMode: state.highlightMode,
      highlightedNodeId,
      relatedEdges,
    });
  }, [edges, state.highlightMode, highlightedNodeId, relatedEdges]);

  // Get viewport center
  const getViewportCenter = useCallback(() => {
    if (!reactFlowInstance.current || !reactFlowWrapper.current) {
      return { x: 400, y: 300 };
    }
    
    const viewport = reactFlowInstance.current.getViewport();
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    
    const centerX = (bounds.width / 2 - viewport.x) / viewport.zoom;
    const centerY = (bounds.height / 2 - viewport.y) / viewport.zoom;
    
    return { x: centerX, y: centerY };
  }, []);

  // Effects
  useEffect(() => {
    localStorage.setItem('cmdb-autosave-enabled', JSON.stringify(isAutoSaveEnabled));
  }, [isAutoSaveEnabled]);

  useEffect(() => {
    const loadHandles = async () => {
      const handles = await loadEdgeHandles();
      setEdgeHandles(handles);
    };
    loadHandles();
  }, []);

  useEffect(() => {
    const { flowNodes, flowEdges } = transformToFlowData();
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [transformToFlowData, setNodes, setEdges]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes, nodesRef]);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketRef.current = socket;

    socket.on('cmdb_update', () => {
      if (!isSaving) {
        fetchAll();
      }
    });

    return () => {
      socket.off('cmdb_update');
      socket.disconnect();
    };
  }, [fetchAll, isSaving]);

  // Handlers
  const handleNodesChange = useCallback((changes) => {
    const hasPositionChange = changes.some(change => 
      change.type === 'position' && change.dragging === false
    );
    
    if (hasPositionChange) {
      pushState([...nodes]);
      
      changes.forEach(change => {
        if (change.type === 'position' && change.dragging === false) {
          trackNodeChange(change.id);
        }
      });
    }
    
    onNodesChange(changes);
  }, [onNodesChange, pushState, nodes, trackNodeChange]);

  const handleItemSubmit = useCallback(async (e) => {
    e.preventDefault();

    const initialPosition = !state.itemFormData.group_id ? getViewportCenter() : null;
    const formDataToSend = new FormData();
    
    Object.keys(state.itemFormData).forEach(key => {
      if (state.itemFormData[key] !== null) {
        formDataToSend.append(key, state.itemFormData[key]);
      }
    });

    if (initialPosition && !state.editItemMode) {
      formDataToSend.append('position', JSON.stringify(initialPosition));
    }

    if (state.editItemMode) {
      formDataToSend.append('existingImages', JSON.stringify(existingImages));
    }

    selectedFiles.forEach(file => {
      formDataToSend.append('images', file);
    });

    try {
      if (state.editItemMode) {
        await api.put(`/cmdb/${state.currentItemId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/cmdb', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      actions.closeItemModal();
      resetImages();
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [state.itemFormData, state.editItemMode, state.currentItemId, getViewportCenter, existingImages, selectedFiles, actions, resetImages, fetchAll]);

  const handleGroupSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (state.editGroupMode) {
        await api.put(`/groups/${state.currentGroupId}`, state.groupFormData);
      } else {
        const initialPosition = getViewportCenter();
        await api.post('/groups', {
          ...state.groupFormData,
          position: initialPosition
        });
      }
      await fetchAll();
      actions.closeGroupModal();
    } catch (err) {
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [state.editGroupMode, state.currentGroupId, state.groupFormData, getViewportCenter, fetchAll, actions]);

  const handleDeleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      await fetchAll();
    } catch (err) {
      toast.error('Gagal menghapus: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveConnections = useCallback(async () => {
    if (!state.selectedItemForConnection) return;
    
    try {
      const currentItemConns = connections
        .filter(conn => conn.source_id === state.selectedItemForConnection.id && conn.target_id)
        .map(conn => conn.target_id);

      const itemsToAdd = state.selectedConnections.filter(id => !currentItemConns.includes(id));
      const itemsToRemove = currentItemConns.filter(id => !state.selectedConnections.includes(id));

      for (const targetId of itemsToAdd) {
        await api.post('/cmdb/connections', {
          source_id: state.selectedItemForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of itemsToRemove) {
        await api.delete(`/cmdb/connections/${state.selectedItemForConnection.id}/${targetId}`);
      }

      const currentGroupConns = connections
        .filter(conn => conn.source_id === state.selectedItemForConnection.id && conn.target_group_id)
        .map(conn => conn.target_group_id);

      const groupsToAdd = state.selectedGroupConnections.filter(id => !currentGroupConns.includes(id));
      const groupsToRemove = currentGroupConns.filter(id => !state.selectedGroupConnections.includes(id));

      for (const groupId of groupsToAdd) {
        await api.post('/cmdb/connections/to-group', {
          source_id: state.selectedItemForConnection.id,
          target_group_id: groupId
        });
      }

      for (const groupId of groupsToRemove) {
        await api.delete(`/cmdb/connections/to-group/${state.selectedItemForConnection.id}/${groupId}`);
      }

      await fetchAll();
      actions.closeConnectionModal();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [connections, state.selectedItemForConnection, state.selectedConnections, state.selectedGroupConnections, fetchAll, actions]);

  const handleSaveGroupConnections = async () => {
    try {
      const currentGroupConns = groupConnections
        .filter(conn => conn.source_id === state.selectedGroupForConnection.id)
        .map(conn => conn.target_id);

      const groupsToAdd = state.selectedGroupToGroupConnections.filter(id => !currentGroupConns.includes(id));
      const groupsToRemove = currentGroupConns.filter(id => !state.selectedGroupToGroupConnections.includes(id));

      for (const targetId of groupsToAdd) {
        await api.post('/groups/connections', {
          source_id: state.selectedGroupForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of groupsToRemove) {
        await api.delete(`/groups/connections/${state.selectedGroupForConnection.id}/${targetId}`);
      }

      const currentItemConns = connections
        .filter(conn => conn.source_group_id === state.selectedGroupForConnection.id)
        .map(conn => conn.target_id);

      const itemsToAdd = state.selectedGroupToItemConnections.filter(id => !currentItemConns.includes(id));
      const itemsToRemove = currentItemConns.filter(id => !state.selectedGroupToItemConnections.includes(id));

      for (const targetId of itemsToAdd) {
        await api.post('/cmdb/connections/from-group', {
          source_group_id: state.selectedGroupForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of itemsToRemove) {
        await api.delete(`/cmdb/connections/from-group/${state.selectedGroupForConnection.id}/${targetId}`);
      }

      await fetchAll();
      actions.closeGroupConnectionModal();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const showOnlySelected = useCallback(() => {
    if (state.selectedForHiding.size > 0) {
      const allNodeIds = new Set([
        ...nodes.map(n => n.id),
        ...groups.map(g => `group-${g.id}`)
      ]);
      
      const nodesToHide = new Set(
        [...allNodeIds].filter(id => !state.selectedForHiding.has(id))
      );
      
      actions.setHiddenNodes(nodesToHide);
      actions.clearSelectedForHiding();
    }
  }, [state.selectedForHiding, nodes, groups, actions]);

  const showAllNodes = useCallback(() => {
    actions.setHiddenNodes(new Set());
    actions.clearSelectedForHiding();
  }, [actions]);

  return (
    <div className="w-full h-screen flex flex-col">
      <VisualizationNavbar
        draggedNode={draggedNode}
        selectionMode={state.selectionMode}
        highlightMode={state.highlightMode}
        highlightedNodeId={highlightedNodeId}
        selectedForHiding={state.selectedForHiding}
        hiddenNodes={state.hiddenNodes}
        isSaving={isSaving}
        isAutoSaving={isAutoSaving}
        isAutoSaveEnabled={isAutoSaveEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          const previousState = undo();
          if (previousState) {
            setNodes(previousState);
            toast.info('Undo', { duration: 1000 });
          }
        }}
        onRedo={() => {
          const nextState = redo();
          if (nextState) {
            setNodes(nextState);
            toast.info('Redo', { duration: 1000 });
          }
        }}
        onToggleAutoSave={() => setIsAutoSaveEnabled(prev => !prev)}
        onSetHighlightMode={actions.setHighlightMode}
        onClearHighlight={clearHighlight}
        showVisibilityPanel={state.showVisibilityPanel}
        nodes={nodes}
        onNodeSearch={useCallback((node) => {
          if (!reactFlowInstance.current) return;

          if (state.hiddenNodes.has(node.id)) {
            actions.toggleNodeVisibility(node.id);
          }

          let targetX = node.position.x;
          let targetY = node.position.y;

          if (node.parentNode) {
            const parentNode = nodes.find(n => n.id === node.parentNode);
            if (parentNode) {
              targetX += parentNode.position.x;
              targetY += parentNode.position.y;
            }
          }

          if (node.type === 'group') {
            targetX += (node.data.width || 0) / 2;
            targetY += (node.data.height || 0) / 2;
          } else {
            targetX += 90;
            targetY += 60;
          }

          reactFlowInstance.current.setCenter(targetX, targetY, {
            zoom: 1.5,
            duration: 800,
          });

          setNodes(prevNodes => 
            prevNodes.map(n => ({
              ...n,
              style: {
                ...n.style,
                outline: n.id === node.id ? '3px solid #3b82f6' : 'none',
                outlineOffset: '2px',
                transition: 'outline 0.3s ease',
              }
            }))
          );

          setTimeout(() => {
            setNodes(prevNodes =>
              prevNodes.map(n => ({
                ...n,
                style: {
                  ...n.style,
                  outline: state.selectedForHiding.has(n.id) ? '3px solid #3b82f6' : 'none',
                }
              }))
            );
          }, 3000);
        }, [state.hiddenNodes, nodes, state.selectedForHiding, setNodes, actions])}
        reactFlowInstance={reactFlowInstance}
        onSetSelectionMode={actions.setSelectionMode}
        onShowOnlySelected={showOnlySelected}
        onToggleVisibilityPanel={actions.toggleVisibilityPanel}
        onShowAllNodes={showAllNodes}
        onSavePositions={handleSavePositions}
        onOpenAddItem={() => {
          actions.openItemModal(INITIAL_ITEM_FORM, false, null);
          resetImages();
        }}
        onOpenManageGroups={() => actions.openGroupModal(null, false, null)}
        onOpenExportModal={actions.toggleExportModal}
      />

      <div className="flex-1 relative flex overflow-y-auto">
        <VisibilityPanel
          show={state.showVisibilityPanel}
          hiddenNodes={state.hiddenNodes}
          items={items}
          groups={groups}
          onToggleVisibility={actions.toggleNodeVisibility}
        />

        <div 
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onMouseDown={selectionHandlers.onMouseDown}
          onMouseMove={selectionHandlers.onMouseMove}
          onMouseUp={selectionHandlers.onMouseUp}
        >
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={useCallback((event, node) => {
              if (state.selectionMode === 'single') {
                actions.toggleSelectedForHiding(node.id);
              } else if (state.highlightMode) {
                if (highlightedNodeId === node.id) {
                  clearHighlight();
                } else {
                  highlightNode(node.id);
                }
              }
            }, [state.selectionMode, state.highlightMode, highlightedNodeId, clearHighlight, highlightNode, actions])}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeDragStart={dragHandlers.onNodeDragStart}
            onNodeDrag={dragHandlers.onNodeDrag}
            onNodeDragStop={dragHandlers.onNodeDragStop}
            onReconnect={useCallback(async (oldEdge, newConnection) => {
              const newEdgeHandles = {
                ...edgeHandles,
                [oldEdge.id]: {
                  sourceHandle: newConnection.sourceHandle,
                  targetHandle: newConnection.targetHandle,
                }
              };
              
              await saveEdgeHandle(
                oldEdge.id,
                newConnection.sourceHandle,
                newConnection.targetHandle
              );
              
              setEdgeHandles(newEdgeHandles);
              setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
            }, [edgeHandles, setEdges])}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            connectionLineType="smoothstep"
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            fitView
            panOnDrag={state.selectionMode === 'freeroam' || state.selectionMode !== 'rectangle'}
            onPaneClick={() => {
              if (state.highlightMode) {
                clearHighlight();
              }
            }}
          >
            <Background />
            <Controls />
          </ReactFlow>

          <NodeContextMenu
            show={contextMenu.show}
            position={contextMenu.position}
            node={contextMenu.node}
            isHidden={contextMenu.node ? state.hiddenNodes.has(contextMenu.node.id) : false}
            onEdit={contextMenuHandlers.handleContextEdit}
            onDelete={contextMenuHandlers.handleContextDelete}
            onManageConnections={contextMenuHandlers.handleContextManageConnections}
            onManageGroupConnections={contextMenuHandlers.handleContextManageGroupConnections}
            onToggleVisibility={contextMenuHandlers.handleContextToggleVisibility}
            onClose={closeContextMenu}
          />

          <SelectionRectangle selectionRect={selectionRect} />
          <DragHoverIndicator hoverPosition={hoverPosition} draggedNode={draggedNode} />
          <SelectionModeIndicator selectionMode={state.selectionMode} isSelecting={state.isSelecting} />
          <HighlightModeIndicator 
            highlightMode={state.highlightMode} 
            highlightedNodeId={highlightedNodeId} 
            onClear={clearHighlight} 
          />
        </div>
      </div>

      {/* Modals */}
      <ItemFormModal
        show={state.showItemModal}
        editMode={state.editItemMode}
        formData={state.itemFormData}
        groups={groups}
        selectedFiles={selectedFiles}
        imagePreviews={imagePreviews}
        existingImages={existingImages}
        onClose={() => {
          actions.closeItemModal();
          resetImages();
        }}
        onSubmit={handleItemSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          actions.updateItemForm({ [name]: value });
        }}
        onFileSelect={handleFileSelect}
        onRemoveNewImage={handleRemoveNewImage}
        onRemoveExistingImage={(imgPath) => handleRemoveExistingImage(imgPath, state.currentItemId)}
      />

      <ConnectionModal
        show={state.showConnectionModal}
        selectedItem={state.selectedItemForConnection}
        items={items}
        groups={groups}
        selectedConnections={state.selectedConnections}
        selectedGroupConnections={state.selectedGroupConnections}
        onClose={actions.closeConnectionModal}
        onSave={handleSaveConnections}
        onToggleConnection={actions.toggleConnection}
        onToggleGroupConnection={actions.toggleGroupConnection}
      />

      <GroupModal
        show={state.showGroupModal}
        editMode={state.editGroupMode}
        formData={state.groupFormData}
        groups={groups}
        onClose={actions.closeGroupModal}
        onSubmit={handleGroupSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          actions.updateGroupForm({ [name]: value });
        }}
        onEditGroup={(group) => {
          actions.openGroupModal({
            name: group.name || '',
            description: group.description || '',
            color: group.color || '#e0e7ff'
          }, true, group.id);
        }}
        onDeleteGroup={handleDeleteGroup}
        onOpenGroupConnection={(group) => {
          const existingGroupConns = groupConnections
            .filter(conn => conn.source_id === group.id)
            .map(conn => conn.target_id);
          
          const existingItemConns = connections
            .filter(conn => conn.source_group_id === group.id)
            .map(conn => conn.target_id);
          
          actions.openGroupConnectionModal(group, existingGroupConns, existingItemConns);
        }}
      />

      <GroupConnectionModal
        show={state.showGroupConnectionModal}
        selectedGroup={state.selectedGroupForConnection}
        groups={groups}
        items={items}
        selectedConnections={state.selectedGroupToGroupConnections}
        selectedGroupConnections={state.selectedGroupToGroupConnections}
        selectedItemConnections={state.selectedGroupToItemConnections}
        onClose={actions.closeGroupConnectionModal}
        onSave={handleSaveGroupConnections}
        onToggleConnection={actions.toggleGroupToGroupConnection}
        onToggleGroupConnection={actions.toggleGroupToGroupConnection}
        onToggleItemConnection={actions.toggleGroupToItemConnection}
      />

      <ExportModal
        show={state.showExportModal}
        onClose={actions.toggleExportModal}
        onExport={exportVisualization}
      />

      <AlertDialog open={alertDialog.show} onOpenChange={closeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (alertDialog.onConfirm) {
                  alertDialog.onConfirm();
                }
                closeAlert();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}