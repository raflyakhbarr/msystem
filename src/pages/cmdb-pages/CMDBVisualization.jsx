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
import { useLayanan } from '../../hooks/cmdb-hooks/useLayanan';
import { useLayananServiceConnections } from '../../hooks/cmdb-hooks/useLayananServiceConnections';
import { useServiceToServiceConnections } from '../../hooks/cmdb-hooks/useServiceToServiceConnections';
import { useFlowData } from '../../hooks/cmdb-hooks/useFlowData';
import { useSocket } from '../../context/SocketContext';
import { useVisualizationActions } from '../../hooks/cmdb-hooks/useVisualizationActions';
import { loadEdgeHandles, saveEdgeHandles, saveEdgeHandle, transformServicesToNodes, getConnectionTypeInfo } from '../../utils/cmdb-utils/flowHelpers';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM, STATUS_COLORS, API_BASE_URL } from '../../utils/cmdb-utils/constants';
import CustomNode from '../../components/cmdb-components/CustomNode';
import CustomGroupNode from '../../components/cmdb-components/CustomGroupNode';
import CustomLayananNode from '../../components/cmdb-components/CustomLayananNode';
import ServiceAsNode from '../../components/cmdb-components/ServiceAsNode';
import VisualizationNavbar from '../../components/cmdb-components/VisualizationNavbar';
import NodeContextMenu from '../../components/cmdb-components/NodeContextMenu';
import EdgeContextMenu from '../../components/cmdb-components/EdgeContextMenu';
import ItemFormModal from '../../components/cmdb-components/ItemFormModal';
import ConnectionModal from '../../components/cmdb-components/ConnectionModal';
import QuickConnectionModal from '../../components/cmdb-components/QuickConnectionModal';
import QuickServiceToServiceConnection from '../../components/cmdb-components/QuickServiceToServiceConnection';
import QuickLayananServiceConnection from '../../components/cmdb-components/QuickLayananServiceConnection';
import GroupModal from '../../components/cmdb-components/GroupModal';
import GroupConnectionModal from '../../components/cmdb-components/GroupConnectionModal';
import ExportModal from '@/components/cmdb-components/ExportModal';
import ImportModal from '@/components/cmdb-components/ImportModal';
import ImportPreviewModal from '@/components/cmdb-components/ImportPreviewModal';
import ShareModal from '@/components/cmdb-components/ShareModal';
import LayananFormModal from '../../components/cmdb-components/LayananFormModal';
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
  layanan: CustomLayananNode,
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
  const [showLayananModal, setShowLayananModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Quick Connection Modal states
  const [showQuickConnectionModal, setShowQuickConnectionModal] = useState(false);
  const [quickConnectionSource, setQuickConnectionSource] = useState(null);
  const [quickConnectionTarget, setQuickConnectionTarget] = useState(null);

  // Service-to-Service Connection Modal states
  const [showServiceConnectionModal, setShowServiceConnectionModal] = useState(false);
  const [serviceConnectionSource, setServiceConnectionSource] = useState(null);
  const [serviceConnectionTarget, setServiceConnectionTarget] = useState(null);

  // Layana-Service Connection Modal states
  const [showLayananServiceModal, setShowLayananServiceModal] = useState(false);
  const [layananServiceSource, setLayananServiceSource] = useState(null);
  const [layananServiceTarget, setLayananServiceTarget] = useState(null);
  const [isLayananSource, setIsLayananSource] = useState(true);

  // Connection labels visibility
  const [showConnectionLabels, setShowConnectionLabels] = useState(false);

  // Edge Context Menu states
  const [edgeContextMenu, setEdgeContextMenu] = useState({ show: false, position: { x: 0, y: 0 }, edge: null });
  const [quickConnectionMode, setQuickConnectionMode] = useState('create'); // 'create' or 'edit'
  const [quickConnectionExistingType, setQuickConnectionExistingType] = useState(null);

  const [itemFormData, setItemFormData] = useState(INITIAL_ITEM_FORM);
  const [groupFormData, setGroupFormData] = useState(INITIAL_GROUP_FORM);
  const [layananFormData, setLayananFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [editItemMode, setEditItemMode] = useState(false);
  const [editGroupMode, setEditGroupMode] = useState(false);
  const [editLayananMode, setEditLayananMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentLayananId, setCurrentLayananId] = useState(null);

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
        map[service.cmdb_item_id].push(service);
      });
    } else if (services && typeof services === 'object') {
      // If services is already an object (old format), use it directly
      return services;
    }

    return map;
  }, [services]);

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewId, setImportPreviewId] = useState(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showTableDrawer, setShowTableDrawer] = useState(false);

  const { items, connections, groups, groupConnections, fetchAll } = useCMDB(currentWorkspace?.id);
  const { layananItems, layananConnections, createLayanan, updateLayanan, deleteLayanan, fetchAll: fetchLayanaAll } = useLayanan(currentWorkspace?.id);
  const { connections: layananServiceConnections, fetchConnections: fetchLayananServiceConnections, createConnection: createLayananServiceConnection, deleteConnection: deleteLayananServiceConnection } = useLayananServiceConnections(currentWorkspace?.id);
  const { connections: serviceToServiceConnections, fetchConnectionsByWorkspace: fetchServiceToServiceConnections } = useServiceToServiceConnections(currentWorkspace?.id);

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
  } = useVisualizationActions(items, groups, layananItems, fetchAll, fetchLayanaAll);

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

    console.log('🔍 handleServiceClick:', {
      serviceId: service.id,
      serviceName: service.name,
      parentItemId: service.cmdb_item_id,
      parentItemFound: !!parentItem,
      parentItem: parentItem ? {
        id: parentItem.id,
        name: parentItem.name
      } : null
    });

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
  const { transformToFlowData } = useFlowData(items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap, showConnectionLabels, handleServiceClick, handleServiceItemsClick);

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
      // Skip layanan edges from highlight processing - they use their own styling
      if (String(edge.id).startsWith('layanan-edge-')) {
        return edge;
      }

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

  // Calculate propagated status and connection details for layanan nodes
  const calculateLayananStatusAndConnections = useCallback((layanaId) => {
    const connections = [];
    let propagatedStatus = 'active';

    // Get layana service connections (to service items with propagation)
    const serviceConnections = layananServiceConnections.filter(
      conn => conn.layanan_id === layanaId && conn.propagation_enabled
    );

    // Get layana connections (to services directly)
    const directConnections = layananConnections.filter(conn => {
      const sourceId = typeof conn.source_id === 'string'
        ? parseInt(conn.source_id.replace('layanan-', ''))
        : conn.source_id;
      return sourceId === layanaId && conn.target_type === 'service';
    });

    // Debug logging
    if (serviceConnections.length > 0 || directConnections.length > 0) {
      console.log(`[Layana ${layanaId}] Found connections:`, {
        serviceConnections: serviceConnections.length,
        directConnections: directConnections.length
      });
    }

    // Process service item connections
    serviceConnections.forEach(conn => {
      const serviceId = conn.service_id;
      const serviceItemId = conn.service_item_id;

      // Find service and service item
      let targetService = null;
      let targetServiceItem = null;
      let parentCmdbItem = null;

      for (const item of items) {
        const itemServices = servicesMap[item.id] || [];
        targetService = itemServices.find(s => s.id === serviceId);
        if (targetService) {
          parentCmdbItem = item;
          const itemsForService = serviceItems[serviceId] || [];
          targetServiceItem = itemsForService.find(si => si.id === serviceItemId);
          break;
        }
      }

      if (targetService && parentCmdbItem) {
        connections.push({
          type: 'Service Item',
          name: `${targetService.name} → ${targetServiceItem?.name || 'Unknown'}`,
          status: targetServiceItem?.status || 'unknown',
          cmdbItem: parentCmdbItem.name
        });

        // Propagate status from service item
        if (conn.propagation_enabled && targetServiceItem) {
          console.log(`[Layana ${layanaId}] Propagating status from service item:`, {
            serviceItem: targetServiceItem.name,
            status: targetServiceItem.status,
            propagationEnabled: conn.propagation_enabled
          });
          if (targetServiceItem.status === 'inactive') {
            propagatedStatus = 'inactive';
          } else if (targetServiceItem.status === 'maintenance' && propagatedStatus !== 'inactive') {
            propagatedStatus = 'maintenance';
          }
        }
      }
    });

    // Process direct service connections - WITHOUT status propagation
    directConnections.forEach(conn => {
      const serviceId = conn.target_id;

      // Find service (only for name/display)
      let targetService = null;
      let parentCmdbItem = null;

      for (const item of items) {
        const itemServices = servicesMap[item.id] || [];
        targetService = itemServices.find(s => s.id === serviceId);
        if (targetService) {
          parentCmdbItem = item;
          break;
        }
      }

      if (targetService && parentCmdbItem) {
        connections.push({
          type: 'Service',
          name: targetService.name,
          status: targetService.status || 'active',
          cmdbItem: parentCmdbItem.name
        });

        console.log(`[Layana ${layanaId}] Direct service connection (no propagation):`, {
          service: targetService.name,
          status: targetService.status
        });
      }
    });

    console.log(`[Layana ${layanaId}] Final propagated status:`, propagatedStatus);

    return { propagatedStatus, connections };
  }, [layananServiceConnections, layananConnections, serviceItems, items, servicesMap]);

  // Fetch services for all items (as callback so it can be called manually)
  const fetchServices = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setServices([]);
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
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [currentWorkspace?.id]);

  // Fetch services on mount and workspace change
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Fetch service items for services that have layana connections
  useEffect(() => {
    const fetchServiceItems = async () => {
      if (!currentWorkspace || layananServiceConnections.length === 0) return;

      const serviceItemsMap = {};

      // Get unique service IDs from layana service connections
      const serviceIds = [...new Set(layananServiceConnections.map(conn => conn.service_id))];

      for (const serviceId of serviceIds) {
        try {
          const res = await api.get(`/service-items/${serviceId}/items`, {
            params: { workspace_id: currentWorkspace.id }
          });
          serviceItemsMap[serviceId] = res.data;
        } catch (err) {
          console.error(`Failed to fetch service items for service ${serviceId}:`, err);
          serviceItemsMap[serviceId] = [];
        }
      }

      setServiceItems(serviceItemsMap);
    };

    fetchServiceItems();
  }, [layananServiceConnections, currentWorkspace]);

  useEffect(() => {
    const { flowNodes, flowEdges } = transformToFlowData();

    // Add layanan nodes
    const layananNodes = layananItems.map((layanan, index) => {
      // Berikan posisi default yang berbeda untuk setiap node jika tidak ada position
      const defaultPosition = layanan.position
        ? layanan.position
        : { x: 100 + (index * 250), y: 100 + (index * 150) }; // Spread out nodes

      // Calculate propagated status and connection details
      const { propagatedStatus, connections } = calculateLayananStatusAndConnections(layanan.id);

      return {
        id: `layanan-${layanan.id}`,
        type: 'layanan',
        position: defaultPosition,
        data: {
          id: layanan.id,
          name: layanan.name,
          description: layanan.description,
          status: propagatedStatus, // Use propagated status instead of original
          originalStatus: layanan.status, // Keep original for reference
          workspaceId: layanan.workspace_id,
          createdAt: layanan.created_at,
          updatedAt: layanan.updated_at,
          connections: connections // Add connection details for info icon
        }
      };
    });

    // Transform services to independent nodes FIRST (before layanaEdges)
    // DISABLED: Services are now rendered inside CustomNode using ServiceAsNode with isInsideItem=true
    // This prevents duplication of service nodes
    // const serviceNodes = transformServicesToNodes(
    //   services,
    //   items,
    //   {
    //     onServiceClick: handleServiceClick,
    //     onServiceItemsClick: handleServiceItemsClick
    //   }
    // );
    const serviceNodes = []; // Empty array since services are inside CustomNode

    // Add layanan connections (edges) with status-based styling
    const layananEdges = layananConnections.map((conn) => {
      const edgeId = `layanan-edge-${conn.id}`;

      // PENTING: Semua node IDs harus STRING untuk ReactFlow
      // Layanan nodes: 'layanan-{id}' (string dengan prefix)
      // Service nodes: 'service-{id}' (string dengan prefix)
      // CMDB nodes: String(id) (angka sebagai string, TANPA prefix)
      let sourceId;
      if (conn.source_type === 'layanan') {
        sourceId = `layanan-${conn.source_id}`;
      } else if (conn.source_type === 'service') {
        sourceId = `service-${conn.source_id}`;
      } else {
        sourceId = String(conn.source_id);
      }

      let targetId;
      if (conn.target_type === 'layanan') {
        targetId = `layanan-${conn.target_id}`;
      } else if (conn.target_type === 'service') {
        // Connect to the SERVICE NODE itself, not the parent CMDB item
        targetId = `service-${conn.target_id}`;

        // Verify the service exists in servicesMap
        let serviceExists = false;
        for (const item of items) {
          const itemServices = servicesMap[item.id] || [];
          if (itemServices.some(s => s.id === conn.target_id)) {
            serviceExists = true;
            break;
          }
        }
        if (!serviceExists) {
          return null; // Skip if service not found
        }
      } else {
        // CMDB item or other
        targetId = String(conn.target_id);
      }

      // Find source and target nodes to get their status
      // Include serviceNodes in the search since they're now created before layananEdges
      const allNodes = [...flowNodes, ...layananNodes, ...serviceNodes];
      let sourceNode = allNodes.find(n => n.id === sourceId);
      let targetNode = allNodes.find(n => n.id === targetId);

      // For service nodes, get the service directly from servicesMap
      let sourceService = null;
      let targetService = null;

      if (conn.source_type === 'service' && !sourceNode) {
        // Find the service in servicesMap
        for (const item of items) {
          const itemServices = servicesMap[item.id] || [];
          sourceService = itemServices.find(s => s.id === conn.source_id);
          if (sourceService) break;
        }
        if (!sourceService) {
          return null; // Service not found
        }
      }

      if (conn.target_type === 'service' && !targetNode) {
        // Find the service in servicesMap
        for (const item of items) {
          const itemServices = servicesMap[item.id] || [];
          targetService = itemServices.find(s => s.id === conn.target_id);
          if (targetService) break;
        }
        if (!targetService) {
          return null; // Service not found
        }
      }

      // Check if we have valid nodes or services
      const hasValidSource = sourceNode || sourceService;
      const hasValidTarget = targetNode || targetService;

      if (!hasValidSource || !hasValidTarget) {
        return null; // Skip edge jika node tidak ditemukan
      }

      // Determine edge status based on source and target
      let edgeStatus = 'active';
      let showCrossMarker = false;

      // Helper to get status from node or service
      const getSourceStatus = () => {
        if (sourceService) return sourceService.status;
        return sourceNode?.data?.status || 'active';
      };

      const getTargetStatus = () => {
        if (targetService) return targetService.status;
        return targetNode?.data?.status || 'active';
      };

      const sourceStatus = getSourceStatus();
      const targetStatus = getTargetStatus();

      // Determine edge status based on source and target statuses
      if (sourceStatus === 'inactive' || targetStatus === 'inactive') {
        edgeStatus = 'inactive';
        showCrossMarker = true;
      } else if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
        edgeStatus = 'maintenance';
      }

      // Get color based on status (SAMA SEPERTI CMDB)
      const getStrokeColor = (status) => {
        switch (status) {
          case 'active': return '#10b981'; // green (SAMA DENGAN CMDB)
          case 'inactive': return '#ef4444'; // red
          case 'maintenance': return '#f59e0b'; // yellow
          default: return '#10b981'; // green (SAMA DENGAN CMDB)
        }
      };

      const strokeColor = getStrokeColor(edgeStatus);

      // Get handles from edgeHandles state, or use defaults
      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        // Default handles based on node types
        // Layanan nodes have handles: 'bottom' (source), 'top' (target), 'left' (source), 'right' (source), 'left-target' (target), 'right-target' (target)
        // CMDB nodes have handles: 'source-bottom', 'target-bottom', 'source-top', 'target-top', 'source-left', 'target-left', 'source-right', 'target-right'
        // Service nodes have handles: 'source-{position}' and 'target-{position}' (top, right, bottom, left)

        if (conn.source_type === 'layanan') {
          // Source is Layanan node - use 'bottom' or 'right' for output
          sourceHandle = 'bottom';
        } else {
          // Source is CMDB node - use 'source-bottom' for output
          sourceHandle = 'source-bottom';
        }

        if (conn.target_type === 'layanan') {
          // Target is Layanan node - use 'top' or 'left-target'/'right-target' for input
          targetHandle = 'top';
        } else if (conn.target_type === 'service') {
          // Target is Service node - use 'target-top' for input
          targetHandle = 'target-top';
        } else {
          // Target is CMDB node - use 'target-top' for input
          targetHandle = 'target-top';
        }
      }

      const edgeConfig = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: 2,  // SAMA DENGAN CMDB (normal = 2)
          opacity: 1,
        },
        zIndex: conn.target_type === 'service' || conn.source_type === 'service' ? 1001 : 10,  // Higher for service edges
        reconnectable: true,
        // Add connection type label if enabled
        ...(showConnectionLabels && {
          label: conn.connection_type || 'connects_to',
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
            fill: strokeColor,
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '2px 4px'
          },
          labelBgStyle: {
            fill: 'white',
            fillOpacity: 0.9
          }
        }),
        // Add cross marker if inactive
        ...(showCrossMarker && {
          label: '✕',
          labelStyle: {
            fill: strokeColor,
            fontWeight: 'bold',
            fontSize: 20,
          },
          labelBgStyle: {
            fill: 'white',
            fillOpacity: 0.9
          }
        }),
      };

      return edgeConfig;
    }).filter(Boolean); // Hapus edges yang null

    // Add layanan service connections (edges to service items with status propagation)
    const layananServiceEdges = layananServiceConnections.map((conn) => {
      const edgeId = `layana-service-edge-${conn.id}`;

      // Layanan node ID
      const layananNodeId = `layanan-${conn.layanan_id}`;

      // Find the CMDB item that contains this service
      // We need to find which item has the service, then use that item's ID as the target
      let targetCmdbItemId = null;
      let targetService = null;

      // Search through all items to find the one containing the service
      for (const item of items) {
        const itemServices = servicesMap[item.id] || [];
        targetService = itemServices.find(s => s.id === conn.service_id);
        if (targetService) {
          targetCmdbItemId = item.id;
          break;
        }
      }

      if (!targetCmdbItemId) {
        return null; // Skip if parent CMDB item not found
      }

      const sourceNode = layananNodes.find(n => n.id === layananNodeId);
      const targetNode = flowNodes.find(n => n.id === String(targetCmdbItemId));

      if (!sourceNode || !targetNode) {
        return null;
      }

      // Determine edge status based on service item status (fetch from serviceItems map)
      let edgeStatus = 'active';
      let showCrossMarker = false;

      // Get service item status - ALWAYS check regardless of propagation_enabled
      // because edge should reflect current state of connected service item
      if (targetService) {
        // Get service items from the serviceItems map
        const itemsForService = serviceItems[conn.service_id] || [];
        const serviceItem = itemsForService.find(item => item.id === conn.service_item_id);

        if (serviceItem) {
          if (serviceItem.status === 'inactive' || sourceNode?.data?.status === 'inactive') {
            edgeStatus = 'inactive';
            showCrossMarker = true;
          } else if (serviceItem.status === 'maintenance' || sourceNode?.data?.status === 'maintenance') {
            edgeStatus = 'maintenance';
          }
        }
      }

      const getStrokeColor = (status) => {
        switch (status) {
          case 'active': return '#10b981';
          case 'inactive': return '#ef4444';
          case 'maintenance': return '#f59e0b';
          default: return '#10b981';
        }
      };

      const strokeColor = getStrokeColor(edgeStatus);

      const edgeConfig = {
        id: edgeId,
        source: layananNodeId,
        target: String(targetCmdbItemId),
        sourceHandle: 'bottom',
        targetHandle: 'target-top',
        type: 'smoothstep',
        animated: false,
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: 2,
          opacity: 1,
        },
        data: {
          connectionType: conn.connection_type || 'depends_on',
          showCrossMarker,
        },
        // Add cross marker if inactive
        ...(showCrossMarker && {
          label: '✕',
          labelStyle: {
            fill: strokeColor,
            fontWeight: 'bold',
            fontSize: 20,
          },
          labelBgStyle: {
            fill: 'white',
            fillOpacity: 0.9
          }
        }),
      };

      // Add label for service connection
      if (showConnectionLabels && conn.connection_type) {
        const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);
        edgeConfig.label = connectionTypeInfo ? connectionTypeInfo.label : conn.connection_type;
        edgeConfig.labelStyle = {
          fontSize: '10px',
          fontWeight: 600,
          fill: strokeColor
        };
        edgeConfig.labelBgStyle = {
          fill: 'white',
          fillOpacity: 0
        };
        edgeConfig.labelBgPadding = [6, 6];
      }

      return edgeConfig;
    }).filter(Boolean);

    const allEdges = [...flowEdges, ...layananEdges, ...layananServiceEdges];

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

      // Get status from connection
      const sourceStatus = conn.source_service_status || 'active';
      const targetStatus = conn.target_service_status || 'active';

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
          const sourceParent = [...flowNodes, ...layananNodes].find(n => n.id === sourceParentId);
          if (sourceParent) {
            sourceAbsX += sourceParent.position.x;
            sourceAbsY += sourceParent.position.y;
          }
        }

        // If target is child node, add parent position
        if (targetParentId) {
          const targetParent = [...flowNodes, ...layananNodes].find(n => n.id === targetParentId);
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
          fill: 'white',
          fillOpacity: 0.9
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

    setNodes([...flowNodes, ...layananNodes, ...serviceNodes]);
    setEdges([...allEdges, ...serviceToServiceEdges]);
  }, [transformToFlowData, setNodes, setEdges, layananItems, layananConnections, layananServiceConnections, showConnectionLabels, edgeHandles, items, calculateLayananStatusAndConnections, serviceToServiceConnections]);

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
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socketRef.current = socket;

    const handleCmdbUpdate = async () => {
      // Skip fetch if currently saving
      if (!isSavingRef.current) {
        // Fetch CMDB data, layana data, and service-to-service connections
        await Promise.all([fetchAll(), fetchLayanaAll(), fetchServiceToServiceConnections()]);
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

    socket.on('cmdb_update', handleCmdbUpdate);
    socket.on('service_update', handleServiceUpdate);

    return () => {
      socket.off('cmdb_update', handleCmdbUpdate);
      socket.off('service_update', handleServiceUpdate);
    };
  }, [socket, fetchAll, fetchLayanaAll, currentWorkspace, setServices, fetchServices]);

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

  const handleOpenAddLayanan = useCallback(() => {
    setLayananFormData({ name: '', description: '', status: 'active' });
    setEditLayananMode(false);
    setCurrentLayananId(null);
    setShowLayananModal(true);
  }, []);

  const handleEditLayanan = useCallback((layanan) => {
    setLayananFormData({
      name: layanan.name || '',
      description: layanan.description || '',
      status: layanan.status || 'active'
    });
    setEditLayananMode(true);
    setCurrentLayananId(layanan.id);
    setShowLayananModal(true);
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

    // Emit socket update
    if (socket) {
      socket.emit('cmdb_update');
    }
  }, [fetchAll, socket]);

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

  const handleLayananSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!currentWorkspace) {
      toast.error('Pilih workspace terlebih dahulu');
      return;
    }

    const initialPosition = getViewportCenter();

    try {
      const layananData = {
        name: layananFormData.name,
        description: layananFormData.description || null,
        status: layananFormData.status,
        position: initialPosition,
        workspace_id: currentWorkspace.id
      };

      let result;

      if (editLayananMode) {
        // Update existing layanan
        result = await updateLayanan(currentLayananId, {
          name: layananData.name,
          description: layananData.description,
          status: layananData.status
        });
      } else {
        // Create new layanan
        result = await createLayanan(layananData);
      }

      if (result.success) {
        toast.success(editLayananMode ? 'Layanan berhasil diupdate' : 'Layanan berhasil ditambahkan');
        setShowLayananModal(false);

        setTimeout(() => {
          setLayananFormData({ name: '', description: '', status: 'active' });
          setEditLayananMode(false);
          setCurrentLayananId(null);
        }, 100);
      } else {
        toast.error('Gagal: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [layananFormData, currentWorkspace, getViewportCenter, editLayananMode, currentLayananId, createLayanan, updateLayanan]);

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

  const handleSaveConnections = useCallback(async (itemConnTypes = {}, groupConnTypes = {}) => {
    if (!selectedItemForConnection || !currentWorkspace) return;

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
    // Detect if source or target is a group, layanan, or service
    const isSourceGroup = String(connection.source).startsWith('group-');
    const isTargetGroup = String(connection.target).startsWith('group-');
    const isSourceLayanan = String(connection.source).startsWith('layanan-');
    const isTargetLayanan = String(connection.target).startsWith('layanan-');
    const isSourceService = String(connection.source).startsWith('service-');
    const isTargetService = String(connection.target).startsWith('service-');

    let sourceItem, targetItem, sourceGroup, targetGroup, sourceLayanan, targetLayanan, sourceService, targetService;

    if (isSourceGroup) {
      const sourceGroupId = Number(String(connection.source).replace('group-', ''));
      sourceGroup = groups.find(g => g.id === sourceGroupId);
    } else if (isSourceLayanan) {
      const sourceLayananId = Number(String(connection.source).replace('layanan-', ''));
      sourceLayanan = layananItems.find(l => l.id === sourceLayananId);
    } else if (isSourceService) {
      const sourceServiceId = Number(String(connection.source).replace('service-', ''));
      // Find service from services array
      sourceService = services.find(s => s.id === sourceServiceId);
    } else {
      sourceItem = items.find(item => item.id === Number(connection.source));
    }

    if (isTargetGroup) {
      const targetGroupId = Number(String(connection.target).replace('group-', ''));
      targetGroup = groups.find(g => g.id === targetGroupId);
    } else if (isTargetLayanan) {
      const targetLayananId = Number(String(connection.target).replace('layanan-', ''));
      targetLayanan = layananItems.find(l => l.id === targetLayananId);
    } else if (isTargetService) {
      const targetServiceId = Number(String(connection.target).replace('service-', ''));
      // Find service from services array
      targetService = services.find(s => s.id === targetServiceId);
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

    // Handle layanan → service connections (direct connection to service, not service item)
    if ((sourceLayanan && targetService) || (sourceService && targetLayanan)) {
      const layananId = sourceLayanan ? sourceLayanan.id : targetLayanan.id;
      const serviceId = sourceService ? sourceService.id : targetService.id;
      const isSourceLay = !!sourceLayanan;

      const existingConn = layananConnections.find(
        conn => conn.source_id === layananId &&
                conn.source_type === 'layanan' &&
                conn.target_id === serviceId &&
                conn.target_type === 'service'
      );

      if (existingConn) {
        toast.error('Koneksi layanan-service sudah ada!');
        return;
      }

      // Open layana-service connection modal
      setLayananServiceSource(isSourceLay ? sourceLayanan : sourceService);
      setLayananServiceTarget(isSourceLay ? targetService : targetLayanan);
      setIsLayananSource(isSourceLay);
      setShowLayananServiceModal(true);
      return;
    }

    // Check if we have valid source and target
    if ((!sourceItem && !sourceGroup && !sourceLayanan) || (!targetItem && !targetGroup && !targetLayanan)) {
      return;
    }

    // Check for unsupported group-to-layanan connections
    if ((sourceGroup && targetLayanan) || (sourceLayanan && targetGroup)) {
      toast.error('Koneksi group-to-layanan tidak didukung. Gunakan item sebagai perantara.');
      return;
    }

    // Check if connection already exists
    let existingConn = null;
    if (sourceLayanan || targetLayanan) {
      // Layanan connections - check in layananConnections
      const sourceId = sourceLayanan ? sourceLayanan.id : null;
      const targetId = targetLayanan ? targetLayanan.id : null;
      const sourceType = sourceLayanan ? 'layanan' : 'cmdb';
      const targetType = targetLayanan ? 'layanan' : 'cmdb';

      existingConn = layananConnections.find(
        conn => conn.source_id === sourceId && conn.source_type === sourceType &&
                conn.target_id === targetId && conn.target_type === targetType
      );
    } else if (sourceItem && targetItem) {
      // Item-to-item
      existingConn = connections.find(
        conn => conn.source_id === sourceItem.id && conn.target_id === targetItem.id
      );
    } else if (sourceItem && targetGroup) {
      // Item-to-group
      existingConn = connections.find(
        conn => conn.source_id === sourceItem.id && conn.target_group_id === targetGroup.id
      );
    } else if (sourceGroup && targetItem) {
      // Group-to-item
      existingConn = connections.find(
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

    // Set source and target (can be item, group, or layanan)
    // Wrap in object with explicit type property for reliable detection
    const sourceData = sourceLayanan || sourceGroup || sourceItem;
    const targetData = targetLayanan || targetGroup || targetItem;

    const sourceType = sourceLayanan ? 'layanan' : (sourceGroup ? 'group' : 'item');
    const targetType = targetLayanan ? 'layanan' : (targetGroup ? 'group' : 'item');

    setQuickConnectionSource({ ...sourceData, _entityType: sourceType });
    setQuickConnectionTarget({ ...targetData, _entityType: targetType });
    setQuickConnectionMode('create');
    setQuickConnectionExistingType(null);
    setShowQuickConnectionModal(true);
  }, [items, connections, groups, layananItems, layananConnections, services, serviceToServiceConnections]);

  const handleSaveServiceConnection = useCallback(async (sourceServiceId, targetServiceId, connectionType) => {
    if (!currentWorkspace) return;

    try {
      // Find the parent CMDB item for the source service
      const sourceService = services.find(s => s.id === sourceServiceId);
      if (!sourceService) {
        toast.error('Source service not found!');
        return;
      }

      const result = await api.post('/service-to-service-connections', {
        cmdb_item_id: sourceService.cmdb_item_id, // Parent CMDB item ID
        source_service_id: sourceServiceId,
        target_service_id: targetServiceId,
        connection_type: connectionType,
        workspace_id: currentWorkspace.id
      });

      if (result.data) {
        toast.success('Koneksi service-to-service berhasil dibuat!');
        await fetchServiceToServiceConnections();
        setShowServiceConnectionModal(false);
        setServiceConnectionSource(null);
        setServiceConnectionTarget(null);
      }
    } catch (error) {
      console.error('Failed to create service-to-service connection:', error);
      toast.error(error.response?.data?.error || 'Gagal membuat koneksi service-to-service');
    }
  }, [currentWorkspace, fetchServiceToServiceConnections, services]);

  const handleSaveLayananServiceConnection = useCallback(async (connectionType) => {
    if (!currentWorkspace || !layananServiceSource || !layananServiceTarget) return;

    try {
      const response = await api.post('/layanan/connections', {
        source_type: isLayananSource ? 'layanan' : 'service',
        source_id: layananServiceSource.id,
        target_type: isLayananSource ? 'service' : 'layanan',
        target_id: layananServiceTarget.id,
        workspace_id: currentWorkspace.id,
        connection_type: connectionType
      });

      toast.success('Koneksi layanan-service berhasil dibuat!');
      await fetchLayanaAll();
      setShowLayananServiceModal(false);
      setLayananServiceSource(null);
      setLayananServiceTarget(null);
    } catch (error) {
      console.error('Failed to create layana-service connection:', error);
      toast.error(error.response?.data?.error || 'Gagal membuat koneksi layanan-service');
    }
  }, [currentWorkspace, fetchLayanaAll, layananServiceSource, layananServiceTarget, isLayananSource]);

  const handleSaveQuickConnection = useCallback(async (connectionType, serviceItemData = null) => {
    if (!quickConnectionSource || !quickConnectionTarget || !currentWorkspace) return;

    try {
      // Detect if source or target is a group or layanan using _entityType property
      const isSourceGroup = quickConnectionSource._entityType === 'group';
      const isTargetGroup = quickConnectionTarget._entityType === 'group';
      const isSourceLayanan = quickConnectionSource._entityType === 'layanan';
      const isTargetLayanan = quickConnectionTarget._entityType === 'layanan';

      // Check if this involves layanan
      const involvesLayanan = isSourceLayanan || isTargetLayanan;

      // Check if this involves groups with layanan (not supported by database)
      const involvesGroupWithLayanan = (isSourceGroup && isTargetLayanan) || (isSourceLayanan && isTargetGroup);

      if (involvesGroupWithLayanan) {
        toast.error('Koneksi group-to-layanan tidak didukung. Gunakan item sebagai perantara.');
        return;
      }

      // Handle layanan to service item connection
      if (involvesLayanan && serviceItemData) {
        const layananNode = isSourceLayanan ? quickConnectionSource : quickConnectionTarget;
        // Handle both string IDs with 'layanan-' prefix and numeric IDs
        const layananId = typeof layananNode.id === 'string'
          ? parseInt(layananNode.id.replace('layanan-', ''))
          : layananNode.id;

        // Check connection target type
        if (serviceItemData.connectionTargetType === 'service') {
          // Direct layana → service connection using layana_connections table
          const response = await api.post('/layanan/connections', {
            source_type: isSourceLayanan ? 'layanan' : 'cmdb',
            source_id: layananNode.id,
            target_type: 'service',
            target_id: serviceItemData.serviceId,
            workspace_id: currentWorkspace.id,
            connection_type: connectionType
          });

          toast.success('Koneksi layanan ke service berhasil dibuat!');
          await fetchLayanaAll();
        } else {
          // Layana → service item connection using layana_service_connections table
          const result = await createLayananServiceConnection({
            layanan_id: layananId,
            service_id: serviceItemData.serviceId,
            service_item_id: serviceItemData.serviceItemId,
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            propagation_enabled: serviceItemData.propagationEnabled,
          });

          if (result.success) {
            toast.success('Koneksi layanan ke service item berhasil dibuat!');
            await fetchLayanaAll();
          } else {
            toast.error(result.error || 'Gagal membuat koneksi');
          }
        }

        setShowQuickConnectionModal(false);
        setQuickConnectionSource(null);
        setQuickConnectionTarget(null);
        return;
      }

      if (quickConnectionMode === 'edit') {
        // Update existing connection - not supported for layanan yet
        if (involvesLayanan) {
          toast.info('Edit koneksi layanan: Hapus dan buat kembali dengan tipe baru.');
          return;
        }
        // Update existing connection
        if (!isSourceGroup && !isTargetGroup) {
          // Item-to-item
          await api.put(`/cmdb/connections/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            direction: getConnectionDirection(connectionType)
          });
          toast.success('Tipe koneksi berhasil diubah!');
        } else if (isSourceGroup && !isTargetGroup) {
          // Group-to-item
          await api.put(`/cmdb/connections/from-group/${quickConnectionSource.id}/${quickConnectionTarget.id}`, {
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            direction: getConnectionDirection(connectionType)
          });
          toast.success('Tipe koneksi group-to-item berhasil diubah!');
        } else if (!isSourceGroup && isTargetGroup) {
          // Item-to-group
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
        if (involvesLayanan) {
          // Check if this is layana → service connection
          const isSourceService = quickConnectionSource._entityType === 'service';
          const isTargetService = quickConnectionTarget._entityType === 'service';

          if ((isSourceLayanan && isTargetService) || (isSourceService && isTargetLayanan)) {
            // Layana → Service direct connection
            const layananId = isSourceLayanan ? quickConnectionSource.id : quickConnectionTarget.id;
            const serviceId = isSourceService ? quickConnectionSource.id : quickConnectionTarget.id;

            const response = await api.post('/layanan/connections', {
              source_type: isSourceLayanan ? 'layanan' : 'service',
              source_id: layananId,
              target_type: isSourceService ? 'layanan' : 'service',
              target_id: serviceId,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType
            });

            toast.success('Koneksi layanan-service berhasil dibuat!');
            await fetchLayanaAll();
          } else {
            // Layanan → CMDB or Layanan → Layanan connections
            const response = await api.post('/layanan/connections', {
              source_type: isSourceLayanan ? 'layanan' : 'cmdb',
              source_id: quickConnectionSource.id,
              target_type: isTargetLayanan ? 'layanan' : 'cmdb',
              target_id: quickConnectionTarget.id,
              workspace_id: currentWorkspace.id,
              connection_type: connectionType
            });

            // Simpan edge handle untuk koneksi layanan yang baru dibuat
            const newConnection = response.data;
            if (newConnection && newConnection.id) {
              const edgeId = `layanan-edge-${newConnection.id}`;

              // Tentukan handle berdasarkan tipe node (layanan vs CMDB)
              let sourceHandle, targetHandle;

              if (isSourceLayanan) {
                // Source is Layanan node - use 'bottom' for output
                sourceHandle = 'bottom';
              } else {
                // Source is CMDB node - use 'source-bottom' for output
                sourceHandle = 'source-bottom';
              }

              if (isTargetLayanan) {
                // Target is Layanan node - use 'top' for input
                targetHandle = 'top';
              } else {
                // Target is CMDB node - use 'target-top' for input
                targetHandle = 'target-top';
              }

              // Simpan edge handle
              const newEdgeHandles = {
                ...edgeHandles,
                [edgeId]: {
                  sourceHandle,
                  targetHandle,
                }
              };

              await saveEdgeHandle(
                edgeId,
                sourceHandle,
                targetHandle,
                currentWorkspace?.id
              );

              setEdgeHandles(newEdgeHandles);
            }

            toast.success('Koneksi layanan berhasil dibuat!');
          }
        } else if (isSourceGroup && isTargetGroup) {
          // Group-to-group - use group connection endpoint
          await api.post('/groups/connections', {
            source_id: quickConnectionSource.id,
            target_id: quickConnectionTarget.id,
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            direction: getConnectionDirection(connectionType)
          });
          toast.success('Koneksi group-to-group berhasil dibuat!');
        } else if (isSourceGroup && !isTargetGroup) {
          // Group-to-item
          await api.post('/cmdb/connections/from-group', {
            source_group_id: quickConnectionSource.id,
            target_id: quickConnectionTarget.id,
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            direction: getConnectionDirection(connectionType)
          });
          toast.success('Koneksi group-to-item berhasil dibuat!');
        } else if (!isSourceGroup && isTargetGroup) {
          // Item-to-group
          await api.post('/cmdb/connections/to-group', {
            source_id: quickConnectionSource.id,
            target_group_id: quickConnectionTarget.id,
            workspace_id: currentWorkspace.id,
            connection_type: connectionType,
            direction: getConnectionDirection(connectionType)
          });
          toast.success('Koneksi item-to-group berhasil dibuat!');
        } else {
          // Item-to-item
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

      // Fetch cmdb, layana, and service-to-service connections data
      await Promise.all([fetchAll(), fetchLayanaAll(), fetchServiceToServiceConnections()]);
      setShowQuickConnectionModal(false);
      setQuickConnectionSource(null);
      setQuickConnectionTarget(null);
    } catch (err) {
      console.error('Save connection error:', err);
      toast.error('Gagal menyimpan koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [quickConnectionSource, quickConnectionTarget, quickConnectionMode, currentWorkspace, fetchAll, fetchLayanaAll, fetchServiceToServiceConnections, getConnectionDirection, saveEdgeHandle, edgeHandles]);

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
    });
  }, [nodes]);

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  const handleDeleteEdge = useCallback(async () => {
    if (!edgeContextMenu.edge) return;

    try {
      // Deteksi apakah koneksi layanan, group-to-item, item-to-group, atau group-to-group
      const isLayananEdge = String(edgeContextMenu.edge.id).startsWith('layanan-edge-');
      const isGroupToItem = String(edgeContextMenu.edge.source).startsWith('group-');
      const isItemToGroup = String(edgeContextMenu.edge.target).startsWith('group-');
      const isGroupToGroup = isGroupToItem && isItemToGroup;
      const isServiceConnection = String(edgeContextMenu.edge.id).startsWith('service-connection-');

      let deleteUrl;
      if (isLayananEdge) {
        // Layanan edge: DELETE /api/layanan/connections/:id
        const connectionId = String(edgeContextMenu.edge.id).replace('layanan-edge-', '');
        deleteUrl = `/layanan/connections/${connectionId}`;
      } else if (isServiceConnection) {
        // Service-to-service connection: DELETE /api/service-to-service-connections/:id
        const connectionId = String(edgeContextMenu.edge.id).replace('service-connection-', '');
        deleteUrl = `/service-to-service-connections/${connectionId}`;
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

      // Fetch cmdb, layana, and service-to-service connections data
      await Promise.all([fetchAll(), fetchLayanaAll(), fetchServiceToServiceConnections()]);
    } catch (err) {
      console.error('Delete connection error:', err);
      toast.error('Gagal menghapus koneksi: ' + (err.response?.data?.error || err.message));
    }
  }, [edgeContextMenu.edge, fetchAll, fetchLayanaAll, fetchServiceToServiceConnections]);

  const handleEditEdge = useCallback(() => {
    if (!edgeContextMenu.edge) return;

    const edge = edgeContextMenu.edge;

    // Deteksi tipe koneksi
    const isLayananEdge = String(edge.id).startsWith('layanan-edge-');
    const isGroupToItem = String(edge.source).startsWith('group-');
    const isItemToGroup = String(edge.target).startsWith('group-');
    const isGroupToGroup = isGroupToItem && isItemToGroup;

    let sourceItem, targetItem, sourceGroup, targetGroup, sourceLayanan, targetLayanan;
    let connectionType = edge.data?.connectionType || edge.label || 'depends_on';

    // Handle layanan edge - edit not supported yet
    if (isLayananEdge) {
      toast.info('Edit koneksi layanan: Hapus dan buat kembali dengan tipe baru.');
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
    const asSource = connections.filter(c => c.source_id === itemId).length;
    const asTarget = connections.filter(c => c.target_id === itemId).length;
    return { dependencies: asTarget, dependents: asSource };
  }, [connections]);

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
                      title={`${service.name} (${service.status})`}
                    />
                  ))}
                  {count > 3 && (
                    <span className="text-xs text-gray-500">+{count - 3}</span>
                  )}
                </div>
              )}
            </div>
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
          // Ambil semua koneksi dari item ini
          const itemConnections = connections.filter(conn => conn.source_id === item.id);

          if (itemConnections.length === 0) {
            return <span className="text-gray-400 text-xs">Tidak ada koneksi</span>;
          }

          // Group koneksi berdasarkan tipe
          const connectionsByType = {};
          itemConnections.forEach(conn => {
            const type = conn.connection_type || 'depends_on';
            if (!connectionsByType[type]) {
              connectionsByType[type] = [];
            }
            connectionsByType[type].push(conn);
          });

          return (
            <div className="space-y-1">
              {Object.entries(connectionsByType).map(([type, conns]) => {
                const connType = CONNECTION_TYPES[type] || CONNECTION_TYPES.depends_on;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 text-xs"
                    title={connType.description}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: connType.color }}
                    />
                    <span className="text-gray-700">
                      {connType.label}: {conns.length}
                    </span>
                  </div>
                );
              })}
            </div>
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
        } else if (node.type === 'layanan') {
          const layananId = typeof node.id === 'string'
            ? node.id.replace('layanan-', '')
            : node.id;
          updatePromises.push(
            api.put(`/layanan/${layananId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits for batch update
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
        } else if (node.type === 'layanan') {
          const layananId = typeof node.id === 'string'
            ? node.id.replace('layanan-', '')
            : node.id;
          updatePromises.push(
            api.put(`/layanan/${layananId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true // Skip individual emits for batch update
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
    } else if (editData.type === 'layanan') {
      handleEditLayanan(editData.data);
    } else {
      handleEditItem(editData.data);
    }
  }, [contextMenu.node, handleEditFromVisualization, handleEditGroup, handleEditLayanan, handleEditItem]);

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
    if (!contextMenu.node || contextMenu.node.type === 'layanan') {
      toast.error('Layanan tidak dapat berada dalam group');
      return;
    }

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
        onOpenAddLayanan={handleOpenAddLayanan}
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
                newConnection.targetHandle,
                currentWorkspace?.id
              );

              setEdgeHandles(newEdgeHandles);
              setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
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

      <LayananFormModal
        show={showLayananModal}
        editMode={editLayananMode}
        formData={layananFormData}
        currentWorkspace={currentWorkspace}
        onClose={() => {
          setShowLayananModal(false);
          setLayananFormData({ name: '', description: '', status: 'active' });
          setEditLayananMode(false);
          setCurrentLayananId(null);
        }}
        onSubmit={handleLayananSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          setLayananFormData(prev => ({ ...prev, [name]: value }));
        }}
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
        }}
        onSave={handleSaveQuickConnection}
        mode={quickConnectionMode}
        existingConnectionType={quickConnectionExistingType}
        workspaceId={currentWorkspace?.id}
        nodes={nodes}
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
      />

      <QuickLayananServiceConnection
        open={showLayananServiceModal}
        onClose={() => {
          setShowLayananServiceModal(false);
          setLayananServiceSource(null);
          setLayananServiceTarget(null);
        }}
        onConnect={handleSaveLayananServiceConnection}
        sourceName={layananServiceSource?.name || ''}
        targetName={layananServiceTarget?.name || ''}
        isSourceLayanan={isLayananSource}
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
