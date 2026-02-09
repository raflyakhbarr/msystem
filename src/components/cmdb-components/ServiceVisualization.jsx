import { useState, useEffect, useCallback, useRef } from 'react';
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
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Link2, Trash2, Save } from 'lucide-react';
import api from '../../services/api';
import { useServiceItems } from '../../hooks/cmdb-hooks/useServiceItems';
import CustomNode from './CustomNode';
import { toast } from 'sonner';

const nodeTypes = {
  custom: CustomNode,
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

  const [itemFormData, setItemFormData] = useState({
    name: '',
    type: 'server',
    description: '',
    status: 'active',
    ip: '',
    category: 'internal',
    location: '',
  });

  const { items, connections, loading, fetchAll } = useServiceItems(service.id, workspaceId);

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
      services: [], // Service items don't have nested services
    },
  }));

  // Transform connections to edges
  const initialEdges = connections.map(conn => ({
    id: `e${conn.source_id}-${conn.target_id}`,
    source: String(conn.source_id),
    target: String(conn.target_id),
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#10b981', strokeWidth: 2 },
  }));

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
        services: [],
      },
    }));
    setNodes(newNodes);
  }, [items, setNodes]);

  // Update edges when connections change
  useEffect(() => {
    const newEdges = connections.map(conn => ({
      id: `e${conn.source_id}-${conn.target_id}`,
      source: String(conn.source_id),
      target: String(conn.target_id),
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#10b981', strokeWidth: 2 },
    }));
    setEdges(newEdges);
  }, [connections, setEdges]);

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
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editItem ? 'Edit Item' : 'Add New Item'}
              </DialogTitle>
            </DialogHeader>

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
          </DialogContent>
        </Dialog>
      )}

      {/* Connection Modal */}
      {showConnectionModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Manage Connections</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select items to connect with <strong>{selectedItem.name}</strong>
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {items
                .filter(i => i.id !== selectedItem.id)
                .map(item => (
                  <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedConnections.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedConnections([...selectedConnections, item.id]);
                        } else {
                          setSelectedConnections(selectedConnections.filter(id => id !== item.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveConnections}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Save
              </Button>
              <Button
                onClick={() => setShowConnectionModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
