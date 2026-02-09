import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
import 'reactflow/dist/style.css';
import { io } from 'socket.io-client';
import { Square } from 'lucide-react';
import api from '../../services/api';
import { useCMDB } from '../../hooks/cmdb-hooks/useCMDB';
import { useFlowData } from '../../hooks/cmdb-hooks/useFlowData';
import { useVisualizationActions } from '../../hooks/cmdb-hooks/useVisualizationActions';
import { loadEdgeHandles, saveEdgeHandles, saveEdgeHandle } from '../../utils/cmdb-utils/flowHelpers';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM, STATUS_COLORS } from '../../utils/cmdb-utils/constants';
import CustomNode from '../../components/cmdb-components/CustomNode';
import CustomGroupNode from '../../components/cmdb-components/CustomGroupNode';
import VisualizationNavbar from '../../components/cmdb-components/VisualizationNavbar';
import NodeContextMenu from '../../components/cmdb-components/NodeContextMenu';
import ItemFormModal from '../../components/cmdb-components/ItemFormModal';
import ConnectionModal from '../../components/cmdb-components/ConnectionModal';
import GroupModal from '../../components/cmdb-components/GroupModal';
import GroupConnectionModal from '../../components/cmdb-components/GroupConnectionModal';
import ExportModal from '@/components/cmdb-components/ExportModal';
import ServiceDetailDialog from '../../components/cmdb-components/ServiceDetailDialog';
import StorageFormModal from '../../components/cmdb-components/StorageFormModal';
import { toast } from 'sonner';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { MousePointer2, GitBranch, Link, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useUndoRedo } from '../../hooks/cmdb-hooks/useUndoRedo';
import { useAutoSave } from '../../hooks/cmdb-hooks/useAutoSave';
import { useNodeRelationships } from '../../hooks/cmdb-hooks/useNodeRelationship'
import DataTable from '@/components/common/DataTable';
import { useWorkspace } from '@/hooks/cmdb-hooks/useWorkspace';
import WorkspaceSwitcher from '@/components/cmdb-components/WorkspaceSwitcher';

