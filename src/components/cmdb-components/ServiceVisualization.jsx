import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  reconnectEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Link2, Trash2, Save, Layers } from 'lucide-react';
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
import ServiceNavbar from './ServiceNavbar';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { INITIAL_GROUP_FORM, API_BASE_URL } from '../../utils/cmdb-utils/constants';

const nodeTypes = {
  custom: CustomServiceNode,
  serviceGroup: CustomServiceGroupNode,
};

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
  const nodesRef = useRef([]);
  const isReorderingRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, startTime: 0 });

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

  // Drag state for reordering items in groups
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);

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
    domain: '',
    port: '',
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

  // Dimensions for item layout in groups (DIGUNAKAN UNTUK RENDER & DRAG)
  const DIMENSIONS = useMemo(() => ({
    itemsPerRow: 3,
    itemWidth: 160,
    itemHeight: 80,
    gapX: 10,
    gapY: 30,
    padding: 15,
    headerHeight: 40,
  }), []);

  // Autosave state
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Minimap state
  const [showMiniMap, setShowMiniMap] = useState(true);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState('single');

  // Undo/Redo state
  const [pastNodes, setPastNodes] = useState([]);
  const [futureNodes, setFutureNodes] = useState([]);

  const canUndo = pastNodes.length > 0;
  const canRedo = futureNodes.length > 0;

  const {
    items,
    connections,
    groups,
    groupConnections,
    fetchAll,
    createServiceGroup,
    updateServiceGroup,
    deleteServiceGroup,
    saveServiceGroupConnections
  } = useServiceItems(service.id, workspaceId);

  // Load service edge handles on mount
  useEffect(() => {
    const loadHandles = async () => {
      if (!service?.id) return;
      const handles = await loadServiceEdgeHandles(service.id, workspaceId);
      setEdgeHandles(handles);
    };
    loadHandles();
  }, [service?.id, workspaceId]);

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

    // Create group nodes first
    groups.forEach(group => {
      const groupItems = items
        .filter(item => item.group_id === group.id)
        .sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));

      const itemCount = groupItems.length;
      const { itemsPerRow, itemWidth, itemHeight, gapX, gapY, padding, headerHeight } = DIMENSIONS;
      const rows = Math.ceil(itemCount / itemsPerRow);
      const width = Math.max(200, padding * 2 + itemsPerRow * (itemWidth + gapX));
      const height = Math.max(150, headerHeight + padding * 2 + rows * (itemHeight + gapY));

      const groupPos = parsePosition(group.position);

      flowNodes.push({
        id: `service-group-${group.id}`,
        type: 'serviceGroup',
        position: groupPos,
        draggable: true,
        data: {
          label: group.name, // Add label for search
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
        // Hitung posisi grid
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        // Hitung posisi relatif terhadap group
        const relativeX = padding + col * (itemWidth + gapX);
        const relativeY = headerHeight + padding + row * (itemHeight + gapY);

        flowNodes.push({
          id: String(item.id),
          type: 'custom',
          position: { x: relativeX, y: relativeY },
          parentNode: `service-group-${group.id}`,
          extent: 'parent',
          draggable: true,
          data: {
            label: item.name, // Add label for search
            name: item.name,
            type: item.type,
            description: item.description,
            status: item.status,
            ip: item.ip,
            domain: item.domain,
            port: item.port,
            category: item.category,
            location: item.location,
            parentService: parentServiceData,
            groupId: item.group_id,
            orderInGroup: item.order_in_group,
          },
          style: {
            width: itemWidth,
            height: itemHeight,
            pointerEvents: 'all',
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
        draggable: true,
        data: {
          label: item.name, // Add label for search
          name: item.name,
          type: item.type,
          description: item.description,
          status: item.status,
          ip: item.ip,
          domain: item.domain,
          port: item.port,
          category: item.category,
          location: item.location,
          parentService: parentServiceData,
          groupId: item.group_id,
          orderInGroup: item.order_in_group,
        },
      });
    });

    setNodes(flowNodes);
    nodesRef.current = flowNodes;

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
      const handleConfig = edgeHandles[edgeId];

      return {
        id: edgeId,
        source: String(conn.source_id),
        target: String(conn.target_id),
        // DEFAULT: Ubah dari kanan-kiri ke atas-bawah
        sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-bottom',
        targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-bottom',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 },
        zIndex:10,
      };
    });

    const groupToGroupEdges = groupConnections
      .filter(conn => conn.source_id && conn.target_id)
      .map(conn => {
        const edgeId = `service-group-e${conn.source_id}-${conn.target_id}`;
        const handleConfig = edgeHandles[edgeId];  // ← Ambil dari database

        return {
          id: edgeId,
          source: `service-group-${conn.source_id}`,
          target: `service-group-${conn.target_id}`,
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-right',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-left',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
        };
      });

    const groupToItemEdges = groupConnections
      .filter(conn => conn.source_group_id && conn.target_item_id)
      .map(conn => {
        const edgeId = `service-group-item-e${conn.source_group_id}-${conn.target_item_id}`;
        const handleConfig = edgeHandles[edgeId];  // ← Ambil dari database

        return {
          id: edgeId,
          source: `service-group-${conn.source_group_id}`,
          target: String(conn.target_item_id),
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-bottom',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
        };
      });

    const itemToGroupEdges = groupConnections
      .filter(conn => conn.source_id && conn.target_group_id)
      .map(conn => {
        const edgeId = `service-item-group-e${conn.source_id}-${conn.target_group_id}`;
        const handleConfig = edgeHandles[edgeId];  // ← Ambil dari database

        return {
          id: edgeId,
          source: String(conn.source_id),
          target: `service-group-${conn.target_group_id}`,
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-right',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '3,3' },
        };
      });

    setEdges([...itemEdges, ...groupToGroupEdges, ...groupToItemEdges, ...itemToGroupEdges]);

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
      domain: '',
      port: '',
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
      domain: item.domain || '',
      port: item.port || '',
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

  // Drag handlers for reordering items in groups
  const onNodeDragStart = useCallback((event, node) => {
    if (node.parentNode) {
      setDraggedNode(node.id);
      dragStateRef.current = { isDragging: true, startTime: Date.now() };
    }
  }, []);

  const onNodeDrag = useCallback((event, node) => {
    if (!node.parentNode || !draggedNode) return;

    const currentNodes = nodesRef.current;
    const groupNode = currentNodes.find(n => n.id === node.parentNode);
    if (!groupNode) return;

    const { itemsPerRow, itemWidth, itemHeight, gapX, gapY, padding, headerHeight } = DIMENSIONS;
    const relX = node.position.x - padding;
    const relY = node.position.y - padding - headerHeight;

    const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gapX))));

    // Calculate row based on fixed item height
    const row = Math.max(0, Math.floor(Math.max(0, relY) / (itemHeight + gapY)));

    const itemsInGroup = currentNodes.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode);
    const newIndex = Math.min(row * itemsPerRow + col, itemsInGroup.length);

    if (newIndex >= 0 && newIndex <= itemsInGroup.length) {
      const newRow = Math.floor(newIndex / itemsPerRow);
      const newCol = newIndex % itemsPerRow;

      const relativeX = padding + newCol * (itemWidth + gapX);
      const relativeY = headerHeight + padding + newRow * (itemHeight + gapY);

      // Calculate absolute position for hover indicator
      const absoluteX = groupNode.position.x + relativeX;
      const absoluteY = groupNode.position.y + relativeY;

      setHoverPosition({
        index: newIndex,
        relativeX,
        relativeY,
        absoluteX,
        absoluteY,
        groupId: node.parentNode,
      });
    }
  }, [draggedNode]);

  const handleAutoSave = useCallback(async () => {
    if (!isAutoSaveEnabled || isSaving || isAutoSaving) return;

    setIsAutoSaving(true);
    try {
      // Only save nodes that have changed position (compare with previous saved state)
      const nodesToSave = nodes.filter(node => {
        // Skip if node is in a group (handled by group position)
        if (node.parentNode) return false;
        return true;
      });

      if (nodesToSave.length === 0) {
        setIsAutoSaving(false);
        return;
      }

      // Save item positions
      const itemPromises = nodesToSave
        .filter(node => node.type === 'custom')
        .map(node =>
          api.put(`/service-items/items/${node.id}/position`, {
            position: node.position,
          })
        );

      // Save group positions
      const groupPromises = nodesToSave
        .filter(node => node.type === 'serviceGroup')
        .map(node => {
          const groupId = node.data.groupId;
          return api.put(`/service-groups/${groupId}/position`, {
            position: node.position,
          });
        });

      await Promise.all([...itemPromises, ...groupPromises]);
      console.log('✅ Autosave completed - saved', nodesToSave.length, 'nodes');
      // Don't show toast for autosave to avoid distraction
    } catch (err) {
      console.error('Autosave failed:', err);
      toast.error('Autosave failed');
    } finally {
      setIsAutoSaving(false);
    }
  }, [isAutoSaveEnabled, isSaving, isAutoSaving, nodes]);

  const onNodeDragStop = useCallback(async (event, node) => {
    const dragDuration = Date.now() - dragStateRef.current.startTime;
    dragStateRef.current = { isDragging: false, startTime: 0 };

    if (dragDuration < 100) {
      setDraggedNode(null);
      setHoverPosition(null);
      return;
    }

    const shouldAutosave = !draggedNode || !hoverPosition || !node.parentNode;

    if (!draggedNode || !hoverPosition || !node.parentNode) {
      setDraggedNode(null);
      setHoverPosition(null);
      isReorderingRef.current = false;

      // Save to history with lightweight clone (only for significant position changes)
      if (dragDuration > 200) { // Only save if drag was significant (>200ms)
        requestAnimationFrame(() => {
          setPastNodes(prev => {
            // Use structuredClone for better performance than JSON.parse/stringify
            const snapshot = structuredClone ? structuredClone(nodes) : JSON.parse(JSON.stringify(nodes));
            return [...prev.slice(-10), snapshot];
          });
          setFutureNodes([]);
        });
      }
    } else {
      try {
        await api.patch(`/service-groups/items/${node.id}/reorder`, {
          new_order: hoverPosition.index
        });

        // Update dragged node position visual immediately
        setNodes(prevNodes => {
          const updatedNodes = prevNodes.map(n => {
            if (n.id === draggedNode) {
              return {
                ...n,
                position: {
                  x: hoverPosition.relativeX,
                  y: hoverPosition.relativeY
                },
                data: {
                  ...n.data,
                  orderInGroup: hoverPosition.index
                }
              };
            }
            return n;
          });

          nodesRef.current = updatedNodes;
          return updatedNodes;
        });

        // Immediately fetch all data to get updated positions for ALL items
        await fetchAll();

      } catch (err) {
        console.error('Failed to reorder:', err);
        toast.error('Failed to reorder item');
      } finally {
        setDraggedNode(null);
        setHoverPosition(null);
      }
    }

    // Trigger autosave for position changes
    if (isAutoSaveEnabled && shouldAutosave) {
      // Clear any existing autosave timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }
  }, [draggedNode, hoverPosition, fetchAll, setNodes, nodes, isAutoSaveEnabled, handleAutoSave]);

  const handleItemSubmit = async (e) => {
    e.preventDefault();

    try {
      // Convert empty string port to null for PostgreSQL INTEGER column
      const submitData = {
        ...itemFormData,
        port: itemFormData.port === '' ? null : itemFormData.port
      };

      if (editItem) {
        await api.put(`/service-items/items/${editItem.id}`, submitData);
      } else {
        const position = reactFlowInstance.current
          ? { x: Math.random() * 400, y: Math.random() * 300 }
          : { x: 0, y: 0 };

        await api.post(`/service-items/${service.id}/items`, {
          ...submitData,
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

    // Get existing group connections for this item (item-to-group)
    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === item.id)
      .map(conn => conn.target_group_id);
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
      .map(conn => conn.target_item_id);

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
        .map(c => c.target_group_id);

      const groupsToAdd = selectedGroupConnections.filter(id => !currentGroupConns.includes(id));
      for (const targetGroupId of groupsToAdd) {
        await api.post('/service-groups/connections/from-item', {
          service_id: service.id,
          source_id: selectedItem.id,
          target_group_id: targetGroupId,
          workspace_id: workspaceId,
        });
      }

      const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConnections.includes(id));
      for (const targetGroupId of groupsToRemove) {
        await api.delete(`/service-groups/connections/from-item/${service.id}/${selectedItem.id}/${targetGroupId}`);
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

  const handleSavePositions = useCallback(async () => {
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
  }, [nodes, isSaving]);

  const handleToggleAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(prev => {
      const newValue = !prev;
      toast.success(newValue ? 'Auto-save enabled' : 'Auto-save disabled');
      return newValue;
    });
  }, []);

  const handleToggleMiniMap = useCallback(() => {
    setShowMiniMap(prev => !prev);
  }, []);

  const handleNodeSearch = useCallback((node) => {
    if (!reactFlowInstance.current) return;

    // Center the view on the selected node
    reactFlowInstance.current.setCenter(
      node.position.x + (node.style?.width || 160) / 2,
      node.position.y + (node.style?.height || 80) / 2,
      { zoom: 1, duration: 500 }
    );
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    const previousState = pastNodes[pastNodes.length - 1];
    if (!previousState) return;

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      setFutureNodes(prev => [...prev.slice(-10), nodes]);
      setNodes(previousState);
      setPastNodes(prev => prev.slice(0, -1));
    });

    toast.success('Undo successful');
  }, [canUndo, pastNodes, nodes]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    const nextState = futureNodes[futureNodes.length - 1];
    if (!nextState) return;

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      setPastNodes(prev => [...prev.slice(-10), nodes]);
      setNodes(nextState);
      setFutureNodes(prev => prev.slice(0, -1));
    });

    toast.success('Redo successful');
  }, [canRedo, futureNodes, nodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSavePositions();
      }
      // Ctrl+Z to undo
      else if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z to redo
      else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSavePositions, handleUndo, handleRedo]);

  // Cleanup autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
    } else if (contextMenu.group) {
      handleDeleteGroup(contextMenu.group.id);
    }
  }, [contextMenu, handleDeleteItem, handleDeleteGroup, handleCloseContextMenu]);

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
    // Save to database FIRST
    try {
      await saveServiceEdgeHandle(
        oldEdge.id,
        newConnection.sourceHandle,
        newConnection.targetHandle,
        service.id,
        workspaceId
      );

      // Reconnect edge in local state immediately
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

      // Update edge handles state AFTER edge reconnect to prevent race condition
      setEdgeHandles(prev => ({
        ...prev,
        [oldEdge.id]: {
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
        }
      }));

      toast.success('Connection point moved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to move connection point');
      // Revert by reloading edge handles from database
      try {
        const handles = await loadServiceEdgeHandles(service.id, workspaceId);
        setEdgeHandles(handles);
      } catch (loadErr) {
        console.error('Failed to reload edge handles:', loadErr);
      }
    }
  }, [service.id, workspaceId, setEdges]);

  return (
    <div className="h-full w-full relative">
      {/* Service Navbar */}
      <ServiceNavbar
        draggedNode={draggedNode}
        isSaving={isSaving}
        isAutoSaving={isAutoSaving}
        isAutoSaveEnabled={isAutoSaveEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleAutoSave={handleToggleAutoSave}
        nodes={nodes}
        onNodeSearch={handleNodeSearch}
        reactFlowInstance={reactFlowInstance}
        onSetSelectionMode={setSelectionMode}
        selectionMode={selectionMode}
        onSavePositions={handleSavePositions}
        onOpenAddItem={handleOpenAddModal}
        onOpenManageGroups={handleOpenManageGroups}
        showMiniMap={showMiniMap}
        onToggleMiniMap={handleToggleMiniMap}
      />

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onReconnect={handleReconnect}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handleCloseContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultViewport={defaultViewport}
        selectionOnDrag={selectionMode === 'rectangle'}
      >
        <Background />
        <Controls />
        {showMiniMap && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'serviceGroup') return '#f59e0b';
              return '#3b82f6';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        )}
      </ReactFlow>

      {/* Hover indicator for drag-to-reorder */}
      {hoverPosition && draggedNode && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 102,
            border: '3px dashed #8b5cf6',
            borderRadius: '8px',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            width: `${DIMENSIONS.itemWidth}px`,
            height: `${DIMENSIONS.itemHeight}px`,
            transform: `translate(${hoverPosition.absoluteX}px, ${hoverPosition.absoluteY}px)`,
            transition: 'transform 0.1s ease-out',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#8b5cf6',
            fontWeight: 'bold',
            fontSize: '14px',
            backgroundColor: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            Drop Here
          </div>
        </div>
      )}

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
            domain: '',
            port: '',
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
        group={contextMenu.group}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onManageConnections={handleContextMenuManageConnections}
        onManageGroupConnections={handleContextMenuManageGroupConnections}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
}
