import { useState, useEffect, useCallback, useRef } from 'react';
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
import { FaSquare } from 'react-icons/fa';
import api from '../../services/api';
import { useCMDB } from '../../hooks/cmdb-hooks/useCMDB';
import { useFlowData } from '../../hooks/cmdb-hooks/useFlowData';
import { useImageUpload } from '../../hooks/cmdb-hooks/useImageUpload';
import { useVisualizationActions } from '../../hooks/cmdb-hooks/useVisualizationActions';
import { loadEdgeHandles, saveEdgeHandles } from '../../utils/cmdb-utils/flowHelpers';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM } from '../../utils/cmdb-utils/constants';
import CustomNode from '../../components/cmdb-components/CustomNode';
import CustomGroupNode from '../../components/cmdb-components/CustomGroupNode';
import VisualizationNavbar from '../../components/cmdb-components/VisualizationNavbar';
import NodeContextMenu from '../../components/cmdb-components/NodeContextMenu';
import ItemFormModal from '../../components/cmdb-components/ItemFormModal';
import ConnectionModal from '../../components/cmdb-components/ConnectionModal';
import GroupModal from '../../components/cmdb-components/GroupModal';
import GroupConnectionModal from '../../components/cmdb-components/GroupConnectionModal';
import ExportModal from '@/components/cmdb-components/ExportModal';
import { toast } from 'sonner';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { FaMousePointer } from 'react-icons/fa';

const nodeTypes = {
  custom: CustomNode,
  group: CustomGroupNode,
};

