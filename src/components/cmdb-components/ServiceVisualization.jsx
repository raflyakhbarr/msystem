import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  reconnectEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Link2, Trash2, Save, Layers, FolderOpen } from 'lucide-react';
import api from '../../services/api';
import { useServiceItems } from '../../hooks/cmdb-hooks/useServiceItems';
import { loadServiceEdgeHandles, saveServiceEdgeHandle } from '../../utils/cmdb-utils/flowHelpers';
import CustomServiceNode from './CustomServiceNode';
import CustomServiceGroupNode from './CustomServiceGroupNode';
import ServiceConnectionModal from './ServiceConnectionModal';
import ServiceItemContextMenu from './ServiceItemContextMenu';
import ServiceGroupModal from './ServiceGroupModal';
import ServiceGroupConnectionModal from './ServiceGroupConnectionModal';
import ServiceItemFormModal from './ServiceItemFormModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { INITIAL_GROUP_FORM } from '../../utils/cmdb-utils/constants';

const nodeTypes = {
  custom: CustomServiceNode,
  serviceGroup: CustomServiceGroupNode,
};

const API_BASE_URL = 'http://localhost:5000';

// Helper function to safely parse position from database
const parsePosition = (positionData) => {
  if (!positionData) return { x: 0, y: 0 };

  // If it's already an object, return it
  if (typeof positionData === 'object') {
    return positionData;
  }

  // If it's a string, try to parse it
  if (typeof positionData === 'string') {
    try {
      return JSON.parse(positionData);
    } catch (e) {
      console.error('Invalid position JSON:', positionData, e);
      return { x: 0, y: 0 };
    }
  }

  // Fallback
  return { x: 0, y: 0 };
};

