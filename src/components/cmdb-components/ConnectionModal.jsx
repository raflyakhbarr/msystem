import { useState, useEffect } from 'react';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowUpRight, ArrowDownRight, Link2, Layers, Shield, TrendingUp, RefreshCw, ArrowRight,
  Server, Key, Puzzle, ArrowUp, ArrowDown, Lock, ShieldCheck, Eye, Scale, Zap,
  Database, Workflow, Route, Search, Check, Briefcase, ChevronDown, ChevronRight, X
} from 'lucide-react';

// Helper function to get icon for connection type
function getConnectionIcon(iconName) {
  const icons = {
    'arrow-up-right': <ArrowUpRight className="h-4 w-4" />,
    'arrow-down-right': <ArrowDownRight className="h-4 w-4" />,
    'link': <Link2 className="h-4 w-4" />,
    'layers': <Layers className="h-4 w-4" />,
    'shield': <Shield className="h-4 w-4" />,
    'trending-up': <TrendingUp className="h-4 w-4" />,
    'refresh-cw': <RefreshCw className="h-4 w-4" />,
    'server': <Server className="h-4 w-4" />,
    'key': <Key className="h-4 w-4" />,
    'puzzle': <Puzzle className="h-4 w-4" />,
    'arrow-up': <ArrowUp className="h-4 w-4" />,
    'arrow-down': <ArrowDown className="h-4 w-4" />,
    'lock': <Lock className="h-4 w-4" />,
    'shield-check': <ShieldCheck className="h-4 w-4" />,
    'eye': <Eye className="h-4 w-4" />,
    'scale': <Scale className="h-4 w-4" />,
    'zap': <Zap className="h-4 w-4" />,
    'database': <Database className="h-4 w-4" />,
    'workflow': <Workflow className="h-4 w-4" />,
    'route': <Route className="h-4 w-4" />,
  };
  return icons[iconName] || <ArrowRight className="h-4 w-4" />;
}