export default function CMDBVisualization() {
  const navigate = useNavigate();
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

  const { items, connections, groups, groupConnections, fetchAll } = useCMDB();
  const { transformToFlowData } = useFlowData(items, connections, groups, groupConnections, edgeHandles, hiddenNodes);
  const [showExportModal, setShowExportModal] = useState(false);
  
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

  useEffect(() => {
    const handles = loadEdgeHandles();
    setEdgeHandles(handles);
  }, []);

  const loadData = useCallback(() => {
    const { flowNodes, flowEdges } = transformToFlowData();
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [transformToFlowData, setNodes, setEdges]);

  const loadDataRef = useRef(null);

  loadDataRef.current = () => {
    const { flowNodes, flowEdges } = transformToFlowData();
    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  useEffect(() => {
    if (loadDataRef.current) {
      loadDataRef.current();
    }
  }, [items, connections, groups, groupConnections, edgeHandles, hiddenNodes]);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socketRef.current = socket;

    socket.on('cmdb_update', (data) => {
      fetchAll();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('cmdb_update');
      socket.disconnect();
    };
  }, []); 

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleOpenAddItem = () => {
    setItemFormData(INITIAL_ITEM_FORM);
    setEditItemMode(false);
    setCurrentItemId(null);
    resetImages();
    setShowItemModal(true);
  };

  const handleEditItem = (item) => {
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
    });
    setCurrentItemId(item.id);
    setEditItemMode(true);
    setImages(item.images);
    setShowItemModal(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(itemFormData).forEach(key => {
      if (itemFormData[key] !== null) {
        formDataToSend.append(key, itemFormData[key]);
      }
    });

    if (editItemMode) {
      formDataToSend.append('existingImages', JSON.stringify(existingImages));
    }

    selectedFiles.forEach(file => {
      formDataToSend.append('images', file);
    });

    try {
      if (editItemMode) {
        await api.put(`/cmdb/${currentItemId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/cmdb', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setShowItemModal(false);
      
      setTimeout(() => {
        setItemFormData(INITIAL_ITEM_FORM);
        setEditItemMode(false);
        setCurrentItemId(null);
        resetImages();
      }, 100);
      
      await fetchAll();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenManageGroups = () => {
    setGroupFormData(INITIAL_GROUP_FORM);
    setEditGroupMode(false);
    setCurrentGroupId(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group) => {
    setGroupFormData({
      name: group.name || '',
      description: group.description || '',
      color: group.color || '#e0e7ff'
    });
    setCurrentGroupId(group.id);
    setEditGroupMode(true);
    setShowGroupModal(true);
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editGroupMode) {
        await api.put(`/groups/${currentGroupId}`, groupFormData);
      } else {
        await api.post('/groups', groupFormData);
      }
      await fetchAll();
      setShowGroupModal(false);
      setGroupFormData(INITIAL_GROUP_FORM);
      setEditGroupMode(false);
    } catch (err) {
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      await fetchAll();
    } catch (err) {
      alert('Gagal menghapus: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenConnectionModal = (item) => {
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
  };

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

  const handleSaveConnections = async () => {
    try {
      const currentItemConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_id)
        .map(conn => conn.target_id);

      const itemsToAdd = selectedConnections.filter(id => !currentItemConns.includes(id));
      const itemsToRemove = currentItemConns.filter(id => !selectedConnections.includes(id));

      for (const targetId of itemsToAdd) {
        await api.post('/cmdb/connections', {
          source_id: selectedItemForConnection.id,
          target_id: targetId
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
          target_group_id: groupId
        });
      }

      for (const groupId of groupsToRemove) {
        await api.delete(`/cmdb/connections/to-group/${selectedItemForConnection.id}/${groupId}`);
      }

      await fetchAll();
      setShowConnectionModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenGroupConnectionModal = (group) => {
    setSelectedGroupForConnection(group);
    
    const existingConns = groupConnections
      .filter(conn => conn.source_id === group.id)
      .map(conn => conn.target_id);
    
    setSelectedGroupToGroupConnections(existingConns);
    setShowGroupConnectionModal(true);
  };

  const handleToggleGroupToGroupConnection = (targetGroupId) => {
    setSelectedGroupToGroupConnections(prev =>
      prev.includes(targetGroupId)
        ? prev.filter(id => id !== targetGroupId)
        : [...prev, targetGroupId]
    );
  };

  const handleSaveGroupConnections = async () => {
    try {
      const currentConns = groupConnections
        .filter(conn => conn.source_id === selectedGroupForConnection.id)
        .map(conn => conn.target_id);

      const toAdd = selectedGroupToGroupConnections.filter(id => !currentConns.includes(id));
      const toRemove = currentConns.filter(id => !selectedGroupToGroupConnections.includes(id));

      for (const targetId of toAdd) {
        await api.post('/groups/connections', {
          source_id: selectedGroupForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of toRemove) {
        await api.delete(`/groups/connections/${selectedGroupForConnection.id}/${targetId}`);
      }

      await fetchAll();
      setShowGroupConnectionModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleContextEdit = () => {
    const editData = handleEditFromVisualization(contextMenu.node);
    if (editData.type === 'group') {
      handleEditGroup(editData.data);
    } else {
      handleEditItem(editData.data);
    }
  };

  const handleContextDelete = async () => {
    await handleDeleteFromVisualization(contextMenu.node);
  };

  const handleContextManageConnections = () => {
    const item = handleManageConnectionsFromVisualization(contextMenu.node);
    if (item) {
      handleOpenConnectionModal(item);
    }
  };

  const handleContextToggleVisibility = () => {
    toggleNodeVisibility(contextMenu.node.id);
  };

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

const onNodeClick = useCallback((event, node) => {
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
  }
}, [selectionMode]);

  const onNodeDragStart = useCallback((event, node) => {
    if (node.parentNode) {
      setDraggedNode(node.id);
    }
  }, []);

  const onNodeDrag = useCallback((event, node) => {
    if (!node.parentNode || !draggedNode) return;

    const groupNode = nodesRef.current.find(n => n.id === node.parentNode);
    const groupItems = nodesRef.current.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode);
    
    const dimensions = {
      itemsPerRow: 3,
      itemWidth: 180,
      itemHeight: 120,
      gap: 60,
      padding: 40,
    };

    const relX = node.position.x - dimensions.padding;
    const relY = node.position.y - dimensions.padding - 40;

    const col = Math.max(0, Math.min(dimensions.itemsPerRow - 1, Math.round(relX / (dimensions.itemWidth + dimensions.gap))));
    const row = Math.max(0, Math.round(relY / (dimensions.itemHeight + dimensions.gap)));
    
    const newIndex = row * dimensions.itemsPerRow + col;
    
    if (newIndex >= 0 && newIndex <= groupItems.length) {
      setHoverPosition({
        groupId: node.parentNode,
        index: newIndex,
        relativeX: dimensions.padding + col * (dimensions.itemWidth + dimensions.gap),
        relativeY: dimensions.padding + 40 + row * (dimensions.itemHeight + dimensions.gap),
        absoluteX: groupNode.position.x + dimensions.padding + col * (dimensions.itemWidth + dimensions.gap),
        absoluteY: groupNode.position.y + dimensions.padding + 40 + row * (dimensions.itemHeight + dimensions.gap),
      });
    }
  }, [draggedNode]);

  const onNodeDragStop = useCallback(async (event, node) => {
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

      // Update lokal tanpa fetchAll
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

      // Delay sebelum mengizinkan reload
      setTimeout(() => {
        isReorderingRef.current = false;
        fetchAll(); // Refresh untuk sinkronisasi
      }, 500);

    } catch (err) {
      console.error('Failed to reorder:', err);
      alert(`Gagal: ${err.response?.data?.error || err.message}`);
      isReorderingRef.current = false;
    } finally {
      setDraggedNode(null);
      setHoverPosition(null);
    }
  }, [draggedNode, hoverPosition, setNodes, fetchAll]);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    const newEdgeHandles = {
      ...edgeHandles,
      [oldEdge.id]: {
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
      }
    };
    
    saveEdgeHandles(newEdgeHandles);
    setEdgeHandles(newEdgeHandles);
    
    setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
  }, [edgeHandles, setEdges]);

  const handleSavePositions = async () => {
    setIsSaving(true);
    try {
      const updatePromises = [];
      
      nodes.forEach((node) => {
        if (node.type === 'custom' && !node.parentNode) {
          updatePromises.push(
            api.put(`/cmdb/${node.id}/position`, {
              position: { x: node.position.x, y: node.position.y },
            })
          );
        }
      });

      nodes.forEach((node) => {
        if (node.type === 'group') {
          const groupId = node.id.replace('group-', '');
          updatePromises.push(
            api.put(`/groups/${groupId}/position`, {
              position: { x: node.position.x, y: node.position.y },
            })
          );
        }
      });

      await Promise.all(updatePromises);
      fetchAll();
     toast.success('Posisi berhasil disimpan!');
    } catch (err) {
      toast.error('Gagal menyimpan posisi', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectionRect = isSelecting && selectionStart && selectionEnd ? {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    width: Math.abs(selectionEnd.x - selectionStart.x),
    height: Math.abs(selectionEnd.y - selectionStart.y),
  } : null;

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
    
    // Loading toast
    const loadingToast = toast.loading('Mempersiapkan export...');

    if (scope === 'all') {
      // Simpan viewport dan hidden nodes saat ini
      const currentViewport = rfInstance.getViewport();
      const currentHiddenNodes = new Set(hiddenNodes);
      restoreHiddenNodes = currentHiddenNodes;
      
      // Tampilkan semua nodes
      setHiddenNodes(new Set());
      
      // Tunggu React render
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      
      // Fit view tanpa animasi
      rfInstance.fitView({ 
        padding: 0.15,
        includeHiddenNodes: false,
        duration: 0,
        minZoom: 0.1,
        maxZoom: 1.5
      });

      // Tunggu rendering selesai
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simpan fungsi restore
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
      
      // Opsi export yang lebih robust
      const baseExportOptions = {
        pixelRatio: 2,
        cacheBust: true,
        quality: 1,
        canvasWidth: exportElement.offsetWidth * 2,
        canvasHeight: exportElement.offsetHeight * 2,
        filter: (node) => {
          // Hanya export viewport, exclude controls
          if (node.classList) {
            return !node.classList.contains('react-flow__controls') &&
                  !node.classList.contains('react-flow__minimap') &&
                  !node.classList.contains('react-flow__attribution');
          }
          return true;
        }
      };

      if (format === 'pdf') {
        // PDF selalu pakai background putih
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
        
        // Kalkulasi ukuran PDF
        const pdfWidth = img.width * 0.75; // Convert px to pt
        const pdfHeight = img.height * 0.75;
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfWidth, pdfHeight],
        });
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('cmdb-visualization.pdf');
      } else if (format === 'png') {
        // PNG: jika background null/undefined = transparan, jika ada warna = solid
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
        // JPEG tidak support transparan, default ke putih jika tidak ada background
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
      // Pulihkan viewport dan hidden nodes
      if (restoreViewport) {
        await new Promise(resolve => setTimeout(resolve, 150));
        restoreViewport();
      }
    }
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <VisualizationNavbar
        draggedNode={draggedNode}
        selectionMode={selectionMode}
        selectedForHiding={selectedForHiding}
        hiddenNodes={hiddenNodes}
        isSaving={isSaving}
        showVisibilityPanel={showVisibilityPanel}
        onNavigateBack={() => navigate("/items")}
        onSetSelectionMode={setSelectionMode}
        onShowOnlySelected={showOnlySelected}
        onToggleVisibilityPanel={() => setShowVisibilityPanel(!showVisibilityPanel)}
        onShowAllNodes={showAllNodes}
        onSavePositions={handleSavePositions}
        onOpenAddItem={handleOpenAddItem}
        onOpenManageGroups={handleOpenManageGroups}
        onOpenExportModal={() => setShowExportModal(true)}
      />

      <div className="flex-1 relative flex overflow-y-auto">
        {showVisibilityPanel && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-lg">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-lg">Node Visibility</h2>
              <p className="text-sm text-gray-600 mt-1">
                Click to show/hide nodes and groups
              </p>
            </div>
            <div className="p-4 space-y-4">
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
                        <button
                          key={nodeId}
                          onClick={() => toggleNodeVisibility(nodeId)}
                          className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-colors ${
                            isHidden
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium truncate">{group.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                        <button
                          key={nodeId}
                          onClick={() => toggleNodeVisibility(nodeId)}
                          className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-colors ${
                            isHidden
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                          <button
                            key={nodeId}
                            onClick={() => toggleNodeVisibility(nodeId)}
                            disabled={isGroupHidden}
                            className={`w-full px-3 py-2 rounded text-sm text-left flex items-center justify-between transition-colors ${
                              isGroupHidden
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                : isHidden
                                ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div 
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              style: {
                ...node.style,
                outline: selectedForHiding.has(node.id) ? '3px solid #3b82f6' : 'none',
                outlineOffset: '2px',
              }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onReconnect={onReconnect}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            connectionLineType="smoothstep"
            onInit={(instance) => { reactFlowInstance.current = instance;}}
            fitView
            panOnDrag={selectionMode === 'freeroam' || selectionMode !== 'rectangle'}
          >
            <Background />
            <Controls/>
          </ReactFlow>

          <NodeContextMenu
            show={contextMenu.show}
            position={contextMenu.position}
            node={contextMenu.node}
            isHidden={contextMenu.node ? hiddenNodes.has(contextMenu.node.id) : false}
            onEdit={handleContextEdit}
            onDelete={handleContextDelete}
            onManageConnections={handleContextManageConnections}
            onToggleVisibility={handleContextToggleVisibility}
            onClose={closeContextMenu}
          />

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

          {selectionMode === 'rectangle' && !isSelecting && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <FaSquare />
              <span>Click and drag to select multiple nodes</span>
            </div>
          )}

          {/* Tambahkan indikator untuk mode single */}
          {selectionMode === 'single' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
              <FaMousePointer />
              <span>Click nodes to select/deselect</span>
            </div>
          )}
        </div>
      </div>

      <ItemFormModal
        show={showItemModal}
        editMode={editItemMode}
        formData={itemFormData}
        groups={groups}
        selectedFiles={selectedFiles}
        imagePreviews={imagePreviews}
        existingImages={existingImages}
        onClose={() => {
          setShowItemModal(false);
          setItemFormData(INITIAL_ITEM_FORM);
          setEditItemMode(false);
          resetImages();
        }}
        onSubmit={handleItemSubmit}
        onInputChange={(e) => {
          const { name, value } = e.target;
          setItemFormData(prev => ({ ...prev, [name]: value }));
        }}
        onFileSelect={handleFileSelect}
        onRemoveNewImage={handleRemoveNewImage}
        onRemoveExistingImage={(imgPath) => handleRemoveExistingImage(imgPath, currentItemId)}
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
        selectedConnections={selectedGroupToGroupConnections}
        onClose={() => setShowGroupConnectionModal(false)}
        onSave={handleSaveGroupConnections}
        onToggleConnection={handleToggleGroupToGroupConnection}
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
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