export default function ServiceVisualization({ service, workspaceId }) {
  const reactFlowInstance = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupConnectionModal, setShowGroupConnectionModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editGroupMode, setEditGroupMode] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [selectedGroupConnections, setSelectedGroupConnections] = useState([]);
  const [selectedGroupForConnection, setSelectedGroupForConnection] = useState(null);
  const [selectedGroupToGroupConnections, setSelectedGroupToGroupConnections] = useState([]);
  const [selectedGroupToItemConnections, setSelectedGroupToItemConnections] = useState([]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    show: false,
    position: { x: 0, y: 0 },
    item: null,
    group: null,
  });

  // Edge Handles State
  const [edgeHandles, setEdgeHandles] = useState({});

  // Item Form Data
  const [itemFormData, setItemFormData] = useState({
    name: '',
    type: 'server',
    description: '',
    status: 'active',
    ip: '',
    category: 'internal',
    location: '',
    group_id: null,
  });

  // Group Form Data
  const [groupFormData, setGroupFormData] = useState(INITIAL_GROUP_FORM);

  // Default viewport settings
  const defaultViewport = useMemo(() => ({
    x: 50,
    y: 100,
    zoom: 0.1,
  }), []);

  const {
    items,
    connections,
    groups,
    groupConnections,
    loading,
    fetchAll,
    createServiceGroup,
    updateServiceGroup,
    deleteServiceGroup,
    saveServiceGroupConnections
  } = useServiceItems(service.id, workspaceId);

  // Load service edge handles on mount
  useEffect(() => {
    const loadHandles = async () => {
      const handles = await loadServiceEdgeHandles(service.id, workspaceId);
      setEdgeHandles(handles);
    };
    loadHandles();
  }, [service.id, workspaceId]);

  // Siapkan data parent service dengan icon_preview
  const parentServiceData = useMemo(() => service ? {
    ...service,
    icon_preview: service.icon_type === 'upload' && service.icon_path
      ? `${API_BASE_URL}${service.icon_path}`
      : null
  } : null, [service]);

  // Initialize with empty arrays
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Use refs to track previous data and prevent unnecessary updates
  const prevItemsRef = useRef(null);
  const prevGroupsRef = useRef(null);
  const prevConnectionsRef = useRef(null);
  const prevGroupConnectionsRef = useRef(null);
  const prevEdgeHandlesRef = useRef(null);

  // Update nodes when items or groups change
  useEffect(() => {
    // Skip if data hasn't actually changed
    const itemsChanged = JSON.stringify(prevItemsRef.current) !== JSON.stringify(items);
    const groupsChanged = JSON.stringify(prevGroupsRef.current) !== JSON.stringify(groups);

    if (!itemsChanged && !groupsChanged) {
      return;
    }

    const flowNodes = [];

    // Dimensions for grouped items
    const itemWidth = 160;
    const itemHeight = 80;
    const itemsPerRow = 3;
    const gapX = 10;
    const gapY = 10;
    const padding = 15;
    const headerHeight = 40;

    // Create group nodes first
    groups.forEach(group => {
      const groupItems = items
        .filter(item => item.group_id === group.id)
        .sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));

      const itemCount = groupItems.length;
      const rows = Math.ceil(itemCount / itemsPerRow);
      const width = Math.max(200, padding * 2 + itemsPerRow * (itemWidth + gapX));
      const height = Math.max(150, headerHeight + padding * 2 + rows * (itemHeight + gapY));

      const groupPos = parsePosition(group.position);

      flowNodes.push({
        id: `service-group-${group.id}`,
        type: 'serviceGroup',
        position: groupPos,
        data: {
          name: group.name,
          description: group.description,
          color: group.color || 'rgba(16, 185, 129, 0.15)',
          width: width,
          height: height,
          itemCount: itemCount,
          groupId: group.id,
        },
        style: {
          width: width,
          height: height,
          zIndex: 0,
        },
      });

      // Create item nodes INSIDE this group
      groupItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        const relativeX = padding + col * (itemWidth + gapX);
        const relativeY = headerHeight + padding + row * (itemHeight + gapY);

        flowNodes.push({
          id: String(item.id),
          type: 'custom',
          position: { x: relativeX, y: relativeY },
          parentNode: `service-group-${group.id}`,
          extent: 'parent',
          data: {
            name: item.name,
            type: item.type,
            description: item.description,
            status: item.status,
            ip: item.ip,
            category: item.category,
            location: item.location,
            parentService: parentServiceData,
            groupId: item.group_id,
            orderInGroup: item.order_in_group,
          },
          style: {
            width: itemWidth,
            height: itemHeight,
          },
        });
      });
    });

    // Create ungrouped item nodes
    const ungroupedItems = items.filter(item => !item.group_id);
    ungroupedItems.forEach(item => {
      flowNodes.push({
        id: String(item.id),
        type: 'custom',
        position: parsePosition(item.position),
        data: {
          name: item.name,
          type: item.type,
          description: item.description,
          status: item.status,
          ip: item.ip,
          category: item.category,
          location: item.location,
          parentService: parentServiceData,
          groupId: item.group_id,
          orderInGroup: item.order_in_group,
        },
      });
    });

    setNodes(flowNodes);

    // Update refs
    prevItemsRef.current = items;
    prevGroupsRef.current = groups;
  }, [items, groups, parentServiceData]);

  // Update edges when connections change
  useEffect(() => {
    // Skip if data hasn't actually changed
    const connectionsChanged = JSON.stringify(prevConnectionsRef.current) !== JSON.stringify(connections);
    const groupConnectionsChanged = JSON.stringify(prevGroupConnectionsRef.current) !== JSON.stringify(groupConnections);
    const edgeHandlesChanged = JSON.stringify(prevEdgeHandlesRef.current) !== JSON.stringify(edgeHandles);

    if (!connectionsChanged && !groupConnectionsChanged && !edgeHandlesChanged) {
      return;
    }

    const itemEdges = connections.map(conn => {
      const edgeId = `e${conn.source_id}-${conn.target_id}`;
      const handleConfig = edgeHandles[edgeId] || {};
      return {
        id: edgeId,
        source: String(conn.source_id),
        target: String(conn.target_id),
        sourceHandle: handleConfig.sourceHandle || 'source-right',
        targetHandle: handleConfig.targetHandle || 'target-left',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 },
      };
    });

    const groupToGroupEdges = groupConnections
      .filter(conn => conn.source_id && conn.target_id)
      .map(conn => {
        const edgeId = `service-group-e${conn.source_id}-${conn.target_id}`;
        return {
          id: edgeId,
          source: `service-group-${conn.source_id}`,
          target: `service-group-${conn.target_id}`,
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
        };
      });

    const groupToItemEdges = groupConnections
      .filter(conn => conn.source_group_id && conn.target_item_id)
      .map(conn => {
        const edgeId = `service-group-item-e${conn.source_group_id}-${conn.target_item_id}`;
        return {
          id: edgeId,
          source: `service-group-${conn.source_group_id}`,
          target: String(conn.target_item_id),
          sourceHandle: 'source-bottom',
          targetHandle: 'target-top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
        };
      });

    setEdges([...itemEdges, ...groupToGroupEdges, ...groupToItemEdges]);

    // Update refs
    prevConnectionsRef.current = connections;
    prevGroupConnectionsRef.current = groupConnections;
    prevEdgeHandlesRef.current = edgeHandles;
  }, [connections, groupConnections, edgeHandles]);

  const handleOpenAddModal = useCallback(() => {
    setItemFormData({
      name: '',
      type: 'server',
      description: '',
      status: 'active',
      ip: '',
      category: 'internal',
      location: '',
      group_id: null,
    });
    setEditItem(null);
    setShowAddModal(true);
  }, []);

  const handleOpenManageGroups = useCallback(() => {
    setGroupFormData(INITIAL_GROUP_FORM);
    setEditGroupMode(false);
    setCurrentGroupId(null);
    setShowGroupModal(true);
  }, []);

  const handleEditItem = useCallback((item) => {
    setItemFormData({
      name: item.name || '',
      type: item.type || 'server',
      description: item.description || '',
      status: item.status || 'active',
      ip: item.ip || '',
      category: item.category || 'internal',
      location: item.location || '',
      group_id: item.group_id || null,
    });
    setEditItem(item);
    setShowAddModal(true);
  }, []);

  const handleEditGroup = useCallback((group) => {
    setGroupFormData({
      name: group.name || '',
      description: group.description || '',
      color: group.color || '#e0e7ff'
    });
    setCurrentGroupId(group.id);
    setEditGroupMode(true);
    setShowGroupModal(true);
  }, []);

  const handleItemSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editItem) {
        await api.put(`/service-items/items/${editItem.id}`, itemFormData);
      } else {
        const position = reactFlowInstance.current
          ? { x: Math.random() * 400, y: Math.random() * 300 }
          : { x: 0, y: 0 };

        await api.post(`/service-items/${service.id}/items`, {
          ...itemFormData,
          position,
          workspace_id: workspaceId,
        });
      }

      setShowAddModal(false);
      await fetchAll();
      toast.success(editItem ? 'Item updated!' : 'Item created!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save item: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editGroupMode) {
        await updateServiceGroup(currentGroupId, groupFormData);
      } else {
        const position = reactFlowInstance.current
          ? { x: Math.random() * 200, y: Math.random() * 200 }
          : { x: 0, y: 0 };

        await createServiceGroup({
          ...groupFormData,
          position,
        });
      }

      await fetchAll();
      setShowGroupModal(false);
      setGroupFormData(INITIAL_GROUP_FORM);
      setEditGroupMode(false);
      setCurrentGroupId(null);
      toast.success(editGroupMode ? 'Group updated!' : 'Group created!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.delete(`/service-items/items/${itemId}`);
      await fetchAll();
      toast.success('Item deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await deleteServiceGroup(groupId);
      toast.success('Group deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete group');
    }
  };

  const handleOpenConnectionModal = useCallback((item) => {
    setSelectedItem(item);
    const existing = connections
      .filter(c => c.source_id === item.id)
      .map(c => c.target_id);
    setSelectedConnections(existing);

    // Get existing group connections for this item
    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === item.id)
      .map(conn => conn.target_id);
    setSelectedGroupConnections(existingGroupConns);

    setShowConnectionModal(true);
  }, [connections, groupConnections]);

  const handleOpenGroupConnectionModal = (group) => {
    setSelectedGroupForConnection(group);

    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === group.id)
      .map(conn => conn.target_id);

    const existingItemConns = groupConnections
      .filter(conn => conn.source_group_id === group.id)
      .map(conn => conn.target_id);

    setSelectedGroupToGroupConnections(existingGroupConns);
    setSelectedGroupToItemConnections(existingItemConns);
    setShowGroupConnectionModal(true);
  };

  const handleSaveConnections = async () => {
    if (!selectedItem) return;

    try {
      // Save item-to-item connections
      const current = connections
        .filter(c => c.source_id === selectedItem.id)
        .map(c => c.target_id);

      const toAdd = selectedConnections.filter(id => !current.includes(id));
      for (const targetId of toAdd) {
        await api.post(`/service-items/${service.id}/connections`, {
          source_id: selectedItem.id,
          target_id: targetId,
          workspace_id: workspaceId,
        });
      }

      const toRemove = current.filter(id => !selectedConnections.includes(id));
      for (const targetId of toRemove) {
        await api.delete(`/service-items/${service.id}/connections/${selectedItem.id}/${targetId}`);
      }

      // Save item-to-group connections
      const currentGroupConns = groupConnections
        .filter(c => c.source_id === selectedItem.id)
        .map(c => c.target_id);

      const groupsToAdd = selectedGroupConnections.filter(id => !currentGroupConns.includes(id));
      for (const targetGroupId of groupsToAdd) {
        await api.post('/service-groups/connections/to-item', {
          service_id: service.id,
          source_id: selectedItem.id,
          target_group_id: targetGroupId,
          workspace_id: workspaceId,
        });
      }

      const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConnections.includes(id));
      for (const targetGroupId of groupsToRemove) {
        await api.delete(`/service-groups/connections/to-item/${service.id}/${selectedItem.id}/${targetGroupId}`);
      }

      setShowConnectionModal(false);
      await fetchAll();
      toast.success('Connections updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update connections');
    }
  };

  const handleSaveGroupConnections = async () => {
    if (!selectedGroupForConnection) return;

    try {
      await saveServiceGroupConnections(
        selectedGroupForConnection.id,
        selectedGroupToGroupConnections,
        selectedGroupToItemConnections
      );

      setShowGroupConnectionModal(false);
      toast.success('Group connections updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update group connections');
    }
  };

  const handleSavePositions = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Save item positions
      const itemPromises = nodes
        .filter(node => node.type === 'custom')
        .map(node =>
          api.put(`/service-items/items/${node.id}/position`, {
            position: node.position,
          })
        );

      // Save group positions
      const groupPromises = nodes
        .filter(node => node.type === 'serviceGroup')
        .map(node => {
          const groupId = node.data.groupId;
          return api.put(`/service-groups/${groupId}/position`, {
            position: node.position,
          });
        });

      await Promise.all([...itemPromises, ...groupPromises]);
      toast.success('Positions saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save positions');
    } finally {
      setIsSaving(false);
    }
  };

  // Context Menu Handlers
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ show: false, position: { x: 0, y: 0 }, item: null, group: null });
  }, []);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();

    if (node.type === 'serviceGroup') {
      const group = groups.find(g => g.id === node.data.groupId);
      if (!group) return;

      setContextMenu({
        show: true,
        position: {
          x: event.pageX,
          y: event.pageY,
        },
        item: null,
        group,
      });
    } else {
      const item = items.find(i => i.id === parseInt(node.id));
      if (!item) return;

      setContextMenu({
        show: true,
        position: {
          x: event.pageX,
          y: event.pageY,
        },
        item,
        group: null,
      });
    }
  }, [items, groups]);

  const handleContextMenuEdit = useCallback((target) => {
    handleCloseContextMenu();
    if (contextMenu.item) {
      handleEditItem(contextMenu.item);
    } else if (contextMenu.group) {
      handleEditGroup(contextMenu.group);
    }
  }, [contextMenu, handleEditItem, handleEditGroup, handleCloseContextMenu]);

  const handleContextMenuDelete = useCallback(() => {
    handleCloseContextMenu();
    if (contextMenu.item) {
      handleDeleteItem(contextMenu.item.id);
    }
  }, [contextMenu, handleDeleteItem, handleCloseContextMenu]);

  const handleContextMenuManageConnections = useCallback(() => {
    handleCloseContextMenu();
    if (contextMenu.item) {
      handleOpenConnectionModal(contextMenu.item);
    }
  }, [contextMenu, handleOpenConnectionModal, handleCloseContextMenu]);

  const handleContextMenuManageGroupConnections = useCallback(() => {
    handleCloseContextMenu();
    if (contextMenu.group) {
      handleOpenGroupConnectionModal(contextMenu.group);
    }
  }, [contextMenu, handleOpenGroupConnectionModal, handleCloseContextMenu]);

  // Handle reconnecting edges
  const handleReconnect = useCallback(async (oldEdge, newConnection) => {
    try {
      const newEdgeHandles = {
        ...edgeHandles,
        [oldEdge.id]: {
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
        }
      };

      await saveServiceEdgeHandle(
        oldEdge.id,
        newConnection.sourceHandle,
        newConnection.targetHandle,
        service.id,
        workspaceId
      );

      setEdgeHandles(newEdgeHandles);
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      toast.success('Connection point moved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to move connection point');
    }
  }, [edgeHandles, setEdges, service.id, workspaceId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white p-2 rounded-lg shadow-md">
        <Button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus size={16} />
          Add Item
        </Button>

        <Button
          onClick={handleOpenManageGroups}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white"
        >
          <FolderOpen size={16} />
          Manage Groups
        </Button>

        <Button
          onClick={handleSavePositions}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Positions'}
        </Button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onReconnect={handleReconnect}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handleCloseContextMenu}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultViewport={defaultViewport}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Add/Edit Item Modal */}
      <ServiceItemFormModal
        show={showAddModal}
        editMode={!!editItem}
        formData={itemFormData}
        groups={groups}
        onClose={() => {
          setShowAddModal(false);
          setEditItem(null);
          setItemFormData({
            name: '',
            type: 'server',
            description: '',
            status: 'active',
            ip: '',
            category: 'internal',
            location: '',
            group_id: null,
          });
        }}
        onSubmit={handleItemSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          setItemFormData(prev => ({ ...prev, [name]: value }));
        }}
      />

      {/* Group Modal */}
      <ServiceGroupModal
        show={showGroupModal}
        editMode={editGroupMode}
        formData={groupFormData}
        groups={groups}
        currentWorkspace={{ id: workspaceId, name: `Workspace ${workspaceId}` }}
        onClose={() => {
          setShowGroupModal(false);
          setGroupFormData(INITIAL_GROUP_FORM);
          setEditGroupMode(false);
          setCurrentGroupId(null);
        }}
        onSubmit={handleGroupSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          setGroupFormData(prev => ({ ...prev, [name]: value }));
        }}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenGroupConnection={handleOpenGroupConnectionModal}
      />

      {/* Connection Modal */}
      <ServiceConnectionModal
        show={showConnectionModal}
        selectedItem={selectedItem}
        allItems={items}
        groups={groups}
        selectedConnections={selectedConnections}
        selectedGroupConnections={selectedGroupConnections}
        onClose={() => {
          setShowConnectionModal(false);
          setSelectedGroupConnections([]);
        }}
        onToggleConnection={(itemId) => {
          if (selectedConnections.includes(itemId)) {
            setSelectedConnections(selectedConnections.filter(id => id !== itemId));
          } else {
            setSelectedConnections([...selectedConnections, itemId]);
          }
        }}
        onToggleGroupConnection={(groupId) => {
          if (selectedGroupConnections.includes(groupId)) {
            setSelectedGroupConnections(selectedGroupConnections.filter(id => id !== groupId));
          } else {
            setSelectedGroupConnections([...selectedGroupConnections, groupId]);
          }
        }}
        onSave={handleSaveConnections}
      />

      {/* Group Connection Modal */}
      <ServiceGroupConnectionModal
        show={showGroupConnectionModal}
        selectedGroup={selectedGroupForConnection}
        groups={groups}
        items={items}
        selectedGroupConnections={selectedGroupToGroupConnections}
        selectedItemConnections={selectedGroupToItemConnections}
        onClose={() => setShowGroupConnectionModal(false)}
        onSave={handleSaveGroupConnections}
        onToggleGroupConnection={(groupId) => {
          if (selectedGroupToGroupConnections.includes(groupId)) {
            setSelectedGroupToGroupConnections(selectedGroupToGroupConnections.filter(id => id !== groupId));
          } else {
            setSelectedGroupToGroupConnections([...selectedGroupToGroupConnections, groupId]);
          }
        }}
        onToggleItemConnection={(itemId) => {
          if (selectedGroupToItemConnections.includes(itemId)) {
            setSelectedGroupToItemConnections(selectedGroupToItemConnections.filter(id => id !== itemId));
          } else {
            setSelectedGroupToItemConnections([...selectedGroupToItemConnections, itemId]);
          }
        }}
      />

      {/* Context Menu */}
      <ServiceItemContextMenu
        show={contextMenu.show}
        position={contextMenu.position}
        item={contextMenu.item}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onManageConnections={handleContextMenuManageConnections}
        onManageGroupConnections={handleContextMenuManageGroupConnections}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
}