// Connection Preview Component
function ConnectionPreview({ connectionType, sourceItem }) {
  const getArrowDirection = () => {
    switch (connectionType.propagation) {
      case 'target_to_source':
        return '←';
      case 'source_to_target':
        return '→';
      case 'both':
        return '↔';
      default:
        return '→';
    }
  };

  const getArrowIcon = () => {
    switch (connectionType.propagation) {
      case 'target_to_source':
        return <ArrowDownRight className="h-5 w-5 rotate-180" />;
      case 'source_to_target':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'both':
        return <div className="relative h-5 w-5"><ArrowRight className="h-5 w-5 absolute" /><ArrowRight className="h-5 w-5 absolute rotate-180" /></div>;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {/* Source Node */}
      <div className="flex flex-col items-center">
        <div
          className="w-16 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-medium"
          style={{
            borderColor: connectionType.color,
            backgroundColor: `${connectionType.color}20`
          }}
        >
          {sourceItem?.name?.slice(0, 8) || 'Source'}
        </div>
        <span className="text-xs text-muted-foreground mt-1">Source</span>
      </div>

      {/* Connection Arrow */}
      <div
        className="flex items-center justify-center gap-1 px-3 py-1 rounded-full text-white font-medium"
        style={{ backgroundColor: connectionType.color }}
      >
        {getArrowDirection()}
        <span className="text-xs ml-1">{connectionType.label}</span>
      </div>

      {/* Target Node */}
      <div className="flex flex-col items-center">
        <div
          className="w-16 h-12 rounded-lg border-2 border-gray-400 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium"
        >
          Target
        </div>
        <span className="text-xs text-muted-foreground mt-1">Target</span>
      </div>
    </div>
  );
}

// Searchable Connection Type Selector Component
export function ConnectionTypeSelector({
  value,
  onChange,
  connectionTypes,
  placeholder = "Pilih tipe koneksi",
  size = "default",
  className = ""
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedType = connectionTypes.find(ct => ct.type_slug === value);

  const filteredTypes = connectionTypes.filter(ct => {
    const searchLower = searchQuery.toLowerCase();
    return (
      ct.label.toLowerCase().includes(searchLower) ||
      ct.type_slug.toLowerCase().includes(searchLower) ||
      (ct.description && ct.description.toLowerCase().includes(searchLower))
    );
  });

  const sizeClasses = size === "small" ? "h-7 text-xs" : "";

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-between ${sizeClasses} ${className}`}
        onClick={() => setShowDialog(true)}
      >
        {selectedType ? (
          <div className="flex items-center gap-2">
            {getConnectionIcon(selectedType.icon)}
            <span>{selectedType.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      {/* Separate Dialog for Connection Type Selection */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Tipe Koneksi</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false}>
            <div className="p-3 border-b">
              <CommandInput
                placeholder="Cari tipe koneksi..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList style={{ maxHeight: size === 'small' ? '200px' : '400px', overflowY: 'auto' }}>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada tipe koneksi ditemukan
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTypes.map((ct) => (
                  <CommandItem
                    key={ct.id}
                    value={ct.type_slug}
                    onSelect={() => {
                      onChange(ct.type_slug);
                      setShowDialog(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    {getConnectionIcon(ct.icon)}
                    <span className={`font-medium ${size === "small" ? "text-xs" : "text-sm"}`}>{ct.label}</span>
                    {value === ct.type_slug && (
                      <Check size={14} className="text-primary ml-auto" />
                    )}
                    {ct.description && size !== "small" && (
                      <p className="text-xs text-muted-foreground truncate ml-2">
                        {ct.description}
                      </p>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mini Connection Preview Component (for individual items)
export function MiniConnectionPreview({ connectionType, sourceName, targetName }) {
  const getArrowDirection = () => {
    switch (connectionType.propagation) {
      case 'target_to_source':
        return '←';
      case 'source_to_target':
        return '→';
      case 'both':
        return '↔';
      default:
        return '→';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-16 truncate" title={sourceName}>{sourceName}</span>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded text-white font-medium"
        style={{ backgroundColor: connectionType.color }}
        title={connectionType.label}
      >
        {getArrowDirection()}
      </div>
      <span className="max-w-16 truncate" title={targetName}>{targetName}</span>
    </div>
  );
}

export default function ConnectionModal({
  show,
  selectedGroup,
  selectedItem,
  items,
  groups,
  selectedConnections,
  selectedGroupConnections,
  onClose,
  onSave,
  onToggleConnection,
  onToggleGroupConnection,
  onConnectionTypeChange,
  selectedConnectionType,
  existingConnectionTypes = {},
  itemToGroupConnectionTypes = {},
  onItemToGroupTypeChange,
  workspaceId = null,
  nodes = [],
}) {
  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionTargetType, setConnectionTargetType] = useState('item');
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(selectedConnectionType || 'depends_on');
  const [itemConnectionTypes, setItemConnectionTypes] = useState({});
  const [groupConnectionTypes, setGroupConnectionTypes] = useState({});

  // Service item selection states for layanan connections
  const [isLayananConnection, setIsLayananConnection] = useState(false);
  const [cmdbItemsWithServices, setCmdbItemsWithServices] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceItem, setSelectedServiceItem] = useState(null);
  const [propagationEnabled, setPropagationEnabled] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [layananConnectionTargetType, setLayananConnectionTargetType] = useState('service_item');
  const [selectedDirectService, setSelectedDirectService] = useState(null);

  // Existing layanan service connections
  const [existingLayanaConnections, setExistingLayanaConnections] = useState([]);
  const [loadingLayanaConnections, setLoadingLayanaConnections] = useState(false);

  useEffect(() => {
    const fetchConnectionTypes = async () => {
      try {
        const response = await api.get('/cmdb/connection-types');
        setConnectionTypes(response.data);
      } catch (error) {
        console.error('Failed to fetch connection types:', error);
      }
    };

    if (show) {
      fetchConnectionTypes();
    }
  }, [show]);

  useEffect(() => {
    if (selectedConnectionType) {
      setSelectedType(selectedConnectionType);
    }
  }, [selectedConnectionType]);

  // Initialize item connection types when selectedConnections change
  useEffect(() => {
    setItemConnectionTypes(prev => {
      const newTypes = { ...prev };
      selectedConnections.forEach(itemId => {
        if (!newTypes[itemId]) {
          newTypes[itemId] = selectedConnectionType || 'depends_on';
        }
      });
      // Remove types for items that are no longer selected
      Object.keys(newTypes).forEach(itemId => {
        if (!selectedConnections.includes(Number(itemId))) {
          delete newTypes[itemId];
        }
      });
      return newTypes;
    });
  }, [selectedConnections, selectedConnectionType]);

  // Load existing connection types when modal opens
  useEffect(() => {
    if (show && Object.keys(existingConnectionTypes).length > 0) {
      setItemConnectionTypes(existingConnectionTypes);
    }
  }, [show, existingConnectionTypes]);

  // Sync group connection types with prop
  useEffect(() => {
    if (show && Object.keys(itemToGroupConnectionTypes).length > 0) {
      setGroupConnectionTypes(itemToGroupConnectionTypes);
    }
  }, [show, itemToGroupConnectionTypes]);

  // Check if this is a layanan connection and load services
  useEffect(() => {
    if (show && selectedItem && workspaceId) {
      console.log('[ConnectionModal] Checking if layanan node:', selectedItem);
      const isLayanan = isLayananNode(selectedItem);
      console.log('[ConnectionModal] Is layanan?', isLayanan);
      if (isLayanan) {
        setIsLayananConnection(true);
        setConnectionTargetType('layanan'); // Auto-switch to layanan tab
        fetchCmdbItemsWithServices();
      } else {
        setIsLayananConnection(false);
        setConnectionTargetType('item'); // Reset to item tab
      }
    }
  }, [show, selectedItem, workspaceId]);

  // Helper function to check if item is a layanan node
  const isLayananNode = (item) => {
    if (!item) return false;

    // Check if it's a layanan object (has layana-specific properties)
    if (item.type === 'layanan' || item._entityType === 'layanan') {
      return true;
    }

    // Check data type (for ReactFlow nodes)
    if (item.data?.type === 'layanan') {
      return true;
    }

    // Check ID with prefix layanan-
    if (item.id && String(item.id).startsWith('layanan-')) {
      return true;
    }

    // Check in nodes array based on ID
    if (item.id && nodes && nodes.length > 0) {
      const node = nodes.find(n => String(n.id) === String(item.id));
      if (node && node.type === 'layanan') {
        return true;
      }
    }

    // Check if it has layana-specific fields (no type/category/ip like CMDB items)
    // Layana items have: id, name, description, status, position, workspace_id
    // CMDB items have: id, name, type, category, location, ip, etc.
    if (!item.type && !item.category && !item.ip && !item.location && item.name && item.status && item.workspace_id) {
      // Likely a layana object
      console.log('[isLayananNode] Detected layana by field absence:', item.name);
      return true;
    }

    return false;
  };

  // Fetch existing layanan service connections
  const fetchExistingLayanaConnections = async () => {
    if (!workspaceId || !selectedItem) return;

    setLoadingLayanaConnections(true);
    try {
      const layananId = selectedItem.id;
      // Fetch existing layana-service connections using the layanan-specific endpoint
      const response = await api.get(`/layanan-service-connections/layanan/${layananId}`);
      setExistingLayanaConnections(response.data || []);
      console.log('[ConnectionModal] Existing layana connections:', response.data);
    } catch (err) {
      console.error('Failed to fetch existing layana connections:', err);
      setExistingLayanaConnections([]);
    } finally {
      setLoadingLayanaConnections(false);
    }
  };

  // Fetch CMDB items with their services (only target items for layanan)
  const fetchCmdbItemsWithServices = async () => {
    if (!workspaceId || !selectedItem) return;

    setLoadingServices(true);
    try {
      // Fetch existing layana connections first
      await fetchExistingLayanaConnections();

      // For layanan items, fetch all CMDB items that could be targets
      const response = await api.get('/cmdb', { params: { workspace_id: workspaceId } });

      // Fetch services for all CMDB items
      const itemsWithServices = await Promise.all(
        response.data.map(async (item) => {
          try {
            const servicesResponse = await api.get(`/services/${item.id}`);

            // Fetch service items for each service
            const servicesWithItems = await Promise.all(
              servicesResponse.data.map(async (service) => {
                try {
                  const serviceItemsResponse = await api.get(`/service-items/${service.id}/items`, {
                    params: { workspace_id: workspaceId }
                  });
                  return {
                    ...service,
                    items: serviceItemsResponse.data || []
                  };
                } catch (err) {
                  console.error(`Failed to fetch service items for service ${service.id}:`, err);
                  return {
                    ...service,
                    items: []
                  };
                }
              })
            );

            return {
              ...item,
              services: servicesWithItems || [],
            };
          } catch (err) {
            console.error(`Failed to fetch services for item ${item.id}:`, err);
            return {
              ...item,
              services: [],
            };
          }
        })
      );

      // Filter items that have services
      const itemsWithServicesOnly = itemsWithServices.filter(
        (item) => item.services && item.services.length > 0
      );

      setCmdbItemsWithServices(itemsWithServicesOnly);
    } catch (err) {
      console.error('Failed to fetch CMDB items:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Check if a service or service item is already connected
  const isConnected = (serviceId, serviceItemId = null) => {
    return existingLayanaConnections.some(conn => {
      if (serviceItemId) {
        return conn.service_item_id === serviceItemId;
      } else {
        return conn.service_id === serviceId && !conn.service_item_id;
      }
    });
  };

  // Handle delete existing layana connection
  const handleDeleteLayanaConnection = async (connectionId) => {
    try {
      await api.delete(`/layanan-service-connections/${connectionId}`);
      toast.success('Koneksi layanan berhasil dihapus');
      await fetchExistingLayanaConnections();
    } catch (err) {
      console.error('Failed to delete layana connection:', err);
      toast.error('Gagal menghapus koneksi: ' + (err.response?.data?.error || err.message));
    }
  };

  // Helper functions for service item selection UI
  const toggleItemExpansion = (itemId) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleServiceExpansion = (itemId, serviceId) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      const key = `${itemId}-${serviceId}`;
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectServiceItem = (service, serviceItem) => {
    setSelectedService(service);
    setSelectedServiceItem(serviceItem);
  };

  // Update group connection types when selectedGroupConnections change
  useEffect(() => {
    setGroupConnectionTypes(prev => {
      const newTypes = { ...prev };
      selectedGroupConnections.forEach(groupId => {
        if (!newTypes[groupId]) {
          newTypes[groupId] = selectedConnectionType || 'depends_on';
        }
      });
      // Remove types for groups that are no longer selected
      Object.keys(newTypes).forEach(groupId => {
        if (!selectedGroupConnections.includes(Number(groupId))) {
          delete newTypes[groupId];
        }
      });
      return newTypes;
    });
  }, [selectedGroupConnections, selectedConnectionType]);

  const handleTypeChange = (typeSlug) => {
    setSelectedType(typeSlug);
    if (onConnectionTypeChange) {
      onConnectionTypeChange(typeSlug);
    }
  };

  const handleItemTypeChange = (itemId, typeSlug) => {
    setItemConnectionTypes(prev => ({
      ...prev,
      [itemId]: typeSlug
    }));
  };

  const handleGroupTypeChange = (groupId, typeSlug) => {
    setGroupConnectionTypes(prev => ({
      ...prev,
      [groupId]: typeSlug
    }));
    if (onItemToGroupTypeChange) {
      onItemToGroupTypeChange(groupId, typeSlug);
    }
  };

  const handleSaveWithLayana = () => {
    if (isLayananConnection) {
      // For layanan connections, save service selection
      if (layananConnectionTargetType === 'service_item') {
        if (!selectedService || !selectedServiceItem) {
          alert('Silakan pilih service item terlebih dahulu untuk koneksi layanan.');
          return;
        }
        onSave(itemConnectionTypes, groupConnectionTypes, {
          connectionTargetType: 'service_item',
          serviceId: selectedService.id,
          serviceItemId: selectedServiceItem.id,
          propagationEnabled: propagationEnabled,
        });
      } else {
        if (!selectedDirectService) {
          alert('Silakan pilih service terlebih dahulu untuk koneksi layanan.');
          return;
        }
        onSave(itemConnectionTypes, groupConnectionTypes, {
          connectionTargetType: 'service',
          serviceId: selectedDirectService.id,
          propagationEnabled: propagationEnabled,
        });
      }
    } else {
      onSave(itemConnectionTypes, groupConnectionTypes);
    }
  };

  const selectedConnectionTypeData = connectionTypes.find(ct => ct.type_slug === selectedType);

  if (!show || !selectedItem) return null;

  const filteredItems = items.filter(item => 
    item.id !== selectedItem.id && 
    (item.name.toLowerCase().includes(connectionSearch.toLowerCase()) || 
     String(item.id).includes(connectionSearch) ||
     item.type.toLowerCase().includes(connectionSearch.toLowerCase()))
  );

  const selectedItems = filteredItems.filter(item =>
    selectedConnections.includes(item.id)
  );

  const availableItems = filteredItems.filter(item =>
    !selectedConnections.includes(item.id)
  );

  const filteredGroups = groups.filter(g => 
    g.id !== selectedItem.group_id &&
    !selectedGroupConnections.includes(g.id) &&
    (g.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    String(g.id).includes(connectionSearch))
  );
  

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Koneksi</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4">
          {/* Source Item Info */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Item Sumber</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedItem.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih item tujuan untuk membuat koneksi dari {selectedItem.name}
            </p>
          </div>

          <Tabs value={connectionTargetType} onValueChange={setConnectionTargetType}>
            <TabsList className={`grid w-full ${isLayananConnection ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="item">
                Ke Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="group">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
              {isLayananConnection && (
                <TabsTrigger value="layanan">
                  Ke Service/Item ({existingLayanaConnections.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="item" className="space-y-3 mt-4">
              {selectedItems.length > 0 && (
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-500 dark:text-black">
                  <p className="font-semibold text-sm mb-3">Items Terpilih ({selectedItems.length})</p>
                  <div className="space-y-3">
                    {selectedItems.map((item) => {
                      const itemTypeId = itemConnectionTypes[item.id] || 'depends_on';
                      const itemTypeInfo = connectionTypes.find(ct => ct.type_slug === itemTypeId);

                      return (
                        <div
                          key={`selected-${item.id}`}
                          className="p-3 bg-white rounded-lg border border-blue-200 dark:border-blue-800 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => onToggleConnection(item.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getTypeIcon(item.type)}
                                  <span className="text-sm font-medium">{item.name}</span>
                                </div>

                                {/* Connection Type Selector for this item */}
                                <div className="flex items-center gap-2 flex-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Tipe:</label>
                                  <ConnectionTypeSelector
                                    value={itemTypeId}
                                    onChange={(value) => handleItemTypeChange(item.id, value)}
                                    connectionTypes={connectionTypes}
                                    placeholder="Pilih tipe"
                                    size="small"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Mini Visualization */}
                            {itemTypeInfo && (
                              <div className="flex-shrink-0">
                                <MiniConnectionPreview
                                  connectionType={itemTypeInfo}
                                  sourceName={selectedItem?.name || 'Source'}
                                  targetName={item.name}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari item..."
                value={connectionSearch}
                onChange={(e) => setConnectionSearch(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableItems.length > 0 ? (
                  availableItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleConnection(item.id)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={false} />
                          {getTypeIcon(item.type)}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {item.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">Tidak ada item tersedia</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-3 mt-4">
              {selectedGroupConnections.length > 0 && (
                <div className="p-3 border rounded-lg bg-purple-50 border-purple-500 dark:text-black">
                  <p className="font-semibold text-sm mb-3">Groups Terpilih ({selectedGroupConnections.length})</p>
                  <div className="space-y-3">
                    {selectedGroupConnections.map((groupId) => {
                      const group = groups.find(g => g.id === groupId);
                      const groupTypeId = groupConnectionTypes[groupId] || 'depends_on';
                      const groupTypeInfo = connectionTypes.find(ct => ct.type_slug === groupTypeId);

                      if (!group) return null;

                      return (
                        <div
                          key={`selected-group-${groupId}`}
                          className="p-3 bg-white rounded-lg border border-purple-200 dark:border-purple-800 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => onToggleGroupConnection(groupId)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-medium">{group.name}</span>
                                </div>

                                {/* Connection Type Selector for this group */}
                                <div className="flex items-center gap-2 flex-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Tipe:</label>
                                  <ConnectionTypeSelector
                                    value={groupTypeId}
                                    onChange={(value) => handleGroupTypeChange(groupId, value)}
                                    connectionTypes={connectionTypes}
                                    placeholder="Pilih tipe"
                                    size="small"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Mini Visualization */}
                            {groupTypeInfo && (
                              <div className="flex-shrink-0">
                                <MiniConnectionPreview
                                  connectionType={groupTypeInfo}
                                  sourceName={selectedItem?.name || 'Source'}
                                  targetName={group.name}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari group..."
                value={connectionSearch}
                onChange={(e) => setConnectionSearch(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={`group-${group.id}`}
                      onClick={() => onToggleGroupConnection(group.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupConnections.includes(group.id)
                          ? 'bg-purple-50 border-purple-500'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedGroupConnections.includes(group.id)}
                          />
                          <span className="font-medium">{group.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {group.id}</span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{group.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">Tidak ada group tersedia</p>
                )}
              </div>
            </TabsContent>

            {/* Layanan Service/Service Item Selection Tab */}
            {isLayananConnection && (
              <TabsContent value="layanan" className="space-y-3 mt-4">
                <Label className="text-base font-semibold">
                  Pilih Service di CMDB Item
                  <span className="text-red-500 ml-1">*</span>
                </Label>

                {/* Existing Connections Section */}
                {existingLayanaConnections.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-500 rounded">
                    <p className="font-semibold text-sm mb-3">Koneksi yang Sudah Ada ({existingLayanaConnections.length})</p>
                    <div className="space-y-2">
                      {existingLayanaConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-green-200"
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-green-600" />
                            <div className="text-sm">
                              <span className="font-medium">{conn.service_name}</span>
                              {conn.service_item_name && (
                                <span className="text-muted-foreground"> → {conn.service_item_name}</span>
                              )}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {conn.connection_type}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLayanaConnection(conn.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connection Target Type Selector */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 border rounded">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="connect-service"
                      name="layanan-connection-target"
                      value="service"
                      checked={layananConnectionTargetType === 'service'}
                      onChange={(e) => {
                        setLayananConnectionTargetType(e.target.value);
                        setSelectedService(null);
                        setSelectedServiceItem(null);
                        setSelectedDirectService(null);
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="connect-service" className="text-sm font-medium cursor-pointer">
                      Koneksi ke Service
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="connect-service-item"
                      name="layanan-connection-target"
                      value="service_item"
                      checked={layananConnectionTargetType === 'service_item'}
                      onChange={(e) => {
                        setLayananConnectionTargetType(e.target.value);
                        setSelectedService(null);
                        setSelectedServiceItem(null);
                        setSelectedDirectService(null);
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="connect-service-item" className="text-sm font-medium cursor-pointer">
                      Koneksi ke Service Item
                    </label>
                  </div>
                </div>

                {loadingServices ? (
                  <div className="p-4 text-center text-sm text-gray-500 border rounded">
                    Loading services...
                  </div>
                ) : cmdbItemsWithServices.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 border rounded">
                    Tidak ada CMDB item dengan services ditemukan
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded">
                    <div className="p-2">
                      {cmdbItemsWithServices.map((item) => (
                        <div key={item.id} className="mb-2">
                          {/* CMDB Item */}
                          <div
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                            onClick={() => toggleItemExpansion(item.id)}
                          >
                            {expandedItems.has(item.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <Server className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm">{item.name}</span>
                            <span className="text-xs text-gray-500">
                              ({item.services.length} services)
                            </span>
                          </div>

                          {/* Services */}
                          {expandedItems.has(item.id) && (
                            <div className="ml-6 border-l-2 border-gray-200 pl-2">
                              {item.services.map((service) => (
                                <div key={service.id}>
                                  {layananConnectionTargetType === 'service' ? (
                                    // Direct Service Selection
                                    <div
                                      className={`flex items-center gap-2 p-2 rounded ${
                                        selectedDirectService?.id === service.id
                                          ? 'bg-purple-50 border-2 border-purple-500'
                                          : isConnected(service.id)
                                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                          : 'hover:bg-gray-100 cursor-pointer'
                                      }`}
                                      onClick={() => {
                                        if (isConnected(service.id)) return;
                                        setSelectedDirectService(service);
                                        setSelectedService(null);
                                        setSelectedServiceItem(null);
                                      }}
                                    >
                                      <div
                                        className={`w-4 h-4 border rounded flex items-center justify-center ${
                                          selectedDirectService?.id === service.id
                                            ? 'bg-purple-500 border-purple-500'
                                            : isConnected(service.id)
                                            ? 'bg-gray-400 border-gray-400'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        {selectedDirectService?.id === service.id && !isConnected(service.id) && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                        {isConnected(service.id) && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                      <Briefcase className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm font-medium">{service.name}</span>
                                      <span className="text-xs text-gray-500">
                                        ({service.items?.length || 0} items)
                                      </span>
                                      {isConnected(service.id) && (
                                        <Badge variant="secondary" className="ml-2 text-xs">Terhubung</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    // Service Item Selection (with expand/collapse)
                                    <>
                                      <div
                                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                                        onClick={() => toggleServiceExpansion(item.id, service.id)}
                                      >
                                        {expandedItems.has(`${item.id}-${service.id}`) ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                        <Briefcase className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-medium">{service.name}</span>
                                      </div>

                                      {/* Service Items */}
                                      {expandedItems.has(`${item.id}-${service.id}`) && (
                                        <div className="ml-6 border-l-2 border-gray-200 pl-2">
                                          {service.items && service.items.length > 0 ? (
                                            service.items.map((serviceItem) => {
                                              const itemConnected = isConnected(service.id, serviceItem.id);
                                              return (
                                                <div
                                                  key={serviceItem.id}
                                                  className={`flex items-center gap-2 p-2 rounded ${
                                                    selectedServiceItem?.id === serviceItem.id
                                                      ? 'bg-blue-50 border-2 border-blue-500'
                                                      : itemConnected
                                                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                      : 'hover:bg-gray-100 cursor-pointer'
                                                  }`}
                                                  onClick={() => {
                                                    if (itemConnected) return;
                                                    handleSelectServiceItem(service, serviceItem);
                                                  }}
                                                >
                                                  <div
                                                    className={`w-4 h-4 border rounded flex items-center justify-center ${
                                                      selectedServiceItem?.id === serviceItem.id
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : itemConnected
                                                        ? 'bg-gray-400 border-gray-400'
                                                        : 'border-gray-300'
                                                    }`}
                                                  >
                                                    {selectedServiceItem?.id === serviceItem.id && !itemConnected && (
                                                      <Check className="w-3 h-3 text-white" />
                                                    )}
                                                    {itemConnected && (
                                                      <Check className="w-3 h-3 text-white" />
                                                    )}
                                                  </div>
                                                  <span className="text-sm">{serviceItem.name}</span>
                                                  <span
                                                    className={`text-xs px-2 py-0.5 rounded ${
                                                      serviceItem.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : serviceItem.status === 'inactive'
                                                        ? 'bg-red-100 text-red-700'
                                                        : serviceItem.status === 'maintenance'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                    }`}
                                                  >
                                                    {serviceItem.status}
                                                  </span>
                                                  {itemConnected && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">Terhubung</Badge>
                                                  )}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="p-2 text-sm text-gray-500">
                                              No service items found
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Selection Info */}
                {layananConnectionTargetType === 'service' && selectedDirectService && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="text-sm">
                      <span className="font-medium">Selected Service:</span> {selectedDirectService.name}
                    </div>
                  </div>
                )}

                {layananConnectionTargetType === 'service_item' && selectedService && selectedServiceItem && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm">
                      <span className="font-medium">Selected:</span> {selectedService.name} →{' '}
                      {selectedServiceItem.name}
                    </div>
                  </div>
                )}

                {/* Propagation Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="propagation"
                    checked={propagationEnabled}
                    onChange={(e) => setPropagationEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="propagation" className="text-sm font-medium">
                    Enable Status Propagation (Service status affects Layanan)
                  </label>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleSaveWithLayana}>
              Simpan {isLayananConnection && (selectedServiceItem || selectedDirectService)
                ? '(1 Koneksi Layanan)'
                : `(${selectedConnections.length + selectedGroupConnections.length})`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}