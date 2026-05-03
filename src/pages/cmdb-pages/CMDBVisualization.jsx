import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  reconnectEdge,
  Position,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import 'reactflow/dist/style.css';
import { Square } from 'lucide-react';
import api from '../../services/api';
import { useCMDB } from '../../hooks/cmdb-hooks/useCMDB';
import { useServiceToServiceConnections } from '../../hooks/cmdb-hooks/useServiceToServiceConnections';
import { useCrossServiceConnections } from '../../hooks/cmdb-hooks/useCrossServiceConnections';
import { useFlowData } from '../../hooks/cmdb-hooks/useFlowData';
import { useSocket } from '../../context/SocketContext';
import { useVisualizationActions } from '../../hooks/cmdb-hooks/useVisualizationActions';
import { loadEdgeHandles, saveEdgeHandles, saveEdgeHandle, transformServicesToNodes, getConnectionTypeInfo } from '../../utils/cmdb-utils/flowHelpers';
import { calculatePropagatedStatuses } from '../../utils/cmdb-utils/statusPropagation';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM, STATUS_COLORS, API_BASE_URL } from '../../utils/cmdb-utils/constants';
import CustomNode from '../../components/cmdb-components/CustomNode';
import CustomGroupNode from '../../components/cmdb-components/CustomGroupNode';
import ServiceAsNode from '../../components/cmdb-components/ServiceAsNode';
import VisualizationNavbar from '../../components/cmdb-components/VisualizationNavbar';
import NodeContextMenu from '../../components/cmdb-components/NodeContextMenu';
import EdgeContextMenu from '../../components/cmdb-components/EdgeContextMenu';
import ItemFormModal from '../../components/cmdb-components/ItemFormModal';
import ConnectionModal from '../../components/cmdb-components/ConnectionModal';
import QuickConnectionModal from '../../components/cmdb-components/QuickConnectionModal';
import QuickServiceToServiceConnection from '../../components/cmdb-components/QuickServiceToServiceConnection';
import GroupModal from '../../components/cmdb-components/GroupModal';
import GroupConnectionModal from '../../components/cmdb-components/GroupConnectionModal';
import ExportModal from '@/components/cmdb-components/ExportModal';
import ImportModal from '@/components/cmdb-components/ImportModal';
import ImportPreviewModal from '@/components/cmdb-components/ImportPreviewModal';
import ShareModal from '@/components/cmdb-components/ShareModal';
import ServiceDetailDialog from '../../components/cmdb-components/ServiceDetailDialog';
import StorageFormModal from '../../components/cmdb-components/StorageFormModal';
import { toast } from 'sonner';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { MousePointer2, GitBranch, Link, Pencil, Trash2, Eye, EyeOff, Search, ChevronsUpDown, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import { useUndoRedo } from '../../hooks/cmdb-hooks/useUndoRedo';
import { useAutoSave } from '../../hooks/cmdb-hooks/useAutoSave';
import { useNodeRelationships } from '../../hooks/cmdb-hooks/useNodeRelationship'
import DataTable from '@/components/common/DataTable';
import { useWorkspace } from '@/hooks/cmdb-hooks/useWorkspace';
import WorkspaceSwitcher from '@/components/cmdb-components/WorkspaceSwitcher';

const nodeTypes = {
  custom: CustomNode,
  group: CustomGroupNode,
  serviceAsNode: ServiceAsNode,
};

const DIMENSIONS = {
  itemsPerRow: 3,
  itemWidth: 180,
  baseItemHeight: 100,     // Tinggi dasar item tanpa service
  serviceHeight: 36,       // Tambahan tinggi per baris service
  servicesPerRow: 3,       // Jumlah service per baris dalam item
  gapX: 60,
  gapY: 10,
  padding: 20,
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function CMDBVisualization() {
  const navigate = useNavigate();

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('cmdb-autosave-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const lastSavedNodesRef = useRef(null);
  const isManualActionRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, startTime: 0 });

  const isSavingRef = useRef(false);
  const changedNodesRef = useRef(new Set());
  const lastNodePositionsRef = useRef({});

  const {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory,
  } = useUndoRedo(50);
  
  const reactFlowInstance = useRef(null);
  const reactFlowWrapper = useRef(null);
  const nodesRef = useRef([]);
  const isReorderingRef = useRef(false);
  const socketRef = useRef(null);
  const prevWorkspaceIdRef = useRef(null);
  const [shouldAutoCenter, setShouldAutoCenter] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [edgeHandles, setEdgeHandles] = useState({});

  const [draggedNode, setDraggedNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null); // Group yang sedang di-hover oleh dragged node
  const [isReorderingInGroup, setIsReorderingInGroup] = useState(false); // Hanya true saat reorder dalam group

  const [hiddenNodes, setHiddenNodes] = useState(new Set());

  // Services state (now as independent nodes)
  // const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Cache for service items to avoid repeated API calls
  const serviceItemsCacheRef = useRef({});

  // Helper function to get default direction for connection type
  const getConnectionDirection = (typeSlug) => {
    const directions = {
      'depends_on': 'forward',
      'consumed_by': 'backward',
      'connects_to': 'bidirectional',
      'contains': 'forward',
      'managed_by': 'forward',
      'data_flow_to': 'forward',
      'backup_to': 'forward',
      'backed_up_by': 'forward',
      'hosted_on': 'forward',
      'hosting': 'backward',
      'licensed_by': 'forward',
      'licensing': 'backward',
      'part_of': 'forward',
      'comprised_of': 'forward',
      'related_to': 'bidirectional',
      'preceding': 'forward',
      'succeeding': 'backward',
      'encrypted_by': 'forward',
      'encrypting': 'backward',
      'authenticated_by': 'forward',
      'authenticating': 'backward',
      'monitoring': 'backward',
      'monitored_by': 'forward',
      'load_balanced_by': 'forward',
      'load_balancing': 'backward',
      'failing_over_to': 'forward',
      'failover_from': 'backward',
      'replicating_to': 'backward',
      'replicated_by': 'forward',
      'proxying_for': 'backward',
      'proxied_by': 'forward',
      'routed_through': 'forward',
      'routing': 'backward',
    };
    return directions[typeSlug] || 'forward';
  };
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [selectionMode, setSelectionMode] = useState('freeroam');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedForHiding, setSelectedForHiding] = useState(new Set());

  const [showItemModal, setShowItemModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupConnectionModal, setShowGroupConnectionModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Connection Modal service selection states
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedServiceItems, setSelectedServiceItems] = useState([]);

  // Quick Connection Modal states
  const [showQuickConnectionModal, setShowQuickConnectionModal] = useState(false);
  const [quickConnectionSource, setQuickConnectionSource] = useState(null);
  const [quickConnectionTarget, setQuickConnectionTarget] = useState(null);
  const [isSavingConnection, setIsSavingConnection] = useState(false);

  // Service-to-Service Connection Modal states
  const [showServiceConnectionModal, setShowServiceConnectionModal] = useState(false);
  const [serviceConnectionSource, setServiceConnectionSource] = useState(null);
  const [serviceConnectionTarget, setServiceConnectionTarget] = useState(null);

  // Connection labels visibility
  const [showConnectionLabels, setShowConnectionLabels] = useState(false);

  // Edge Context Menu states
  const [edgeContextMenu, setEdgeContextMenu] = useState({ show: false, position: { x: 0, y: 0 }, edge: null });
  const [quickConnectionMode, setQuickConnectionMode] = useState('create'); // 'create' or 'edit'
  const [quickConnectionExistingType, setQuickConnectionExistingType] = useState(null);
  const [quickConnectionExistingServiceItemId, setQuickConnectionExistingServiceItemId] = useState(null);

  const [itemFormData, setItemFormData] = useState(INITIAL_ITEM_FORM);
  const [groupFormData, setGroupFormData] = useState(INITIAL_GROUP_FORM);
  const [editItemMode, setEditItemMode] = useState(false);
  const [editGroupMode, setEditGroupMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  const [selectedItemForConnection, setSelectedItemForConnection] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [selectedGroupConnections, setSelectedGroupConnections] = useState([]);
  const [selectedGroupForConnection, setSelectedGroupForConnection] = useState(null);
  const [selectedGroupToGroupConnections, setSelectedGroupToGroupConnections] = useState([]);
  const [selectedGroupToItemConnections, setSelectedGroupToItemConnections] = useState([]);
  const [selectedConnectionType, setSelectedConnectionType] = useState('depends_on');
  const [itemConnectionTypes, setItemConnectionTypes] = useState({});
  // Connection types for group-to-item and item-to-group connections
  const [itemToGroupConnectionTypes, setItemToGroupConnectionTypes] = useState({});
  // Connection types for group-to-group and group-to-item connections (from group modal)
  const [groupToGroupConnectionTypes, setGroupToGroupConnectionTypes] = useState({});
  const [groupToItemConnectionTypes, setGroupToItemConnectionTypes] = useState({});

  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem('cmdb-minimap-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const {
    workspaces,
    currentWorkspace,
    viewAllMode,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setDefaultWorkspace,
    duplicateWorkspace,
  } = useWorkspace();

  // Services state - PINDAHKAN KE ATAS sebelum useFlowData
  const [services, setServices] = useState([]); // Changed to array for independent service nodes
  const [serviceItems, setServiceItems] = useState({});
  const [serviceDialog, setServiceDialog] = useState({ show: false, service: null, parentItem: null, workspaceId: null });
  const [serviceIconUploads, setServiceIconUploads] = useState({});

  // Convert services array to object map for backward compatibility
  // Format: { itemId: [services] }
  const servicesMap = useMemo(() => {
    const map = {};

    // Ensure services is an array before iterating
    if (Array.isArray(services)) {
      services.forEach(service => {
        if (!map[service.cmdb_item_id]) {
          map[service.cmdb_item_id] = [];
        }
        // Attach service_items to each service from serviceItems state
        const serviceWithItems = {
          ...service,
          service_items: serviceItems[service.id] || []
        };
        map[service.cmdb_item_id].push(serviceWithItems);
      });
    } else if (services && typeof services === 'object') {
      // If services is already an object (old format), use it directly
      return services;
    }

    return map;
  }, [services, serviceItems]);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewId, setImportPreviewId] = useState(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showTableDrawer, setShowTableDrawer] = useState(false);

  const { items, connections, groups, groupConnections, fetchAll } = useCMDB(currentWorkspace?.id);
  const { connections: serviceToServiceConnections, fetchConnectionsByWorkspace: fetchServiceToServiceConnections } = useServiceToServiceConnections(currentWorkspace?.id);
  const { connections: crossServiceConnections, fetchConnectionsByWorkspace: fetchCrossServiceConnections } = useCrossServiceConnections(currentWorkspace?.id);

  // Service handlers
  const handleServiceAdd = useCallback(() => {
    setItemFormData(prev => ({
      ...prev,
      services: [...(prev.services || []), { name: '', status: 'active', icon_type: 'preset', icon_name: 'citrix' }]
    }));
  }, [setItemFormData]);

  const handleServiceRemove = useCallback((index) => {
    setItemFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  }, [setItemFormData]);

  const handleServiceChange = useCallback((index, field, value) => {
    setItemFormData(prev => {
      const newServices = [...(prev.services || [])];
      newServices[index] = { ...newServices[index], [field]: value };
      return { ...prev, services: newServices };
    });
  }, [setItemFormData]);

  const handleServiceIconUpload = useCallback((index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview URL
    const preview = URL.createObjectURL(file);

    // Update service with preview and filename
    setItemFormData(prev => {
      const newServices = [...(prev.services || [])];
      newServices[index] = {
        ...newServices[index],
        icon_preview: preview,
        icon_name: file.name
      };
      return { ...prev, services: newServices };
    });

    setServiceIconUploads(prev => ({
      ...prev,
      [index]: file
    }));
  }, [setItemFormData]);

  // Storage handlers
  const handleStorageClick = useCallback(() => {
    setShowStorageModal(true);
  }, []);

  const handleStorageSave = useCallback((storageData) => {
    setItemFormData(prev => ({
      ...prev,
      storage: storageData
    }));
    setShowStorageModal(false);
  }, [setItemFormData]);

  const handleStorageDelete = useCallback(() => {
    setItemFormData(prev => ({
      ...prev,
      storage: null
    }));
  }, [setItemFormData]);

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

  const {
    highlightedNodeId,
    relatedNodes,
    relatedEdges,
    highlightNode,
    clearHighlight,
    getDependencies,
    getDependents,
  } = useNodeRelationships(nodes, edges);

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

    const exportVisualization = async ({ format, scope, background }) => {
    const reactFlowContainer = document.querySelector('.react-flow');
    if (!reactFlowContainer) {
      toast.error('Tidak dapat menemukan visualisasi untuk diekspor.');
      return;
    }

    const rfInstance = reactFlowInstance.current;
    if (!rfInstance) {
      toast.error('ReactFlow instance tidak tersedia.');
      return;
    }

    let restoreViewport = null;
    let restoreHiddenNodes = null;

    const loadingToast = toast.loading('Mempersiapkan export...');

    if (scope === 'all') {
      const currentViewport = rfInstance.getViewport();
      const currentHiddenNodes = new Set(hiddenNodes);
      restoreHiddenNodes = currentHiddenNodes;

      setHiddenNodes(new Set());
      
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      
      rfInstance.fitView({ 
        padding: 0.15,
        includeHiddenNodes: false,
        duration: 0,
        minZoom: 0.1,
        maxZoom: 1.5
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      restoreViewport = () => {
        rfInstance.setViewport(currentViewport);
        if (restoreHiddenNodes) {
          setHiddenNodes(restoreHiddenNodes);
        }
      };
    }

    try {
      toast.loading('Mengekspor visualisasi...', { id: loadingToast });
      
      let dataUrl;
      const exportElement = reactFlowContainer;
      
      const baseExportOptions = {
        pixelRatio: 2,
        cacheBust: true,
        quality: 1,
        canvasWidth: exportElement.offsetWidth * 2,
        canvasHeight: exportElement.offsetHeight * 2,
        filter: (node) => {
          if (node.classList) {
            return !node.classList.contains('react-flow__controls') &&
                  !node.classList.contains('react-flow__minimap') &&
                  !node.classList.contains('react-flow__attribution');
          }
          return true;
        }
      };

      if (format === 'pdf') {
        const pdfOptions = {
          ...baseExportOptions,
          backgroundColor: '#ffffff'
        };
        dataUrl = await toPng(exportElement, pdfOptions);
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const pdfWidth = img.width * 0.75; 
        const pdfHeight = img.height * 0.75;
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfWidth, pdfHeight],
        });
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('cmdb-visualization.pdf');
      } else if (format === 'png') {
        const pngOptions = {
          ...baseExportOptions,
          ...(background && background !== 'transparent' ? { backgroundColor: background } : {})
        };
        dataUrl = await toPng(exportElement, pngOptions);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `cmdb-visualization-${Date.now()}.png`;
        link.click();
      } else if (format === 'jpeg') {
        const jpegOptions = {
          ...baseExportOptions,
          backgroundColor: background && background !== 'transparent' ? background : '#ffffff',
          quality: 0.95,
        };
        dataUrl = await toJpeg(exportElement, jpegOptions);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `cmdb-visualization-${Date.now()}.jpeg`;
        link.click();
      }

      toast.success('Ekspor berhasil!', { id: loadingToast });
    } catch (err) {
      console.error('Ekspor gagal:', err);
      toast.error('Gagal mengekspor visualisasi', {
        id: loadingToast,
        description: err.message || 'Kesalahan tidak dikenal',
      });
    } finally {
      if (restoreViewport) {
        await new Promise(resolve => setTimeout(resolve, 150));
        restoreViewport();
      }
    }
  };

  const handleServiceClick = useCallback((service, nodeData) => {
    // Find parent item - service now has cmdbItemId directly
    const parentItem = items.find(i => i.id === service.cmdb_item_id);

    setServiceDialog({
      show: true,
      service,
      parentItem,
      workspaceId: currentWorkspace?.id
    });
  }, [items, currentWorkspace]);

  const handleFetchServiceItems = useCallback(async (serviceId) => {
    // Check if already cached
    if (serviceItemsCacheRef.current[serviceId]) {
      return serviceItemsCacheRef.current[serviceId];
    }

    try {
      const res = await api.get(`/service-items/${serviceId}/items?workspace_id=${currentWorkspace?.id}`);
      const serviceItems = res.data;

      // Cache the result
      serviceItemsCacheRef.current[serviceId] = serviceItems;

      // Update services in nodes state
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          if (node.type === 'custom' && node.data.services) {
            const updatedServices = node.data.services.map(svc => {
              if (svc.id === parseInt(serviceId)) {
                return {
                  ...svc,
                  items: serviceItems
                };
              }
              return svc;
            });

            return {
              ...node,
              data: {
                ...node.data,
                services: updatedServices
              }
            };
          }
          return node;
        });
      });

      return serviceItems;
    } catch (err) {
      console.error('Failed to fetch service items:', err);
      return [];
    }
  }, [currentWorkspace, setNodes]);

  // Handler for clicking service items badge on service node
  const handleServiceItemsClick = useCallback(async (service) => {
    try {
      // Fetch service items for this service
      const res = await api.get(`/service-items/${service.id}/items?workspace_id=${currentWorkspace?.id}`);
      const serviceItems = res.data;

      // Open service detail dialog with service items
      setServiceDialog({
        show: true,
        service: service,
        parentItem: items.find(i => i.id === service.cmdb_item_id),
        serviceItems: serviceItems
      });
    } catch (err) {
      console.error('Failed to fetch service items:', err);
      toast.error('Gagal memuat service items');
    }
  }, [currentWorkspace, items]);

  // Initialize useFlowData after handlers are defined
  const { transformToFlowData } = useFlowData(
    items,
    connections,
    groups,
    groupConnections,
    edgeHandles,
    hiddenNodes,
    servicesMap,
    showConnectionLabels,
    handleServiceClick,
    handleServiceItemsClick,
    services,
    serviceItems
  );

  // Save service node position to database
  const saveServiceNodePosition = useCallback(async (serviceId, position, parentNodeId = null) => {
    try {
      // If service is a child node (inside CMDB item), position is relative
      // We need to save the absolute position for database
      let finalPosition = position;

      if (parentNodeId) {
        const parentNode = nodes.find(n => n.id === parentNodeId);
        if (parentNode) {
          // Calculate absolute position: parent absolute + child relative
          finalPosition = {
            x: parentNode.position.x + position.x,
            y: parentNode.position.y + position.y
          };
        }
      }

      await api.put(`/services/${serviceId}/position`, { position: finalPosition, skipEmit: true });
      console.log('✅ Service node position saved:', serviceId, finalPosition);
    } catch (err) {
      console.error('❌ Failed to save service node position:', err);
    }
  }, [nodes]);

  const handleAddService = useCallback((nodeData) => {
    const item = items.find(i => i.id === parseInt(nodeData.id));
    if (!item) return;

    const itemServices = servicesMap[item.id] || [];

    // Add icon_preview for uploaded icons
    const servicesWithPreview = itemServices.map(service => ({
      ...service,
      icon_preview: service.icon_type === 'upload' && service.icon_path
        ? `${API_BASE_URL}${service.icon_path}`
        : null
    }));

    // Open item modal in edit mode with current services
    setItemFormData({
      name: item.name || '',
      type: item.type || '',
      description: item.description || '',
      status: item.status || 'active',
      ip: item.ip || '',
      category: item.category || 'internal',
      location: item.location || '',
      group_id: item.group_id || null,
      env_type: item.env_type || 'fisik',
      services: servicesWithPreview,
      storage: item.storage || null,
      alias: item.alias || '',
      port: item.port || '',
    });
    setCurrentItemId(item.id);
    setEditItemMode(true);
    setShowItemModal(true);
    setServiceIconUploads({});
  }, [items, services]);

  const processedNodes = useMemo(() => {
    return nodes.map(node => {
      let opacity = 1;
      let outline = 'none';
      let zIndex = node.style?.zIndex || 1;

      if (selectedForHiding.has(node.id)) {
        outline = '3px solid #3b82f6';
      }

      if (highlightMode && highlightedNodeId) {
        if (node.id === highlightedNodeId) {
          opacity = 1;
          zIndex = 100;
        } else if (relatedNodes && relatedNodes.has(node.id)) {
          opacity = 1;
          zIndex = 50;
        } else {
          opacity = 0.08;
          zIndex = 1;
        }
      }

      // Get services for this node (only for custom nodes, not group nodes)
      let nodeServices = [];
      if (node.type === 'custom' && !node.id.startsWith('group-')) {
        nodeServices = servicesMap[node.id] || [];
      }

      return {
        ...node,
        data: {
          ...node.data,
          onServiceClick: handleServiceClick,
          onAddService: handleAddService,
          onFetchServiceItems: handleFetchServiceItems,
          workspaceId: currentWorkspace?.id,
          services: nodeServices,
        },
        style: {
          ...node.style,
          opacity,
          outline,
          outlineOffset: '2px',
          zIndex,
          transition: 'opacity 0.3s ease, outline 0.3s ease',
        }
      };
    });
  }, [nodes, selectedForHiding, highlightMode, highlightedNodeId, relatedNodes, handleServiceClick, handleAddService, handleFetchServiceItems, currentWorkspace, services]);

  const processedEdges = useMemo(() => {
    return edges.map(edge => {
      let opacity = edge.style?.opacity || 1;
      let strokeWidth = edge.style?.strokeWidth || 2;
      let zIndex = edge.zIndex || 10;

      if (highlightMode && highlightedNodeId) {
        if (relatedEdges && relatedEdges.has(edge.id)) {
          opacity = 1;
          strokeWidth = 3;
          zIndex = 60;
        } else {
          opacity = 0.1;
          zIndex = 1;
        }
      }

      return {
        ...edge,
        style: {
          ...edge.style,
          opacity,
          strokeWidth,
          transition: 'opacity 0.3s ease, stroke-width 0.3s ease',
        },
        zIndex,
      };
    });
  }, [edges, highlightMode, highlightedNodeId, relatedEdges]);

  const selectionRect = useMemo(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;
    
    return {
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };
  }, [isSelecting, selectionStart, selectionEnd]);

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

  // Fetch services for all items (as callback so it can be called manually)
  const fetchServices = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setServices([]);
      setServiceItems({});
      return;
    }

    setLoadingServices(true);
    try {
      // Fetch all services for workspace (as independent nodes)
      const res = await api.get(`/services/workspace/${currentWorkspace.id}`);

      // Add icon_preview for uploaded icons
      const servicesWithPreview = res.data.map(service => ({
        ...service,
        icon_preview: service.icon_type === 'upload' && service.icon_path
          ? `${API_BASE_URL}${service.icon_path}`
          : null
      }));

      setServices(servicesWithPreview);

      // Also fetch all service items for each service to build serviceItemToServiceMap
      const allServiceItems = {};
      for (const service of servicesWithPreview) {
        try {
          const itemsRes = await api.get(`/services/${service.id}/items?workspace_id=${currentWorkspace.id}`);
          if (itemsRes.data && itemsRes.data.length > 0) {
            // Add serviceName to each item
            const itemsWithServiceName = itemsRes.data.map(item => ({
              ...item,
              serviceName: service.name
            }));
            allServiceItems[service.id] = itemsWithServiceName;
          } else {
            allServiceItems[service.id] = [];
          }
        } catch (err) {
          console.error(`Failed to fetch items for service ${service.id}:`, err);
          allServiceItems[service.id] = [];
        }
      }
      setServiceItems(allServiceItems);
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices([]);
      setServiceItems({});
    } finally {
      setLoadingServices(false);
    }
  }, [currentWorkspace?.id]);

  // Fetch services on mount and workspace change
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    console.log('🔄 TransformToFlowData effect triggered, connections:', connections.length, 'items:', items.length);
    const { flowNodes, flowEdges } = transformToFlowData();

    const allEdges = [...flowEdges];

    // Create service-to-service edges with DASHED style
    const serviceToServiceEdges = (serviceToServiceConnections || []).map((conn) => {
      const sourceServiceNodeId = `service-${conn.source_service_id}`;
      const targetServiceNodeId = `service-${conn.target_service_id}`;

      // Find service nodes in flowNodes (services are now child nodes inside CustomNode)
      const sourceNode = flowNodes.find(n => n.id === sourceServiceNodeId);
      const targetNode = flowNodes.find(n => n.id === targetServiceNodeId);

      if (!sourceNode || !targetNode) {
        console.warn('Service nodes not found for connection:', {
          sourceServiceNodeId,
          targetServiceNodeId,
          conn
        });
        return null;
      }

      const edgeId = `service-connection-${conn.id}`;
      const isEdgeHidden = hiddenNodes.has(sourceServiceNodeId) || hiddenNodes.has(targetServiceNodeId);

      // Get status from real-time services state (not static connection data)
      const sourceService = services.find(s => s.id === conn.source_service_id);
      const targetService = services.find(s => s.id === conn.target_service_id);
      const sourceStatus = sourceService?.status || 'active';
      const targetStatus = targetService?.status || 'active';

      let edgeStatus = 'active';
      let showCrossMarker = false;

      // Priority: inactive > maintenance > active
      if (sourceStatus === 'inactive' || targetStatus === 'inactive') {
        edgeStatus = 'inactive';
        showCrossMarker = true;
      } else if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
        edgeStatus = 'maintenance';
      }

      // Get color based on status
      const getStrokeColor = (status) => {
        switch (status) {
          case 'active': return '#10b981';
          case 'inactive': return '#ef4444';
          case 'maintenance': return '#f59e0b';
          default: return '#10b981';
        }
      };

      const strokeColor = getStrokeColor(edgeStatus);

      // Get handle positions - considering child node absolute positions
      const getBestHandlePositions = (source, target) => {
        const sourceParentId = source.parentNode;
        const targetParentId = target.parentNode;

        // Calculate absolute positions for child nodes
        let sourceAbsX = source.position.x;
        let sourceAbsY = source.position.y;
        let targetAbsX = target.position.x;
        let targetAbsY = target.position.y;

        // If source is child node, add parent position
        if (sourceParentId) {
          const sourceParent = [...flowNodes].find(n => n.id === sourceParentId);
          if (sourceParent) {
            sourceAbsX += sourceParent.position.x;
            sourceAbsY += sourceParent.position.y;
          }
        }

        // If target is child node, add parent position
        if (targetParentId) {
          const targetParent = [...flowNodes].find(n => n.id === targetParentId);
          if (targetParent) {
            targetAbsX += targetParent.position.x;
            targetAbsY += targetParent.position.y;
          }
        }

        const dx = targetAbsX - sourceAbsX;
        const dy = targetAbsY - sourceAbsY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
          return dx > 0
            ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
            : { sourceHandle: 'source-left', targetHandle: 'target-right' };
        } else {
          return dy > 0
            ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
            : { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
        }
      };

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const connectionTypeLabel = conn.connection_type
        ? getConnectionTypeInfo(conn.connection_type).label
        : null;

      const edgeConfig = {
        id: edgeId,
        source: sourceServiceNodeId,
        target: targetServiceNodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        zIndex: 1001, // Higher than service nodes (1000)
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: '8,4', // DASHED line untuk service-to-service connections
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        reconnectable: true,
        updatable: true,
        selectable: true,
        hidden: isEdgeHidden,
        data: {
          connection_type: conn.connection_type,
          source_service_id: conn.source_service_id,
          target_service_id: conn.target_service_id,
          isServiceConnection: true // Flag untuk identifikasi service connection
        }
      };

      // Add cross marker if inactive
      if (showCrossMarker) {
        edgeConfig.label = `✕`;
        edgeConfig.labelStyle = {
          fill: strokeColor,
          fontWeight: 'bold',
          fontSize: 20,
        };
        edgeConfig.labelBgStyle = {
          fill: 'transparent',
          fillOpacity: 0
        };
        edgeConfig.labelBgPadding = [8, 8];
        edgeConfig.labelBgBorderRadius = 50;
      } else if (showConnectionLabels && conn.connection_type) {
        const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);
        const connectionTypeLabel = connectionTypeInfo ? connectionTypeInfo.label : null;

        if (connectionTypeLabel) {
          edgeConfig.label = connectionTypeLabel;
          edgeConfig.labelStyle = {
            fontSize: 11,
            fontWeight: 500,
            fill: strokeColor,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 6px',
            borderRadius: '4px',
          };
          edgeConfig.labelBgStyle = {
            fill: 'white',
            fillOpacity: 0.9,
          };
          edgeConfig.labelBgPadding = [4, 6];
          edgeConfig.labelBgBorderRadius = 4;
        }
      }

      return edgeConfig;
    }).filter(Boolean);

    // Create cross-service edges (service item to service item) with DOTTED style
    const crossServiceEdges = (crossServiceConnections || []).map((conn) => {
      const sourceServiceNodeId = `service-${conn.source_service_id}`;
      const targetServiceNodeId = `service-${conn.target_service_id}`;

      // Find service nodes in flowNodes
      const sourceNode = flowNodes.find(n => n.id === sourceServiceNodeId);
      const targetNode = flowNodes.find(n => n.id === targetServiceNodeId);

      if (!sourceNode || !targetNode) {
        console.warn('Service nodes not found for cross-service connection:', {
          sourceServiceNodeId,
          targetServiceNodeId,
          conn
        });
        return null;
      }

      const edgeId = `cross-service-connection-${conn.id}`;
      const isEdgeHidden = hiddenNodes.has(sourceServiceNodeId) || hiddenNodes.has(targetServiceNodeId);

      // Get status from real-time services state
      const sourceService = services.find(s => s.id === conn.source_service_id);
      const targetService = services.find(s => s.id === conn.target_service_id);
      const sourceStatus = sourceService?.status || 'active';
      const targetStatus = targetService?.status || 'active';

      let edgeStatus = 'active';
      let showCrossMarker = false;

      // Priority: inactive > maintenance > active
      if (sourceStatus === 'inactive' || targetStatus === 'inactive') {
        edgeStatus = 'inactive';
        showCrossMarker = true;
      } else if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
        edgeStatus = 'maintenance';
      }

      // Get color based on status
      const getStrokeColor = (status) => {
        switch (status) {
          case 'active': return '#10b981';
          case 'inactive': return '#ef4444';
          case 'maintenance': return '#f59e0b';
          default: return '#10b981';
        }
      };

      const strokeColor = getStrokeColor(edgeStatus);

      // Get handle positions - considering child node absolute positions
      const getBestHandlePositions = (source, target) => {
        const sourceParentId = source.parentNode;
        const targetParentId = target.parentNode;

        // Calculate absolute positions for child nodes
        let sourceAbsX = source.position.x;
        let sourceAbsY = source.position.y;
        let targetAbsX = target.position.x;
        let targetAbsY = target.position.y;

        // If source is child node, add parent position
        if (sourceParentId) {
          const sourceParent = [...flowNodes].find(n => n.id === sourceParentId);
          if (sourceParent) {
            sourceAbsX += sourceParent.position.x;
            sourceAbsY += sourceParent.position.y;
          }
        }

        // If target is child node, add parent position
        if (targetParentId) {
          const targetParent = [...flowNodes].find(n => n.id === targetParentId);
          if (targetParent) {
            targetAbsX += targetParent.position.x;
            targetAbsY += targetParent.position.y;
          }
        }

        const dx = targetAbsX - sourceAbsX;
        const dy = targetAbsY - sourceAbsY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
          return dx > 0
            ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
            : { sourceHandle: 'source-left', targetHandle: 'target-right' };
        } else {
          return dy > 0
            ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
            : { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
        }
      };

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const edgeConfig = {
        id: edgeId,
        source: sourceServiceNodeId,
        target: targetServiceNodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        zIndex: 1002, // Higher than service-to-service edges (1001)
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: '3,3', // DOTTED line untuk cross-service connections (service item level)
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        reconnectable: true,
        updatable: true,
        selectable: true,
        hidden: isEdgeHidden,
        data: {
          connection_type: conn.connection_type,
          source_service_id: conn.source_service_id,
          target_service_id: conn.target_service_id,
          source_service_item_id: conn.source_service_item_id,
          target_service_item_id: conn.target_service_item_id,
          isCrossServiceConnection: true, // Flag untuk identifikasi cross-service connection
          propagation_enabled: conn.propagation_enabled
        }
      };

      // Add cross marker if inactive
      if (showCrossMarker) {
        edgeConfig.label = `✕`;
        edgeConfig.labelStyle = {
          fill: strokeColor,
          fontWeight: 'bold',
          fontSize: 20,
        };
        edgeConfig.labelBgStyle = {
          fill: 'transparent',
          fillOpacity: 0
        };
        edgeConfig.labelBgPadding = [8, 8];
        edgeConfig.labelBgBorderRadius = 50;
      } else if (showConnectionLabels && conn.connection_type) {
        const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);
        const connectionTypeLabel = connectionTypeInfo ? connectionTypeInfo.label : null;

        if (connectionTypeLabel) {
          edgeConfig.label = connectionTypeLabel;
          edgeConfig.labelStyle = {
            fontSize: 11,
            fontWeight: 500,
            fill: strokeColor,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 6px',
            borderRadius: '4px',
          };
          edgeConfig.labelBgStyle = {
            fill: 'white',
            fillOpacity: 0.9,
          };
          edgeConfig.labelBgPadding = [4, 6];
          edgeConfig.labelBgBorderRadius = 4;
        }
      }

      return edgeConfig;
    }).filter(Boolean);

    setNodes([...flowNodes]);
    setEdges([...allEdges, ...serviceToServiceEdges, ...crossServiceEdges]);
  }, [items, connections, groups, groupConnections, transformToFlowData, setNodes, setEdges, showConnectionLabels, edgeHandles, serviceToServiceConnections, crossServiceConnections, services, serviceItems]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Update node data untuk visual feedback saat group di-hover
  useEffect(() => {
    if (!hoveredGroup) {
      // Reset semua group isHovered flag
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.type === 'group') {
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
        } else if (n.type === 'group') {
          return {
            ...n,
            data: { ...n.data, isHovered: false }
          };
        }
        return n;
      }));
    }
  }, [hoveredGroup, setNodes]);

  useEffect(() => {
    nodes.forEach(node => {
      if (!lastNodePositionsRef.current[node.id]) {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      }
    });
  }, [nodes]);

  // Use SocketContext for real-time updates
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available yet');
      return;
    }

    console.log('🔌 Setting up socket listeners, socket connected:', isConnected);
    socketRef.current = socket;

    const handleCmdbUpdate = async () => {
      // Skip fetch if currently saving connection to avoid race condition
      if (!isSavingRef.current && !isSavingConnection) {
        console.log('📡 cmdb_update event received, fetching all data...');
        // Fetch CMDB data, services, service-to-service connections, and cross-service connections
        await Promise.all([
          fetchAll(),
          fetchServices(),
          fetchServiceToServiceConnections(),
          fetchCrossServiceConnections()
        ]);
        console.log('✅ cmdb_update: data fetch complete');
      } else {
        console.log('⏸️ cmdb_update event skipped - currently saving');
      }
    };

    const handleServiceUpdate = async (data) => {
      // Parse serviceId and workspaceId (backend might send as strings)
      const eventServiceId = parseInt(data.serviceId);
      const eventWorkspaceId = parseInt(data.workspaceId);
      const currentWorkspaceId = currentWorkspace?.id;

      // Only update if this is for our workspace
      if (eventWorkspaceId === currentWorkspaceId) {
        try {
          // Fetch the updated service
          const response = await api.get(`/services/single/${eventServiceId}`);
          const updatedService = response.data;

          // Update the specific service in the services state
          setServices(prevServices => {
            // services is now an ARRAY, not an object
            if (!Array.isArray(prevServices)) {
              return prevServices;
            }

            // Update the service in the array
            return prevServices.map(service =>
              service.id === eventServiceId ? updatedService : service
            );
          });

          console.log('✅ Service updated in state:', updatedService.name);

          // Trigger re-fetch to rebuild nodes with updated services
          fetchServices();
        } catch (err) {
          console.warn(`Failed to fetch service ${eventServiceId}:`, err);
          // Service might have been deleted, ignore error
        }
      }
    };

    const handleServiceItemStatusUpdate = async (data) => {
      // Parse service item data
      const eventServiceItemId = parseInt(data.serviceItemId);
      const eventWorkspaceId = parseInt(data.workspaceId);
      const eventServiceId = parseInt(data.serviceId);
      const newStatus = data.newStatus;
      const currentWorkspaceId = currentWorkspace?.id;

      console.log('\n📡 ========================================');
      console.log('📡 SERVICE ITEM STATUS UPDATE EVENT');
      console.log('📡 ========================================');
      console.log('📡 Service Item ID:', eventServiceItemId);
      console.log('📡 New Status:', newStatus);
      console.log('📡 Service ID:', eventServiceId);
      console.log('📡 Event Workspace ID:', eventWorkspaceId);
      console.log('📡 Current Workspace ID:', currentWorkspaceId);
      console.log('📡 Should Process:', eventWorkspaceId === currentWorkspaceId);
      console.log('📡 ========================================\n');

      // Only update if this is for our workspace
      if (eventWorkspaceId === currentWorkspaceId) {
        console.log('📡 Service item status update received:', {
          serviceItemId: eventServiceItemId,
          newStatus,
          serviceId: eventServiceId
        });

        try {
          // FIX: Fetch all service items for the service, not just one item
          // Use eventServiceId (service ID), not eventServiceItemId (service item ID)
          const response = await api.get(`/service-items/${eventServiceId}/items?workspace_id=${eventWorkspaceId}`);
          const updatedServiceItems = response.data || [];

          // Update serviceItems state with the new data
          setServiceItems(prevServiceItems => ({
            ...prevServiceItems,
            [eventServiceId]: updatedServiceItems
          }));

          console.log('✅ Service item status updated:', {
            serviceItemId: eventServiceItemId,
            newStatus,
            serviceId: eventServiceId
          });

          // Force trigger edge re-calculation by updating services with a timestamp
          // This ensures service item edges re-render with updated status
          setServices(prevServices => {
            // Create a new array reference with updated timestamp for the affected service
            const updatedServices = prevServices.map(service => {
              if (service.id === eventServiceId) {
                console.log(`🔄 Forcing edge update for service: ${service.name} (${eventServiceId})`);
                return {
                  ...service,
                  _lastUpdated: Date.now(), // Force re-render trigger
                  _forceEdgeUpdate: true // Explicit flag for edge update
                };
              }
              return service;
            });

            console.log('🔄 Services state updated, triggering edge re-calculation');

            return updatedServices;
          });
        } catch (err) {
          console.warn(`Failed to fetch service items for service ${eventServiceId}:`, err);
        }
      }
    };

    const handleCrossServiceConnectionUpdate = async (data) => {
      // Parse cross-service connection update data
      // Event format: { sourceServiceId, targetServiceId, workspaceId }
      const eventWorkspaceId = parseInt(data.workspaceId);
      const currentWorkspaceId = currentWorkspace?.id;

      // Only update if this is for our workspace
      if (eventWorkspaceId === currentWorkspaceId) {
        console.log('📡 Cross-service connection update received in CMDBVisualization:', data);
        try {
          // Fetch cross-service connections to get the latest data
          await fetchCrossServiceConnections();
          console.log('✅ Cross-service connections refreshed after socket update');
        } catch (err) {
          console.warn('Failed to refresh cross-service connections:', err);
        }
      }
    };

    socket.on('cmdb_update', handleCmdbUpdate);
    socket.on('service_update', handleServiceUpdate);
    socket.on('service_item_status_update', handleServiceItemStatusUpdate);
    socket.on('cross_service_connection_update', handleCrossServiceConnectionUpdate);

    return () => {
      socket.off('cmdb_update', handleCmdbUpdate);
      socket.off('service_update', handleServiceUpdate);
      socket.off('service_item_status_update', handleServiceItemStatusUpdate);
      socket.off('cross_service_connection_update', handleCrossServiceConnectionUpdate);
    };
  }, [socket, isConnected, isSavingConnection, fetchAll, fetchServices, currentWorkspace, setServices, setServiceItems, fetchCrossServiceConnections]);

  // Handle socket reconnection - fetch data when socket reconnects
  useEffect(() => {
    if (isConnected && currentWorkspace?.id) {
      console.log('🔌 Socket reconnected, fetching latest data...');
      fetchAll();
      fetchServices();
      fetchServiceToServiceConnections();
      fetchCrossServiceConnections();
    }
  }, [isConnected, fetchAll, fetchServices, currentWorkspace, fetchServiceToServiceConnections, fetchCrossServiceConnections]);

  useEffect(() => {
    localStorage.setItem('cmdb-minimap-enabled', JSON.stringify(showMiniMap));
  }, [showMiniMap]);

  const handleOpenAddItem = useCallback(() => {
    setItemFormData({ ...INITIAL_ITEM_FORM, services: [] });
    setEditItemMode(false);
    setCurrentItemId(null);
    setServiceIconUploads({});
    setShowItemModal(true);
  }, []);

  const handleOpenImport = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleImportComplete = useCallback((previewId) => {
    setImportPreviewId(previewId);
    setShowImportModal(false);
  }, []);

  const handleImportConfirm = useCallback((result) => {
    // Refresh data after import
    fetchAll();
    fetchServices();

    // Emit socket update
    if (socket) {
      socket.emit('cmdb_update');
    }
  }, [fetchAll, fetchServices, socket]);

  const handleEditItem = useCallback((item) => {
    const itemServices = servicesMap[item.id] || [];

    // Add icon_preview for uploaded icons
    const servicesWithPreview = itemServices.map(service => ({
      ...service,
      icon_preview: service.icon_type === 'upload' && service.icon_path
        ? `${API_BASE_URL}${service.icon_path}`
        : null
    }));

    setItemFormData({
      name: item.name || '',
      type: item.type || '',
      description: item.description || '',
      status: item.status || 'active',
      ip: item.ip || '',
      category: item.category || 'internal',
      location: item.location || '',
      group_id: item.group_id || null,
      env_type: item.env_type || 'fisik',
      services: servicesWithPreview,
      storage: item.storage || null,
      alias: item.alias || '',
      port: item.port || '',
    });
    setCurrentItemId(item.id);
    setEditItemMode(true);
    setShowItemModal(true);
    setServiceIconUploads({}); // Reset icon uploads for edit
  }, [services]);

  const handleItemSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!currentWorkspace) {
      toast.error('Pilih workspace terlebih dahulu');
      return;
    }

    const initialPosition = !itemFormData.group_id ? getViewportCenter() : null;

    try {
      let itemId;

      // Prepare item data WITHOUT services field
      const { services, ...itemDataWithoutServices } = itemFormData;

      // Create or update CMDB item
      if (editItemMode) {
        // Get current item to check status change
        const currentItem = items.find(item => item.id === currentItemId);
        const oldStatus = currentItem ? currentItem.status : 'active';
        const newStatus = itemDataWithoutServices.status;

        await api.put(`/cmdb/${currentItemId}`, {
          ...itemDataWithoutServices,
        });
        itemId = currentItemId;

        // Skip service updates if CMDB item status changed to 'inactive'
        // (Backend already propagated the status to services)
        const shouldSkipServiceUpdates = newStatus === 'inactive' && oldStatus !== newStatus;

        if (!shouldSkipServiceUpdates) {
          // Get existing services for this item
          const existingServicesResponse = await api.get(`/services/${itemId}`);
          const existingServices = existingServicesResponse.data;

          // Track which services are kept/updated
          const keptServiceIds = new Set();

          // Update or create services
          if (services && services.length > 0) {
            for (let i = 0; i < services.length; i++) {
              const service = services[i];

              // Check if this is an existing service (has id) or new service
              const existingService = service.id
                ? existingServices.find(s => s.id === service.id)
                : null;

              const serviceData = {
                cmdb_item_id: itemId,
                name: service.name,
                status: service.status,
                icon_type: service.icon_type,
                icon_name: service.icon_type === 'preset' ? (service.icon_name || 'citrix') : null,
                description: service.description,
              };

              let createdService;

              if (existingService) {
                // Update existing service
                const updateResponse = await api.put(`/services/${existingService.id}`, serviceData);
                createdService = updateResponse.data;
                keptServiceIds.add(existingService.id);

                // Check if icon needs to be updated for upload type
                if (service.icon_type === 'upload') {
                  const iconFile = serviceIconUploads[i];
                  if (iconFile) {
                    // New file uploaded - upload it
                    const iconFormData = new FormData();
                    iconFormData.append('icon', iconFile);
                    iconFormData.append('icon_type', 'upload');  // Tambahkan icon_type

                    await api.put(`/services/${createdService.id}/icon`, iconFormData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                  }
                  // If no new file, keep existing icon (icon_path stays in database)
                }
              } else {
                // Create new service
                const serviceResponse = await api.post('/services', serviceData);
                createdService = serviceResponse.data;

                // If upload type and icon file exists, upload icon separately
                if (service.icon_type === 'upload') {
                  const iconFile = serviceIconUploads[i];
                  if (iconFile) {
                    // New file uploaded - upload it
                    const iconFormData = new FormData();
                    iconFormData.append('icon', iconFile);

                    await api.post(`/services/${createdService.id}/upload-icon`, iconFormData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                  }
                }
              }
            }
          }

          // Delete services that are not in the form anymore
          for (const service of existingServices) {
            if (!keptServiceIds.has(service.id)) {
              await api.delete(`/services/${service.id}`);
            }
          }
        } else {
          console.log('⏭️ Skipping service updates - CMDB item status changed to inactive, backend already propagated to services');
        }
      } else {
        const result = await api.post('/cmdb', {
          ...itemDataWithoutServices,
          position: initialPosition ? JSON.stringify(initialPosition) : null,
          workspace_id: currentWorkspace.id,
        });
        itemId = result.data.id;

        // Create services for new item
        if (services && services.length > 0) {
          for (let i = 0; i < services.length; i++) {
            const service = services[i];

            // Create service first
            const serviceData = {
              cmdb_item_id: itemId,
              name: service.name,
              status: service.status,
              icon_type: service.icon_type,
              icon_name: service.icon_type === 'preset' ? (service.icon_name || 'citrix') : null,
              description: service.description,
            };

            const serviceResponse = await api.post('/services', serviceData);
            const createdService = serviceResponse.data;

            // If upload type and icon file exists, upload icon separately
            if (service.icon_type === 'upload') {
              const iconFile = serviceIconUploads[i];
              if (iconFile) {
                // New file uploaded - upload it
                const iconFormData = new FormData();
                iconFormData.append('icon', iconFile);

                await api.post(`/services/${createdService.id}/upload-icon`, iconFormData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
              }
            }
          }
        }
      }

      setShowItemModal(false);

      setTimeout(() => {
        setItemFormData({ ...INITIAL_ITEM_FORM, services: [] });
        setEditItemMode(false);
        setCurrentItemId(null);
        setServiceIconUploads({});
      }, 100);

      // Fetch all data including services
      await Promise.all([fetchAll(), fetchServices()]);
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [itemFormData, currentWorkspace, getViewportCenter, editItemMode, currentItemId, serviceIconUploads, fetchAll, fetchServices]);

  const handleOpenManageGroups = useCallback(() => {
    setGroupFormData(INITIAL_GROUP_FORM);
    setEditGroupMode(false);
    setCurrentGroupId(null);
    setShowGroupModal(true);
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

  const handleGroupSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!currentWorkspace) {
      toast.error('Pilih workspace terlebih dahulu');
      return;
    }
    try {
      if (editGroupMode) {
        await api.put(`/groups/${currentGroupId}`, groupFormData);
      } else {
        const initialPosition = getViewportCenter();
        await api.post('/groups', {
          ...groupFormData,
          position: initialPosition,
          workspace_id: currentWorkspace.id
        });
      }
      await fetchAll();
      setShowGroupModal(false);
      setGroupFormData(INITIAL_GROUP_FORM);
      setEditGroupMode(false);
    } catch (err) {
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [editGroupMode, currentGroupId, groupFormData, currentWorkspace, getViewportCenter, fetchAll]);

  const handleDeleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      await fetchAll();
    } catch (err) {
      alert('Gagal menghapus: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenConnectionModal = useCallback((item) => {
    setSelectedItemForConnection(item);
    setSelectedConnectionType('depends_on'); // Reset to default

    const existingItemConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_id)
      .map(conn => conn.target_id);

    const existingGroupConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_group_id)
      .map(conn => conn.target_group_id);

    // Load existing service connections (target_service_id)
    const existingServiceConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_service_id)
      .map(conn => conn.target_service_id);

    // Load existing service item connections (target_service_item_id)
    const existingServiceItemConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_service_item_id)
      .map(conn => conn.target_service_item_id);

    setSelectedConnections(existingItemConns);
    setSelectedGroupConnections(existingGroupConns);

    // Load existing connection types for each selected item
    const existingTypes = {};
    connections
      .filter(conn => conn.source_id === item.id && conn.target_id)
      .forEach(conn => {
        existingTypes[conn.target_id] = conn.connection_type || 'depends_on';
      });

    setItemConnectionTypes(existingTypes);

    // Load existing connection types for each selected group
    const existingGroupTypes = {};
    connections
      .filter(conn => conn.source_id === item.id && conn.target_group_id)
      .forEach(conn => {
        existingGroupTypes[conn.target_group_id] = conn.connection_type || 'depends_on';
      });

    setItemToGroupConnectionTypes(existingGroupTypes);
    setSelectedServices(existingServiceConns);
    setSelectedServiceItems(existingServiceItemConns);
    setShowConnectionModal(true);
  }, [connections]);

  const handleConnectionTypeChange = useCallback((typeSlug) => {
    setSelectedConnectionType(typeSlug);
  }, []);

  const handleItemToGroupTypeChange = useCallback((groupId, typeSlug) => {
    setItemToGroupConnectionTypes(prev => ({
      ...prev,
      [groupId]: typeSlug
    }));
  }, []);

  const handleSaveConnections = useCallback(async (itemConnTypes = {}, groupConnTypes = {}, serviceData = {}) => {
    if (!selectedItemForConnection || !currentWorkspace) return;

    const { selectedServices = [], selectedServiceItems = [], serviceConnectionTypes = {}, serviceItemConnectionTypes = {} } = serviceData;

    try {
      // SIMPLER & MORE ROBUST APPROACH:
      // Delete all existing connections for this source, then add back the selected ones
      const existingConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_id);

      // Remove all existing item-to-item connections for this source
      for (const conn of existingConns) {
        await api.delete(`/cmdb/connections/${selectedItemForConnection.id}/${conn.target_id}`);
      }

      // Add back all selected connections with their types
      for (const targetId of selectedConnections) {
        const connectionType = itemConnTypes[targetId] || selectedConnectionType;
        await api.post('/cmdb/connections', {
          source_id: selectedItemForConnection.id,
          target_id: targetId,
          workspace_id: currentWorkspace.id,
          connection_type: connectionType,
          direction: getConnectionDirection(connectionType)
        });
      }

      // Handle group connections (remove all, then add back)
      const existingGroupConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_group_id);

      for (const conn of existingGroupConns) {
        await api.delete(`/cmdb/connections/to-group/${selectedItemForConnection.id}/${conn.target_group_id}`);
      }

      for (const groupId of selectedGroupConnections) {
        const connectionType = groupConnTypes[groupId] || selectedConnectionType;
        await api.post('/cmdb/connections/to-group', {
          source_id: selectedItemForConnection.id,
          target_group_id: groupId,
          workspace_id: currentWorkspace.id,
          connection_type: connectionType,
          direction: getConnectionDirection(connectionType)
        });
      }

      // Handle service connections (remove all, then add back)
      const existingServiceConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_service_id);

      for (const conn of existingServiceConns) {
        await api.delete(`/cmdb/connections/item-to-service/${selectedItemForConnection.id}/${conn.target_service_id}`);
      }

      for (const serviceId of selectedServices) {
        const connectionType = serviceConnectionTypes[serviceId]?.type || selectedConnectionType;
        await api.post('/cmdb/connections', {
          source_id: selectedItemForConnection.id,
          target_id: null,
          workspace_id: currentWorkspace.id,
          connection_type: connectionType,
          direction: getConnectionDirection(connectionType),
          target_service_id: serviceId
        });
      }

      // Handle service item connections (remove all, then add back)
      const existingServiceItemConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_service_item_id);

      for (const conn of existingServiceItemConns) {
        await api.delete(`/cmdb/connections/item-to-service-item/${selectedItemForConnection.id}/${conn.target_service_item_id}`);
      }

      for (const serviceItemId of selectedServiceItems) {
        const connectionType = serviceItemConnectionTypes[serviceItemId]?.type || selectedConnectionType;
        await api.post('/cmdb/connections', {
          source_id: selectedItemForConnection.id,
          target_id: null,
          workspace_id: currentWorkspace.id,
          connection_type: connectionType,
          direction: getConnectionDirection(connectionType),
          target_service_item_id: serviceItemId
        });
      }

      await fetchAll();
      setShowConnectionModal(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [selectedItemForConnection, selectedConnections, selectedGroupConnections, selectedConnectionType, currentWorkspace, fetchAll, getConnectionDirection]);

  const handleToggleConnection = (targetId) => {
    setSelectedConnections(prev =>
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  // Handler for drag-to-connect (Quick Connection Modal)
  const handleConnect = useCallback((connection) => {
    // Detect if source or target is a group, service, or service_item
    const isSourceGroup = String(connection.source).startsWith('group-');
    const isTargetGroup = String(connection.target).startsWith('group-');
    const isSourceService = String(connection.source).startsWith('service-');
    const isTargetService = String(connection.target).startsWith('service-');
    const isSourceServiceItem = String(connection.source).startsWith('service-item-');
    const isTargetServiceItem = String(connection.target).startsWith('service-item-');

    let sourceItem, targetItem, sourceGroup, targetGroup, sourceService, targetService, sourceServiceItem, targetServiceItem;

    // Parse source
    if (isSourceGroup) {
      const sourceGroupId = Number(String(connection.source).replace('group-', ''));
      sourceGroup = groups.find(g => g.id === sourceGroupId);
    } else if (isSourceService) {
      const sourceServiceId = Number(String(connection.source).replace('service-', ''));
      sourceService = services.find(s => s.id === sourceServiceId);
    } else if (isSourceServiceItem) {
      const sourceServiceItemId = Number(String(connection.source).replace('service-item-', ''));
      sourceServiceItem = serviceItems.find(si => si.id === sourceServiceItemId);
    } else {
      sourceItem = items.find(item => item.id === Number(connection.source));
    }

    // Parse target
    if (isTargetGroup) {
      const targetGroupId = Number(String(connection.target).replace('group-', ''));
      targetGroup = groups.find(g => g.id === targetGroupId);
    } else if (isTargetService) {
      const targetServiceId = Number(String(connection.target).replace('service-', ''));
      targetService = services.find(s => s.id === targetServiceId);
    } else if (isTargetServiceItem) {
      const targetServiceItemId = Number(String(connection.target).replace('service-item-', ''));
      targetServiceItem = serviceItems.find(si => si.id === targetServiceItemId);
    } else {
      targetItem = items.find(item => item.id === Number(connection.target));
    }

    // Handle service-to-service connections
    if (isSourceService && isTargetService) {
      if (!sourceService || !targetService) {
        console.error('Service nodes not found:', { sourceService, targetService });
        return;
      }

      // Check if connection already exists
      const existingServiceConn = serviceToServiceConnections.find(
        conn => conn.source_service_id === sourceService.id && conn.target_service_id === targetService.id
      );

      if (existingServiceConn) {
        toast.error('Koneksi service sudah ada!');
        return;
      }

      // Open service-to-service connection modal
      setServiceConnectionSource(sourceService);
      setServiceConnectionTarget(targetService);
      setShowServiceConnectionModal(true);
      return;
    }

    // Handle CMDB Item to/from Service connections
    // (Item <-> Service, Item <-> ServiceItem, Service <-> Item, ServiceItem <-> Item)
    const isItemToService = (sourceItem && (targetService || targetServiceItem)) ||
                           (targetItem && (sourceService || sourceServiceItem));

    if (isItemToService) {
      // For item-to-service connections, use QuickConnectionModal with special handling
      // Determine which is source and which is target for display
      let itemNode, serviceNode;

      if (sourceItem && targetService) {
        // Item (source) -> Service (target)
        itemNode = sourceItem;
        serviceNode = targetService;
      } else if (sourceItem && targetServiceItem) {
        // Item (source) -> Service Item (target)
        itemNode = sourceItem;
        serviceNode = { ...targetServiceItem, _entityType: 'service_item' };
      } else if (targetItem && sourceService) {
        // Service (source) -> Item (target)
        // Keep service as source (not swapped)
        serviceNode = sourceService;
        itemNode = targetItem;
      } else if (targetItem && sourceServiceItem) {
        // Service Item (source) -> Item (target)
        serviceNode = { ...sourceServiceItem, _entityType: 'service_item' };
        itemNode = targetItem;
      }

      if (!itemNode || !serviceNode) {
        console.error('Could not determine item/service nodes:', { sourceItem, targetItem, sourceService, targetService, sourceServiceItem, targetServiceItem });
        return;
      }

      // Set source and target for QuickConnectionModal
      // For item-to-service: source is item, target is service
      // For service-to-item: source is service, target is item
      const isServiceSource = sourceService || sourceServiceItem;
      if (isServiceSource) {
        // Service -> Item: source is service, target is item
        setQuickConnectionSource({ ...serviceNode, _entityType: 'service' });
        setQuickConnectionTarget({ ...itemNode, _entityType: 'item' });
      } else {
        // Item -> Service (or Item -> Service Item): source is item, target is service
        setQuickConnectionSource({ ...itemNode, _entityType: 'item' });
        setQuickConnectionTarget({ ...serviceNode, _entityType: 'service' });
      }
      setQuickConnectionMode('create');
      setQuickConnectionExistingType(null);
      setShowQuickConnectionModal(true);
      return;
    }

    // Check if we have valid source and target
    if ((!sourceItem && !sourceGroup) || (!targetItem && !targetGroup)) {
      return;
    }

    // Check if connection already exists
    let existingConn = null;
    if (sourceItem && targetItem) {
      existingConn = connections.find(
        conn => conn.source_id === sourceItem.id && conn.target_id === targetItem.id
      );
    } else if (sourceItem && targetGroup) {
      existingConn = connections.find(
        conn => conn.source_id === sourceItem.id && conn.target_group_id === targetGroup.id
      );
    } else if (sourceGroup && targetItem) {
      existingConn = connections.find(
        conn => conn.source_group_id === sourceGroup.id && conn.target_id === targetItem.id
      );
    } else if (sourceGroup && targetGroup) {
      toast.info('Gunakan Group Connection Modal untuk koneksi group-to-group');
      return;
    }

    if (existingConn) {
      toast.error('Koneksi sudah ada!');
      return;
    }

    // Set source and target (can be item or group)
    const sourceData = sourceGroup || sourceItem;
    const targetData = targetGroup || targetItem;

    const sourceType = sourceGroup ? 'group' : 'item';
    const targetType = targetGroup ? 'group' : 'item';

    setQuickConnectionSource({ ...sourceData, _entityType: sourceType });
    setQuickConnectionTarget({ ...targetData, _entityType: targetType });
    setQuickConnectionMode('create');
    setQuickConnectionExistingType(null);
    setShowQuickConnectionModal(true);
  }, [items, connections, groups, services, serviceItems, serviceToServiceConnections]);

  const handleSaveServiceConnection = useCallback(async (sourceServiceId, targetServiceId, connectionType, options = {}) => {
    if (!currentWorkspace) return;

    try {
      const {
        connectionTargetType = 'service',
        propagationEnabled = true,
        sourceServiceItemId,
        targetServiceItemId
      } = options;

      // Find the parent CMDB item for the source service
      const sourceService = services.find(s => s.id === sourceServiceId);
      if (!sourceService) {
        toast.error('Source service not found!');
        return;
      }

      let result;

      if (connectionTargetType === 'service_item') {
        // Create service item to service item connection (cross-service connection)
        if (!sourceServiceItemId || !targetServiceItemId) {
          toast.error('Service item IDs are required for service item connections!');
          return;
        }

        result = await api.post('/cross-service-connections', {
          source_service_item_id: sourceServiceItemId,
          target_service_item_id: targetServiceItemId,
          source_service_id: sourceServiceId,
          target_service_id: targetServiceId,
          connection_type: connectionType,
          propagation_enabled: propagationEnabled,
          workspace_id: currentWorkspace.id
        });

        if (result.data) {
          toast.success('Koneksi service item berhasil dibuat!');
          await fetchCrossServiceConnections();
        }
      } else {
        // Create service-to-service connection
        result = await api.post('/service-to-service-connections', {
          cmdb_item_id: sourceService.cmdb_item_id, // Parent CMDB item ID
          source_service_id: sourceServiceId,
          target_service_id: targetServiceId,
          connection_type: connectionType,
          propagation: propagationEnabled ? getConnectionTypeInfo(connectionType).propagation : 'none',
          workspace_id: currentWorkspace.id
        });

        if (result.data) {
          toast.success('Koneksi service-to-service berhasil dibuat!');
          await fetchServiceToServiceConnections();
        }
      }

      if (result.data) {
        setShowServiceConnectionModal(false);
        setServiceConnectionSource(null);
        setServiceConnectionTarget(null);
      }
    } catch (error) {
      console.error('Failed to create service connection:', error);
      toast.error(error.response?.data?.error || 'Gagal membuat koneksi service');
    }
  }, [currentWorkspace, fetchServiceToServiceConnections, fetchCrossServiceConnections, services]);

  const handleSaveQuickConnection = useCallback(async (connectionType, serviceItemData = null) => {
    if (!quickConnectionSource || !quickConnectionTarget || !currentWorkspace) return;

    try {
      const isSourceGroup = quickConnectionSource._entityType === 'group';
      const isTargetGroup = quickConnectionTarget._entityType === 'group';
      const isSourceService = quickConnectionSource._entityType === 'service' || String(quickConnectionSource.id).startsWith('service-');
      const isTargetService = quickConnectionTarget._entityType === 'service' || String(quickConnectionTarget.id).startsWith('service-');
      const isSourceServiceItem = quickConnectionSource._entityType === 'service_item' || String(quickConnectionSource.id).startsWith('service-item-');
      const isTargetServiceItem = quickConnectionTarget._entityType === 'service_item' || String(quickConnectionTarget.id).startsWith('service-item-');

      // Handle CMDB Item to Service / Service Item connections
      const isItemToService = (quickConnectionSource._entityType === 'item' && (isTargetService || isTargetServiceItem)) ||
                             (quickConnectionTarget._entityType === 'item' && (isSourceService || isSourceServiceItem));

      if (isItemToService) {
        // Determine the CMDB item and service/serviceitem
        let cmdbItem, serviceOrItem;
        let isServiceAsSource = false;

        if (quickConnectionSource._entityType === 'item') {
          cmdbItem = quickConnectionSource;
          serviceOrItem = quickConnectionTarget;
        } else if (quickConnectionTarget._entityType === 'item') {
          // Service is the source, item is the target - SWAP for saving
          cmdbItem = quickConnectionTarget;
          serviceOrItem = quickConnectionSource;
          isServiceAsSource = true;
        } else {
          console.error('Unknown connection pattern:', { quickConnectionSource, quickConnectionTarget });
          return;
        }

        console.log('   Processing item-to-service connection:', { cmdbItem, serviceOrItem, isServiceAsSource });
        console.log('   serviceItemData from modal:', serviceItemData);

        // Get the service or service item details
        let targetServiceId, targetServiceItemId, sourceServiceItemId;

        // If serviceItemData is provided (user selected from modal), use it
        if (serviceItemData && serviceItemData.selectedServiceItemIds && serviceItemData.selectedServiceItemIds.length > 0) {
          // User selected service items from the modal
          if (serviceItemData.isSourceService) {
            // Service is the source, user selected service item FROM the service as source
            sourceServiceItemId = serviceItemData.selectedServiceItemIds[0];
          } else {
            // Service is the target, user selected service item FROM the service as target
            targetServiceItemId = serviceItemData.selectedServiceItemIds[0];
          }

          // NOTE: We do NOT set targetServiceId here
          // The parent service can be derived from service_items.service_id in the database
          // Edge rendering in useFlowData will use serviceItemToServiceMap to find the parent service
        } else if (isServiceAsSource) {
          // Service is the source, so we need to get target (which is item, not service)
          // For service->item connection, source is service, target is item
          // We set source_service_id in this case
          const sourceIdStr = String(serviceOrItem.id || '');
          if (sourceIdStr.startsWith('service-')) {
            targetServiceId = Number(sourceIdStr.replace('service-', ''));
          } else {
            targetServiceId = serviceOrItem.id;
          }
        } else if (isTargetService || quickConnectionTarget._entityType === 'service') {
          // Fallback to target service if explicitly targeted
          const targetIdStr = String(serviceOrItem.id || '');
          if (targetIdStr.startsWith('service-')) {
            targetServiceId = Number(targetIdStr.replace('service-', ''));
          } else {
            targetServiceId = serviceOrItem.id;
          }
        } else if (isTargetServiceItem || quickConnectionTarget._entityType === 'service_item') {
          // Extract service item ID from serviceOrItem.id (could be "service-item-3" or just "3")
          const serviceItemIdStr = String(serviceOrItem.id || '');
          if (serviceItemIdStr.startsWith('service-item-')) {
            targetServiceItemId = Number(serviceItemIdStr.replace('service-item-', ''));
          } else {
            targetServiceItemId = serviceOrItem.id;
          }
          // Also get parent service ID for service item connections
          // Since user selected "Ke Service Item" from modal, quickConnectionTarget IS the parent service
          if (quickConnectionTarget._entityType === 'service') {
            targetServiceId = Number(quickConnectionTarget.id);
          } else {
            const targetIdStr = String(quickConnectionTarget.id || '');
            if (targetIdStr.startsWith('service-') && !targetIdStr.startsWith('service-item-')) {
              targetServiceId = Number(targetIdStr.replace('service-', ''));
            } else {
              // Try to find parent service from services array
              for (const service of services) {
                const serviceItemsArray = serviceItems[service.id];
                if (serviceItemsArray && Array.isArray(serviceItemsArray)) {
                  const found = serviceItemsArray.find(si => si.id === targetServiceItemId);
                  if (found) {
                    targetServiceId = service.id;
                    break;
                  }
                }
              }
            }
          }
        }

        // Check for duplicate connection before saving
        // Only check in create mode (not edit mode)
        if (quickConnectionMode === 'create') {
          const actualSourceId = isServiceAsSource ? serviceOrItem.id : cmdbItem.id;
          const isDuplicate = connections.some(conn => {
            // Must be same source
            if (conn.source_id !== actualSourceId) return false;

            // Check if both target_service_id and target_service_item_id match
            if (targetServiceId && conn.target_service_id === targetServiceId) {
              // Same service connection
              return true;
            }
            if (targetServiceItemId && conn.target_service_item_id === targetServiceItemId) {
              // Same service item connection
              return true;
            }
            // Also check target_id match for service->item connections
            if (isServiceAsSource && cmdbItem && conn.target_id === cmdbItem.id) {
              return true;
            }
            return false;
          });

          if (isDuplicate) {
            toast.error('Koneksi sudah ada! Tidak boleh membuat koneksi duplikat.');
            return;
          }
        }

        try {
          // Save to connections table with target_service_id
          // For item-to-service, we set target_id = null and only use target_service_id
          let connectionData;

          if (isServiceAsSource) {
            // Service is the source, item is the target
            // If user selected a service item as source, use source_service_item_id
            // Otherwise, use source_service_id (service as source)
            if (sourceServiceItemId) {
              // User selected service item FROM the service as source
              connectionData = {
                source_service_item_id: sourceServiceItemId, // service item as source
                source_id: null,
                source_service_id: null, // Must be null when using source_service_item_id
                target_id: cmdbItem.id, // item as target
                target_service_id: null,
                target_service_item_id: null,
                workspace_id: currentWorkspace.id,
                connection_type: connectionType,
                direction: getConnectionDirection(connectionType)
              };
              console.log('\n🔗 ========================================');
              console.log('🔗 CREATING SERVICE-ITEM-TO-ITEM CONNECTION');
              console.log('🔗 ========================================');
              console.log('🔗 Source Service Item ID:', sourceServiceItemId);
              console.log('🔗 Target CMDB Item ID:', cmdbItem.id);
              console.log('🔗 Target CMDB Item Name:', cmdbItem.name);
              console.log('🔗 Connection Type:', connectionType);
              console.log('🔗 Connection Data:', JSON.stringify(connectionData, null, 2));
              console.log('🔗 ========================================\n');
            } else {
              // User selected the service itself as source (not a service item)
              connectionData = {
                source_service_id: serviceOrItem.id, // service as source
                source_id: null,
                target_id: cmdbItem.id, // item as target
                workspace_id: currentWorkspace.id,
                connection_type: connectionType,
                direction: getConnectionDirection(connectionType)
              };
            }
          } else {
            // Item is the source, service is the target
            connectionData = {
              source_id: cmdbItem.id,
              target_id: null, // Set to null since we're connecting to a service, not an item
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType),
              target_service_id: targetServiceId,
              target_service_item_id: targetServiceItemId
            };
          }

          console.log('   Saving item-to-service connection:', connectionData);
          setIsSavingConnection(true);
          const response = await api.post('/cmdb/connections', connectionData);
          console.log('   Connection saved successfully:', response.data);

          toast.success('Koneksi item-to-service berhasil dibuat!');
          await Promise.all([fetchAll(), fetchServices(), fetchServiceToServiceConnections(), fetchCrossServiceConnections()]);

          // Add small delay to ensure React has processed the state updates
          await new Promise(resolve => setTimeout(resolve, 100));

          setIsSavingConnection(false);
          setShowQuickConnectionModal(false);
          setQuickConnectionSource(null);
          setQuickConnectionTarget(null);
          return;
        } catch (err) {
          console.error('   Failed to save item-to-service connection:', err);
          toast.error('Gagal menyimpan koneksi: ' + (err.response?.data?.error || err.message));
          return;
        }
      }

      try {
        setIsSavingConnection(true);

        if (quickConnectionMode === 'edit') {
          // Update existing connection
          if (!isSourceGroup && !isTargetGroup) {
            await api.put(`/cmdb/connections/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Tipe koneksi berhasil diubah!');
          } else if (isSourceGroup && !isTargetGroup) {
            await api.put(`/cmdb/connections/from-group/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Tipe koneksi group-to-item berhasil diubah!');
          } else if (!isSourceGroup && isTargetGroup) {
            await api.put(`/cmdb/connections/to-group/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Tipe koneksi item-to-group berhasil diubah!');
          } else {
            toast.error('Edit koneksi group-to-group: Gunakan Group Connection Modal.');
          }
        } else {
          // Create new connection
          if (isSourceGroup && isTargetGroup) {
            await api.post('/groups/connections', {
              source_id: quickConnectionSource.id,
              target_id: quickConnectionTarget.id,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Koneksi group-to-group berhasil dibuat!');
          } else if (isSourceGroup && !isTargetGroup) {
            await api.post('/cmdb/connections/from-group', {
              source_group_id: quickConnectionSource.id,
              target_id: quickConnectionTarget.id,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Koneksi group-to-item berhasil dibuat!');
          } else if (!isSourceGroup && isTargetGroup) {
            await api.post('/cmdb/connections/to-group', {
              source_id: quickConnectionSource.id,
              target_group_id: quickConnectionTarget.id,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Koneksi item-to-group berhasil dibuat!');
          } else {
            await api.post('/cmdb/connections', {
              source_id: quickConnectionSource.id,
              target_id: quickConnectionTarget.id,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType,
              direction: getConnectionDirection(connectionType)
            });
            toast.success('Koneksi berhasil dibuat!');
          }
        }

        await Promise.all([fetchAll(), fetchServices(), fetchServiceToServiceConnections(), fetchCrossServiceConnections()]);

        // Add small delay to ensure React has processed the state updates
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsSavingConnection(false);
        setShowQuickConnectionModal(false);
        setQuickConnectionSource(null);
        setQuickConnectionTarget(null);
      } catch (apiError) {
        setIsSavingConnection(false);
        throw apiError; // Re-throw to outer catch block
      }
    } catch (err) {
      console.error('Save connection error:', err);
      toast.error('Gagal menyimpan koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [quickConnectionSource, quickConnectionTarget, quickConnectionMode, currentWorkspace, fetchAll, fetchServiceToServiceConnections, fetchCrossServiceConnections, getConnectionDirection]);

  // Edge Context Menu handlers
  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();

    // Prevent context menu on pane click
    if (!edge) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    setEdgeContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      edge,
      sourceNode,
      targetNode,
      servicesMap, // Pass servicesMap for service name lookup
      serviceItems, // Pass serviceItems for service item name lookup
    });
  }, [nodes, servicesMap, serviceItems]);

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu.edge) return;

    try {
      const edge = edgeContextMenu.edge;
      const isGroupToItem = String(edge.source).startsWith('group-');
      const isItemToGroup = String(edge.target).startsWith('group-');
      const isGroupToGroup = isGroupToItem && isItemToGroup;
      const isServiceToServiceConnection = String(edge.id).startsWith('service-connection-');
      const isCrossServiceConnection = String(edge.id).startsWith('cross-service-connection-');
      const isSourceService = String(edge.source).startsWith('service-');
      const isTargetService = String(edge.target).startsWith('service-');
      const isServiceToItem = isSourceService && !isTargetService && String(edge.target).match(/^\d+$/);
      // Check if this is an item-to-service-item connection (edge id contains '-service-' pattern)
      const isItemToServiceItem = isTargetService && String(edge.id).includes('-service-item-') && !isServiceToServiceConnection;
      // Check if this is a service-item-to-item connection (service item as source)
      // Edge ID format: eservice-item-{serviceItemId}-{targetId}
      const isServiceItemToItem = String(edge.id).startsWith('eservice-item-');

      let deleteUrl;
      if (isServiceToServiceConnection) {
        // Service-to-service connection: DELETE /api/service-to-service-connections/:id
        const connectionId = String(edge.id).replace('service-connection-', '');
        deleteUrl = `/service-to-service-connections/${connectionId}`;
      } else if (isCrossServiceConnection) {
        // Cross-service connection (service item to service item): DELETE /api/cross-service-connections/:id
        const connectionId = String(edge.id).replace('cross-service-connection-', '');
        deleteUrl = `/cross-service-connections/${connectionId}`;
      } else if (isServiceItemToItem) {
        // Service-item-to-item connection: source is service item, target is item
        // Edge ID format: eservice-item-{serviceItemId}-{targetId}
        // Need to DELETE by source_service_item_id
        const edgeIdStr = String(edge.id);
        const serviceItemIdMatch = edgeIdStr.match(/^eservice-item-(\d+)-(\d+)$/);
        if (serviceItemIdMatch) {
          const sourceServiceItemId = serviceItemIdMatch[1]; // Service item ID
          const targetItemId = serviceItemIdMatch[2]; // Target CMDB item ID
          deleteUrl = `/cmdb/connections/service-item-to-item/${sourceServiceItemId}/${targetItemId}`;
        } else {
          console.error('Invalid service-item-to-item edge ID format:', edgeIdStr);
          toast.error('Format edge ID tidak valid untuk service-item-to-item connection');
          return;
        }
      } else if (isServiceToItem) {
        // Service-to-item connection: source is service, target is item
        // Edge id pattern: e{service-x}-{itemId}
        const sourceServiceId = String(edge.source).replace('service-', '');
        const targetItemId = edge.target;
        deleteUrl = `/cmdb/connections/from-service/${sourceServiceId}/${targetItemId}`;
      } else if (isItemToServiceItem) {
        // Item-to-service-item connection: DELETE /api/cmdb/connections/item-to-service-item/:sourceId/:targetServiceItemId
        // Edge id pattern: e{source_id}-service-item-{serviceItemId}
        const sourceId = edge.source;
        const edgeIdStr = String(edge.id);
        const targetServiceItemId = edgeIdStr.replace(`e${sourceId}-service-item-`, '');
        deleteUrl = `/cmdb/connections/item-to-service-item/${sourceId}/${targetServiceItemId}`;
      } else if (isTargetService) {
        // Item-to-service connection: DELETE /api/cmdb/connections/item-to-service/:sourceId/:targetServiceId
        // For item-to-service, target_id in DB is NULL and target_service_id stores the service ID
        const sourceId = edge.source;
        const targetServiceId = String(edge.target).replace('service-', '');
        deleteUrl = `/cmdb/connections/item-to-service/${sourceId}/${targetServiceId}`;
      } else if (isGroupToGroup) {
        // Group-to-group: DELETE /api/groups/connections/:sourceId/:targetId
        const sourceGroupId = String(edgeContextMenu.edge.source).replace('group-', '');
        const targetGroupId = String(edgeContextMenu.edge.target).replace('group-', '');
        deleteUrl = `/groups/connections/${sourceGroupId}/${targetGroupId}`;
      } else if (isGroupToItem) {
        // Group-to-item: DELETE /api/cmdb/connections/from-group/:sourceGroupId/:targetId
        const sourceGroupId = String(edgeContextMenu.edge.source).replace('group-', '');
        deleteUrl = `/cmdb/connections/from-group/${sourceGroupId}/${edgeContextMenu.edge.target}`;
      } else if (isItemToGroup) {
        // Item-to-group: DELETE /api/cmdb/connections/to-group/:sourceId/:targetGroupId
        const targetGroupId = String(edgeContextMenu.edge.target).replace('group-', '');
        deleteUrl = `/cmdb/connections/to-group/${edgeContextMenu.edge.source}/${targetGroupId}`;
      } else {
        // Item-to-item: DELETE /api/cmdb/connections/:sourceId/:targetId
        deleteUrl = `/cmdb/connections/${edgeContextMenu.edge.source}/${edgeContextMenu.edge.target}`;
      }

      await api.delete(deleteUrl);
      toast.success('Koneksi berhasil dihapus');

      // Fetch cmdb, service-to-service connections, and cross-service connections data
      await Promise.all([
        fetchAll(),
        fetchServiceToServiceConnections(),
        fetchCrossServiceConnections()
      ]);
    } catch (err) {
      console.error('Delete connection error:', err);
      toast.error('Gagal menghapus koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [edgeContextMenu.edge, fetchAll, fetchServiceToServiceConnections, fetchCrossServiceConnections]);

  const handleEditEdge = useCallback(() => {
    if (!edgeContextMenu.edge) return;

    const edge = edgeContextMenu.edge;

    // Deteksi tipe koneksi
    const isGroupToItem = String(edge.source).startsWith('group-');
    const isItemToGroup = String(edge.target).startsWith('group-');
    const isGroupToGroup = isGroupToItem && isItemToGroup;
    const isItemToService = String(edge.target).startsWith('service-') && !String(edge.target).startsWith('service-item-');

    let sourceItem, targetItem, sourceGroup, targetGroup;
    let connectionType = edge.data?.connectionType || edge.label || 'depends_on';

    // Handle item-to-service connections
    if (isItemToService) {
      const sourceId = Number(edge.source);
      const targetServiceId = Number(String(edge.target).replace('service-', ''));

      sourceItem = items.find(item => item.id === sourceId);
      const targetService = services.find(s => Number(s.id) === targetServiceId);

      if (!sourceItem || !targetService) {
        toast.error('Source item atau target service tidak ditemukan!');
        return;
      }

      // Find the connection in the connections array
      // Since we now only save target_service_id for direct service connections,
      // and target_service_item_id for service item connections (no target_service_id),
      // we need to find by source + target_service_item
      const existingConnection = connections.find(
        conn => conn.source_id === sourceId && conn.target_service_item_id
      );
      const existingServiceItemId = existingConnection?.target_service_item_id || null;

      setQuickConnectionSource({ ...sourceItem, _entityType: 'item' });
      setQuickConnectionTarget({ ...targetService, _entityType: 'service' });
      setQuickConnectionMode('edit');
      setQuickConnectionExistingType(connectionType);
      setQuickConnectionExistingServiceItemId(existingServiceItemId);
      setShowQuickConnectionModal(true);
      return;
    }

    if (isGroupToGroup) {
      // Group-to-group - gunakan Group Connection Modal
      const sourceGroupId = Number(String(edge.source).replace('group-', ''));
      sourceGroup = groups.find(g => g.id === sourceGroupId);
      if (sourceGroup) {
        toast.info('Membuka Group Connection Modal untuk edit koneksi group-to-group.');
        // Set state langsung tanpa memanggil handleOpenGroupConnectionModal
        setSelectedGroupForConnection(sourceGroup);
        setSelectedConnectionType('depends_on');

        // Load existing connections
        const existingGroupConns = groupConnections
          .filter(conn => conn.source_id === sourceGroup.id)
          .map(conn => conn.target_id);
        const existingItemConns = connections
          .filter(conn => conn.source_group_id === sourceGroup.id)
          .map(conn => conn.target_id);

        setSelectedGroupToGroupConnections(existingGroupConns);
        setSelectedGroupToItemConnections(existingItemConns);

        // Load existing connection types
        const existingGroupTypes = {};
        groupConnections
          .filter(conn => conn.source_id === sourceGroup.id)
          .forEach(conn => {
            existingGroupTypes[conn.target_id] = conn.connection_type || 'depends_on';
          });
        setGroupToGroupConnectionTypes(existingGroupTypes);

        const existingItemTypes = {};
        connections
          .filter(conn => conn.source_group_id === sourceGroup.id)
          .forEach(conn => {
            existingItemTypes[conn.target_id] = conn.connection_type || 'depends_on';
          });
        setGroupToItemConnectionTypes(existingItemTypes);

        setShowGroupConnectionModal(true);
      }
      return;
    }

    if (isGroupToItem) {
      // source is group, target is item
      const sourceGroupId = Number(String(edge.source).replace('group-', ''));
      const targetId = Number(edge.target);
      sourceGroup = groups.find(g => g.id === sourceGroupId);
      targetItem = items.find(item => item.id === targetId);
      if (!sourceGroup || !targetItem) {
        toast.error('Source group atau target item tidak ditemukan!');
        return;
      }
      // Open Quick Connection Modal for group-to-item
      setQuickConnectionSource({ ...sourceGroup, _entityType: 'group' });
      setQuickConnectionTarget({ ...targetItem, _entityType: 'item' });
      setQuickConnectionMode('edit');
      setQuickConnectionExistingType(connectionType);
      setShowQuickConnectionModal(true);
      return;
    }

    if (isItemToGroup) {
      // source is item, target is group
      const sourceId = Number(edge.source);
      const targetGroupId = Number(String(edge.target).replace('group-', ''));
      sourceItem = items.find(item => item.id === sourceId);
      targetGroup = groups.find(g => g.id === targetGroupId);
      if (!sourceItem || !targetGroup) {
        toast.error('Source item atau target group tidak ditemukan!');
        return;
      }
      // Open Quick Connection Modal for item-to-group
      setQuickConnectionSource({ ...sourceItem, _entityType: 'item' });
      setQuickConnectionTarget({ ...targetGroup, _entityType: 'group' });
      setQuickConnectionMode('edit');
      setQuickConnectionExistingType(connectionType);
      setShowQuickConnectionModal(true);
      return;
    }

    // Handle item-to-item connections
    sourceItem = items.find(item => item.id === Number(edge.source));
    targetItem = items.find(item => item.id === Number(edge.target));

    if (sourceItem && targetItem) {
      setQuickConnectionSource({ ...sourceItem, _entityType: 'item' });
      setQuickConnectionTarget({ ...targetItem, _entityType: 'item' });
      setQuickConnectionMode('edit');
      setQuickConnectionExistingType(edge.data?.connectionType || 'depends_on');
      setShowQuickConnectionModal(true);
    }
  }, [edgeContextMenu.edge, items, groups, groupConnections, connections]);

  const handleToggleGroupConnection = (groupId) => {
    setSelectedGroupConnections(prev => {
      const isSelected = prev.includes(groupId);
      const newSelection = isSelected
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];

      // Update connection types - add default when selecting, remove when deselecting
      setItemToGroupConnectionTypes(prevTypes => {
        const newTypes = { ...prevTypes };
        if (!isSelected) {
          // Adding group - set default connection type
          newTypes[groupId] = selectedConnectionType || 'depends_on';
        } else {
          // Removing group - delete its connection type
          delete newTypes[groupId];
        }
        return newTypes;
      });

      return newSelection;
    });
  };

  const handleOpenGroupConnectionModal = (group) => {
    setSelectedGroupForConnection(group);
    setSelectedConnectionType('depends_on'); // Reset to default

    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === group.id)
      .map(conn => conn.target_id);

    const existingItemConns = connections
      .filter(conn => conn.source_group_id === group.id)
      .map(conn => conn.target_id);

    setSelectedGroupToGroupConnections(existingGroupConns);
    setSelectedGroupToItemConnections(existingItemConns);

    // Load existing connection types for group-to-group connections
    const existingGroupTypes = {};
    groupConnections
      .filter(conn => conn.source_id === group.id)
      .forEach(conn => {
        existingGroupTypes[conn.target_id] = conn.connection_type || 'depends_on';
      });
    setGroupToGroupConnectionTypes(existingGroupTypes);

    // Load existing connection types for group-to-item connections
    const existingItemTypes = {};
    connections
      .filter(conn => conn.source_group_id === group.id)
      .forEach(conn => {
        existingItemTypes[conn.target_id] = conn.connection_type || 'depends_on';
      });
    setGroupToItemConnectionTypes(existingItemTypes);

    setShowGroupConnectionModal(true);
  };

  const handleToggleGroupToGroupConnection = (targetGroupId) => {
    setSelectedGroupToGroupConnections(prev => {
      const isSelected = prev.includes(targetGroupId);
      const newSelection = isSelected
        ? prev.filter(id => id !== targetGroupId)
        : [...prev, targetGroupId];

      // Update connection types
      setGroupToGroupConnectionTypes(prevTypes => {
        const newTypes = { ...prevTypes };
        if (!isSelected) {
          // Adding group - set default connection type
          newTypes[targetGroupId] = selectedConnectionType || 'depends_on';
        } else {
          // Removing group - delete its connection type
          delete newTypes[targetGroupId];
        }
        return newTypes;
      });

      return newSelection;
    });
  };

  const handleToggleGroupToItemConnection = (targetItemId) => {
    setSelectedGroupToItemConnections(prev => {
      const isSelected = prev.includes(targetItemId);
      const newSelection = isSelected
        ? prev.filter(id => id !== targetItemId)
        : [...prev, targetItemId];

      // Update connection types
      setGroupToItemConnectionTypes(prevTypes => {
        const newTypes = { ...prevTypes };
        if (!isSelected) {
          // Adding item - set default connection type
          newTypes[targetItemId] = selectedConnectionType || 'depends_on';
        } else {
          // Removing item - delete its connection type
          delete newTypes[targetItemId];
        }
        return newTypes;
      });

      return newSelection;
    });
  };

  const handleSaveGroupConnections = async (groupConnTypes = {}, itemConnTypes = {}) => {
  if (!currentWorkspace || !selectedGroupForConnection) return;

  try {
    const currentGroupConns = groupConnections
      .filter(conn => conn.source_id === selectedGroupForConnection.id)
      .map(conn => conn.target_id);

    const groupsToAdd = selectedGroupToGroupConnections.filter(id => !currentGroupConns.includes(id));
    const groupsToRemove = currentGroupConns.filter(id => !selectedGroupToGroupConnections.includes(id));

    for (const targetId of groupsToAdd) {
      const connectionType = groupConnTypes[targetId] || 'depends_on';
      await api.post('/groups/connections', {
        source_id: selectedGroupForConnection.id,
        target_id: targetId,
        workspace_id: currentWorkspace.id,
        connection_type: connectionType,
        direction: getConnectionDirection(connectionType)
      });
    }

    for (const targetId of groupsToRemove) {
      await api.delete(`/groups/connections/${selectedGroupForConnection.id}/${targetId}`);
    }

    const currentItemConns = connections
      .filter(conn => conn.source_group_id === selectedGroupForConnection.id)
      .map(conn => conn.target_id);

    const itemsToAdd = selectedGroupToItemConnections.filter(id => !currentItemConns.includes(id));
    const itemsToRemove = currentItemConns.filter(id => !selectedGroupToItemConnections.includes(id));

    for (const targetId of itemsToAdd) {
      const connectionType = itemConnTypes[targetId] || 'depends_on';
      await api.post('/cmdb/connections/from-group', {
        source_group_id: selectedGroupForConnection.id,
        target_id: targetId,
        workspace_id: currentWorkspace.id,
        connection_type: connectionType,
        direction: getConnectionDirection(connectionType)
      });
    }

    for (const targetId of itemsToRemove) {
      await api.delete(`/cmdb/connections/from-group/${selectedGroupForConnection.id}/${targetId}`);
    }

    await fetchAll();
    setShowGroupConnectionModal(false);
  } catch (err) {
    console.error(err);
    toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
  }
};

  const getConnectionInfo = useCallback((itemId) => {
    const targetItemId = parseInt(itemId);

    // Regular item-to-item connections
    const itemToItemAsSource = connections.filter(c => parseInt(c.source_id) === targetItemId).length;
    const itemToItemAsTarget = connections.filter(c => parseInt(c.target_id) === targetItemId).length;

    // Service-to-service connections (via services attached to this item)
    const itemServices = servicesMap[itemId] || [];
    let serviceToServiceCount = 0;
    itemServices.forEach(service => {
      const serviceConns = serviceToServiceConnections.filter(
        c => parseInt(c.source_service_id) === parseInt(service.id) || parseInt(c.target_service_id) === parseInt(service.id)
      );
      serviceToServiceCount += serviceConns.length;
    });

    // Cross-service connections (via service items attached to services of this item)
    let crossServiceCount = 0;
    itemServices.forEach(service => {
      // Get service items for this service
      if (service.service_items) {
        service.service_items.forEach(serviceItem => {
          const serviceItemConns = crossServiceConnections.filter(
            c => parseInt(c.source_service_item_id) === parseInt(serviceItem.id) || parseInt(c.target_service_item_id) === parseInt(serviceItem.id)
          );
          crossServiceCount += serviceItemConns.length;
        });
      }
    });

    return {
      dependencies: itemToItemAsTarget,
      dependents: itemToItemAsSource,
      serviceConnections: serviceToServiceCount,
      crossServiceConnections: crossServiceCount,
      total: itemToItemAsSource + itemToItemAsTarget + serviceToServiceCount + crossServiceCount
    };
  }, [connections, serviceToServiceConnections, crossServiceConnections, servicesMap]);

  const getConnectionDetails = useCallback((itemId) => {
    const itemServices = servicesMap[itemId] || [];
    const targetItemId = parseInt(itemId);

    // Get outgoing connections (as source)
    const outgoingConnections = connections
      .filter(c => {
        const sourceId = c.source_id ? parseInt(c.source_id) : null;
        const sourceServiceItemId = c.source_service_item_id ? parseInt(c.source_service_item_id) : null;
        const targetId = c.target_id ? parseInt(c.target_id) : null;

        // Check if this connection belongs to this CMDB item
        let isFromThisItem = false;
        if (sourceId === targetItemId) {
          // Direct item-to-item connection
          isFromThisItem = true;
        } else if (sourceServiceItemId) {
          // Service-item-to-item connection - check if service item belongs to this item's services
          for (const service of itemServices) {
            if (service.service_items && Array.isArray(service.service_items)) {
              const hasThisServiceItem = service.service_items.some(si => parseInt(si.id) === sourceServiceItemId);
              if (hasThisServiceItem) {
                isFromThisItem = true;
                break;
              }
            }
          }
        }

        return isFromThisItem && targetId;
      })
      .map(conn => {
        const targetItem = items.find(i => i.id === parseInt(conn.target_id));

        // Get source info
        let sourceName, sourceType;
        if (conn.source_service_item_id) {
          // This is a service-item-to-item connection
          // Find the service item and its parent service
          for (const [itemId, itemServices] of Object.entries(servicesMap)) {
            const service = itemServices.find(s => s.service_items?.some(si => si.id === conn.source_service_item_id));
            if (service) {
              const serviceItem = service.service_items?.find(si => si.id === conn.source_service_item_id);
              const parentItem = items.find(i => i.id === parseInt(itemId));
              sourceName = `${parentItem?.name || 'Unknown'} > ${service.name} > ${serviceItem?.name || 'Unknown'}`;
              sourceType = `Service Item (${serviceItem?.name || 'Unknown'})`;
              break;
            }
          }
        } else {
          const sourceItem = items.find(i => i.id === parseInt(conn.source_id));
          sourceName = sourceItem?.name || `Item ${conn.source_id}`;
          sourceType = sourceItem?.type || 'Unknown';
        }

        return {
          type: 'item-to-item',
          direction: 'outgoing',
          connectionType: conn.connection_type || 'depends_on',
          sourceName,
          sourceType,
          targetName: targetItem?.name || `Item ${conn.target_id}`,
          targetType: targetItem?.type || 'Unknown',
          isServiceItemConnection: !!conn.source_service_item_id
        };
      });

    // Get incoming connections (as target)
    const incomingConnections = connections
      .filter(c => {
        const targetId = parseInt(c.target_id);

        // Only check if target is this item - show ALL incoming connections
        return targetId === targetItemId;
      })
      .map(conn => {
        // Get source info
        let sourceName, sourceType;
        if (conn.source_service_item_id) {
          // This is a service-item-to-item connection
          // Find the service item and its parent service
          for (const [itemId, itemServices] of Object.entries(servicesMap)) {
            const service = itemServices.find(s => s.service_items?.some(si => si.id === conn.source_service_item_id));
            if (service) {
              const serviceItem = service.service_items?.find(si => si.id === conn.source_service_item_id);
              const parentItem = items.find(i => i.id === parseInt(itemId));
              sourceName = `${parentItem?.name || 'Unknown'} > ${service.name} > ${serviceItem?.name || 'Unknown'}`;
              sourceType = `Service Item (${serviceItem?.name || 'Unknown'})`;
              break;
            }
          }
        } else {
          const sourceItem = items.find(i => i.id === parseInt(conn.source_id));
          sourceName = sourceItem?.name || `Item ${conn.source_id}`;
          sourceType = sourceItem?.type || 'Unknown';
        }

        return {
          type: 'item-to-item',
          direction: 'incoming',
          connectionType: conn.connection_type || 'depends_on',
          sourceName,
          sourceType,
          isServiceItemConnection: !!conn.source_service_item_id
        };
      });

    // Get service-to-service connections
    const serviceConnections = [];
    itemServices.forEach(service => {
      const outgoingServiceConns = serviceToServiceConnections.filter(
        c => parseInt(c.source_service_id) === parseInt(service.id)
      );
      outgoingServiceConns.forEach(conn => {
        const targetService = itemServices.find(s => parseInt(s.id) === parseInt(conn.target_service_id));
        if (targetService) {
          serviceConnections.push({
            type: 'service-to-service',
            direction: 'outgoing',
            sourceServiceName: service.name,
            targetServiceName: targetService.name,
            connectionType: conn.connection_type || 'depends_on'
          });
        }
      });
    });

    // Get cross-service connections (both outgoing and incoming)
    const crossServiceConns = [];
    itemServices.forEach(service => {
      if (service.service_items) {
        service.service_items.forEach(serviceItem => {
          // Outgoing cross-service connections
          const outgoing = crossServiceConnections.filter(
            c => parseInt(c.source_service_item_id) === parseInt(serviceItem.id)
          );
          outgoing.forEach(conn => {
            // Find target service item info
            let targetServiceItemName = 'Unknown';
            let targetServiceName = 'Unknown';
            let targetParentItemName = 'Unknown';

            // Search through all items' services to find the target
            for (const [itemId, itemServices] of Object.entries(servicesMap)) {
              const targetService = itemServices.find(s => {
                if (s.service_items) {
                  return s.service_items.some(si => parseInt(si.id) === parseInt(conn.target_service_item_id));
                }
                return false;
              });

              if (targetService) {
                const targetServiceItem = targetService.service_items.find(
                  si => parseInt(si.id) === parseInt(conn.target_service_item_id)
                );
                const targetParentItem = items.find(i => i.id === parseInt(itemId));
                targetServiceItemName = targetServiceItem?.name || 'Unknown';
                targetServiceName = targetService.name;
                targetParentItemName = targetParentItem?.name || 'Unknown';
                break;
              }
            }

            crossServiceConns.push({
              type: 'cross-service',
              direction: 'outgoing',
              sourceServiceItemName: serviceItem.name,
              sourceServiceName: service.name,
              targetServiceItemName,
              targetServiceName,
              targetParentItemName,
              connectionType: conn.connection_type || 'connects_to'
            });
          });

          // Incoming cross-service connections
          const incoming = crossServiceConnections.filter(
            c => parseInt(c.target_service_item_id) === parseInt(serviceItem.id)
          );
          incoming.forEach(conn => {
            // Find source service item info
            let sourceServiceItemName = 'Unknown';
            let sourceServiceName = 'Unknown';
            let sourceParentItemName = 'Unknown';

            // Search through all items' services to find the source
            for (const [itemId, itemServices] of Object.entries(servicesMap)) {
              const sourceService = itemServices.find(s => {
                if (s.service_items) {
                  return s.service_items.some(si => parseInt(si.id) === parseInt(conn.source_service_item_id));
                }
                return false;
              });

              if (sourceService) {
                const sourceServiceItem = sourceService.service_items.find(
                  si => parseInt(si.id) === parseInt(conn.source_service_item_id)
                );
                const sourceParentItem = items.find(i => i.id === parseInt(itemId));
                sourceServiceItemName = sourceServiceItem?.name || 'Unknown';
                sourceServiceName = sourceService.name;
                sourceParentItemName = sourceParentItem?.name || 'Unknown';
                break;
              }
            }

            crossServiceConns.push({
              type: 'cross-service',
              direction: 'incoming',
              sourceServiceItemName,
              sourceServiceName,
              sourceParentItemName,
              targetServiceItemName: serviceItem.name,
              targetServiceName: service.name,
              connectionType: conn.connection_type || 'connects_to'
            });
          });
        });
      }
    });

    return {
      outgoing: outgoingConnections,
      incoming: incomingConnections,
      serviceConnections,
      crossServiceConnections: crossServiceConns
    };
  }, [connections, serviceToServiceConnections, crossServiceConnections, servicesMap, items]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nama',
        searchable: true,
        sortable: true,
      },
      {
        key: 'status',
        label: 'Status',
        isEnum: true,
        enumOptions: [
          { value: 'active', label: 'Active', color: STATUS_COLORS.active },
          { value: 'inactive', label: 'Inactive', color: STATUS_COLORS.inactive },
          { value: 'maintenance', label: 'Maintenance', color: STATUS_COLORS.maintenance },
        ],
        searchable: true,
        sortable: true,
      },
      {
        key: 'location',
        label: 'Lokasi',
        searchable: true,
        sortable: true,
      },
      {
        key: 'group_id',
        label: 'Group',
        sortable: true,
        searchable: true,
        isEnum: true,
        enumOptions: [
          { value: 'null', label: 'No Group' },
          ...groups.map(g => ({ value: g.id.toString(), label: g.name }))
        ],
        render: (item) => {
          const groupId = item.group_id;
          const group = groups.find(g => g.id === groupId);
          return group ? (
            <span className="px-2 py-1 rounded text-xs text-black" style={{
              backgroundColor: group.color,
              border: '1px solid #6366f1'
            }}>
              {group.name}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          );
        },
      },
      {
        key: 'services',
        label: 'Services',
        searchable: false,
        sortable: true,
        render: (item) => {
          const itemServices = servicesMap[item.id] || [];
          const count = itemServices.length;
          return (
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      count === 0
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {count} Service{count !== 1 ? 's' : ''}
                    </span>
                    {count > 0 && (
                      <div className="flex gap-1">
                        {itemServices.slice(0, 3).map((service, idx) => (
                          <div
                            key={idx}
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: service.status === 'active' ? '#22c55e' : '#ef4444'
                            }}
                          />
                        ))}
                        {count > 3 && (
                          <span className="text-xs text-gray-500">+{count - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverTrigger>
              {count > 0 && (
                <PopoverContent className="w-96 max-h-[400px] overflow-y-auto" align="start" side="right">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm border-b pb-2">Services & Items ({count})</h4>
                    {itemServices.map((service) => (
                      <div key={service.id} className="space-y-1">
                        {/* Service Header - Always visible */}
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-2 h-2 rounded-full ${
                              service.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="font-medium text-sm">{service.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            service.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {service.status}
                          </span>
                        </div>

                        {/* Service Items - Folder-like structure */}
                        {service.service_items && service.service_items.length > 0 ? (
                          <div className="ml-2">
                            {service.service_items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between py-1.5 px-2 text-xs hover:bg-muted/50 rounded"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  {/* Indentation like folder structure */}
                                  <span className="text-muted-foreground">├─</span>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    item.status === 'active'
                                      ? 'bg-green-500'
                                      : item.status === 'maintenance'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`} />
                                  <span className="text-foreground">{item.name}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  item.status === 'active'
                                    ? 'bg-green-50 text-green-700'
                                    : item.status === 'maintenance'
                                    ? 'bg-yellow-50 text-yellow-700'
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="ml-6 pl-3 border-l-2 border-muted">
                            <div className="py-1.5 px-2 text-xs text-muted-foreground italic">
                              └─ No service items
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        },
      },
      ...(viewAllMode ? [{
        key: 'workspace_id',
        label: 'Workspace',
        sortable: true,
        searchable: true,
        isEnum: true,
        enumOptions: [
          ...workspaces.map(w => ({ value: w.id.toString(), label: w.name }))
        ],
        render: (item) => {
          const workspace = workspaces.find(w => w.id === item.workspace_id);
          return workspace ? (
            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 border border-purple-300">
              {workspace.name}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          );
        },
      }] : []),
      {
        key: 'connections',
        label: 'Koneksi',
        searchable: false,
        sortable: false,
        render: (item) => {
          const connInfo = getConnectionInfo(item.id);
          const connDetails = getConnectionDetails(item.id);

          console.log(`🔍 [${item.name}] Item ID: ${item.id} (type: ${typeof item.id})`);
          console.log(`   - Total connections: ${connInfo.total}`);
          console.log(`   - Outgoing: ${connInfo.dependents}, Incoming: ${connInfo.dependencies}`);
          console.log(`   - Service-to-Service: ${connInfo.serviceConnections}, Cross-Service: ${connInfo.crossServiceConnections}`);
          console.log(`   - All connections for this item:`, connections.filter(c => {
            const sid = c.source_id ? parseInt(c.source_id) : null;
            const tid = c.target_id ? parseInt(c.target_id) : null;
            const ssid = c.source_service_item_id ? parseInt(c.source_service_item_id) : null;
            return sid === parseInt(item.id) || tid === parseInt(item.id) || ssid === parseInt(item.id);
          }));

          console.log(`   - Outgoing details:`, connDetails.outgoing);
          console.log(`   - Incoming details:`, connDetails.incoming);

          return (
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  {connInfo.total === 0 ? (
                    <span className="text-gray-400 text-xs">Tidak ada koneksi</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs"
                    >
                      Detail
                    </Button>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] max-h-[500px] overflow-y-auto" align="start" side="right">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm border-b pb-2">Detail Koneksi: {item.name}</h4>

                  {/* Outgoing Connections (As Source) */}
                  {connDetails.outgoing.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Menghubungi Ke ({connDetails.outgoing.length})
                      </h5>
                      <div className="space-y-1">
                        {connDetails.outgoing.map((conn, idx) => (
                          <div key={idx} className={`p-2 border rounded text-xs ${conn.isServiceItemConnection ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {conn.isServiceItemConnection ? (
                                  <>
                                    <p className="font-medium text-foreground text-[10px] text-indigo-700">Via Service Item:</p>
                                    <p className="text-foreground font-semibold">{conn.sourceName}</p>
                                  </>
                                ) : (
                                  <p className="font-medium text-foreground">{conn.sourceName}</p>
                                )}
                                <p className="text-muted-foreground text-[10px]">Type: {conn.targetType}</p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                                {conn.connectionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incoming Connections (As Target) */}
                  {connDetails.incoming.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Menjadi Target Dari ({connDetails.incoming.length})
                      </h5>
                      <div className="space-y-1">
                        {connDetails.incoming.map((conn, idx) => (
                          <div key={idx} className={`p-2 border rounded text-xs ${conn.isServiceItemConnection ? 'bg-indigo-50 border-indigo-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {conn.isServiceItemConnection ? (
                                  <>
                                    <p className="font-medium text-foreground text-[10px] text-indigo-700">Via Service Item:</p>
                                    <p className="text-foreground font-semibold">{conn.sourceName}</p>
                                  </>
                                ) : (
                                  <p className="font-medium text-foreground">{conn.sourceName}</p>
                                )}
                                <p className="text-muted-foreground text-[10px]">Type: {conn.sourceType}</p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                                {conn.connectionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service-to-Service Connections */}
                  {connDetails.serviceConnections.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Service-to-Service ({connDetails.serviceConnections.length})
                      </h5>
                      <div className="space-y-1">
                        {connDetails.serviceConnections.map((conn, idx) => (
                          <div key={idx} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{conn.sourceServiceName} → {conn.targetServiceName}</p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                                {conn.connectionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Service Connections - Outgoing */}
                  {connDetails.crossServiceConnections.filter(c => c.direction === 'outgoing').length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Cross-Service Outgoing ({connDetails.crossServiceConnections.filter(c => c.direction === 'outgoing').length})
                      </h5>
                      <div className="space-y-1">
                        {connDetails.crossServiceConnections.filter(c => c.direction === 'outgoing').map((conn, idx) => (
                          <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{conn.sourceServiceItemName}</p>
                                <p className="text-muted-foreground text-[10px]">via {conn.sourceServiceName}</p>
                                <p className="text-muted-foreground text-[10px]">→ {conn.targetServiceItemName} ({conn.targetParentItemName})</p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px]">
                                {conn.connectionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Service Connections - Incoming */}
                  {connDetails.crossServiceConnections.filter(c => c.direction === 'incoming').length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Cross-Service Incoming ({connDetails.crossServiceConnections.filter(c => c.direction === 'incoming').length})
                      </h5>
                      <div className="space-y-1">
                        {connDetails.crossServiceConnections.filter(c => c.direction === 'incoming').map((conn, idx) => (
                          <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{conn.sourceServiceItemName}</p>
                                <p className="text-muted-foreground text-[10px]">from {conn.sourceParentItemName} via {conn.sourceServiceName}</p>
                                <p className="text-muted-foreground text-[10px]">→ {conn.targetServiceItemName}</p>
                              </div>
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                                {conn.connectionType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        key: 'actions',
        label: 'Aksi',
        sortable: false,
        searchable: false,
        render: (item) => (
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenConnectionModal(item)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Kelola Koneksi"
            >
              <Link size={16} />
            </Button>
            <Button
              onClick={() => handleEditItem(item)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
              title="Edit"
            >
              <Pencil size={16} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Item ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await handleDeleteFromVisualization({ id: String(item.id), type: 'custom' });
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Ya, Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [connections, groups, viewAllMode, workspaces, services, getConnectionInfo, handleOpenConnectionModal, handleEditItem, handleDeleteFromVisualization]
  );

  const toggleNodeVisibility = useCallback((nodeId) => {
    setHiddenNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const showOnlySelected = useCallback(() => {
    if (selectedForHiding.size > 0) {
      const allNodeIds = new Set([
        ...nodes.map(n => n.id),
        ...groups.map(g => `group-${g.id}`)
      ]);
      
      const nodesToHide = new Set(
        [...allNodeIds].filter(id => !selectedForHiding.has(id))
      );
      
      setHiddenNodes(nodesToHide);
      setSelectedForHiding(new Set());
    }
  }, [selectedForHiding, nodes, groups]);

  const showAllNodes = useCallback(() => {
    setHiddenNodes(new Set());
    setSelectedForHiding(new Set());
  }, []);

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
    const groups = currentNodes.filter(n => n.type === 'group');

    for (const group of groups) {
      const groupWidth = group.data?.width;
      const groupHeight = group.data?.height;

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
    const { itemsPerRow, itemWidth, gapX, gapY, padding } = DIMENSIONS;

    // Hitung posisi node yang sedang di-drag (absolute position)
    const draggedNodeData = currentNodes.find(n => n.id === draggedNodeId);
    if (!draggedNodeData) return null;

    const nodeAbsoluteX = draggedNodeData.position.x;
    const nodeAbsoluteY = draggedNodeData.position.y;

    // Hitung posisi relatif terhadap group
    const relX = nodeAbsoluteX - groupNode.position.x - padding;
    const relY = nodeAbsoluteY - groupNode.position.y - padding - 40;

    const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gapX))));

    // Hitung baris menggunakan fixed height untuk smooth performance (O(1) complexity)
    const itemsInGroup = currentNodes.filter(n => n.parentNode === groupNode.id && n.id !== draggedNodeId);
    const itemHeight = DIMENSIONS.baseItemHeight;
    const row = Math.max(0, Math.floor(Math.max(0, relY) / (itemHeight + gapY)));

    const newIndex = row * itemsPerRow + col;
    const maxIndex = itemsInGroup.length;

    // Batasi index agar tidak melebihi jumlah items
    const validIndex = Math.min(Math.max(0, newIndex), maxIndex);

    // Hitung relativeY menggunakan fixed height untuk smooth performance
    const targetRelativeY = padding + 40 + row * (itemHeight + gapY);

    return {
      groupId: groupNode.id,
      index: validIndex,
      relativeX: padding + col * (itemWidth + gapX),
      relativeY: targetRelativeY,
      absoluteX: groupNode.position.x + padding + col * (itemWidth + gapX),
      absoluteY: groupNode.position.y + targetRelativeY,
    };
  }, []);

  const onNodeDrag = useCallback((event, node) => {
    if (!draggedNode || node.id !== draggedNode) return;

    const currentNodes = nodesRef.current;

    // CASE 1: Node sudah dalam group (reorder dalam group yang sama)
    if (node.parentNode) {
      const groupNode = currentNodes.find(n => n.id === node.parentNode);
      if (!groupNode) return;

      const { itemsPerRow, itemWidth, gapX, gapY, padding } = DIMENSIONS;
      const relX = node.position.x - padding;
      const relY = node.position.y - padding - 40;

      const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gapX))));

      // Hitung baris menggunakan fixed height seperti ServiceVisualization (O(1) complexity)
      // Use fixed itemHeight for smooth performance during drag
      const itemHeight = DIMENSIONS.baseItemHeight;
      const row = Math.max(0, Math.floor(Math.max(0, relY) / (itemHeight + gapY)));

      const newIndex = row * itemsPerRow + col;
      const itemsInGroup = currentNodes.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode);

      if (newIndex >= 0 && newIndex <= itemsInGroup.length) {
        // Calculate targetRelativeY using fixed height for smooth performance
        const itemHeight = DIMENSIONS.baseItemHeight;
        const targetRelativeY = padding + 40 + row * (itemHeight + gapY);

        setHoverPosition({
          groupId: node.parentNode,
          index: newIndex,
          relativeX: padding + col * (itemWidth + gapX),
          relativeY: targetRelativeY,
          absoluteX: groupNode.position.x + padding + col * (itemWidth + gapX),
          absoluteY: groupNode.position.y + targetRelativeY,
        });
        setHoveredGroup(node.parentNode); // Set hovered group untuk visual feedback
      }
    } else {
      // CASE 2: Node di luar group, cek collision dengan group
      const nodeSize = {
        width: node.style?.width || DIMENSIONS.itemWidth,
        height: node.style?.height || DIMENSIONS.baseItemHeight
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

  const onNodeDragStop = useCallback(async (event, node) => {
    const dragDuration = Date.now() - dragStateRef.current.startTime;
    const originalParentId = dragStateRef.current.originalParentId;
    dragStateRef.current = { isDragging: false, startTime: 0, originalParentId: null };

    // Clear hovered group visual feedback dan reordering state
    setHoveredGroup(null);
    setIsReorderingInGroup(false);

    if (dragDuration < 100) {
      setDraggedNode(null);
      setHoverPosition(null);
      return;
    }

    // Save state to history for undo/redo (only for significant drags >200ms)
    if (dragDuration > 200) {
      requestAnimationFrame(() => {
        pushState(nodes);
      });
    }

    if (!draggedNode || !hoverPosition) {
      setDraggedNode(null);
      setHoverPosition(null);
      isReorderingRef.current = false;
      return;
    }

    try {
      const targetGroupId = hoverPosition.groupId;
      const isNewGroup = node.parentNode !== targetGroupId;

      // CASE 1: Reorder dalam group yang sama
      if (!isNewGroup && node.parentNode) {
        await api.patch(`/cmdb/${node.id}/reorder`, {
          new_order: hoverPosition.index
        });

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

        setTimeout(() => {
          isReorderingRef.current = false;
          fetchAll();
        }, 500);
      }
      // CASE 2: Pindah ke group baru (dari luar group atau dari group lain)
      else if (targetGroupId) {
        const groupIdNumeric = parseInt(targetGroupId.replace('group-', ''));

        toast.info('Memindahkan item ke group...');

        // Update item dengan group baru dan order menggunakan endpoint spesifik
        await api.patch(`/cmdb/${node.id}/group`, {
          group_id: groupIdNumeric,
          order_in_group: hoverPosition.index
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
                parentNode: targetGroupId,
                data: {
                  ...n.data,
                  groupId: groupIdNumeric,
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

        setTimeout(() => {
          isReorderingRef.current = false;
          fetchAll();
        }, 500);
      }

    } catch (err) {
      console.error('Failed to move item:', err);
      toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
      isReorderingRef.current = false;
    } finally {
      setDraggedNode(null);
      setHoverPosition(null);
    }
  }, [draggedNode, hoverPosition, setNodes, fetchAll, nodes, pushState]);

  const onMouseDown = useCallback((event) => {
    if (selectionMode !== 'rectangle') return;
    
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    setIsSelecting(true);
    setSelectionStart({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    setSelectionEnd({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, [selectionMode]);

  const onMouseMove = useCallback((event) => {
    if (!isSelecting || selectionMode !== 'rectangle') return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    setSelectionEnd({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, [isSelecting, selectionMode]);

  const onMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !reactFlowInstance.current) {
      setIsSelecting(false);
      return;
    }

    const viewport = reactFlowInstance.current.getViewport();
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    const flowMinX = (minX - viewport.x) / viewport.zoom;
    const flowMaxX = (maxX - viewport.x) / viewport.zoom;
    const flowMinY = (minY - viewport.y) / viewport.zoom;
    const flowMaxY = (maxY - viewport.y) / viewport.zoom;

    const selectedNodes = nodes.filter(node => {
      if (node.type === 'group') {
        const centerX = node.position.x + (node.data.width || 0) / 2;
        const centerY = node.position.y + (node.data.height || 0) / 2;
        return centerX >= flowMinX && centerX <= flowMaxX &&
               centerY >= flowMinY && centerY <= flowMaxY;
      }
      
      const nodeX = node.parentNode 
        ? nodes.find(n => n.id === node.parentNode)?.position.x + node.position.x
        : node.position.x;
      const nodeY = node.parentNode
        ? nodes.find(n => n.id === node.parentNode)?.position.y + node.position.y
        : node.position.y;
      
      return nodeX >= flowMinX && nodeX <= flowMaxX &&
             nodeY >= flowMinY && nodeY <= flowMaxY;
    });

    setSelectedForHiding(prev => {
      const newSet = new Set(prev);
      selectedNodes.forEach(node => newSet.add(node.id));
      return newSet;
    });

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, nodes]);

  const handleNodesChange = useCallback((changes) => {
    const hasPositionChange = changes.some(change =>
      change.type === 'position' && change.dragging === false
    );

    if (hasPositionChange) {
      isManualActionRef.current = true;
      pushState([...nodes]);

      // Track which nodes changed
      changes.forEach(change => {
        if (change.type === 'position' && change.dragging === false) {
          const node = nodes.find(n => n.id === change.id);
          if (node) {
            const lastPos = lastNodePositionsRef.current[change.id];
            const newPos = change.position || node.position;

            if (!lastPos ||
                Math.abs(lastPos.x - newPos.x) > 1 ||
                Math.abs(lastPos.y - newPos.y) > 1) {
              changedNodesRef.current.add(change.id);

              // Save service node position to database
              if (node.type === 'serviceAsNode') {
                const serviceId = change.id.replace('service-', '');
                saveServiceNodePosition(serviceId, newPos, node.parentNode);
              }
            }
          }
        }
      });
    }

    onNodesChange(changes);
  }, [onNodesChange, pushState, nodes, saveServiceNodePosition]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Escape' && highlightMode && highlightedNodeId) {
        clearHighlight();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          const previousState = undo();
          if (previousState) {
            setNodes(previousState);
            toast.info('Undo', { duration: 1000 });
          }
        }
      }
      
      if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
          ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        if (canRedo) {
          const nextState = redo();
          if (nextState) {
            setNodes(nextState);
            toast.info('Redo', { duration: 1000 });
          }
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSavePositions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo, setNodes, highlightMode, highlightedNodeId, clearHighlight]);

  const autoSavePositions = useCallback(async () => {
    if (!isManualActionRef.current || isSavingRef.current) return;
    
    const changedNodeIds = Array.from(changedNodesRef.current);
    
    if (changedNodeIds.length === 0) return;
    
    isSavingRef.current = true;
    setIsAutoSaving(true);

    try {
      const updatePromises = [];

      changedNodeIds.forEach((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (node.type === 'custom' && !node.parentNode) {
          updatePromises.push(
            api.put(`/cmdb/${node.id}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits
            })
          );
        } else if (node.type === 'group') {
          const groupId = node.id.replace('group-', '');
          updatePromises.push(
            api.put(`/groups/${groupId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits
            })
          );
        }
      });

      await Promise.all(updatePromises);

      // Single emit after all updates
      await api.post('/cmdb/trigger-update');
      
      nodes.forEach(node => {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      });
      changedNodesRef.current.clear();
      isManualActionRef.current = false;
      
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setIsAutoSaving(false);
      isSavingRef.current = false;
    }
  }, [nodes]);

  useAutoSave(nodes, autoSavePositions, 2000, isAutoSaveEnabled);

  const handleSavePositions = async () => {
    if (isSavingRef.current) {
      return;
    }
    
    const changedNodeIds = Array.from(changedNodesRef.current);
    
    if (changedNodeIds.length === 0) {
      toast.info('Tidak ada perubahan untuk disimpan');
      return;
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const updatePromises = [];
      
      changedNodeIds.forEach((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        if (node.type === 'custom' && !node.parentNode) {
          updatePromises.push(
            api.put(`/cmdb/${node.id}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits
            })
          );
        } else if (node.type === 'group') {
          const groupId = node.id.replace('group-', '');
          updatePromises.push(
            api.put(`/groups/${groupId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits
            })
          );
        }
      });

      await Promise.all(updatePromises);

      // Single emit after all updates
      await api.post('/cmdb/trigger-update');
      
      nodes.forEach(node => {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      });
      changedNodesRef.current.clear();
      
      toast.success(`Posisi berhasil disimpan!`);
      
    } catch (err) {
      toast.error('Gagal menyimpan posisi', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleContextEdit = useCallback(() => {
    const editData = handleEditFromVisualization(contextMenu.node);
    if (editData.type === 'group') {
      handleEditGroup(editData.data);
    } else {
      handleEditItem(editData.data);
    }
  }, [contextMenu.node, handleEditFromVisualization, handleEditGroup, handleEditItem]);

  const handleContextDelete = useCallback(async () => {
    await handleDeleteFromVisualization(contextMenu.node);
  }, [contextMenu.node, handleDeleteFromVisualization]);

  const handleContextManageConnections = useCallback(() => {
    const item = handleManageConnectionsFromVisualization(contextMenu.node);
    if (item) {
      handleOpenConnectionModal(item);
    }
  }, [contextMenu.node, handleManageConnectionsFromVisualization, handleOpenConnectionModal]);

  const handleContextManageGroupConnections = useCallback(() => {
    if (!contextMenu.node || contextMenu.node.type !== 'group') return;
    
    const groupId = parseInt(contextMenu.node.id.replace('group-', ''));
    const group = groups.find(g => g.id === groupId);
    
    if (group) {
      handleOpenGroupConnectionModal(group);
    }
  }, [contextMenu.node, groups, handleOpenGroupConnectionModal]);

  const handleContextToggleVisibility = useCallback(() => {
    toggleNodeVisibility(contextMenu.node.id);

  }, [contextMenu.node, toggleNodeVisibility]);

  const handleContextRemoveFromGroup = useCallback(async () => {
    if (!contextMenu.node.parentNode) {
      toast.error('Item tidak dalam group');
      return;
    }

    const nodeId = contextMenu.node.id;

    try {
      toast.info('Mengeluarkan item dari group...');

      // Update item dengan group_id null
      await api.patch(`/cmdb/${nodeId}/group`, {
        group_id: null,
        order_in_group: null
      });

      toast.success('Item berhasil dikeluarkan dari group!');

      // Fetch ulang data
      setTimeout(() => {
        fetchAll();
      }, 300);

    } catch (err) {
      console.error('Failed to remove from group:', err);
      toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
    }
  }, [contextMenu.node, fetchAll]);

    const toggleTableDrawer = useCallback(() => {
    setShowTableDrawer(prev => !prev);
  }, []);

  // Handler untuk Jump to First Node (Quick Jump)
  const handleJumpToFirstNode = useCallback(() => {
    if (!reactFlowInstance.current || nodes.length === 0) return;

    const firstNode = nodes[0];
    let targetX = firstNode.position.x;
    let targetY = firstNode.position.y;

    // Handle nodes dalam group
    if (firstNode.parentNode) {
      const parentNode = nodes.find(n => n.id === firstNode.parentNode);
      if (parentNode) {
        targetX += parentNode.position.x;
        targetY += parentNode.position.y;
      }
    }

    // Center viewport ke node pertama
    reactFlowInstance.current.setCenter(targetX, targetY, {
      zoom: 1.2,
      duration: 800,
    });

    // Highlight node
    setNodes(prevNodes =>
      prevNodes.map(n => ({
        ...n,
        style: {
          ...n.style,
          outline: n.id === firstNode.id ? '3px solid #3b82f6' : 'none',
          outlineOffset: '2px',
          transition: 'outline 0.3s ease',
        }
      }))
    );

    // Remove highlight setelah 3 detik
    setTimeout(() => {
      setNodes(prevNodes =>
        prevNodes.map(n => ({
          ...n,
          style: {
            ...n.style,
            outline: 'none',
          }
        }))
      );
    }, 3000);
  }, [nodes, setNodes]);

  // Handler untuk Fit View (center semua nodes)
  const handleFitView = useCallback(() => {
    if (!reactFlowInstance.current || nodes.length === 0) return;

    reactFlowInstance.current.fitView({
      padding: 0.2,
      duration: 800,
    });
  }, [nodes]);

  // Auto-center saat workspace berubah
  useEffect(() => {
    if (currentWorkspace && currentWorkspace.id !== prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = currentWorkspace.id;
      setShouldAutoCenter(true);
    }
  }, [currentWorkspace?.id]); // Hanya pantau ID, bukan object

  // Trigger auto-center setelah nodes terupdate dari workspace switch
  useEffect(() => {
    if (shouldAutoCenter && nodes.length > 0 && reactFlowInstance.current) {
      // Tunggu sedikit untuk memastikan nodes sudah ter-render
      const timer = setTimeout(() => {
        handleJumpToFirstNode();
        setShouldAutoCenter(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [shouldAutoCenter, nodes.length, reactFlowInstance, handleJumpToFirstNode]);

  return (
    <div className="w-full h-screen flex flex-col">
      <VisualizationNavbar
        draggedNode={isReorderingInGroup ? draggedNode : null}
        isReorderingInGroup={isReorderingInGroup}
        selectionMode={selectionMode}
        highlightMode={highlightMode}
        highlightedNodeId={highlightedNodeId}
        selectedForHiding={selectedForHiding}
        hiddenNodes={hiddenNodes}
        isSaving={isSaving}
        isAutoSaving={isAutoSaving}
        isAutoSaveEnabled={isAutoSaveEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          const previousState = undo();
          if (previousState) {
            requestAnimationFrame(() => {
              setNodes(previousState);
            });
            toast.info('Undo', { duration: 1000 });
          }
        }}
        onRedo={() => {
          const nextState = redo();
          if (nextState) {
            requestAnimationFrame(() => {
              setNodes(nextState);
            });
            toast.info('Redo', { duration: 1000 });
          }
        }}
        onToggleAutoSave={() => setIsAutoSaveEnabled(prev => !prev)}
        onSetHighlightMode={setHighlightMode}
        onClearHighlight={clearHighlight}
        showVisibilityPanel={showVisibilityPanel}
        nodes={nodes}
        onNodeSearch={useCallback((node) => {
          if (!reactFlowInstance.current) return;

          if (hiddenNodes.has(node.id)) {
            setHiddenNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(node.id);
              return newSet;
            });
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
                  outline: selectedForHiding.has(n.id) ? '3px solid #3b82f6' : 'none',
                }
              }))
            );
          }, 3000);
        }, [hiddenNodes, nodes, selectedForHiding, setNodes])}
        reactFlowInstance={reactFlowInstance}
        onSetSelectionMode={setSelectionMode}
        onShowOnlySelected={showOnlySelected}
        onToggleVisibilityPanel={() => setShowVisibilityPanel(!showVisibilityPanel)}
        onShowAllNodes={showAllNodes}
        onSavePositions={handleSavePositions}
        onOpenAddItem={handleOpenAddItem}
        onOpenManageGroups={handleOpenManageGroups}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenImportModal={handleOpenImport}
        onOpenShareModal={() => setShowShareModal(true)}
        showTableDrawer={showTableDrawer}
        onToggleTableDrawer={toggleTableDrawer}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSwitchWorkspace={switchWorkspace}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onDuplicateWorkspace={duplicateWorkspace}
        onSetDefaultWorkspace={setDefaultWorkspace}
        hideViewAllOption={true}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap(prev => !prev)}
        showConnectionLabels={showConnectionLabels}
        onToggleConnectionLabels={() => setShowConnectionLabels(prev => !prev)}
        onJumpToFirstNode={handleJumpToFirstNode}
        onFitView={handleFitView}
      />

      {/* Rest of your JSX remains mostly the same, but uses processedNodes and processedEdges */}
      <div className="flex-1 relative flex overflow-y-auto">
        {/* Visibility Panel */}
        {showVisibilityPanel && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-lg">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-lg">Node Visibility</h2>
              <p className="text-sm text-gray-600 mt-1">
                Click to show/hide nodes and groups
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Groups section */}
              {groups.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded"></span>
                    Groups ({groups.length})
                  </h3>
                  <div className="space-y-1">
                    {groups.map(group => {
                      const nodeId = `group-${group.id}`;
                      const isHidden = hiddenNodes.has(nodeId);
                      return (
                        <Button
                          key={nodeId}
                          onClick={() => toggleNodeVisibility(nodeId)}
                          variant="ghost"
                          className={`w-full justify-start px-3 py-2 h-auto ${
                            isHidden
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium truncate">{group.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ungrouped items section */}
              {items.filter(i => !i.group_id).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded"></span>
                    Ungrouped Items ({items.filter(i => !i.group_id).length})
                  </h3>
                  <div className="space-y-1">
                    {items.filter(item => !item.group_id).map(item => {
                      const nodeId = String(item.id);
                      const isHidden = hiddenNodes.has(nodeId);
                      return (
                        <Button
                          key={nodeId}
                          onClick={() => toggleNodeVisibility(nodeId)}
                          variant="ghost"
                          className={`w-full justify-start px-3 py-2 h-auto ${
                            isHidden
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group items sections */}
              {groups.map(group => {
                const groupItems = items.filter(i => i.group_id === group.id);
                if (groupItems.length === 0) return null;
                
                return (
                  <div key={`items-${group.id}`}>
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: group.color || '#6366f1' }}
                      ></span>
                      {group.name} Items ({groupItems.length})
                    </h3>
                    <div className="space-y-1 pl-4">
                      {groupItems.map(item => {
                        const nodeId = String(item.id);
                        const isHidden = hiddenNodes.has(nodeId);
                        const groupNodeId = `group-${group.id}`;
                        const isGroupHidden = hiddenNodes.has(groupNodeId);
                        
                        return (
                          <Button
                            key={nodeId}
                            onClick={() => toggleNodeVisibility(nodeId)}
                            disabled={isGroupHidden}
                            variant="ghost"
                            className={`w-full justify-start px-3 py-2 h-auto text-sm ${
                              isGroupHidden
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                : isHidden
                                ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{item.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Visualization Area */}
        <div 
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={useCallback((event, node) => {
              if (selectionMode === 'single') {
                setSelectedForHiding(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(node.id)) {
                    newSet.delete(node.id);
                  } else {
                    newSet.add(node.id);
                  }
                  return newSet;
                });
              } else if (highlightMode) {
                if (highlightedNodeId === node.id) {
                  clearHighlight();
                } else {
                  highlightNode(node.id);
                }
              }
            }, [selectionMode, highlightMode, highlightedNodeId, clearHighlight, highlightNode])}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onReconnect={useCallback(async (oldEdge, newConnection) => {
              // Validate that we have the required data before saving
              if (!newConnection.sourceHandle || !newConnection.targetHandle) {
                console.warn('onReconnect: Missing handle information, skipping save', { sourceHandle: newConnection.sourceHandle, targetHandle: newConnection.targetHandle });
                // Still allow the visual reconnect
                const newEdgeHandles = {
                  ...edgeHandles,
                  [oldEdge.id]: {
                    sourceHandle: newConnection.source || 'right',
                    targetHandle: newConnection.target || 'left',
                  }
                };
                setEdgeHandles(newEdgeHandles);
                setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
                return;
              }

              console.log('[onReconnect] Attempting to reconnect edge:', {
                oldEdgeId: oldEdge.id,
                oldSourceHandle: oldEdge.sourceHandle,
                oldTargetHandle: oldEdge.targetHandle,
                newSource: newConnection.source,
                newSourceHandle: newConnection.sourceHandle,
                newTarget: newConnection.target,
                newTargetHandle: newConnection.targetHandle
              });

              const newEdgeHandles = {
                ...edgeHandles,
                [oldEdge.id]: {
                  sourceHandle: newConnection.sourceHandle,
                  targetHandle: newConnection.targetHandle,
                }
              };

              console.log('[onReconnect] Saving new handle positions:', newEdgeHandles[oldEdge.id]);

              await saveEdgeHandle(
                oldEdge.id,
                newConnection.sourceHandle,
                newConnection.targetHandle,
                currentWorkspace?.id
              );

              setEdgeHandles(newEdgeHandles);
              setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

              console.log('[onReconnect] Completed. Edge handles now:', newEdgeHandles);
            }, [edgeHandles, setEdges, currentWorkspace?.id])}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            connectionLineType="smoothstep"
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            fitView
            panOnDrag={selectionMode === 'freeroam' || selectionMode !== 'rectangle'}
            onPaneClick={() => {
              if (highlightMode) {
                clearHighlight();
              }
            }}
          >
            <Background />
            <Controls />
              {showMiniMap && (
                <MiniMap
                  pannable zoomable
                  nodeStrokeColor={(node) => {
                    if (node.type === 'group') return '#8b5cf6';
                    return '#3b82f6';
                  }}
                  nodeColor={(node) => {
                    if (node.type === 'group') {
                      return node.data?.color || '#e0e7ff';
                    }
                    return '#dbeafe';
                  }}
                  nodeBorderRadius={8}
                  maskColor="rgba(0, 0, 0, 0.1)"
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  position="bottom-right"
                />
              )}
          </ReactFlow>

          {/* Context Menu */}
          <NodeContextMenu
            show={contextMenu.show}
            position={contextMenu.position}
            node={contextMenu.node}
            isHidden={contextMenu.node ? hiddenNodes.has(contextMenu.node.id) : false}
            onEdit={handleContextEdit}
            onDelete={handleContextDelete}
            onManageConnections={handleContextManageConnections}
            onManageGroupConnections={handleContextManageGroupConnections}
            onRemoveFromGroup={handleContextRemoveFromGroup}
            onToggleVisibility={handleContextToggleVisibility}
            onClose={closeContextMenu}
          />

          {/* Edge Context Menu */}
          <EdgeContextMenu
            show={edgeContextMenu.show}
            position={edgeContextMenu.position}
            edge={edgeContextMenu.edge}
            sourceNode={edgeContextMenu.sourceNode}
            targetNode={edgeContextMenu.targetNode}
            servicesMap={servicesMap}
            serviceItems={serviceItems}
            onEdit={handleEditEdge}
            onDelete={handleDeleteEdge}
            onClose={closeEdgeContextMenu}
          />

          {/* Selection Rectangle */}
          {selectionRect && (
            <div
              style={{
                position: 'absolute',
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
                border: '2px dashed #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            />
          )}

          {/* Drag Hover Indicator */}
          {hoverPosition && draggedNode && (
            <div
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                zIndex: 102,
                border: '3px dashed #3b82f6',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                width: '180px',
                height: '120px',
                transform: `translate(${hoverPosition.absoluteX}px, ${hoverPosition.absoluteY}px)`,
                transition: 'transform 0.1s ease-out',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#3b82f6',
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

          {/* Selection Mode Indicators */}
          {selectionMode === 'rectangle' && !isSelecting && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] px-4 text-white py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <Square />
              <span>Click and drag to select multiple nodes</span>
            </div>
          )}
 
          {selectionMode === 'single' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <MousePointer2 />
              <span>Click nodes to select/deselect</span>
            </div>
          )}
        </div>
      </div>
      <Drawer open={showTableDrawer} onOpenChange={setShowTableDrawer}>
        <DrawerContent className="max-h-[96vh]">
          <div className="px-4 overflow-y-auto flex-1">
            <DrawerHeader>
            <DrawerTitle>CMDB Items Table</DrawerTitle>
              <DrawerDescription>
                Manage and view all CMDB items in table format
              </DrawerDescription>
            </DrawerHeader>
            <DataTable
              data={items}
              columns={columns}
              title=""
              showAddButton={false}
              showExportButton={true}
              showRefreshButton={false}
              itemsPerPage={5}
              maxHeight="max-h-[calc(96vh-200px)]"
              onExport={(data) => {
                return data.map(item => {
                  const group = groups.find(g => g.id === item.group_id);
                  const itemServices = servicesMap[item.id] || [];
                  const workspace = workspaces.find(w => w.id === item.workspace_id);

                  return {
                    'Nama': item.name || '',
                    'Type': item.type || '',
                    'Status': item.status || '',
                    'IP': item.ip || '',
                    'Category': item.category || '',
                    'Location': item.location || '',
                    'Group': group ? group.name : '-',
                    'Environment Type': item.env_type || '',
                    'Services': itemServices.length,
                    'Active Services': itemServices.filter(s => s.status === 'active').length,
                    'Description': item.description || '',
                    ...(viewAllMode && workspace ? { 'Workspace': workspace.name } : {}),
                  };
                });
              }}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="secondary">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Modals - Keep existing implementation */}
      <ItemFormModal
        show={showItemModal}
        editMode={editItemMode}
        formData={itemFormData}
        groups={groups}
        currentWorkspace={currentWorkspace}
        onClose={() => {
          setShowItemModal(false);
          setItemFormData({ ...INITIAL_ITEM_FORM, services: [] });
          setEditItemMode(false);
          setServiceIconUploads({});
        }}
        onSubmit={handleItemSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          setItemFormData(prev => ({ ...prev, [name]: value }));
        }}
        onServiceAdd={handleServiceAdd}
        onServiceRemove={handleServiceRemove}
        onServiceChange={handleServiceChange}
        onServiceIconUpload={handleServiceIconUpload}
        onStorageClick={handleStorageClick}
        onStorageDelete={handleStorageDelete}
      />

      <StorageFormModal
        show={showStorageModal}
        storage={itemFormData.storage}
        onClose={() => setShowStorageModal(false)}
        onSave={handleStorageSave}
      />

      <ConnectionModal
        show={showConnectionModal}
        selectedItem={selectedItemForConnection}
        items={items}
        groups={groups}
        selectedConnections={selectedConnections}
        selectedGroupConnections={selectedGroupConnections}
        onClose={() => setShowConnectionModal(false)}
        onSave={handleSaveConnections}
        onToggleConnection={handleToggleConnection}
        onToggleGroupConnection={handleToggleGroupConnection}
        onConnectionTypeChange={handleConnectionTypeChange}
        selectedConnectionType={selectedConnectionType}
        existingConnectionTypes={itemConnectionTypes}
        itemToGroupConnectionTypes={itemToGroupConnectionTypes}
        onItemToGroupTypeChange={handleItemToGroupTypeChange}
        workspaceId={currentWorkspace?.id}
        nodes={nodes}
        existingServiceConnections={selectedServices}
        existingServiceItemConnections={selectedServiceItems}
      />

      <GroupModal
        show={showGroupModal}
        editMode={editGroupMode}
        formData={groupFormData}
        groups={groups}
        currentWorkspace={currentWorkspace}
        onClose={() => {
          setShowGroupModal(false);
          setGroupFormData(INITIAL_GROUP_FORM);
          setEditGroupMode(false);
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

      <GroupConnectionModal
        show={showGroupConnectionModal}
        selectedGroup={selectedGroupForConnection}
        groups={groups}
        items={items}
        selectedConnections={selectedGroupToGroupConnections}
        selectedGroupConnections={selectedGroupToGroupConnections}
        selectedItemConnections={selectedGroupToItemConnections}
        onClose={() => setShowGroupConnectionModal(false)}
        onSave={handleSaveGroupConnections}
        onToggleConnection={handleToggleGroupToGroupConnection}
        onToggleGroupConnection={handleToggleGroupToGroupConnection}
        onToggleItemConnection={handleToggleGroupToItemConnection}
        selectedConnectionType={selectedConnectionType}
        onConnectionTypeChange={handleConnectionTypeChange}
        existingGroupConnectionTypes={groupToGroupConnectionTypes}
        existingItemConnectionTypes={groupToItemConnectionTypes}
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        workspaceId={currentWorkspace?.id}
        onExport={exportVisualization}
      />

      <ImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        workspaceId={currentWorkspace?.id}
        onImportComplete={handleImportComplete}
      />

      <ImportPreviewModal
        show={!!importPreviewId}
        onClose={() => setImportPreviewId(null)}
        workspaceId={currentWorkspace?.id}
        previewId={importPreviewId}
        onConfirm={handleImportConfirm}
      />

      <ShareModal
        show={showShareModal}
        workspaceId={currentWorkspace?.id}
        onClose={() => setShowShareModal(false)}
      />

      <QuickConnectionModal
        show={showQuickConnectionModal}
        sourceItem={quickConnectionSource}
        targetItem={quickConnectionTarget}
        onClose={() => {
          setShowQuickConnectionModal(false);
          setQuickConnectionMode('create');
          setQuickConnectionExistingType(null);
          setQuickConnectionExistingServiceItemId(null);
        }}
        onSave={handleSaveQuickConnection}
        mode={quickConnectionMode}
        existingConnectionType={quickConnectionExistingType}
        existingServiceItemId={quickConnectionExistingServiceItemId}
        workspaceId={currentWorkspace?.id}
        nodes={nodes}
        services={services}
      />

      <QuickServiceToServiceConnection
        open={showServiceConnectionModal}
        onClose={() => {
          setShowServiceConnectionModal(false);
          setServiceConnectionSource(null);
          setServiceConnectionTarget(null);
        }}
        onConnect={handleSaveServiceConnection}
        sourceService={serviceConnectionSource}
        targetService={serviceConnectionTarget}
        workspaceId={currentWorkspace?.id}
      />

      <ServiceDetailDialog
        show={serviceDialog.show}
        service={serviceDialog.service}
        workspaceId={serviceDialog.workspaceId || currentWorkspace?.id}
        cmdbItem={serviceDialog.parentItem}
        onClose={() => setServiceDialog({ show: false, service: null, parentItem: null, workspaceId: null })}
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

      {/* Highlight Mode Indicators */}
      {highlightMode && !highlightedNodeId && (
        <div className="absolute top-30 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <GitBranch />
          <span>Click node to highlight dependencies</span>
        </div>
      )}

      {highlightMode && highlightedNodeId && (
        <div className="absolute top-30 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] px-4 text-white py-2 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <GitBranch />
          <span>Selected node and highlighted dependencies</span>
          <Button
            onClick={clearHighlight}
            variant="ghost"
            size="sm"
            className="ml-2 bg-white/20 hover:bg-white/30 h-7 px-2 text-xs"
          >
            Clear (ESC)
          </Button>
        </div>
      )}
    </div>
  );
}
