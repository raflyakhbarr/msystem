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
import { Plus, Link2, Trash2, Save, Layers, AlertTriangle, Globe, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { useServiceItems } from '../../hooks/cmdb-hooks/useServiceItems';
import { loadServiceEdgeHandles, saveServiceEdgeHandle, CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import { calculatePropagatedStatuses, getStatusColor, shouldShowCrossMarker } from '../../utils/cmdb-utils/statusPropagation';
import CustomServiceNode from './CustomServiceNode';
import CustomServiceGroupNode from './CustomServiceGroupNode';
import ServiceConnectionModal from './ServiceConnectionModal';
import ServiceItemContextMenu from './ServiceItemContextMenu';
import ServiceGroupModal from './ServiceGroupModal';
import ServiceGroupConnectionModal from './ServiceGroupConnectionModal';
import ServiceItemFormModal from './ServiceItemFormModal';
import ServiceNavbar from './ServiceNavbar';
import CrossServiceConnectionModal from './CrossServiceConnectionModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { INITIAL_GROUP_FORM, API_BASE_URL } from '../../utils/cmdb-utils/constants';
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
import { io } from 'socket.io-client';

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

/**
 * Calculate propagated statuses for cross-service connections
 * This considers both local items and external service items
 */
const calculateCrossServicePropagatedStatuses = (
  localItems,
  crossServiceConnections,
  externalServiceItems
) => {
  const edgeStatuses = {};

  // Create a unified map of all items (local + external)
  const allItems = [...localItems];
  externalServiceItems.forEach(externalItem => {
    allItems.push({
      id: externalItem.id,
      status: externalItem.status,
      name: externalItem.name,
      type: externalItem.type,
      isExternal: true,
    });
  });

  // Build a simplified dependency graph for cross-service connections
  const graph = {};
  const ensureNode = (nodeId) => {
    if (!graph[nodeId]) {
      graph[nodeId] = {
        dependencies: new Set(),
        dependents: new Set(),
      };
    }
  };

  crossServiceConnections.forEach((conn) => {
    const sourceId = String(conn.source_service_item_id);
    const targetId = String(conn.target_service_item_id);

    ensureNode(sourceId);
    ensureNode(targetId);

    // Get connection type for propagation direction
    const connType = conn.connection_type || 'depends_on';
    const connectionInfo = CONNECTION_TYPES[connType] || CONNECTION_TYPES.depends_on;
    const propagation = connectionInfo.propagation || 'target_to_source';

    if (propagation === 'target_to_source') {
      // Target affects Source
      graph[sourceId].dependencies.add(targetId);
      graph[targetId].dependents.add(sourceId);
    } else if (propagation === 'source_to_target') {
      // Source affects Target
      graph[targetId].dependencies.add(sourceId);
      graph[sourceId].dependents.add(targetId);
    } else if (propagation === 'both') {
      // Bidirectional
      graph[sourceId].dependencies.add(targetId);
      graph[targetId].dependents.add(sourceId);
      graph[targetId].dependencies.add(sourceId);
      graph[sourceId].dependents.add(targetId);
    }
  });

  // Recursive function to get affected nodes
  const getAffectedNodesRecursive = (nodeId, visited = new Set()) => {
    if (visited.has(nodeId) || !graph[nodeId]) {
      return visited;
    }
    visited.add(nodeId);

    const dependents = graph[nodeId].dependents;
    dependents.forEach((dependentId) => {
      getAffectedNodesRecursive(dependentId, visited);
    });

    return visited;
  };

  // Find all problematic nodes
  const problematicNodes = new Set();
  allItems.forEach((item) => {
    if (['inactive', 'maintenance', 'decommissioned'].includes(item.status)) {
      problematicNodes.add(String(item.id));
    }
  });

  // Calculate affected nodes for each problematic node
  const affectedNodesMap = new Map();
  problematicNodes.forEach((nodeId) => {
    const item = allItems.find(i => String(i.id) === nodeId);
    const status = item?.status || 'inactive';
    const affected = getAffectedNodesRecursive(nodeId, new Set());
    affected.delete(nodeId);

    affected.forEach((affectedId) => {
      if (!affectedNodesMap.has(affectedId)) {
        affectedNodesMap.set(affectedId, []);
      }
      affectedNodesMap.get(affectedId).push({ sourceId: nodeId, status });
    });
  });

  // Calculate status for each cross-service edge
  crossServiceConnections.forEach((conn) => {
    const edgeId = `cross-service-${conn.source_service_item_id}-${conn.target_service_item_id}`;
    const sourceId = String(conn.source_service_item_id);
    const targetId = String(conn.target_service_item_id);

    const sourceItem = allItems.find(i => String(i.id) === sourceId);
    const targetItem = allItems.find(i => String(i.id) === targetId);

    if (!sourceItem || !targetItem) return;

    const sourceStatus = sourceItem.status;
    const targetStatus = targetItem.status;

    const connType = conn.connection_type || 'depends_on';
    const connectionInfo = CONNECTION_TYPES[connType] || CONNECTION_TYPES.depends_on;
    const propagation = connectionInfo.propagation || 'target_to_source';

    let propagatedStatus = null;
    let propagatedFrom = null;
    let isPropagated = false;
    let effectiveEdgeStatus = sourceStatus;

    if (propagation === 'both') {
      const sourceAffected = affectedNodesMap.has(sourceId);
      const targetAffected = affectedNodesMap.has(targetId);

      if (sourceAffected || targetAffected) {
        isPropagated = true;
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

        let allAffecting = [];
        if (sourceAffected) allAffecting = allAffecting.concat(affectedNodesMap.get(sourceId));
        if (targetAffected) allAffecting = allAffecting.concat(affectedNodesMap.get(targetId));

        let worstStatus = 'active';
        allAffecting.forEach(({ status: s }) => {
          if (priorities[s] > priorities[worstStatus]) {
            worstStatus = s;
          }
        });

        propagatedStatus = worstStatus;
        propagatedFrom = allAffecting.map(s => s.sourceId);
        effectiveEdgeStatus = worstStatus;
      } else {
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };
        effectiveEdgeStatus = priorities[sourceStatus] > priorities[targetStatus] ? sourceStatus : targetStatus;
      }
    } else {
      let dependentId, dependencyId;

      if (propagation === 'target_to_source') {
        dependentId = sourceId;
        dependencyId = targetId;
      } else if (propagation === 'source_to_target') {
        dependentId = targetId;
        dependencyId = sourceId;
      } else {
        dependentId = null;
        dependencyId = null;
      }

      const dependentAffected = affectedNodesMap.has(dependentId);

      if (dependentAffected) {
        isPropagated = true;
        const affectingSources = affectedNodesMap.get(dependentId);
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

        let worstStatus = 'active';
        affectingSources.forEach(({ status: s }) => {
          if (priorities[s] > priorities[worstStatus]) {
            worstStatus = s;
          }
        });

        propagatedStatus = worstStatus;
        propagatedFrom = affectingSources.map(s => s.sourceId);
        effectiveEdgeStatus = worstStatus;
      } else {
        effectiveEdgeStatus = dependencyId === targetId ? targetStatus : sourceStatus;
      }
    }

    edgeStatuses[edgeId] = {
      sourceId,
      targetId,
      sourceStatus,
      targetStatus,
      propagatedStatus,
      propagatedFrom,
      isPropagated,
      effectiveEdgeStatus,
      connectionType: connType,
      propagation,
    };
  });

  return edgeStatuses;
};

export default function ServiceVisualization({ service, workspaceId }) {
  const reactFlowInstance = useRef(null);
  const nodesRef = useRef([]);
  const isReorderingRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, startTime: 0 });
  const lastSavedPositionsRef = useRef(new Map()); // Track last saved positions

  // Socket initialization - use ref to persist across renders
  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = io('http://localhost:5001', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  const socket = socketRef.current;

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

  // Delete Confirmation Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [groupToDelete, setGroupToDelete] = useState(null);

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
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState('single');

  // Cross-service connections state
  const [crossServiceConnections, setCrossServiceConnections] = useState([]);
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [externalServiceItems, setExternalServiceItems] = useState([]);
  const [showCrossConnectionModal, setShowCrossConnectionModal] = useState(false);
  const [selectedItemForCrossConnection, setSelectedItemForCrossConnection] = useState(null);
  const [showExternalNodes, setShowExternalNodes] = useState(true);
  const [externalItemPositions, setExternalItemPositions] = useState({});
  const [crossServiceEdgeHandles, setCrossServiceEdgeHandles] = useState({});
  const [crossServiceUpdateKey, setCrossServiceUpdateKey] = useState(0); // Add force update key

  // Use refs to always get latest state values and avoid stale closures
  const crossServiceConnectionsRef = useRef(crossServiceConnections);
  const crossServiceEdgeHandlesRef = useRef(crossServiceEdgeHandles);

  // Keep refs in sync with state
  useEffect(() => {
    crossServiceConnectionsRef.current = crossServiceConnections;
  }, [crossServiceConnections]);

  useEffect(() => {
    crossServiceEdgeHandlesRef.current = crossServiceEdgeHandles;
  }, [crossServiceEdgeHandles]);

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
  const prevCrossServiceConnectionsRef = useRef(null);
  const prevExternalServiceItemsRef = useRef(null);
  const prevCrossServiceEdgeHandlesRef = useRef(null);

  // Fetch connection types on mount
  useEffect(() => {
    const fetchConnectionTypes = async () => {
      try {
        const response = await api.get('/cmdb/connection-types');
        setConnectionTypes(response.data);
      } catch (error) {
        console.error('Failed to fetch connection types:', error);
      }
    };
    fetchConnectionTypes();
  }, []);

  // Listen for cross-service connection updates via socket
  useEffect(() => {
    if (!service?.id || !workspaceId) return;

    const handleCrossServiceConnectionUpdate = async (data) => {
      console.log('Received cross_service_connection_update:', data);

      // Check if this service is involved in the update
      if (data.sourceServiceId === service.id || data.targetServiceId === service.id) {
        if (data.workspaceId === workspaceId) {
          console.log('Refreshing cross-service connections for service:', service.id);

          // Refresh cross-service connections
          try {
            const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
            const connections = response.data;

            // Filter connections that involve this service
            const relevantConnections = connections.filter(conn =>
              conn.source_service_id === service.id ||
              conn.target_service_id === service.id
            );

            setCrossServiceConnections(relevantConnections);

            // Refresh cross-service edge handles
            const edgeHandlesResponse = await api.get(`/cross-service-connections/edge-handles/workspace/${workspaceId}`);
            const edgeHandlesMap = {};
            edgeHandlesResponse.data.forEach(handle => {
              edgeHandlesMap[handle.edge_id] = {
                sourceHandle: handle.source_handle,
                targetHandle: handle.target_handle
              };
            });
            setCrossServiceEdgeHandles(edgeHandlesMap);

            // Refresh external positions
            const positionsResponse = await api.get(`/external-item-positions/service/${service.id}`, {
              params: { workspaceId }
            });
            const positions = {};
            positionsResponse.data.forEach(pos => {
              positions[pos.external_service_item_id] = pos.position;
            });
            setExternalItemPositions(positions);

            // Recalculate external service items from the updated connections
            const externalItems = [];
            const externalItemIds = new Set();

            relevantConnections.forEach(conn => {
              // Check if source is from this service (local) or external
              const isSourceLocal = conn.source_service_id === service.id;

              if (isSourceLocal) {
                // Target is external
                if (!externalItemIds.has(conn.target_service_item_id)) {
                  const savedPosition = positions[conn.target_service_item_id];
                  externalItems.push({
                    id: conn.target_service_item_id,
                    name: conn.target_name,
                    type: conn.target_type,
                    status: conn.target_status,
                    cmdbItemId: conn.target_cmdb_item_id,
                    serviceId: conn.target_service_id,
                    serviceName: conn.target_service_name || 'Unknown Service',
                    cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                    position: savedPosition ? savedPosition : { x: 0, y: 0 },
                  });
                  externalItemIds.add(conn.target_service_item_id);
                }
              } else {
                // Source is external
                if (!externalItemIds.has(conn.source_service_item_id)) {
                  const savedPosition = positions[conn.source_service_item_id];
                  externalItems.push({
                    id: conn.source_service_item_id,
                    name: conn.source_name,
                    type: conn.source_type,
                    status: conn.source_status,
                    cmdbItemId: conn.source_cmdb_item_id,
                    serviceId: conn.source_service_id,
                    serviceName: conn.source_service_name || 'Unknown Service',
                    cmdbItemName: conn.source_cmdb_item_name || 'Unknown CMDB Item',
                    position: savedPosition ? savedPosition : { x: 0, y: 0 },
                  });
                  externalItemIds.add(conn.source_service_item_id);
                }
              }
            });

            setExternalServiceItems(externalItems);
            console.log('External service items recalculated:', externalItems);

          } catch (error) {
            console.error('Failed to refresh cross-service connections:', error);
          }
        }
      }
    };

    socket.on('cross_service_connection_update', handleCrossServiceConnectionUpdate);

    return () => {
      socket.off('cross_service_connection_update', handleCrossServiceConnectionUpdate);
    };
  }, [service?.id, workspaceId]);

  // Fetch cross-service connections on mount
  useEffect(() => {
    const fetchCrossServiceConnections = async () => {
      console.log('🔄 Fetching cross-service connections...', { serviceId: service?.id, workspaceId });

      if (!service?.id || !workspaceId) return;

      try {
        // Fetch external item positions for this service
        const positionsResponse = await api.get(`/external-item-positions/service/${service.id}`, {
          params: { workspaceId }
        });
        const positions = {};
        positionsResponse.data.forEach(pos => {
          positions[pos.external_service_item_id] = pos.position;
        });
        setExternalItemPositions(positions);

        // Fetch cross-service edge handles
        const edgeHandlesResponse = await api.get(`/cross-service-connections/edge-handles/workspace/${workspaceId}`);
        const edgeHandlesMap = {};
        edgeHandlesResponse.data.forEach(handle => {
          edgeHandlesMap[handle.edge_id] = {
            sourceHandle: handle.source_handle,
            targetHandle: handle.target_handle
          };
        });
        setCrossServiceEdgeHandles(edgeHandlesMap);

        // Get all cross-service connections for workspace
        const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
        const connections = response.data;

        console.log('📡 All cross-service connections:', connections);
        console.log('📍 Current service ID:', service.id);

        // Filter connections that involve service items from this service
        // Note: items from props might not be available yet, so we fetch all and filter
        const relevantConnections = connections.filter(conn => {
          // Include if source or target is in the same service as this visualization
          const isRelevant = conn.source_service_id === service.id || conn.target_service_id === service.id;
          console.log(`Connection ${conn.id}: source=${conn.source_service_id}, target=${conn.target_service_id}, relevant=${isRelevant}`);
          return isRelevant;
        });

        console.log('✅ Relevant connections:', relevantConnections);
        setCrossServiceConnections(relevantConnections);
        console.log('📝 setCrossServiceConnections called with', relevantConnections.length, 'connections');

        // Increment update key to force edges re-render
        setCrossServiceUpdateKey(prev => prev + 1);

        // Get all external service items from these connections
        const externalItems = [];
        const externalItemIds = new Set();

        relevantConnections.forEach(conn => {
          // Check if source is from this service (local) or external
          const isSourceLocal = conn.source_service_id === service.id;

          if (isSourceLocal) {
            // Target is external
            if (!externalItemIds.has(conn.target_service_item_id)) {
              const savedPosition = positions[conn.target_service_item_id];
              externalItems.push({
                id: conn.target_service_item_id,
                name: conn.target_name,
                type: conn.target_type,
                status: conn.target_status,
                cmdbItemId: conn.target_cmdb_item_id,
                serviceId: conn.target_service_id,
                serviceName: conn.target_service_name || 'Unknown Service',
                cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                position: savedPosition ? savedPosition : { x: 0, y: 0 }, // Use saved position or default
              });
              externalItemIds.add(conn.target_service_item_id);
            }
          } else {
            // Source is external
            if (!externalItemIds.has(conn.source_service_item_id)) {
              const savedPosition = positions[conn.source_service_item_id];
              externalItems.push({
                id: conn.source_service_item_id,
                name: conn.source_name,
                type: conn.source_type,
                status: conn.source_status,
                cmdbItemId: conn.source_cmdb_item_id,
                serviceId: conn.source_service_id,
                serviceName: conn.source_service_name || 'Unknown Service',
                cmdbItemName: conn.source_cmdb_item_name || 'Unknown CMDB Item',
                position: savedPosition ? savedPosition : { x: 0, y: 0 }, // Use saved position or default
              });
              externalItemIds.add(conn.source_service_item_id);
            }
          }
        });

        setExternalServiceItems(externalItems);
      } catch (error) {
        console.error('Failed to fetch cross-service connections:', error);
      }
    };

    fetchCrossServiceConnections();
  }, [service?.id, workspaceId]);

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

    // Preserve external nodes when rebuilding local nodes
    setNodes(currentNodes => {
      // Keep existing external nodes
      const externalNodes = currentNodes.filter(n => n.data?.isExternal);

      // Combine local nodes with external nodes
      const allNodes = [...flowNodes, ...externalNodes];

      nodesRef.current = allNodes;
      return allNodes;
    });

    // Update refs
    prevItemsRef.current = items;
    prevGroupsRef.current = groups;

    // Initialize last saved positions for new nodes
    flowNodes.forEach(node => {
      if (!lastSavedPositionsRef.current.has(node.id)) {
        lastSavedPositionsRef.current.set(node.id, { ...node.position });
      }
    });
  }, [items, groups, parentServiceData]);

  // Add external service item nodes when cross-service connections change
  useEffect(() => {
    const crossServiceConnectionsChanged = JSON.stringify(prevCrossServiceConnectionsRef.current) !== JSON.stringify(crossServiceConnections);
    const externalServiceItemsChanged = JSON.stringify(prevExternalServiceItemsRef.current) !== JSON.stringify(externalServiceItems);

    if (!crossServiceConnectionsChanged && !externalServiceItemsChanged) {
      return;
    }

    // Add/update external nodes with saved positions
    setNodes(currentNodes => {
      const updatedNodes = [...currentNodes];
      const externalNodeIds = new Set();

      // Calculate bounding box of existing nodes (local nodes only)
      let maxX = 0;
      let maxY = 0;
      currentNodes.forEach(node => {
        if (!node.parentNode && !node.data?.isExternal) {
          const nodeRight = node.position.x + (node.style?.width || 160);
          const nodeBottom = node.position.y + (node.style?.height || 80);
          maxX = Math.max(maxX, nodeRight);
          maxY = Math.max(maxY, nodeBottom);
        }
      });

      // Add external nodes
      let offsetX = maxX + 200; // Start 200px to the right
      let offsetY = 100;
      let itemsInRow = 0;
      const maxItemsPerRow = 4;

      externalServiceItems.forEach(externalItem => {
        const existingNode = updatedNodes.find(n => n.id === String(externalItem.id));

        // Use saved position if available, otherwise calculate new position
        let nodePosition = externalItem.position;
        if (!nodePosition || (nodePosition.x === 0 && nodePosition.y === 0)) {
          nodePosition = { x: offsetX, y: offsetY };

          // Update offset for next new item
          itemsInRow++;
          if (itemsInRow >= maxItemsPerRow) {
            offsetX = maxX + 200;
            offsetY += 120;
            itemsInRow = 0;
          } else {
            offsetX += 180;
          }
        }

        if (!existingNode) {
          // Create new external node
          updatedNodes.push({
            id: String(externalItem.id),
            type: 'custom',
            position: nodePosition,
            draggable: true, // External nodes are now draggable!
            data: {
              label: externalItem.name,
              name: externalItem.name,
              type: externalItem.type,
              description: '',
              status: externalItem.status,
              ip: '',
              domain: '',
              port: '',
              category: 'external',
              location: '',
              parentService: null,
              groupId: null,
              orderInGroup: 0,
              isExternal: true,
              externalSource: {
                serviceName: externalItem.serviceName,
                cmdbItemName: externalItem.cmdbItemName,
                serviceId: externalItem.serviceId,
                cmdbItemId: externalItem.cmdbItemId,
              },
            },
            style: {
              width: 160,
              height: 80,
              pointerEvents: 'all',
            },
            className: 'external-service-node',
          });

          externalNodeIds.add(String(externalItem.id));
        } else {
          // Update existing external node position if needed
          const nodeIndex = updatedNodes.findIndex(n => n.id === String(externalItem.id));
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex].position = nodePosition;
            updatedNodes[nodeIndex].draggable = true; // Ensure it's draggable
          }
          externalNodeIds.add(String(externalItem.id));
        }
      });

      // Remove external nodes that are no longer connected
      const currentExternalNodeIds = new Set(externalServiceItems.map(item => String(item.id)));
      const filteredNodes = updatedNodes.filter(node => {
        // Remove external nodes that are no longer connected
        if (node.data?.isExternal && !currentExternalNodeIds.has(node.id)) {
          return false;
        }
        // Hide external nodes if toggle is off
        if (node.data?.isExternal && !showExternalNodes) {
          return false;
        }
        return true;
      });

      return filteredNodes;
    });

    // Update refs
    prevCrossServiceConnectionsRef.current = crossServiceConnections;
    prevExternalServiceItemsRef.current = externalServiceItems;
  }, [crossServiceConnections, externalServiceItems, showExternalNodes]);

  // Update edges when connections change
  useEffect(() => {
    // Use ref for edgeHandles to avoid stale closures, but use direct values for crossServiceConnections
    // since it's in the dependency array and will always be fresh when useEffect runs
    const currentEdgeHandles = edgeHandles;
    const currentCrossServiceEdgeHandles = crossServiceEdgeHandlesRef.current;

    console.log('🔄 Update edges useEffect triggered');
    console.log('  - connections:', connections.length);
    console.log('  - groupConnections:', groupConnections.length);
    console.log('  - crossServiceConnections:', crossServiceConnections.length);
    console.log('  - crossServiceEdgeHandles:', Object.keys(currentCrossServiceEdgeHandles).length);

    // Skip if data hasn't actually changed (but allow first render)
    const isFirstRender = prevConnectionsRef.current === null;
    const connectionsChanged = isFirstRender || JSON.stringify(prevConnectionsRef.current) !== JSON.stringify(connections);
    const groupConnectionsChanged = isFirstRender || JSON.stringify(prevGroupConnectionsRef.current) !== JSON.stringify(groupConnections);
    const edgeHandlesChanged = isFirstRender || JSON.stringify(prevEdgeHandlesRef.current) !== JSON.stringify(currentEdgeHandles);

    // For cross-service data, always update when useEffect is triggered (React handles dependency changes)
    // We only check if it's the very first render to prevent unnecessary updates
    const crossServiceConnectionsChanged = isFirstRender || true;
    const crossServiceEdgeHandlesChanged = isFirstRender || true;

    console.log('Change detection:', {
      connectionsChanged,
      groupConnectionsChanged,
      edgeHandlesChanged,
      crossServiceConnectionsChanged,
      crossServiceEdgeHandlesChanged,
      crossServiceUpdateKey,
      currentCrossConnLength: crossServiceConnections.length
    });

    if (!connectionsChanged && !groupConnectionsChanged && !edgeHandlesChanged && !crossServiceConnectionsChanged && !crossServiceEdgeHandlesChanged) {
      console.log('⏭️ Skipping edges update - no changes detected');
      return;
    }

    console.log('✅ Updating edges...');

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

    // Calculate propagated statuses for cross-service connections
    const crossServiceEdgeStatuses = calculateCrossServicePropagatedStatuses(
      items,
      crossServiceConnections,
      externalServiceItems
    );

    // Add cross-service edges with connection type styling and status propagation
    const crossServiceEdges = crossServiceConnections.map(conn => {
      const edgeId = `cross-service-${conn.source_service_item_id}-${conn.target_service_item_id}`;
      const connectionType = connectionTypes.find(ct => ct.type_slug === conn.connection_type);

      // Get saved edge handles or use defaults
      const handleConfig = currentCrossServiceEdgeHandles[edgeId];
      const sourceHandle = (handleConfig && handleConfig.sourceHandle) || 'source-right';
      const targetHandle = (handleConfig && handleConfig.targetHandle) || 'target-left';

      // Get propagated status information
      const edgeStatusInfo = crossServiceEdgeStatuses[edgeId];
      let strokeColor = connectionType?.color || '#3b82f6';
      let showCrossMarker = false;
      let isPropagated = false;

      if (edgeStatusInfo) {
        const effectiveStatus = edgeStatusInfo.effectiveEdgeStatus || edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.isPropagated);
        showCrossMarker = shouldShowCrossMarker(effectiveStatus);
        isPropagated = edgeStatusInfo.isPropagated || false;
      }

      const baseStyle = {
        strokeWidth: isPropagated ? 3 : 2,
        stroke: strokeColor,
      };

      // Add dash array for certain connection types
      if (conn.connection_type === 'related_to') {
        baseStyle.strokeDasharray = '5,5';
      }

      console.log('🔗 Creating cross-service edge:', {
        edgeId,
        source: conn.source_service_item_id,
        target: conn.target_service_item_id,
        sourceHandle,
        targetHandle,
        sourceName: conn.source_name,
        targetName: conn.target_name,
        connectionType: connectionType?.label || conn.connection_type,
        statusInfo: edgeStatusInfo,
        isPropagated,
        showCrossMarker
      });

      const edge = {
        id: edgeId,
        source: String(conn.source_service_item_id),
        target: String(conn.target_service_item_id),
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: 'smoothstep',
        animated: true, // Animate cross-service edges for visibility
        style: baseStyle,
        zIndex: isPropagated ? 10 : 5,
        label: showCrossMarker ? '✕' : (connectionType?.label || ''),
        labelStyle: {
          fontSize: showCrossMarker ? 20 : 10,
          fontWeight: showCrossMarker ? 'bold' : 600,
          fill: strokeColor,
          backgroundColor: 'white',
        },
        labelBgStyle: showCrossMarker ? {
          fill: 'white',
          fillOpacity: 0,
        } : undefined,
        labelBgPadding: showCrossMarker ? [8, 8] : undefined,
        labelBgBorderRadius: showCrossMarker ? 50 : undefined,
        markerEnd: {
          type: 'arrowclosed',
          color: strokeColor,
        },
        // Store service IDs for edge handle saving
        data: {
          sourceServiceId: conn.source_service_id,
          targetServiceId: conn.target_service_id,
          isCrossService: true,
          ...(edgeStatusInfo && isPropagated ? {
            isPropagated: true,
            propagatedFrom: edgeStatusInfo.propagatedFrom,
            propagatedStatus: edgeStatusInfo.propagatedStatus,
          } : {})
        }
      };

      console.log('✅ Edge created:', edge);
      return edge;
    });

    console.log('📊 Total cross-service edges:', crossServiceEdges.length);

    setEdges([...itemEdges, ...groupToGroupEdges, ...groupToItemEdges, ...itemToGroupEdges, ...crossServiceEdges]);

    // Update refs (but NOT crossServiceConnectionsRef since we're using a separate ref to avoid stale closures)
    prevConnectionsRef.current = connections;
    prevGroupConnectionsRef.current = groupConnections;
    prevEdgeHandlesRef.current = edgeHandles;
    prevCrossServiceEdgeHandlesRef.current = crossServiceEdgeHandles;
  }, [connections, groupConnections, edgeHandles, crossServiceConnections, crossServiceEdgeHandles, connectionTypes, crossServiceUpdateKey]);

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

  const handleOpenCrossServiceConnection = useCallback((item) => {
    setSelectedItemForCrossConnection(item);
    setShowCrossConnectionModal(true);
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
      // Only save nodes that have changed position (compare with last saved position)
      const nodesToSave = nodes.filter(node => {
        // Skip if node is in a group (handled by group position)
        if (node.parentNode) return false;

        // Get last saved position
        const lastSaved = lastSavedPositionsRef.current.get(node.id);
        const currentPosition = node.position;

        // Check if position actually changed
        if (!lastSaved) {
          // First time saving this node
          return true;
        }

        // Compare positions with small threshold to avoid unnecessary saves
        const positionChanged =
          Math.abs(lastSaved.x - currentPosition.x) > 1 ||
          Math.abs(lastSaved.y - currentPosition.y) > 1;

        return positionChanged;
      });

      if (nodesToSave.length === 0) {
        setIsAutoSaving(false);
        console.log('✅ Autosave skipped - no position changes');
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

      // Update last saved positions
      nodesToSave.forEach(node => {
        lastSavedPositionsRef.current.set(node.id, { ...node.position });
      });

      console.log('✅ Autosave completed - saved', nodesToSave.length, 'nodes (only changed positions)');
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

      // Save external item position to database
      if (node.data?.isExternal && service?.id) {
        try {
          await api.post('/external-item-positions', {
            workspaceId: workspaceId,
            serviceId: service.id,
            externalServiceItemId: node.id,
            position: node.position
          });
        } catch (err) {
          console.error('Failed to save external item position:', err);
        }
      }

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
    // Show confirmation dialog instead of window.confirm
    const item = items.find(i => i.id === itemId);
    if (item) {
      setItemToDelete(item);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      await api.delete(`/service-items/items/${itemToDelete.id}`);
      await fetchAll();
      toast.success('Item deleted!');
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setGroupToDelete(group);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await deleteServiceGroup(groupToDelete.id);
      toast.success('Group deleted!');
      setShowDeleteDialog(false);
      setGroupToDelete(null);
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
      const item = items.find(i => i.id === contextMenu.item.id);
      if (item) {
        setItemToDelete(item);
        setShowDeleteDialog(true);
      }
    } else if (contextMenu.group) {
      const group = groups.find(g => g.id === contextMenu.group.id);
      if (group) {
        setGroupToDelete(group);
        setShowDeleteDialog(true);
      }
    }
  }, [contextMenu, items, groups, handleCloseContextMenu]);

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

  const handleContextMenuManageCrossServiceConnections = useCallback(() => {
    handleCloseContextMenu();
    if (contextMenu.item) {
      handleOpenCrossServiceConnection(contextMenu.item);
    }
  }, [contextMenu, handleOpenCrossServiceConnection, handleCloseContextMenu]);

  // Handle reconnecting edges
  const handleReconnect = useCallback(async (oldEdge, newConnection) => {
    // Save to database FIRST
    try {
      // Check if this is a cross-service edge
      const isCrossService = oldEdge.id.startsWith('cross-service-') || oldEdge.data?.isCrossService;

      if (isCrossService) {
        // Save cross-service edge handle
        const edgeData = oldEdge.data || {};
        await api.put(`/cross-service-connections/edge-handles/${oldEdge.id}`, {
          sourceServiceId: edgeData.sourceServiceId,
          targetServiceId: edgeData.targetServiceId,
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
          workspaceId: workspaceId
        });

        // Update cross-service edge handles state
        setCrossServiceEdgeHandles(prev => ({
          ...prev,
          [oldEdge.id]: {
            sourceHandle: newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
          }
        }));
      } else {
        // Save regular service edge handle
        await saveServiceEdgeHandle(
          oldEdge.id,
          newConnection.sourceHandle,
          newConnection.targetHandle,
          service.id,
          workspaceId
        );

        // Update edge handles state AFTER edge reconnect to prevent race condition
        setEdgeHandles(prev => ({
          ...prev,
          [oldEdge.id]: {
            sourceHandle: newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
          }
        }));
      }

      // Reconnect edge in local state immediately
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

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
        showExternalNodes={showExternalNodes}
        onToggleExternalNodes={() => setShowExternalNodes(!showExternalNodes)}
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
        onDeleteGroup={(groupId) => handleDeleteGroup(groupId)}
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

      {/* Cross-Service Connection Modal */}
      <CrossServiceConnectionModal
        show={showCrossConnectionModal}
        selectedItem={selectedItemForCrossConnection}
        allServiceItems={items}
        workspaceId={workspaceId}
        onClose={() => {
          setShowCrossConnectionModal(false);
          setSelectedItemForCrossConnection(null);
        }}
        onSave={async () => {
          // Refresh cross-service connections
          try {
            const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
            const connections = response.data;

            // Filter connections that involve service items from this service
            const serviceItemIds = items.map(item => item.id);
            const relevantConnections = connections.filter(conn =>
              serviceItemIds.includes(conn.source_service_item_id) ||
              serviceItemIds.includes(conn.target_service_item_id)
            );

            setCrossServiceConnections(relevantConnections);
          } catch (error) {
            console.error('Failed to refresh cross-service connections:', error);
          }

          setShowCrossConnectionModal(false);
          setSelectedItemForCrossConnection(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Service Item?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete && (
                <>
                  Apakah Anda yakin ingin menghapus item <strong>"{itemToDelete.name}"</strong> ini?
                </>
              )}
              {groupToDelete && (
                <>
                  Apakah Anda yakin ingin menghapus group <strong>"{groupToDelete.name}"</strong> ini?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  confirmDeleteItem();
                } else if (groupToDelete) {
                  confirmDeleteGroup();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        onManageCrossServiceConnections={handleContextMenuManageCrossServiceConnections}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
}
