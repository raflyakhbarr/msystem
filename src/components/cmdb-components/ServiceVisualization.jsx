import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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
import { useSocket } from '../../context/SocketContext';
import { useServiceItems } from '../../hooks/cmdb-hooks/useServiceItems';
import { loadServiceEdgeHandles, saveServiceEdgeHandle, CONNECTION_TYPES, getStatusColor, shouldShowCrossMarker } from '../../utils/cmdb-utils/flowHelpers';
import { calculatePropagatedStatuses } from '../../utils/cmdb-utils/statusPropagation';
import CustomServiceNode from './CustomServiceNode';
import CustomServiceGroupNode from './CustomServiceGroupNode';
import ServiceConnectionModal from './ServiceConnectionModal';
import ServiceItemContextMenu from './ServiceItemContextMenu';
import ServiceGroupModal from './ServiceGroupModal';
import ServiceGroupConnectionModal from './ServiceGroupConnectionModal';
import ServiceItemFormModal from './ServiceItemFormModal';
import ServiceNavbar from './ServiceNavbar';
import QuickConnectionModal from './QuickConnectionModal';
import ServiceEdgeContextMenu from './ServiceEdgeContextMenu';
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

const nodeTypes = {
  custom: CustomServiceNode,
  serviceGroup: CustomServiceGroupNode,
};

// Memoize these objects to prevent ReactFlow infinite re-renders
const CONNECTION_LINE_STYLE = { stroke: '#3b82f6', strokeWidth: 2 };