const nodeTypes = {
  custom: CustomNode,
  group: CustomGroupNode,
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [edgeHandles, setEdgeHandles] = useState({});

  const [draggedNode, setDraggedNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);

  const [hiddenNodes, setHiddenNodes] = useState(new Set());
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

  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem('cmdb-minimap-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setDefaultWorkspace,
    duplicateWorkspace,
  } = useWorkspace();

  // Services state - PINDAHKAN KE ATAS sebelum useFlowData
  const [services, setServices] = useState({});
  const [serviceDialog, setServiceDialog] = useState({ show: false, service: null, parentItem: null });
  const [serviceIconUploads, setServiceIconUploads] = useState({});

  // Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [showTableDrawer, setShowTableDrawer] = useState(false);

  const { items, connections, groups, groupConnections, fetchAll } = useCMDB(currentWorkspace?.id);
  const { transformToFlowData } = useFlowData(items, connections, groups, groupConnections, edgeHandles, hiddenNodes, services);

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
    setServiceDialog({
      show: true,
      service,
      parentItem: items.find(i => i.id === parseInt(nodeData.id))
    });
  }, [items]);

  const handleAddService = useCallback((nodeData) => {
    const item = items.find(i => i.id === parseInt(nodeData.id));
    if (!item) return;

    const itemServices = services[item.id] || [];

    // Add icon_preview for uploaded icons
    const servicesWithPreview = itemServices.map(service => ({
      ...service,
      icon_preview: service.icon_type === 'upload' && service.icon_path
        ? `http://localhost:5000${service.icon_path}`
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
      storage: item.storage || null,  // ← Tambahkan storage
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
        nodeServices = services[node.id] || [];
      }

      return {
        ...node,
        data: {
          ...node.data,
          onServiceClick: handleServiceClick,
          onAddService: handleAddService,
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
  }, [nodes, selectedForHiding, highlightMode, highlightedNodeId, relatedNodes, handleServiceClick, handleAddService, services]);

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

  useEffect(() => {
    const { flowNodes, flowEdges } = transformToFlowData();
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [transformToFlowData, setNodes, setEdges]);

  // Fetch services for all items
  useEffect(() => {
    const fetchServices = async () => {
      const servicesMap = {};
      for (const item of items) {
        try {
          const res = await api.get(`/services/${item.id}`);
          // Tambahkan icon_preview untuk services yang di-upload
          const servicesWithPreview = res.data.map(service => ({
            ...service,
            icon_preview: service.icon_type === 'upload' && service.icon_path
              ? `http://localhost:5000${service.icon_path}`
              : null
          }));
          servicesMap[item.id] = servicesWithPreview;
        } catch (err) {
          console.error(`Failed to fetch services for item ${item.id}:`, err);
          servicesMap[item.id] = [];
        }
      }
      setServices(servicesMap);
    };

    if (items.length > 0) {
      fetchServices();
    }
  }, [items]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    nodes.forEach(node => {
      if (!lastNodePositionsRef.current[node.id]) {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      }
    });
  }, [nodes]);
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketRef.current = socket;

    socket.on('cmdb_update', () => {
      // Skip fetch if currently saving
      if (!isSavingRef.current) {
        fetchAll();
      }
    });

    return () => {
      socket.off('cmdb_update');
      socket.disconnect();
    };
  }, [fetchAll]);

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

  const handleEditItem = useCallback((item) => {
    const itemServices = services[item.id] || [];

    // Add icon_preview for uploaded icons
    const servicesWithPreview = itemServices.map(service => ({
      ...service,
      icon_preview: service.icon_type === 'upload' && service.icon_path
        ? `http://localhost:5000${service.icon_path}`
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
      storage: item.storage || null,  // ← Tambahkan storage
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
        await api.put(`/cmdb/${currentItemId}`, {
          ...itemDataWithoutServices,
        });
        itemId = currentItemId;

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

      await fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  }, [itemFormData, currentWorkspace, getViewportCenter, editItemMode, currentItemId, serviceIconUploads, fetchAll]);

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
    
    const existingItemConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_id)
      .map(conn => conn.target_id);
    
    const existingGroupConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_group_id)
      .map(conn => conn.target_group_id);
    
    setSelectedConnections(existingItemConns);
    setSelectedGroupConnections(existingGroupConns);
    setShowConnectionModal(true);
  }, [connections]);

  const handleSaveConnections = useCallback(async () => {
  if (!selectedItemForConnection || !currentWorkspace) return;
  
  try {
    const currentItemConns = connections
      .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_id)
      .map(conn => conn.target_id);

    const itemsToAdd = selectedConnections.filter(id => !currentItemConns.includes(id));
    const itemsToRemove = currentItemConns.filter(id => !selectedConnections.includes(id));

    for (const targetId of itemsToAdd) {
      await api.post('/cmdb/connections', {
        source_id: selectedItemForConnection.id,
        target_id: targetId,
        workspace_id: currentWorkspace.id // TAMBAHKAN INI
      });
    }

    for (const targetId of itemsToRemove) {
      await api.delete(`/cmdb/connections/${selectedItemForConnection.id}/${targetId}`);
    }

    const currentGroupConns = connections
      .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_group_id)
      .map(conn => conn.target_group_id);

    const groupsToAdd = selectedGroupConnections.filter(id => !currentGroupConns.includes(id));
    const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConnections.includes(id));

    for (const groupId of groupsToAdd) {
      await api.post('/cmdb/connections/to-group', {
        source_id: selectedItemForConnection.id,
        target_group_id: groupId,
        workspace_id: currentWorkspace.id // TAMBAHKAN INI
      });
    }

    for (const groupId of groupsToRemove) {
      await api.delete(`/cmdb/connections/to-group/${selectedItemForConnection.id}/${groupId}`);
    }

    await fetchAll();
    setShowConnectionModal(false);
  } catch (err) {
    console.error(err);
    toast.error('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
  }
}, [connections, selectedItemForConnection, selectedConnections, selectedGroupConnections, currentWorkspace, fetchAll]);

  const handleToggleConnection = (targetId) => {
    setSelectedConnections(prev => 
      prev.includes(targetId) 
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleToggleGroupConnection = (groupId) => {
    setSelectedGroupConnections(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleOpenGroupConnectionModal = (group) => {
    setSelectedGroupForConnection(group);
    
    const existingGroupConns = groupConnections
      .filter(conn => conn.source_id === group.id)
      .map(conn => conn.target_id);
    
    const existingItemConns = connections
      .filter(conn => conn.source_group_id === group.id)
      .map(conn => conn.target_id);
    
    setSelectedGroupToGroupConnections(existingGroupConns);
    setSelectedGroupToItemConnections(existingItemConns); // TAMBAHKAN INI
    setShowGroupConnectionModal(true);
  };

  const handleToggleGroupToGroupConnection = (targetGroupId) => {
    setSelectedGroupToGroupConnections(prev =>
      prev.includes(targetGroupId)
        ? prev.filter(id => id !== targetGroupId)
        : [...prev, targetGroupId]
    );
  };

  const handleToggleGroupToItemConnection = (targetItemId) => {
    setSelectedGroupToItemConnections(prev =>
      prev.includes(targetItemId)
        ? prev.filter(id => id !== targetItemId)
        : [...prev, targetItemId]
    );
  };

  const handleSaveGroupConnections = async () => {
  if (!currentWorkspace) return;
  
  try {
    const currentGroupConns = groupConnections
      .filter(conn => conn.source_id === selectedGroupForConnection.id)
      .map(conn => conn.target_id);

    const groupsToAdd = selectedGroupToGroupConnections.filter(id => !currentGroupConns.includes(id));
    const groupsToRemove = currentGroupConns.filter(id => !selectedGroupToGroupConnections.includes(id));

    for (const targetId of groupsToAdd) {
      await api.post('/groups/connections', {
        source_id: selectedGroupForConnection.id,
        target_id: targetId,
        workspace_id: currentWorkspace.id // TAMBAHKAN INI
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
      await api.post('/cmdb/connections/from-group', {
        source_group_id: selectedGroupForConnection.id,
        target_id: targetId,
        workspace_id: currentWorkspace.id // TAMBAHKAN INI
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
          { value: 'decommissioned', label: 'Decommissioned', color: STATUS_COLORS.decommissioned },
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
            <span className="px-2 py-1 rounded text-xs" style={{
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
        key: 'connections',
        label: 'Koneksi',
        searchable: false,
        sortable: false,
        render: (item) => {
          const info = getConnectionInfo(item.id);
          return (
            <div className="text-xs">
              <div className="text-blue-600">↑ {info.dependencies} dependencies</div>
              <div className="text-green-600">↓ {info.dependents} dependents</div>
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
    [connections, groups, getConnectionInfo, handleOpenConnectionModal, handleEditItem, handleDeleteFromVisualization]
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

    const { itemsPerRow, itemWidth, gapX, gapY, padding } = DIMENSIONS;
    const relX = node.position.x - padding;
    const relY = node.position.y - padding - 40;

    const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gapX))));

    // Hitung baris berdasarkan kumulatif tinggi baris dari groupNode
    let row = 0;
    let currentY = 0;
    const itemsInGroup = currentNodes.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode);
    const rowCount = Math.ceil(itemsInGroup.length / itemsPerRow);

    // Cari baris yang sesuai dengan posisi Y
    for (let r = 0; r < rowCount; r++) {
      // Hitung tinggi baris ini (ambil maksimum dari item di baris tersebut)
      const startIdx = r * itemsPerRow;
      const endIdx = Math.min(startIdx + itemsPerRow, itemsInGroup.length);
      const itemsInRow = itemsInGroup.slice(startIdx, endIdx);

      let maxRowHeight = DIMENSIONS.baseItemHeight; // Default
      if (groupNode.data?.rowHeights && groupNode.data.rowHeights[r]) {
        maxRowHeight = groupNode.data.rowHeights[r];
      } else {
        // Fallback: hitung dari items yang ada
        for (const item of itemsInRow) {
          const itemServices = item.data?.services || [];
          const serviceCount = itemServices.length;
          const itemHeight = DIMENSIONS.baseItemHeight + (serviceCount > 0 ? 20 + Math.ceil(serviceCount / DIMENSIONS.servicesPerRow) * DIMENSIONS.serviceHeight : 0);
          maxRowHeight = Math.max(maxRowHeight, itemHeight);
        }
      }

      const rowBottomY = currentY + maxRowHeight + gapY / 2;

      if (relY <= rowBottomY) {
        row = r;
        break;
      }

      currentY += maxRowHeight + gapY;
    }

    const newIndex = row * itemsPerRow + col;

    if (newIndex >= 0 && newIndex <= currentNodes.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode).length) {
      // Hitung relativeY berdasarkan kumulatif tinggi baris sebelumnya
      let targetRelativeY = padding + 40;
      for (let r = 0; r < row; r++) {
        const rowHeight = groupNode.data?.rowHeights?.[r] || DIMENSIONS.baseItemHeight;
        targetRelativeY += rowHeight + gapY;
      }

      setHoverPosition({
        groupId: node.parentNode,
        index: newIndex,
        relativeX: padding + col * (itemWidth + gapX),
        relativeY: targetRelativeY,
        absoluteX: groupNode.position.x + padding + col * (itemWidth + gapX),
        absoluteY: groupNode.position.y + targetRelativeY,
      });
    }
  }, [draggedNode]);

  const onNodeDragStop = useCallback(async (event, node) => {
    const dragDuration = Date.now() - dragStateRef.current.startTime;
    dragStateRef.current = { isDragging: false, startTime: 0 };

    if (dragDuration < 100) {
      setDraggedNode(null);
      setHoverPosition(null);
      return;
    }

    if (!draggedNode || !hoverPosition || !node.parentNode) {
      setDraggedNode(null);
      setHoverPosition(null);
      isReorderingRef.current = false;
      return;
    }

    try {
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

    } catch (err) {
      console.error('Failed to reorder:', err);
      toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
      isReorderingRef.current = false;
    } finally {
      setDraggedNode(null);
      setHoverPosition(null);
    }
  }, [draggedNode, hoverPosition, setNodes, fetchAll]);

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
            }
          }
        }
      });
    }
    
    onNodesChange(changes);
  }, [onNodesChange, pushState, nodes]);

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
      console.log('Save already in progress, skipping...');
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
    const toggleTableDrawer = useCallback(() => {
    setShowTableDrawer(prev => !prev);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col">
      <VisualizationNavbar
        draggedNode={draggedNode}
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
            onToggleVisibility={handleContextToggleVisibility}
            onClose={closeContextMenu}
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
                  return {
                    'Nama': item.name || '',
                    'Type': item.type || '',
                    'Status': item.status || '',
                    'IP': item.ip || '',
                    'Category': item.category || '',
                    'Location': item.location || '',
                    'Group': group ? group.name : '-',
                    'Environment Type': item.env_type || '',
                    'Description': item.description || '',
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
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={exportVisualization}
      />

      <ServiceDetailDialog
        show={serviceDialog.show}
        service={serviceDialog.service}
        workspaceId={currentWorkspace?.id}
        onClose={() => setServiceDialog({ show: false, service: null, parentItem: null })}
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
