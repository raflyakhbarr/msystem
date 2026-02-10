import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  reconnectEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo } from 'react';
import { Plus, Link2, Trash2, Save } from 'lucide-react';
import api from '../../services/api';
import { useServiceItems } from '../../hooks/cmdb-hooks/useServiceItems';
import { loadServiceEdgeHandles, saveServiceEdgeHandle } from '../../utils/cmdb-utils/flowHelpers';
import CustomServiceNode from './CustomServiceNode';
import ServiceConnectionModal from './ServiceConnectionModal';
import ServiceItemContextMenu from './ServiceItemContextMenu';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const nodeTypes = {
  custom: CustomServiceNode,
};

const API_BASE_URL = 'http://localhost:5000';

export default function ServiceVisualization({ service, workspaceId }) {
  const reactFlowInstance = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState([]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({
    show: false,
    position: { x: 0, y: 0 },
    item: null,
  });

  // Edge Handles State
  const [edgeHandles, setEdgeHandles] = useState({});

  const [itemFormData, setItemFormData] = useState({
    name: '',
    type: 'server',
    description: '',
    status: 'active',
    ip: '',
    category: 'internal',
    location: '',
  });

  // Default viewport settings - atur zoom dan posisi default
  const defaultViewport = useMemo(() => ({
    x: 50,
    y: 100,
    zoom: 0.1, // Zoom level: 0.1 = 10%, 1 = 100%, 2 = 200%
  }), []);

  const { items, connections, loading, fetchAll } = useServiceItems(service.id, workspaceId);

  // Load service edge handles on mount
  useEffect(() => {
    const loadHandles = async () => {
      const handles = await loadServiceEdgeHandles(service.id, workspaceId);
      setEdgeHandles(handles);
    };
    loadHandles();
  }, [service.id, workspaceId]);

  // Siapkan data parent service dengan icon_preview
  const parentServiceData = service ? {
    ...service,
    icon_preview: service.icon_type === 'upload' && service.icon_path
      ? `${API_BASE_URL}${service.icon_path}`
      : null
  } : null;

  // Transform items to nodes
  const initialNodes = items.map(item => ({
    id: String(item.id),
    type: 'custom',
    position: item.position || { x: 0, y: 0 },
    data: {
      name: item.name,
      type: item.type,
      description: item.description,
      status: item.status,
      ip: item.ip,
      category: item.category,
      location: item.location,
      parentService: parentServiceData,
    },
  }));

  // Transform connections to edges with handle positions
  const initialEdges = connections.map(conn => {
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when items change
  useEffect(() => {
    const newNodes = items.map(item => ({
      id: String(item.id),
      type: 'custom',
      position: item.position || { x: 0, y: 0 },
      data: {
        name: item.name,
        type: item.type,
        description: item.description,
        status: item.status,
        ip: item.ip,
        category: item.category,
        location: item.location,
        parentService: parentServiceData,
      },
    }));
    setNodes(newNodes);
  }, [items, setNodes]);

  // Update edges when connections change
  useEffect(() => {
    const newEdges = connections.map(conn => {
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
    setEdges(newEdges);
  }, [connections, edgeHandles, setEdges]);

  const handleOpenAddModal = useCallback(() => {
    setItemFormData({
      name: '',
      type: 'server',
      description: '',
      status: 'active',
      ip: '',
      category: 'internal',
      location: '',
    });
    setEditItem(null);
    setShowAddModal(true);
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
    });
    setEditItem(item);
    setShowAddModal(true);
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

  const handleOpenConnectionModal = useCallback((item) => {
    setSelectedItem(item);
    const existing = connections
      .filter(c => c.source_id === item.id)
      .map(c => c.target_id);
    setSelectedConnections(existing);
    setShowConnectionModal(true);
  }, [connections]);

  const handleSaveConnections = async () => {
    if (!selectedItem) return;

    try {
      // Get current connections
      const current = connections
        .filter(c => c.source_id === selectedItem.id)
        .map(c => c.target_id);

      // Add new connections
      const toAdd = selectedConnections.filter(id => !current.includes(id));
      for (const targetId of toAdd) {
        await api.post(`/service-items/${service.id}/connections`, {
          source_id: selectedItem.id,
          target_id: targetId,
          workspace_id: workspaceId,
        });
      }

      // Remove old connections
      const toRemove = current.filter(id => !selectedConnections.includes(id));
      for (const targetId of toRemove) {
        await api.delete(`/service-items/${service.id}/connections/${selectedItem.id}/${targetId}`);
      }

      setShowConnectionModal(false);
      await fetchAll();
      toast.success('Connections updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update connections');
    }
  };

  const handleSavePositions = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const updatePromises = nodes.map(node =>
        api.put(`/service-items/items/${node.id}/position`, {
          position: node.position,
        })
      );

      await Promise.all(updatePromises);
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
    setContextMenu({ show: false, position: { x: 0, y: 0 }, item: null });
  }, []);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    const item = items.find(i => i.id === parseInt(node.id));
    if (!item) return;

    setContextMenu({
      show: true,
      position: {
        x: event.pageX,
        y: event.pageY,
      },
      item,
    });
  }, [items]);

  const handleContextMenuEdit = useCallback((item) => {
    setEditItem(item);
    setItemFormData({
      name: item.name || '',
      type: item.type || 'server',
      description: item.description || '',
      status: item.status || 'active',
      ip: item.ip || '',
      category: item.category || 'internal',
      location: item.location || '',
    });
    setShowAddModal(true);
  }, []);

  const handleContextMenuDelete = useCallback((item) => {
    handleDeleteItem(item.id);
  }, [handleDeleteItem]);

  const handleContextMenuManageConnections = useCallback((item) => {
    handleOpenConnectionModal(item);
  }, [handleOpenConnectionModal]);

  // Handle reconnecting edges (moving connection points only, NOT creating new connections)
  const handleReconnect = useCallback(async (oldEdge, newConnection) => {
    try {
      // Update edge handles state
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
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Service Item' : 'Add New Service Item'}
            </DialogTitle>
          </DialogHeader>

          {showAddModal && (
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder="e.g., Web Server"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={itemFormData.type}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="workstation">Workstation</SelectItem>
                    <SelectItem value="firewall">Firewall</SelectItem>
                    <SelectItem value="router">Router</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={itemFormData.status}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip">IP Address</Label>
                <Input
                  id="ip"
                  type="text"
                  value={itemFormData.ip}
                  onChange={(e) => setItemFormData({ ...itemFormData, ip: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={itemFormData.category}
                  onValueChange={(value) => setItemFormData({ ...itemFormData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  value={itemFormData.location}
                  onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                  placeholder="e.g., Data Center 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  rows={3}
                  placeholder="Item description..."
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editItem ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Connection Modal */}
      <ServiceConnectionModal
        show={showConnectionModal}
        selectedItem={selectedItem}
        allItems={items}
        selectedConnections={selectedConnections}
        onClose={() => setShowConnectionModal(false)}
        onToggleConnection={(itemId) => {
          if (selectedConnections.includes(itemId)) {
            setSelectedConnections(selectedConnections.filter(id => id !== itemId));
          } else {
            setSelectedConnections([...selectedConnections, itemId]);
          }
        }}
        onSave={handleSaveConnections}
      />

      {/* Context Menu */}
      <ServiceItemContextMenu
        show={contextMenu.show}
        position={contextMenu.position}
        item={contextMenu.item}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onManageConnections={handleContextMenuManageConnections}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
}