const getMiniMapNodeColor = (node) => {
  if (node.type === 'serviceGroup') return '#f59e0b';
  return '#3b82f6';
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
  externalServiceItems,
  isSharedView = false // ✅ FIX: Add isSharedView parameter with default value
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
      isSharedView: isSharedView || false, // ✅ FIX: Pass isSharedView flag
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
  // If a node is problematic, all nodes that DEPEND on it are affected
  const getAffectedNodesRecursive = (nodeId, visited = new Set()) => {
    if (visited.has(nodeId) || !graph[nodeId]) {
      return visited;
    }
    visited.add(nodeId);

    // Get dependents (nodes yang bergantung pada nodeId ini)
    // Jika A bermasalah dan B depends on A, maka B terpengaruh
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
        // No propagation - edge status is based on source item status
        // Each edge is independent and should only reflect its own source status
        effectiveEdgeStatus = sourceStatus;
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
        // No propagation - edge status is based on source item status
        // Each edge is independent and should only reflect its own source status
        effectiveEdgeStatus = sourceStatus;
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

function ServiceVisualization({
  service,
  workspaceId,
  isSharedView = false,
  sharedData = null // Pre-loaded data for shared view
}) {
  const reactFlowInstance = useRef(null);
  const nodesRef = useRef([]);
  const isReorderingRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, startTime: 0 });
  const lastSavedPositionsRef = useRef(new Map()); // Track last saved positions

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
  const [itemConnectionTypes, setItemConnectionTypes] = useState({});
  const [itemToGroupConnectionTypes, setItemToGroupConnectionTypes] = useState({});
  const [selectedGroupForConnection, setSelectedGroupForConnection] = useState(null);
  const [selectedGroupToGroupConnections, setSelectedGroupToGroupConnections] = useState([]);
  const [selectedGroupToItemConnections, setSelectedGroupToItemConnections] = useState([]);

  // Drag state for reordering items in groups
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null); // Group yang sedang di-hover oleh dragged node
  const [isReorderingInGroup, setIsReorderingInGroup] = useState(false); // Hanya true saat reorder dalam group

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
    paddingRight: 13,
    headerHeight: 40,
  }), []);

  // Autosave state
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Minimap state
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Edge labels state
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);

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

  // Quick Connection Modal states
  const [showQuickConnectionModal, setShowQuickConnectionModal] = useState(false);
  const [quickConnectionSource, setQuickConnectionSource] = useState(null);
  const [quickConnectionTarget, setQuickConnectionTarget] = useState(null);
  const [quickConnectionMode, setQuickConnectionMode] = useState('create'); // 'create' or 'edit'
  const [quickConnectionExistingType, setQuickConnectionExistingType] = useState(null);

  // Edge Context Menu states
  const [edgeContextMenu, setEdgeContextMenu] = useState({ show: false, position: { x: 0, y: 0 }, edge: null, sourceNode: null, targetNode: null });

  // Use refs to always get latest state values and avoid stale closures
  const crossServiceConnectionsRef = useRef(crossServiceConnections);
  const crossServiceEdgeHandlesRef = useRef(crossServiceEdgeHandles);
  const autoLayoutedPositionsRef = useRef(new Map()); // Cache auto-layouted positions

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

  // Extract pre-loaded data from sharedData (for shared view)
  const preLoadedData = useMemo(() => {
    if (!isSharedView || !sharedData?.services) {
      return null;
    }

    // Find service in sharedData
    const sharedService = sharedData.services.find(s => s.id === service.id);
    if (!sharedService) {
      return null;
    }

    // Extract service items
    const items = sharedService.service_items || [];

    // Extract internal connections (item-to-item)
    const connections = sharedService.service_connections || [];

    // Extract groups
    const groups = sharedService.service_groups || [];

    // Extract group connections
    const groupConnections = sharedService.service_group_connections || [];

    return {
      items,
      connections,
      groups,
      groupConnections,
      isPreLoaded: true
    };
  }, [isSharedView, service.id, sharedData?.services]);

  // IMPORTANT: useServiceItems hook MUST be called conditionally based on isSharedView
  // This is safe because isSharedView is a prop that doesn't change during component lifetime
  // Once a ServiceVisualization is mounted in shared view mode, it never switches to normal mode
  // and vice versa. This prevents hook order violations.
  const serviceItemsData = !isSharedView
    ? useServiceItems(service.id, workspaceId)
    : {
        // Mock data for shared view - prevents unnecessary API calls and hook order issues
        items: [],
        connections: [],
        groups: [],
        groupConnections: [],
        loading: false,
        fetchAll: () => Promise.resolve(),
        createServiceGroup: () => Promise.resolve(),
        updateServiceGroup: () => Promise.resolve(),
        deleteServiceGroup: () => Promise.resolve(),
        saveServiceGroupConnections: () => Promise.resolve(),
      };

  // Use pre-loaded data in shared view, otherwise use hook data
  const items = preLoadedData ? preLoadedData.items : serviceItemsData.items;
  const connections = preLoadedData ? preLoadedData.connections : serviceItemsData.connections;
  const groups = preLoadedData ? preLoadedData.groups : serviceItemsData.groups;
  const groupConnections = preLoadedData ? preLoadedData.groupConnections : serviceItemsData.groupConnections;

  // Use appropriate functions based on view mode
  const fetchAll = serviceItemsData.fetchAll;
  const createServiceGroup = serviceItemsData.createServiceGroup;
  const updateServiceGroup = serviceItemsData.updateServiceGroup;
  const deleteServiceGroup = serviceItemsData.deleteServiceGroup;
  const saveServiceGroupConnections = serviceItemsData.saveServiceGroupConnections;

  // Load service edge handles on mount
  useEffect(() => {
    // Skip API call in shared view
    if (isSharedView) {
      // Use pre-loaded edge handles from sharedData
      if (sharedData?.edgeHandles) {
        setEdgeHandles(sharedData.edgeHandles);
      }
      // Use pre-loaded service edge handles (for internal item connections)
      if (sharedData?.serviceEdgeHandles) {
        // Merge with existing edgeHandles
        setEdgeHandles(prev => ({ ...prev, ...sharedData.serviceEdgeHandles }));
      }
      // Use pre-loaded cross-service edge handles
      if (sharedData?.crossServiceEdgeHandles) {
        setCrossServiceEdgeHandles(sharedData.crossServiceEdgeHandles);
      }
      // Use pre-loaded external item positions
      if (sharedData?.externalItemPositions) {
        // ✅ FIX: Extract service-specific positions from new per-service format
        // New format: { [service_id]: { [item_id]: position } }
        const serviceSpecificPositions = sharedData.externalItemPositions[service.id] || {};
        setExternalItemPositions(serviceSpecificPositions);
      }
      return;
    }

    const loadHandles = async () => {
      if (!service?.id) return;
      const handles = await loadServiceEdgeHandles(service.id, workspaceId);
      setEdgeHandles(handles);
    };
    loadHandles();
  }, [service?.id, workspaceId, isSharedView, sharedData?.edgeHandles, sharedData?.serviceEdgeHandles, sharedData?.crossServiceEdgeHandles, sharedData?.externalItemPositions]);

  // Clear auto-layout cache when service changes
  useEffect(() => {
    autoLayoutedPositionsRef.current.clear();
  }, [service?.id]);

  // Siapkan data parent service dengan icon_preview
  const parentServiceData = useMemo(() => service ? {
    ...service,
    icon_preview: service.icon_type === 'upload' && service.icon_path
      ? `${API_BASE_URL}${service.icon_path}`
      : null
  } : null, [service]);

  // Helper function to get default propagation for connection type (for service items)
  const getConnectionPropagation = (typeSlug) => {
    const propagationMap = {
      'depends_on': 'source_to_target',
      'consumed_by': 'target_to_source',
      'connects_to': 'both',
      'contains': 'source_to_target',
      'managed_by': 'source_to_target',
      'data_flow_to': 'source_to_target',
      'backup_to': 'source_to_target',
      'backed_up_by': 'source_to_target',
      'hosted_on': 'source_to_target',
      'hosting': 'target_to_source',
      'licensed_by': 'source_to_target',
      'licensing': 'target_to_source',
      'part_of': 'source_to_target',
      'comprised_of': 'source_to_target',
      'related_to': 'both',
      'preceding': 'source_to_target',
      'succeeding': 'target_to_source',
      'encrypted_by': 'source_to_target',
      'encrypting': 'target_to_source',
      'authenticated_by': 'source_to_target',
      'authenticating': 'target_to_source',
      'monitoring': 'target_to_source',
      'monitored_by': 'source_to_target',
      'load_balanced_by': 'source_to_target',
      'load_balancing': 'target_to_source',
      'failing_over_to': 'source_to_target',
      'failover_from': 'target_to_source',
      'replicating_to': 'target_to_source',
      'replicated_by': 'source_to_target',
      'proxying_for': 'target_to_source',
      'proxied_by': 'source_to_target',
      'routed_through': 'source_to_target',
      'routing': 'target_to_source',
    };
    return propagationMap[typeSlug] || 'source_to_target';
  };

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
    // Skip API call in shared view - connection types should be in sharedData
    if (isSharedView) {
      if (sharedData?.connectionTypes) {
        setConnectionTypes(sharedData.connectionTypes);
      }
      return;
    }

    const fetchConnectionTypes = async () => {
      try {
        const response = await api.get('/cmdb/connection-types');
        setConnectionTypes(response.data);
      } catch (error) {
        console.error('Failed to fetch connection types:', error);
      }
    };
    fetchConnectionTypes();
  }, [isSharedView, sharedData?.connectionTypes?.length]);

  // Fetch cross-service connections on mount
  useEffect(() => {
    // In shared view with pre-loaded data, use it directly
    if (isSharedView && sharedData?.crossServiceConnections) {
      // Filter connections for this service
      const relevantConnections = sharedData.crossServiceConnections.filter(conn => {
        const isRelevant = conn.source_service_id === service.id || conn.target_service_id === service.id;
        return isRelevant;
      });

      // Process external service items
      const externalItems = [];
      const externalItemIds = new Set();

      relevantConnections.forEach(conn => {
        // Add external service items
        if (conn.source_service_id === service.id && conn.target_service_id !== service.id) {
          if (!externalItemIds.has(conn.target_service_item_id)) {
            externalItemIds.add(conn.target_service_item_id);
            const targetService = sharedData.services.find(s => s.id === conn.target_service_id);
            const targetServiceItem = targetService?.service_items?.find(si => si.id === conn.target_service_item_id);
            if (targetServiceItem) {
              // ✅ FIX: Use PER-SERVICE format { [service_id]: { [item_id]: position } }
              // Get positions for the CURRENT viewing service, not the target service
              const serviceSpecificPositions = sharedData.externalItemPositions?.[service.id] || {};
              const savedPosition = serviceSpecificPositions[targetServiceItem.id] || null;

              // ✅ FIXED: Accept {x: 0, y: 0} as valid position (user might place item there intentionally)
              const hasExplicitPosition = savedPosition !== null;

              externalItems.push({
                id: targetServiceItem.id,
                name: targetServiceItem.name,
                type: targetServiceItem.type,
                status: targetServiceItem.status,
                cmdbItemId: targetService.cmdb_item_id,
                serviceId: targetService.id,
                serviceName: targetService.name,
                cmdbItemName: targetService.cmdb_item_id ? sharedData.items?.find(i => i.id === targetService.cmdb_item_id)?.name : 'Unknown',
                isExternal: true,
                isSharedView: isSharedView || false, // ✅ FIX: Pass isSharedView flag
                position: hasExplicitPosition ? savedPosition : null
              });
            }
          }
        } else if (conn.target_service_id === service.id && conn.source_service_id !== service.id) {
          if (!externalItemIds.has(conn.source_service_item_id)) {
            externalItemIds.add(conn.source_service_item_id);
            const sourceService = sharedData.services.find(s => s.id === conn.source_service_id);
            const sourceServiceItem = sourceService?.service_items?.find(si => si.id === conn.source_service_item_id);
            if (sourceServiceItem) {
              // ✅ FIX: Use PER-SERVICE format { [service_id]: { [item_id]: position } }
              // Get positions for the CURRENT viewing service, not the source service
              const serviceSpecificPositions = sharedData.externalItemPositions?.[service.id] || {};
              const savedPosition = serviceSpecificPositions[sourceServiceItem.id] || null;

              // ✅ FIXED: Accept {x: 0, y: 0} as valid position (user might place item there intentionally)
              const hasExplicitPosition = savedPosition !== null;

              externalItems.push({
                id: sourceServiceItem.id,
                name: sourceServiceItem.name,
                type: sourceServiceItem.type,
                status: sourceServiceItem.status,
                cmdbItemId: sourceService.cmdb_item_id,
                serviceId: sourceService.id,
                serviceName: sourceService.name,
                cmdbItemName: sourceService.cmdb_item_id ? sharedData.items?.find(i => i.id === sourceService.cmdb_item_id)?.name : 'Unknown',
                isExternal: true,
                isSharedView: isSharedView || false, // ✅ FIX: Pass isSharedView flag
                position: hasExplicitPosition ? savedPosition : null
              });
            }
          }
        }
      });

      setCrossServiceConnections(relevantConnections);
      setExternalServiceItems(externalItems);

      return;
    }

    // Skip all API calls in shared view without pre-loaded data
    if (isSharedView) {
      return;
    }

    const fetchCrossServiceConnections = async () => {

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
        // Filter hanya handles yang relevan untuk service ini (viewing service)
        const edgeHandlesResponse = await api.get(`/cross-service-connections/edge-handles/workspace/${workspaceId}`);
        const edgeHandlesMap = {};
        edgeHandlesResponse.data.forEach(handle => {
          // Hanya gunakan handle yang dibuat dari viewing service ini
          // atau handle yang belum punya viewing_service_id (backward compatibility)
          if (!handle.viewing_service_id || handle.viewing_service_id === service.id) {
            edgeHandlesMap[handle.edge_id] = {
              sourceHandle: handle.source_handle,
              targetHandle: handle.target_handle
            };
          }
        });
        setCrossServiceEdgeHandles(edgeHandlesMap);

        // Get all cross-service connections for workspace
        const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
        const connections = response.data;

        // Filter connections that involve service items from this service
        // Note: items from props might not be available yet, so we fetch all and filter
        const relevantConnections = connections.filter(conn => {
          // Include if source or target is in the same service as this visualization
          const isRelevant = conn.source_service_id === service.id || conn.target_service_id === service.id;
          return isRelevant;
        });
        setCrossServiceConnections(relevantConnections);
        // Increment update key to force edges re-render
        setCrossServiceUpdateKey(prev => prev + 1);

        // Get all external service items from these connections
        const externalItems = [];
        const externalItemIds = new Set();
        const itemsNeedingAutoLayout = [];

        relevantConnections.forEach(conn => {
          // Check if source is from this service (local) or external
          const isSourceLocal = conn.source_service_id === service.id;

          if (isSourceLocal) {
            // Target is external
            if (!externalItemIds.has(conn.target_service_item_id)) {
              const savedPosition = positions[conn.target_service_item_id];
              // Check if position exists and is explicitly set (not default {x: 0, y: 0})
              const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);

              if (!hasExplicitPosition) {
                // Queue for auto-layout
                itemsNeedingAutoLayout.push(conn.target_service_item_id);
              }

              externalItems.push({
                id: conn.target_service_item_id,
                name: conn.target_name,
                type: conn.target_type,
                status: conn.target_status,
                cmdbItemId: conn.target_cmdb_item_id,
                serviceId: conn.target_service_id,
                serviceName: conn.target_service_name || 'Unknown Service',
                cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                position: hasExplicitPosition ? savedPosition : null, // null = needs auto-layout
              });
              externalItemIds.add(conn.target_service_item_id);
            }
          } else {
            // Source is external
            if (!externalItemIds.has(conn.source_service_item_id)) {
              const savedPosition = positions[conn.source_service_item_id];
              // Check if position exists and is explicitly set (not default {x: 0, y: 0})
              const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);

              if (!hasExplicitPosition) {
                // Queue for auto-layout
                itemsNeedingAutoLayout.push(conn.source_service_item_id);
              }

              externalItems.push({
                id: conn.source_service_item_id,
                name: conn.source_name,
                type: conn.source_type,
                status: conn.source_status,
                cmdbItemId: conn.source_cmdb_item_id,
                serviceId: conn.source_service_id,
                serviceName: conn.source_service_name || 'Unknown Service',
                cmdbItemName: conn.source_cmdb_item_name || 'Unknown CMDB Item',
                position: hasExplicitPosition ? savedPosition : null, // null = needs auto-layout
              });
              externalItemIds.add(conn.source_service_item_id);
            }
          }
        });

        // Batch create default positions untuk items yang belum punya posisi
        if (itemsNeedingAutoLayout.length > 0) {
          try {
            const autoLayoutResponse = await api.post('/external-item-positions/batch-auto-layout', {
              workspaceId: workspaceId,
              serviceId: service.id,
              externalServiceItemIds: itemsNeedingAutoLayout
            });

            // Update positions dengan yang baru di-auto-layout
            autoLayoutResponse.data.forEach(pos => {
              positions[pos.external_service_item_id] = pos.position;
            });

            // Update external items dengan positions baru
            externalItems.forEach(item => {
              if (!item.position) {
                item.position = positions[item.id];
              }
            });
          } catch (autoLayoutErr) {
            console.error('Failed to auto-layout external items:', autoLayoutErr);
            // Fallback: gunakan manual calculation
            let offsetX = 500;
            let offsetY = 100;
            let itemsInRow = 0;
            const maxItemsPerRow = 4;

            externalItems.forEach(item => {
              if (!item.position) {
                item.position = { x: offsetX, y: offsetY };

                itemsInRow++;
                if (itemsInRow >= maxItemsPerRow) {
                  offsetX = 500;
                  offsetY += 150;
                  itemsInRow = 0;
                } else {
                  offsetX += 200;
                }
              }
            });
          }
        }

        setExternalServiceItems(externalItems);
      } catch (error) {
        console.error('Failed to fetch cross-service connections:', error);
      }
    };

    // Skip in shared view
    if (isSharedView) {
      return;
    }

    fetchCrossServiceConnections();
  }, [service?.id, workspaceId, isSharedView]);

  // Listen for external service item status updates using SocketContext
  const { socket } = useSocket();

  useEffect(() => {
    // Skip in shared view
    if (isSharedView) {
      return;
    }

    if (!socket || !service?.id || !workspaceId) return;

    const handleStatusUpdate = async (data) => {
      // ONLY handle updates jika ini untuk service yang SEDANG AKTIF
      // JANGAN refresh external items hanya karena item di service lain berubah
      if (data.workspaceId !== workspaceId) return;
      if (data.serviceId !== service.id) return; // ← KEY: Only handle if SAME service

      // Refresh cross-service connections to get updated external item statuses
      try {
        const positionsResponse = await api.get(`/external-item-positions/service/${service.id}`, {
          params: { workspaceId }
        });
        const positions = {};
        positionsResponse.data.forEach(pos => {
          positions[pos.external_service_item_id] = pos.position;
        });
        setExternalItemPositions(positions);

        const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
        const connections = response.data;
        const relevantConnections = connections.filter(conn => {
          const isRelevant = conn.source_service_id === service.id || conn.target_service_id === service.id;
          return isRelevant;
        });

        setCrossServiceConnections(relevantConnections);
        setCrossServiceUpdateKey(prev => prev + 1);

        const externalItems = [];
        const externalItemIds = new Set();
        const itemsNeedingAutoLayout = [];

        relevantConnections.forEach(conn => {
            const isSourceLocal = conn.source_service_id === service.id;

            if (isSourceLocal) {
              if (!externalItemIds.has(conn.target_service_item_id)) {
                const savedPosition = positions[conn.target_service_item_id];
                const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);

                if (!hasExplicitPosition) {
                  itemsNeedingAutoLayout.push(conn.target_service_item_id);
                }

                externalItems.push({
                  id: conn.target_service_item_id,
                  name: conn.target_name,
                  type: conn.target_type,
                  status: conn.target_status,
                  cmdbItemId: conn.target_cmdb_item_id,
                  serviceId: conn.target_service_id,
                  serviceName: conn.target_service_name || 'Unknown Service',
                  cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                  position: hasExplicitPosition ? savedPosition : null,
                });
                externalItemIds.add(conn.target_service_item_id);
              }
            } else {
              if (!externalItemIds.has(conn.source_service_item_id)) {
                const savedPosition = positions[conn.source_service_item_id];
                const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);

                if (!hasExplicitPosition) {
                  itemsNeedingAutoLayout.push(conn.source_service_item_id);
                }

                externalItems.push({
                  id: conn.source_service_item_id,
                  name: conn.source_name,
                  type: conn.source_type,
                  status: conn.source_status,
                  cmdbItemId: conn.source_cmdb_item_id,
                  serviceId: conn.source_service_id,
                  serviceName: conn.source_service_name || 'Unknown Service',
                  cmdbItemName: conn.source_cmdb_item_name || 'Unknown CMDB Item',
                  position: hasExplicitPosition ? savedPosition : null,
                });
                externalItemIds.add(conn.source_service_item_id);
              }
            }
          });

          // Batch auto-layout jika needed
          if (itemsNeedingAutoLayout.length > 0) {
            try {
              const autoLayoutResponse = await api.post('/external-item-positions/batch-auto-layout', {
                workspaceId: workspaceId,
                serviceId: service.id,
                externalServiceItemIds: itemsNeedingAutoLayout
              });

              autoLayoutResponse.data.forEach(pos => {
                positions[pos.external_service_item_id] = pos.position;
              });

              externalItems.forEach(item => {
                if (!item.position) {
                  item.position = positions[item.id];
                }
              });
            } catch (autoLayoutErr) {
              console.error('Failed to auto-layout:', autoLayoutErr);
            }
          }

          setExternalServiceItems(externalItems);
        } catch (error) {
          console.error('Failed to refresh cross-service connections:', error);
        }
      };

    socket.on('service_item_status_update', handleStatusUpdate);

    return () => {
      socket.off('service_item_status_update', handleStatusUpdate);
    };
  }, [socket, service?.id, workspaceId, isSharedView]); // Add isSharedView dependency

  // Listen for cross-service connection updates (create/update/delete)
  useEffect(() => {
    // Skip in shared view
    if (isSharedView) {
      return;
    }

    if (!socket || !service?.id || !workspaceId) return;

    const handleCrossServiceConnectionUpdate = async (data) => {
      // Only care about updates in the same workspace
      if (data.workspaceId !== workspaceId) return;

      // Only care if it involves this service (either as source or target)
      if (data.sourceServiceId !== service.id && data.targetServiceId !== service.id) return;

      try {
        // Fetch external item positions
        const positionsResponse = await api.get(`/external-item-positions/service/${service.id}`, {
          params: { workspaceId }
        });
        const positions = {};
        positionsResponse.data.forEach(pos => {
          positions[pos.external_service_item_id] = pos.position;
        });
        setExternalItemPositions(positions);

        // Fetch cross-service edge handles
        // Filter hanya handles yang relevan untuk service ini (viewing service)
        const edgeHandlesResponse = await api.get(`/cross-service-connections/edge-handles/workspace/${workspaceId}`);
        const edgeHandlesMap = {};
        edgeHandlesResponse.data.forEach(handle => {
          // Hanya gunakan handle yang dibuat dari viewing service ini
          // atau handle yang belum punya viewing_service_id (backward compatibility)
          if (!handle.viewing_service_id || handle.viewing_service_id === service.id) {
            edgeHandlesMap[handle.edge_id] = {
              sourceHandle: handle.source_handle,
              targetHandle: handle.target_handle
            };
          }
        });
        setCrossServiceEdgeHandles(edgeHandlesMap);

        // Fetch updated cross-service connections
        const response = await api.get(`/cross-service-connections/workspace/${workspaceId}`);
        const connections = response.data;

        // Filter connections that involve this service
        const relevantConnections = connections.filter(conn => {
          const isRelevant = conn.source_service_id === service.id || conn.target_service_id === service.id;
          return isRelevant;
        });
        setCrossServiceConnections(relevantConnections);
        setCrossServiceUpdateKey(prev => prev + 1);

        // Fetch external service items
        const externalItems = [];
        const externalItemIds = new Set();

        relevantConnections.forEach(conn => {
          const isSourceLocal = conn.source_service_id === service.id;

          if (isSourceLocal) {
            if (!externalItemIds.has(conn.target_service_item_id)) {
              const savedPosition = positions[conn.target_service_item_id];
              const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);
              externalItems.push({
                id: conn.target_service_item_id,
                name: conn.target_name,
                type: conn.target_type,
                status: conn.target_status,
                cmdbItemId: conn.target_cmdb_item_id,
                serviceId: conn.target_service_id,
                serviceName: conn.target_service_name || 'Unknown Service',
                cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                position: hasExplicitPosition ? savedPosition : null,
              });
              externalItemIds.add(conn.target_service_item_id);
            }
          } else {
            if (!externalItemIds.has(conn.source_service_item_id)) {
              const savedPosition = positions[conn.source_service_item_id];
              const hasExplicitPosition = savedPosition && (savedPosition.x !== 0 || savedPosition.y !== 0);
              externalItems.push({
                id: conn.source_service_item_id,
                name: conn.source_name,
                type: conn.source_type,
                status: conn.source_status,
                cmdbItemId: conn.source_cmdb_item_id,
                serviceId: conn.source_service_id,
                serviceName: conn.source_service_name || 'Unknown Service',
                cmdbItemName: conn.target_cmdb_item_name || 'Unknown CMDB Item',
                position: hasExplicitPosition ? savedPosition : null,
              });
              externalItemIds.add(conn.source_service_item_id);
            }
          }
        });

        setExternalServiceItems(externalItems);
      } catch (error) {
        console.error('Failed to refresh cross-service connections after update:', error);
      }
    };

    socket.on('cross_service_connection_update', handleCrossServiceConnectionUpdate);

    return () => {
      socket.off('cross_service_connection_update', handleCrossServiceConnectionUpdate);
    };
  }, [socket, service?.id, workspaceId]);

  // Update nodes when items or groups change
  useEffect(() => {
    // Skip if data hasn't actually changed
    const itemsChanged = JSON.stringify(prevItemsRef.current) !== JSON.stringify(items);
    const groupsChanged = JSON.stringify(prevGroupsRef.current) !== JSON.stringify(groups);

    const flowNodes = [];

    // Create group nodes first
    groups.forEach(group => {
      const groupItems = items
        .filter(item => item.group_id === group.id)
        .sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));

      const itemCount = groupItems.length;
      const { itemsPerRow, itemWidth, itemHeight, gapX, gapY, padding, paddingRight, headerHeight } = DIMENSIONS;
      const rows = Math.ceil(itemCount / itemsPerRow);
      const colCount = Math.min(itemsPerRow, itemCount);
      // Width: gunakan rumus yang sama dengan positioning: padding + colCount * (itemWidth + gapX) + padding
      const width = Math.max(200, padding + colCount * (itemWidth + gapX) + padding + paddingRight);
      const height = Math.max(150, headerHeight + padding * 2 + rows * (itemHeight + gapY));

      const groupPos = parsePosition(group.position);

      flowNodes.push({
        id: `service-group-${group.id}`,
        type: 'serviceGroup',
        position: groupPos,
        draggable: !isSharedView,
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
          borderRadius: '8px',
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
          draggable: !isSharedView,
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
        draggable: !isSharedView,
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

    // Add/update external nodes with saved positions (without filtering)
    setNodes(currentNodes => {
      const updatedNodes = [...currentNodes];
      const externalNodeIds = new Set();

      // Calculate bounding box of existing nodes (local nodes only)
      let maxX = 0;
      let maxY = 0;
      currentNodes.forEach(node => {
        if (!node.parentNode && !node.data?.isExternal) {
          // Use data.width/height for service groups, style.width/height for others
          const nodeWidth = node.data?.width || node.style?.width || 160;
          const nodeHeight = node.data?.height || node.style?.height || 80;

          // Parse width/height if they're strings (e.g., "500px")
          const width = typeof nodeWidth === 'string' ? parseInt(nodeWidth, 10) || 160 : nodeWidth;
          const height = typeof nodeHeight === 'string' ? parseInt(nodeHeight, 10) || 80 : nodeHeight;

          const nodeRight = node.position.x + width;
          const nodeBottom = node.position.y + height;
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
        // ✅ FIXED: Only auto-layout if position is null (allow {x: 0, y: 0} as valid position)
        const needsAutoLayout = nodePosition === null;

        if (needsAutoLayout) {
          // Check cache first for stable auto-layout positions
          const itemId = String(externalItem.id);
          if (autoLayoutedPositionsRef.current.has(itemId)) {
            nodePosition = autoLayoutedPositionsRef.current.get(itemId);
          } else {
            // Calculate new position and cache it
            nodePosition = { x: offsetX, y: offsetY };
            autoLayoutedPositionsRef.current.set(itemId, nodePosition);

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
        }

        if (!existingNode) {
          // Create new external node
          updatedNodes.push({
            id: String(externalItem.id),
            type: 'custom',
            position: nodePosition,
            draggable: !isSharedView, // External nodes are now draggable!
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
              isSharedView: isSharedView || false, // ✅ FIX: Pass isSharedView flag
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
          // Update existing external node with latest data
          const nodeIndex = updatedNodes.findIndex(n => n.id === String(externalItem.id));
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex].position = nodePosition;
            updatedNodes[nodeIndex].draggable = true; // Ensure it's draggable
            // Update all data fields with latest values
            updatedNodes[nodeIndex].data = {
              ...updatedNodes[nodeIndex].data,
              label: externalItem.name,
              name: externalItem.name,
              type: externalItem.type,
              status: externalItem.status, // This is the key update!
              externalSource: {
                serviceName: externalItem.serviceName,
                cmdbItemName: externalItem.cmdbItemName,
                serviceId: externalItem.serviceId,
                cmdbItemId: externalItem.cmdbItemId,
              },
            };
          }
          externalNodeIds.add(String(externalItem.id));
        }
      });

      // Log external nodes positioning result
      const createdExternalNodes = [];
      const updatedExternalNodes = [];
      const autoLayoutedExternalNodes = [];

      externalServiceItems.forEach(externalItem => {
        const itemId = String(externalItem.id);
        const node = updatedNodes.find(n => n.id === itemId);
        const wasExisting = currentNodes.find(n => n.id === itemId);

        if (node) {
          const position = node.position;
          const wasAutoLayouted = autoLayoutedPositionsRef.current.has(itemId);

          if (!wasExisting) {
            createdExternalNodes.push({
              id: itemId,
              name: externalItem.name,
              position,
              wasAutoLayouted,
              source: externalItem.position ? 'saved' : 'auto-layout'
            });
          } else {
            updatedExternalNodes.push({
              id: itemId,
              name: externalItem.name,
              position,
              wasAutoLayouted,
              source: externalItem.position ? 'saved' : 'auto-layout'
            });
          }

          if (wasAutoLayouted) {
            autoLayoutedExternalNodes.push({
              id: itemId,
              name: externalItem.name,
              position
            });
          }
        }
      });

      // Remove external nodes that are no longer connected
      const currentExternalNodeIds = new Set(externalServiceItems.map(item => String(item.id)));
      const filteredNodes = updatedNodes.filter(node => {
        // Remove external nodes that are no longer connected
        if (node.data?.isExternal && !currentExternalNodeIds.has(node.id)) {
          return false;
        }
        return true;
      });

      return filteredNodes;
    });

    // Update refs
    prevCrossServiceConnectionsRef.current = crossServiceConnections;
    prevExternalServiceItemsRef.current = externalServiceItems;
  }, [crossServiceConnections, externalServiceItems]);

  // Toggle external nodes visibility
  useEffect(() => {
    if (showExternalNodes) {
      // Add external nodes to state
      setNodes(currentNodes => {
        const hasExternalNodes = currentNodes.some(node => node.data?.isExternal);
        if (hasExternalNodes) {
          return currentNodes; // Already has external nodes
        }

        // Recreate external nodes from externalServiceItems
        const externalNodes = externalServiceItems.map(externalItem => {
          // Use saved position or calculate auto-layout position
          let nodePosition = externalItem.position;
          if (!nodePosition || (nodePosition.x === 0 && nodePosition.y === 0)) {
            // For new items without saved position, use default
            nodePosition = { x: 0, y: 0 };
          }

          return {
            id: String(externalItem.id),
            type: 'custom',
            position: nodePosition,
            draggable: !isSharedView,
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
              isSharedView: isSharedView || false, // ✅ FIX: Pass isSharedView flag
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
          };
        });

        return [...currentNodes, ...externalNodes];
      });

      // Trigger edge update by incrementing crossServiceUpdateKey
      // This will cause the useEffect for edges to re-run and recreate cross-service edges
      setCrossServiceUpdateKey(prev => prev + 1);
    } else {
      // Remove external nodes from state
      setNodes(currentNodes => currentNodes.filter(node => !node.data?.isExternal));

      // Remove cross-service edges (edges connected to external nodes)
      setEdges(currentEdges => {
        const externalNodeIds = new Set(externalServiceItems.map(item => String(item.id)));
        return currentEdges.filter(edge => {
          return !externalNodeIds.has(edge.source) && !externalNodeIds.has(edge.target);
        });
      });
    }
  }, [showExternalNodes, externalServiceItems]);

  // Update node data untuk visual feedback saat group di-hover
  useEffect(() => {
    if (!hoveredGroup) {
      // Reset semua group isHovered flag
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.type === 'serviceGroup') {
          return {
            ...n,
            data: { ...n.data, isHovered: false }
          };
        }
        return n;
      }));
    } else {
      // Set isHovered flag untuk group yang di-hover
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.id === hoveredGroup) {
          return {
            ...n,
            data: { ...n.data, isHovered: true }
          };
        } else if (n.type === 'serviceGroup') {
          return {
            ...n,
            data: { ...n.data, isHovered: false }
          };
        }
        return n;
      }));
    }
  }, [hoveredGroup, setNodes]);

  // Update edges when connections change
  useEffect(() => {
    // Use ref for edgeHandles to avoid stale closures
    const currentEdgeHandles = edgeHandles;
    const currentCrossServiceEdgeHandles = crossServiceEdgeHandlesRef.current;

    // Skip if data hasn't actually changed (but allow first render)
    const isFirstRender = prevConnectionsRef.current === null;
    const connectionsChanged = isFirstRender || JSON.stringify(prevConnectionsRef.current) !== JSON.stringify(connections);
    const groupConnectionsChanged = isFirstRender || JSON.stringify(prevGroupConnectionsRef.current) !== JSON.stringify(groupConnections);
    const edgeHandlesChanged = isFirstRender || JSON.stringify(prevEdgeHandlesRef.current) !== JSON.stringify(currentEdgeHandles);

    // For cross-service data, always update when useEffect is triggered (React handles dependency changes)
    const crossServiceConnectionsChanged = isFirstRender || true;
    const crossServiceEdgeHandlesChanged = isFirstRender || true;

    const itemEdges = connections.map(conn => {
      const edgeId = `e${conn.source_id}-${conn.target_id}`;
      const handleConfig = edgeHandles[edgeId];
      const connectionType = conn.connection_type || 'depends_on';

      // Get source item to determine edge color based on status
      const sourceItem = items.find(item => item.id === conn.source_id);
      const sourceStatus = sourceItem?.status || 'active';

      // Edge color based on source item status (not connection type)
      const getEdgeColor = (status) => {
        switch (status) {
          case 'active': return '#10b981';      // green-500
          case 'inactive': return '#ef4444';    // red-500
          case 'maintenance': return '#f59e0b';  // amber-500
          case 'disabled': return '#9ca3af';    // gray-400
          case 'decommissioned': return '#9ca3af'; // gray-400
          default: return '#10b981';
        }
      };

      // Determine if we need to show cross marker (for inactive/maintenance status)
      const showCrossMarker = sourceStatus === 'inactive' || sourceStatus === 'maintenance' || sourceStatus === 'decommissioned';
      const edgeColor = getEdgeColor(sourceStatus);

      const edgeConfig = {
        id: edgeId,
        source: String(conn.source_id),
        target: String(conn.target_id),
        // DEFAULT: Ubah dari kanan-kiri ke atas-bawah
        sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-bottom',
        targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-bottom',
        type: 'smoothstep',
        animated: false,
        style: { stroke: edgeColor, strokeWidth: 2 },
        zIndex:10,
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
        },
        data: {
          connectionType: connectionType,
          sourceStatus: sourceStatus,
        },
      };

      // Add cross marker if needed (for inactive/maintenance status)
      if (showCrossMarker) {
        edgeConfig.label = '✕';
        edgeConfig.labelStyle = {
          fontSize: 18,
          fontWeight: 'bold',
          fill: edgeColor,
        };
        edgeConfig.labelBgStyle = {
          fill: 'transparent',
          fillOpacity: 0,
        };
        edgeConfig.labelBgPadding = [0, 0];
      } else if (showEdgeLabels) {
        // Show connection type label if edge labels are enabled
        const typeLabel = connectionType ? connectionType.replace(/_/g, ' ').toUpperCase() : '';
        if (typeLabel) {
          edgeConfig.label = typeLabel;
          edgeConfig.labelStyle = {
            fontSize: 9,
            fontWeight: 500,
            fill: edgeColor,
          };
          edgeConfig.labelBgStyle = {
            fill: 'white',
            fillOpacity: 0.8,
          };
          edgeConfig.labelBgPadding = [4, 4];
        }
      }

      return edgeConfig;
    });

    const groupToGroupEdges = groupConnections
      .filter(conn => conn.source_id && conn.target_id)
      .map(conn => {
        const edgeId = `service-group-e${conn.source_id}-${conn.target_id}`;
        const handleConfig = edgeHandles[edgeId];

        // Get source group info to determine status
        const sourceGroup = groups.find(g => g.id === conn.source_id);
        const groupColor = '#f59e0b'; // Default orange for group-to-group

        return {
          id: edgeId,
          source: `service-group-${conn.source_id}`,
          target: `service-group-${conn.target_id}`,
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-right',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-left',
          type: 'smoothstep',
          animated: false,
          style: { stroke: groupColor, strokeWidth: 2, strokeDasharray: '5,5' },
          markerEnd: {
            type: 'arrowclosed',
            color: groupColor,
          },
        };
      });

    const groupToItemEdges = groupConnections
      .filter(conn => conn.source_group_id && conn.target_item_id)
      .map(conn => {
        const edgeId = `service-group-item-e${conn.source_group_id}-${conn.target_item_id}`;
        const handleConfig = edgeHandles[edgeId];

        // Get target item to determine status
        const targetItem = items.find(item => item.id === conn.target_item_id);
        const targetStatus = targetItem?.status || 'active';
        const edgeColor = targetStatus === 'active' ? '#8b5cf6' : targetStatus === 'inactive' ? '#ef4444' : targetStatus === 'maintenance' ? '#f59e0b' : '#9ca3af';
        const showCrossMarker = targetStatus !== 'active';

        const edgeConfig = {
          id: edgeId,
          source: `service-group-${conn.source_group_id}`,
          target: String(conn.target_item_id),
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-bottom',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: edgeColor, strokeWidth: 2 },
          markerEnd: {
            type: 'arrowclosed',
            color: edgeColor,
          },
        };

        // Add cross marker if target item is not active
        if (showCrossMarker) {
          edgeConfig.label = '✕';
          edgeConfig.labelStyle = {
            fontSize: 18,
            fontWeight: 'bold',
            fill: edgeColor,
          };
          edgeConfig.labelBgStyle = {
            fill: 'transparent',
            fillOpacity: 0,
          };
          edgeConfig.labelBgPadding = [0, 0];
        }

        return edgeConfig;
      });

    const itemToGroupEdges = groupConnections
      .filter(conn => conn.source_id && conn.target_group_id)
      .map(conn => {
        const edgeId = `service-item-group-e${conn.source_id}-${conn.target_group_id}`;
        const handleConfig = edgeHandles[edgeId];

        // Get source item to determine status
        const sourceItem = items.find(item => item.id === conn.source_id);
        const sourceStatus = sourceItem?.status || 'active';
        const edgeColor = sourceStatus === 'active' ? '#ec4899' : sourceStatus === 'inactive' ? '#ef4444' : sourceStatus === 'maintenance' ? '#f59e0b' : '#9ca3af';
        const showCrossMarker = sourceStatus !== 'active';

        const edgeConfig = {
          id: edgeId,
          source: String(conn.source_id),
          target: `service-group-${conn.target_group_id}`,
          sourceHandle: (handleConfig && handleConfig.sourceHandle) || 'source-right',
          targetHandle: (handleConfig && handleConfig.targetHandle) || 'target-top',
          type: 'smoothstep',
          animated: false,
          style: { stroke: edgeColor, strokeWidth: 2, strokeDasharray: '3,3' },
          markerEnd: {
            type: 'arrowclosed',
            color: edgeColor,
          },
        };

        // Add cross marker if source item is not active
        if (showCrossMarker) {
          edgeConfig.label = '✕';
          edgeConfig.labelStyle = {
            fontSize: 18,
            fontWeight: 'bold',
            fill: edgeColor,
          };
          edgeConfig.labelBgStyle = {
            fill: 'transparent',
            fillOpacity: 0,
          };
          edgeConfig.labelBgPadding = [0, 0];
        }

        return edgeConfig;
      });

    // Calculate propagated statuses for cross-service connections
    const crossServiceEdgeStatuses = calculateCrossServicePropagatedStatuses(
      items,
      crossServiceConnections,
      externalServiceItems,
      isSharedView // ✅ FIX: Pass isSharedView flag
    );

    // Helper function to get best handle positions - considering child node absolute positions
    // This is CRITICAL for cross-service connections between child nodes and external nodes
    const getBestHandlePositionsForCrossService = (sourceId, targetId) => {
      const sourceNode = nodesRef.current.find(n => n.id === sourceId);
      const targetNode = nodesRef.current.find(n => n.id === targetId);

      if (!sourceNode || !targetNode) {
        console.warn('⚠️ [HANDLE CALC] Nodes not found:', {
          sourceId,
          targetId,
          sourceFound: !!sourceNode,
          targetFound: !!targetNode
        });
        return { sourceHandle: 'source-right', targetHandle: 'target-left' };
      }

      const sourceParentId = sourceNode.parentNode;
      const targetParentId = targetNode.parentNode;

      // Calculate absolute positions for child nodes
      let sourceAbsX = sourceNode.position.x;
      let sourceAbsY = sourceNode.position.y;
      let targetAbsX = targetNode.position.x;
      let targetAbsY = targetNode.position.y;

      // If source is child node, add parent position
      if (sourceParentId) {
        const sourceParent = nodesRef.current.find(n => n.id === sourceParentId);
        if (sourceParent) {
          sourceAbsX += sourceParent.position.x;
          sourceAbsY += sourceParent.position.y;
        }
      }

      // If target is child node, add parent position
      if (targetParentId) {
        const targetParent = nodesRef.current.find(n => n.id === targetParentId);
        if (targetParent) {
          targetAbsX += targetParent.position.x;
          targetAbsY += targetParent.position.y;
        }
      }

      const dx = targetAbsX - sourceAbsX;
      const dy = targetAbsY - sourceAbsY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const result = absDx > absDy
        ? (dx > 0
            ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
            : { sourceHandle: 'source-left', targetHandle: 'target-right' })
        : (dy > 0
            ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
            : { sourceHandle: 'source-top', targetHandle: 'target-bottom' });

      return result;
    };

    // Add cross-service edges with connection type styling and status propagation
    const crossServiceEdges = crossServiceConnections.map((conn, index) => {
      const edgeId = `cross-service-${conn.source_service_item_id}-${conn.target_service_item_id}`;
      const connectionType = connectionTypes.find(ct => ct.type_slug === conn.connection_type);

      // Get saved edge handles or use defaults
      // Check both formats: new format with item IDs and legacy format with connection ID
      let handleConfig = currentCrossServiceEdgeHandles[edgeId];
      if (!handleConfig && conn.id) {
        const legacyEdgeId = `cross-service-connection-${conn.id}`;
        handleConfig = currentCrossServiceEdgeHandles[legacyEdgeId];
      }

      // Calculate best handle positions if no saved handles
      let sourceHandle, targetHandle;
      let handleSource = 'none';
      if (handleConfig && handleConfig.sourceHandle && handleConfig.targetHandle) {
        sourceHandle = handleConfig.sourceHandle;
        targetHandle = handleConfig.targetHandle;
        handleSource = 'saved';
      } else {
        // Calculate optimal handle positions based on node positions
        const bestHandles = getBestHandlePositionsForCrossService(
          String(conn.source_service_item_id),
          String(conn.target_service_item_id)
        );
        sourceHandle = bestHandles.sourceHandle;
        targetHandle = bestHandles.targetHandle;
        handleSource = 'calculated';
      }

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

      // Calculate unique z-index to prevent edge stacking issues
      // Propagated edges get higher z-index (100-999), normal edges get lower (0-99)
      const baseZIndex = isPropagated ? 100 : 0;
      const uniqueZIndex = baseZIndex + (index % 100);

      const baseStyle = {
        strokeWidth: isPropagated ? 3 : 2,
        stroke: strokeColor,
      };

      // Add dash array for certain connection types
      if (conn.connection_type === 'related_to') {
        baseStyle.strokeDasharray = '5,5';
      }

      const edge = {
        id: edgeId,
        key: `${edgeId}-${crossServiceUpdateKey}`, // Add stable key to prevent React reusing components
        source: String(conn.source_service_item_id),
        target: String(conn.target_service_item_id),
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: 'smoothstep',
        animated: true, // Re-enable animation for cross-service edges
        style: baseStyle,
        zIndex: uniqueZIndex,
        label: showCrossMarker ? '✕' : (showEdgeLabels ? (connectionType?.label || '') : ''),
        labelStyle: {
          fontSize: showCrossMarker ? 20 : 10,
          fontWeight: showCrossMarker ? 'bold' : 600,
          fill: strokeColor,
        },
        labelBgStyle: showCrossMarker ? {
          fill: 'transparent',
          fillOpacity: 0,
        } : undefined,
        labelBgPadding: showCrossMarker ? [0, 0] : undefined,
        markerEnd: {
          type: 'arrowclosed',
          color: strokeColor,
        },
        // Store service IDs for edge handle saving
        data: {
          sourceServiceId: conn.source_service_id,
          targetServiceId: conn.target_service_id,
          isCrossService: true,
          edgeIndex: index, // Store index for debugging
          ...(edgeStatusInfo && isPropagated ? {
            isPropagated: true,
            propagatedFrom: edgeStatusInfo.propagatedFrom,
            propagatedStatus: edgeStatusInfo.propagatedStatus,
          } : {})
        }
      };
      return edge;
    });

    setEdges([...itemEdges, ...groupToGroupEdges, ...groupToItemEdges, ...itemToGroupEdges, ...crossServiceEdges]);

    // Update refs
    prevConnectionsRef.current = connections;
    prevGroupConnectionsRef.current = groupConnections;
    prevEdgeHandlesRef.current = edgeHandles;
    prevCrossServiceEdgeHandlesRef.current = crossServiceEdgeHandles;
  }, [connections, groupConnections, edgeHandles, crossServiceConnections, crossServiceEdgeHandles, connectionTypes, crossServiceUpdateKey, items, externalServiceItems, showEdgeLabels]);

  const handleOpenAddModal = useCallback(() => {
    if (isSharedView) {
      toast.info('View-only mode: Cannot add items in shared view');
      return;
    }
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
  }, [isSharedView]);

  const handleOpenManageGroups = useCallback(() => {
    if (isSharedView) {
      toast.info('🔒 View-only mode: Cannot manage groups in shared view');
      return;
    }
    setGroupFormData(INITIAL_GROUP_FORM);
    setEditGroupMode(false);
    setCurrentGroupId(null);
    setShowGroupModal(true);
  }, [isSharedView]);

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
    setSelectedConnectionItem(item); // Use same state as service connections
    setShowConnectionModal(true);
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

  // Handler for drag-to-connect (Quick Connection Modal)
  const handleConnect = useCallback((connection) => {
    // Detect if source or target is a group
    const isSourceGroup = String(connection.source).startsWith('service-group-');
    const isTargetGroup = String(connection.target).startsWith('service-group-');

    let sourceItem, targetItem, sourceGroup, targetGroup;

    if (isSourceGroup) {
      const sourceGroupId = Number(String(connection.source).replace('service-group-', ''));
      sourceGroup = groups.find(g => g.id === sourceGroupId);
    } else {
      sourceItem = items.find(item => item.id === Number(connection.source));
    }

    if (isTargetGroup) {
      const targetGroupId = Number(String(connection.target).replace('service-group-', ''));
      targetGroup = groups.find(g => g.id === targetGroupId);
    } else {
      targetItem = items.find(item => item.id === Number(connection.target));
    }

    // Check if we have valid source and target
    if ((!sourceItem && !sourceGroup) || (!targetItem && !targetGroup)) {
      return;
    }

    // Check if connection already exists
    let existingConn = null;
    if (sourceItem && targetItem) {
      // Item-to-item
      existingConn = connections.find(
        conn => conn.source_id === sourceItem.id && conn.target_id === targetItem.id
      );
    } else if (sourceItem && targetGroup) {
      // Item-to-group
      existingConn = groupConnections.find(
        conn => conn.source_id === sourceItem.id && conn.target_group_id === targetGroup.id
      );
    } else if (sourceGroup && targetItem) {
      // Group-to-item
      existingConn = groupConnections.find(
        conn => conn.source_group_id === sourceGroup.id && conn.target_id === targetItem.id
      );
    } else if (sourceGroup && targetGroup) {
      // Group-to-group - not supported in quick connection yet
      toast.info('Gunakan Group Connection Modal untuk koneksi group-to-group');
      return;
    }

    if (existingConn) {
      toast.error('Koneksi sudah ada!');
      return;
    }

    // Set source and target (can be item or group)
    setQuickConnectionSource(sourceItem || sourceGroup);
    setQuickConnectionTarget(targetItem || targetGroup);
    setQuickConnectionMode('create');
    setQuickConnectionExistingType(null);
    setShowQuickConnectionModal(true);
  }, [items, connections, groups, groupConnections]);

  const handleSaveQuickConnection = useCallback(async (connectionType) => {
    if (!quickConnectionSource || !quickConnectionTarget || !service?.id || !workspaceId) return;

    try {
      // Detect if source or target is a group
      const isSourceGroup = quickConnectionSource.color !== undefined; // Groups have color property
      const isTargetGroup = quickConnectionTarget.color !== undefined;

      if (quickConnectionMode === 'edit') {
        // Update existing connection
        if (!isSourceGroup && !isTargetGroup) {
          // Item-to-item
          await api.put(`/services/${service.id}/connections/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Tipe koneksi berhasil diubah!');
        } else if (isSourceGroup && !isTargetGroup) {
          // Group-to-item
          await api.put(`/service-groups/connections/from-group/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
            service_id: service.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Tipe koneksi group-to-item berhasil diubah!');
        } else if (!isSourceGroup && isTargetGroup) {
          // Item-to-group
          await api.put(`/service-groups/connections/to-group/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
            service_id: service.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Tipe koneksi item-to-group berhasil diubah!');
        } else {
          toast.error('Edit koneksi group-to-group: Gunakan Group Connection Modal.');
        }
      } else {
        // Create new connection
        if (isSourceGroup && isTargetGroup) {
          // Group-to-group - use group connection endpoint
          await api.post('/service-groups/connections', {
            service_id: service.id,
            source_id: quickConnectionSource.id,
            target_id: quickConnectionTarget.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Koneksi group-to-group berhasil dibuat!');
        } else if (isSourceGroup && !isTargetGroup) {
          // Group-to-item
          await api.post('/service-groups/connections/from-group', {
            service_id: service.id,
            source_group_id: quickConnectionSource.id,
            target_id: quickConnectionTarget.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Koneksi group-to-item berhasil dibuat!');
        } else if (!isSourceGroup && isTargetGroup) {
          // Item-to-group
          await api.post('/service-groups/connections/to-group', {
            service_id: service.id,
            source_id: quickConnectionSource.id,
            target_group_id: quickConnectionTarget.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Koneksi item-to-group berhasil dibuat!');
        } else {
          // Item-to-item
          await api.post(`/services/${service.id}/connections`, {
            source_id: quickConnectionSource.id,
            target_id: quickConnectionTarget.id,
            workspace_id: workspaceId,
            connection_type: connectionType,
            propagation: getConnectionPropagation(connectionType)
          });
          toast.success('Koneksi berhasil dibuat!');
        }
      }

      await fetchAll();
      setShowQuickConnectionModal(false);
      setQuickConnectionSource(null);
      setQuickConnectionTarget(null);
    } catch (err) {
      console.error('Save connection error:', err);
      toast.error('Gagal menyimpan koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [quickConnectionSource, quickConnectionTarget, quickConnectionMode, service?.id, workspaceId, fetchAll, getConnectionPropagation]);

  // Edge Context Menu handlers
  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();

    // Prevent context menu on pane click
    if (!edge) return;

    // Only handle service item edges (not cross-service edges)
    if (edge.id.startsWith('cross-service-')) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // Get existing connection type from edge data
    const existingConnectionType = edge.data?.connectionType || 'depends_on';

    setEdgeContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      edge,
      sourceNode,
      targetNode,
      existingConnectionType
    });
  }, [nodes]);

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  const handleEditEdgeConnectionType = useCallback(() => {
    if (!edgeContextMenu.edge) return;

    const { edge, sourceNode, targetNode, existingConnectionType } = edgeContextMenu;

    // Open QuickConnectionModal in edit mode
    // Node objects already have all the properties we need (id, type, data.name, etc.)
    setQuickConnectionSource(sourceNode || null);
    setQuickConnectionTarget(targetNode || null);
    setQuickConnectionMode('edit');
    setQuickConnectionExistingType(existingConnectionType);
    setShowQuickConnectionModal(true);

    closeEdgeContextMenu();
  }, [edgeContextMenu, closeEdgeContextMenu]);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu.edge) return;

    const { edge } = edgeContextMenu;

    try {
      // Parse edge ID to get source and target IDs
      // Edge ID format: "e{source_id}-{target_id}"
      const match = edge.id.match(/^e(\d+)-(\d+)$/);
      if (!match) {
        toast.error('Format edge ID tidak valid');
        return;
      }

      const [, sourceId, targetId] = match;

      await api.delete(`/services/${service.id}/connections/${sourceId}/${targetId}`);
      toast.success('Koneksi berhasil dihapus');

      await fetchAll();
      closeEdgeContextMenu();
    } catch (err) {
      console.error('Delete edge error:', err);
      toast.error('Gagal menghapus koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [edgeContextMenu, service?.id, fetchAll, closeEdgeContextMenu]);

  // Drag handlers for reordering items in groups
  const onNodeDragStart = useCallback((event, node) => {
    // Handle semua node drag, bukan hanya yang punya parentNode
    if (node.type === 'custom') { // Hanya item yang bisa di-drag
      setDraggedNode(node.id);

      // Set isReorderingInGroup hanya jika node sudah dalam group (reorder, bukan pindah ke group baru)
      setIsReorderingInGroup(!!node.parentNode);

      dragStateRef.current = { isDragging: true, startTime: Date.now(), originalParentId: node.parentNode };
    }
  }, []);

  // Helper function untuk mendeteksi collision dengan group
  const checkGroupCollision = useCallback((nodePosition, nodeSize) => {
    const currentNodes = nodesRef.current;
    const groups = currentNodes.filter(n => n.type === 'serviceGroup');

    for (const group of groups) {
      const groupWidth = group.data?.width || 200;
      const groupHeight = group.data?.height || 250;

      // Hitung center dari node
      const nodeCenterX = nodePosition.x + nodeSize.width / 2;
      const nodeCenterY = nodePosition.y + nodeSize.height / 2;

      // Cek jika center node ada dalam bounds group
      if (
        nodeCenterX >= group.position.x &&
        nodeCenterX <= group.position.x + groupWidth &&
        nodeCenterY >= group.position.y &&
        nodeCenterY <= group.position.y + groupHeight
      ) {
        return group;
      }
    }
    return null;
  }, []);

  // Helper untuk menghitung posisi drop dalam group
  const calculateDropPositionInGroup = useCallback((groupNode, draggedNodeId) => {
    const currentNodes = nodesRef.current;
    const { itemsPerRow, itemWidth, itemHeight, gapX, gapY, padding, headerHeight } = DIMENSIONS;

    // Hitung posisi node yang sedang di-drag (absolute position)
    const draggedNodeData = currentNodes.find(n => n.id === draggedNodeId);
    if (!draggedNodeData) return null;

    const nodeAbsoluteX = draggedNodeData.position.x;
    const nodeAbsoluteY = draggedNodeData.position.y;

    // Hitung posisi relatif terhadap group
    const relX = nodeAbsoluteX - groupNode.position.x - padding;
    const relY = nodeAbsoluteY - groupNode.position.y - padding - headerHeight;

    const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gapX))));

    // Calculate row based on fixed item height
    const row = Math.max(0, Math.floor(Math.max(0, relY) / (itemHeight + gapY)));

    const itemsInGroup = currentNodes.filter(n => n.parentNode === groupNode.id && n.id !== draggedNodeId);
    const newIndex = Math.min(row * itemsPerRow + col, itemsInGroup.length);

    const newRow = Math.floor(newIndex / itemsPerRow);
    const newCol = newIndex % itemsPerRow;

    const relativeX = padding + newCol * (itemWidth + gapX);
    const relativeY = headerHeight + padding + newRow * (itemHeight + gapY);

    // Calculate absolute position for hover indicator
    const absoluteX = groupNode.position.x + relativeX;
    const absoluteY = groupNode.position.y + relativeY;

    // Extract numeric group ID dari node ID (e.g., "serviceGroup-10" → 10)
    const groupIdNumeric = parseInt(groupNode.id.toString().replace(/\D/g, ''));
    return {
      groupId: groupNode.id, // Full node ID untuk ReactFlow parentNode
      groupIdNumeric, // Numeric ID untuk database
      index: newIndex,
      relativeX,
      relativeY,
      absoluteX,
      absoluteY,
    };
  }, [DIMENSIONS]);

  const onNodeDrag = useCallback((event, node) => {
    if (!draggedNode || node.id !== draggedNode) return;

    const currentNodes = nodesRef.current;

    // CASE 1: Node sudah dalam group (reorder dalam group yang sama)
    if (node.parentNode) {
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
        setHoveredGroup(node.parentNode); // Set hovered group untuk visual feedback
      }
    } else {
      // CASE 2: Node di luar group, cek collision dengan group
      const nodeSize = {
        width: node.style?.width || DIMENSIONS.itemWidth,
        height: node.style?.height || DIMENSIONS.itemHeight
      };

      const collidedGroup = checkGroupCollision(node.position, nodeSize);

      if (collidedGroup) {
        const dropPosition = calculateDropPositionInGroup(collidedGroup, draggedNode);
        if (dropPosition) {
          setHoverPosition(dropPosition);
          setHoveredGroup(collidedGroup.id); // Set hovered group untuk visual feedback
        }
      } else {
        setHoverPosition(null);
        setHoveredGroup(null); // Clear hovered group
      }
    }
  }, [draggedNode, checkGroupCollision, calculateDropPositionInGroup]);

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
        return;
      }

      // Save item positions
      const itemPromises = nodesToSave
        .filter(node => node.type === 'custom')
        .map(node => {
          // External items: save to external_item_positions table
          if (node.data?.isExternal) {
            return api.post('/external-item-positions', {
              workspaceId: workspaceId,
              serviceId: service.id,
              externalServiceItemId: node.id,
              position: node.position,
              skipRefresh: true  // Prevent socket events to other services
            });
          }
          // Internal items: save to service_items table
          return api.put(`/service-items/items/${node.id}/position`, {
            position: node.position,
            skipRefresh: false  // Allow normal service updates
          });
        });

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
    const originalParentId = dragStateRef.current.originalParentId;
    const isExternalNode = node.data?.isExternal;

    dragStateRef.current = { isDragging: false, startTime: 0, originalParentId: null };

    // Clear hovered group visual feedback dan reordering state
    setHoveredGroup(null);
    setIsReorderingInGroup(false);

    if (dragDuration < 100) {
      setDraggedNode(null);
      setHoverPosition(null);
      return;
    }

    // Save external item position FIRST (before any other logic)
    // External nodes cannot be added to groups, so we always save their position
    if (isExternalNode && service?.id) {
      try {
        // ✅ CRITICAL FIX: Use external item's PARENT service ID, not the viewing service ID
        // When viewing NextJS and moving DB_GATEWAY (from PostgreSQL), we must save with serviceId: PostgreSQL
        // This ensures each service has its own view of external item positions
        const externalItemParentServiceId = node.data.externalSource?.serviceId;

        if (!externalItemParentServiceId) {
          console.error('❌ External item missing parent service ID:', node);
          toast.error('External item missing parent service information');
          setDraggedNode(null);
          setHoverPosition(null);
          return;
        }

        // Use flag untuk mencegah socket refresh di services lain
        // Kita tidak ingin service lain refresh saat kita hanya memindahkan external item
        const response = await api.post('/external-item-positions', {
          workspaceId: workspaceId,
          serviceId: externalItemParentServiceId, // ✅ FIX: Use parent service ID
          externalServiceItemId: node.id,
          position: node.position,
          skipRefresh: true  // Flag untuk backend agar jangan emit socket event
        });

        // Update local state immediately tanpa menunggu refresh
        setExternalItemPositions(prev => ({
          ...prev,
          [node.id]: node.position
        }));

        // Update node position di state
        setNodes(prevNodes => prevNodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              position: node.position
            };
          }
          return n;
        }));

        // Optionally show feedback
        // toast.success('External item position saved!');
      } catch (err) {
        console.error('Failed to save external item position:', err);
        toast.error('Failed to save external item position');
      }

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
      return; // Exit early for external nodes
    }

    if (!draggedNode || !hoverPosition) {
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
        const targetGroupId = hoverPosition.groupId; // Full node ID ("service-group-10")
        const groupIdNumeric = hoverPosition.groupIdNumeric; // Numeric ID (10)
        const isNewGroup = node.parentNode !== targetGroupId;

        // CASE 1: Reorder dalam group yang sama
        if (!isNewGroup && node.parentNode) {
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
        }
        // CASE 2: Pindah ke group baru (dari luar group atau dari group lain)
        else if (targetGroupId) {
          // Validasi: cek apakah group ID valid
          if (isNaN(groupIdNumeric)) {
            toast.error('ID group tidak valid!');
            isReorderingRef.current = false;
            return;
          }

          // Validasi: cek apakah group ada di groups state
          const targetGroup = groups.find(g => g.id === groupIdNumeric);
          if (!targetGroup) {
            toast.error(`Group dengan ID ${groupIdNumeric} tidak ditemukan!`);
            isReorderingRef.current = false;
            return;
          }

          toast.info(`Memindahkan item ke group "${targetGroup.name}"...`);

          // Update item dengan group baru menggunakan PUT (endpoint service items menggunakan PUT)
          await api.put(`/service-items/items/${node.id}`, {
            name: node.data.name || '',
            type: node.data.type || 'server',
            description: node.data.description || '',
            status: node.data.status || 'active',
            ip: node.data.ip || '',
            domain: node.data.domain || '',
            port: node.data.port ? parseInt(node.data.port) : null,  // Convert to int or null
            category: node.data.category || 'internal',
            location: node.data.location || '',
            group_id: hoverPosition.groupIdNumeric, // Numeric ID untuk database
            order_in_group: hoverPosition.index,  // Tambahkan order_in_group
          });

          // Update local state
          setNodes(prevNodes => {
            const updatedNodes = prevNodes.map(n => {
              if (n.id === draggedNode) {
                return {
                  ...n,
                  position: {
                    x: hoverPosition.relativeX,
                    y: hoverPosition.relativeY
                  },
                  parentNode: hoverPosition.groupId, // Full node ID untuk ReactFlow
                  data: {
                    ...n.data,
                    groupId: hoverPosition.groupIdNumeric, // Numeric ID
                    orderInGroup: hoverPosition.index
                  }
                };
              }
              return n;
            });

            nodesRef.current = updatedNodes;
            return updatedNodes;
          });

          toast.success('Item berhasil dipindahkan ke group!');

          // Simpan position baru ke database (hanya untuk internal items)
          // External items tidak bisa masuk group, jadi di-handle terpisah di onNodeDragStop
          if (!node.data?.isExternal) {
            try {
              await api.put(`/service-items/items/${node.id}/position`, {
                position: {
                  x: hoverPosition.relativeX,
                  y: hoverPosition.relativeY
                },
                skipRefresh: false  // Allow normal service updates
              });
            } catch (posErr) {
              console.error('Failed to save position:', posErr);
            }
          }

          // Reset reordering flag - jangan panggil fetchAll() manual, socket akan menanganinya
          isReorderingRef.current = false;
        }

      } catch (err) {
        console.error('Failed to move item:', err);
        toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
        isReorderingRef.current = false;
      } finally {
        setDraggedNode(null);
        setHoverPosition(null);
      }
    }

    // Trigger autosave for position changes
    const shouldAutosave = !draggedNode || !hoverPosition;
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
  }, [draggedNode, hoverPosition, fetchAll, setNodes, nodes, isAutoSaveEnabled, handleAutoSave, service?.id, workspaceId]);

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

    // Load existing connection types for each selected item
    const existingTypes = {};
    connections
      .filter(c => c.source_id === item.id && c.target_id)
      .forEach(c => {
        existingTypes[c.target_id] = c.connection_type || 'depends_on';
      });
    setItemConnectionTypes(existingTypes);

    // Get existing group connections for this item (item-to-group)
    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === item.id)
      .map(conn => conn.target_group_id);
    setSelectedGroupConnections(existingGroupConns);

    // Load existing connection types for each selected group
    const existingGroupTypes = {};
    groupConnections
      .filter(conn => conn.source_id === item.id && conn.target_group_id)
      .forEach(conn => {
        existingGroupTypes[conn.target_group_id] = conn.connection_type || 'depends_on';
      });
    setItemToGroupConnectionTypes(existingGroupTypes);

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

  const handleSaveConnections = async (itemConnTypes = {}, groupConnTypes = {}) => {
    if (!selectedItem || !service?.id || !workspaceId) return;

    try {
      // Delete all existing item-to-item connections for this source
      const existingItemConns = connections
        .filter(c => c.source_id === selectedItem.id && c.target_id);

      for (const conn of existingItemConns) {
        await api.delete(`/services/${service.id}/connections/${selectedItem.id}/${conn.target_id}`);
      }

      // Add back all selected item-to-item connections with their types
      for (const targetId of selectedConnections) {
        const connectionType = itemConnTypes[targetId] || 'depends_on';
        await api.post(`/services/${service.id}/connections`, {
          source_id: selectedItem.id,
          target_id: targetId,
          workspace_id: workspaceId,
          connection_type: connectionType,
          propagation: getConnectionPropagation(connectionType)
        });
      }

      // Delete all existing item-to-group connections for this source
      const existingGroupConns = groupConnections
        .filter(c => c.source_id === selectedItem.id && c.target_group_id);

      for (const conn of existingGroupConns) {
        await api.delete(`/service-groups/connections/from-item/${service.id}/${selectedItem.id}/${conn.target_group_id}`);
      }

      // Add back all selected item-to-group connections with their types
      for (const targetGroupId of selectedGroupConnections) {
        const connectionType = groupConnTypes[targetGroupId] || 'depends_on';
        await api.post('/service-groups/connections/from-item', {
          service_id: service.id,
          source_id: selectedItem.id,
          target_group_id: targetGroupId,
          workspace_id: workspaceId,
          connection_type: connectionType,
          propagation: getConnectionPropagation(connectionType)
        });
      }

      setShowConnectionModal(false);
      await fetchAll();
      toast.success('Connections updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update connections: ' + (err.response?.data?.error || err.message));
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
        .map(node => {
          // External items: save to external_item_positions table
          if (node.data?.isExternal) {
            return api.post('/external-item-positions', {
              workspaceId: workspaceId,
              serviceId: service.id,
              externalServiceItemId: node.id,
              position: node.position,
              skipRefresh: true  // Prevent socket events to other services
            });
          }
          // Internal items: save to service_items table
          return api.put(`/service-items/items/${node.id}/position`, {
            position: node.position,
            skipRefresh: false  // Allow normal service updates
          });
        });

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

  const handleToggleEdgeLabels = useCallback(() => {
    setShowEdgeLabels(prev => !prev);
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

  const handleContextMenuRemoveFromGroup = useCallback(async () => {
    if (!contextMenu.item || !contextMenu.item.group_id) {
      toast.error('Item tidak dalam group');
      return;
    }

    const itemId = contextMenu.item.id;
    const itemData = contextMenu.item;

    try {
      toast.info('Mengeluarkan item dari group...');

      // Update item dengan group_id null menggunakan PUT (endpoint service items menggunakan PUT)
      await api.put(`/service-items/items/${itemId}`, {
        name: itemData.name || '',
        type: itemData.type || 'server',
        description: itemData.description || '',
        status: itemData.status || 'active',
        ip: itemData.ip || '',
        domain: itemData.domain || '',
        port: itemData.port ? parseInt(itemData.port) : null,
        category: itemData.category || 'internal',
        location: itemData.location || '',
        group_id: null,
        order_in_group: null,
      });

      toast.success('Item berhasil dikeluarkan dari group!');

      handleCloseContextMenu();

      // Fetch ulang data
      setTimeout(() => {
        fetchAll();
      }, 300);

    } catch (err) {
      console.error('Failed to remove from group:', err);
      toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
    }
  }, [contextMenu.item, fetchAll, handleCloseContextMenu]);

  // Handle reconnecting edges
  const handleReconnect = useCallback(async (oldEdge, newConnection) => {
    // Save to database FIRST
    try {
      // Check if this is a cross-service edge
      const isCrossService = oldEdge.id.startsWith('cross-service-') || oldEdge.data?.isCrossService;

      if (isCrossService) {
        // Save cross-service edge handle dengan viewing service context
        // Ini memungkinkan setiap service visualization memiliki handle position sendiri
        const edgeData = oldEdge.data || {};
        await api.put(`/cross-service-connections/edge-handles/${oldEdge.id}`, {
          sourceServiceId: edgeData.sourceServiceId,
          targetServiceId: edgeData.targetServiceId,
          viewingServiceId: service.id, // ← KEY: Service yang sedang melihat
          sourceHandle: newConnection.sourceHandle,
          targetHandle: newConnection.targetHandle,
          workspaceId: workspaceId,
          skipRefresh: true // ← Mencegah socket refresh ke services lain
        });

        // Update cross-service edge handles state immediately (tanpa reload)
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
      {/* Service Navbar - Hide in shared view */}
      {!isSharedView && (
        <ServiceNavbar
          draggedNode={isReorderingInGroup ? draggedNode : null}
          isReorderingInGroup={isReorderingInGroup}
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
          showEdgeLabels={showEdgeLabels}
          onToggleEdgeLabels={handleToggleEdgeLabels}
        />
      )}

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onReconnect={isSharedView ? undefined : handleReconnect}
        onConnect={isSharedView ? undefined : handleConnect}
        onNodeContextMenu={isSharedView ? undefined : handleNodeContextMenu}
        onEdgeContextMenu={isSharedView ? undefined : handleEdgeContextMenu}
        onPaneClick={handleCloseContextMenu}
        onNodeDragStart={isSharedView ? undefined : onNodeDragStart}
        onNodeDrag={isSharedView ? undefined : onNodeDrag}
        onNodeDragStop={isSharedView ? undefined : onNodeDragStop}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        nodesDraggable={!isSharedView}
        nodesConnectable={!isSharedView}
        edgesUpdatable={!isSharedView}
        elementsSelectable={!isSharedView}
        defaultViewport={defaultViewport}
        selectionOnDrag={isSharedView ? false : selectionMode === 'rectangle'}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        connectionLineType="smoothstep"
      >
        <Background />
        <Controls />
        {showMiniMap && (
          <MiniMap
            nodeColor={getMiniMapNodeColor}
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
        itemConnectionTypes={itemConnectionTypes}
        itemToGroupConnectionTypes={itemToGroupConnectionTypes}
        onClose={() => {
          setShowConnectionModal(false);
          setSelectedGroupConnections([]);
          setItemConnectionTypes({});
          setItemToGroupConnectionTypes({});
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
        onConnectionTypeChange={(itemId, typeSlug) => {
          setItemConnectionTypes(prev => ({ ...prev, [itemId]: typeSlug }));
        }}
        onItemToGroupTypeChange={(groupId, typeSlug) => {
          setItemToGroupConnectionTypes(prev => ({ ...prev, [groupId]: typeSlug }));
        }}
        onSave={handleSaveConnections}
        workspaceId={workspaceId}
        onCrossServiceSave={() => {
          // Cross-service connection updates will be handled automatically via socket
        }}
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

      {/* Quick Connection Modal */}
      <QuickConnectionModal
        show={showQuickConnectionModal}
        sourceItem={quickConnectionSource}
        targetItem={quickConnectionTarget}
        onClose={() => {
          setShowQuickConnectionModal(false);
          setQuickConnectionMode('create');
          setQuickConnectionExistingType(null);
        }}
        onSave={handleSaveQuickConnection}
        mode={quickConnectionMode}
        existingConnectionType={quickConnectionExistingType}
      />

      {/* Service Edge Context Menu */}
      <ServiceEdgeContextMenu
        show={edgeContextMenu.show}
        position={edgeContextMenu.position}
        edge={edgeContextMenu.edge}
        sourceNode={edgeContextMenu.sourceNode}
        targetNode={edgeContextMenu.targetNode}
        onEdit={handleEditEdgeConnectionType}
        onDelete={handleDeleteEdge}
        onClose={closeEdgeContextMenu}
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
        onRemoveFromGroup={handleContextMenuRemoveFromGroup}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
}

export default memo(ServiceVisualization);
