import { useState, useEffect } from 'react';
import { Check, Link2, ChevronRight, ChevronDown, Layers, FolderOpen, ArrowUpRight, ArrowDownRight, ArrowRight, Server, Key, Puzzle, Shield, TrendingUp, RefreshCw, ArrowUp, ArrowDown, Lock, ShieldCheck, Eye, Scale, Zap, Database, Workflow, Route, Search, Package } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import api from '../../services/api';
import { toast } from 'sonner';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';

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

// Cross-Service Connection Type Selector Component
function CrossServiceConnectionTypeSelector({
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Tipe Koneksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 border-b">
              <Input
                placeholder="Cari tipe koneksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-y-auto px-1">
              {filteredTypes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada tipe koneksi ditemukan
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTypes.map((ct) => (
                    <div
                      key={ct.id}
                      onClick={() => {
                        onChange(ct.type_slug);
                        setShowDialog(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-secondary transition-colors border"
                    >
                      {getConnectionIcon(ct.icon)}
                      <span className={`font-medium flex-1 ${size === "small" ? "text-xs" : "text-sm"}`}>{ct.label}</span>
                      {value === ct.type_slug && (
                        <Check size={14} className="text-primary" />
                      )}
                      {ct.description && size !== "small" && (
                        <p className="text-xs text-muted-foreground truncate">
                          {ct.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
  // Pre-populated service selections (for editing existing connections)
  existingServiceConnections = [],
  existingServiceItemConnections = [],
}) {
  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionTargetType, setConnectionTargetType] = useState('item');
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(selectedConnectionType || 'depends_on');
  const [itemConnectionTypes, setItemConnectionTypes] = useState({});
  const [groupConnectionTypes, setGroupConnectionTypes] = useState({});

  // Service connection state
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedServiceItems, setSelectedServiceItems] = useState([]);
  const [serviceConnectionTypes, setServiceConnectionTypes] = useState({});
  const [serviceItemConnectionTypes, setServiceItemConnectionTypes] = useState({});
  const [availableServices, setAvailableServices] = useState([]);
  const [availableServiceItems, setAvailableServiceItems] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [openCmdbGroups, setOpenCmdbGroups] = useState({});
  const [openServices, setOpenServices] = useState({});

  // Reset service selection when modal opens
  useEffect(() => {
    if (show) {
      setSelectedServices(existingServiceConnections || []);
      setSelectedServiceItems(existingServiceItemConnections || []);
      setServiceConnectionTypes({});
      setServiceItemConnectionTypes({});
      setServiceSearch('');
    }
  }, [show, existingServiceConnections, existingServiceItemConnections]);

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

  // Fetch services and service items for the "Ke Service" tab
  useEffect(() => {
    const fetchServicesData = async () => {
      if (connectionTargetType === 'service' && show && workspaceId) {
        setIsLoadingServices(true);
        try {
          // Fetch all services in workspace
          const servicesResponse = await api.get(`/services/workspace/${workspaceId}`);
          setAvailableServices(servicesResponse.data || []);

          // Fetch all service items in workspace
          const servicesData = servicesResponse.data || [];

          // Get all service items grouped by service
          const serviceItemsData = [];
          for (const service of servicesData) {
            try {
              const itemsResponse = await api.get(`/services/${service.id}/items?workspace_id=${workspaceId}`);
              if (itemsResponse.data && itemsResponse.data.length > 0) {
                serviceItemsData.push(...itemsResponse.data.map(item => ({
                  ...item,
                  serviceName: service.name,
                  cmdbItemId: service.cmdb_item_id
                })));
              }
            } catch (err) {
              console.error(`Failed to fetch items for service ${service.id}:`, err);
            }
          }
          setAvailableServiceItems(serviceItemsData);

          // Auto-expand all
          const uniqueCmdbItems = [...new Set(servicesData.map(s => s.cmdb_item_id))];
          setOpenCmdbGroups(uniqueCmdbItems.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
          setOpenServices(servicesData.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));
        } catch (error) {
          console.error('Failed to fetch services data:', error);
        } finally {
          setIsLoadingServices(false);
        }
      }
    };

    fetchServicesData();
  }, [connectionTargetType, show, workspaceId]);

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

  // Service connection handlers
  const handleToggleService = (serviceId) => {
    setSelectedServices(prev => {
      const newSelected = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      return newSelected;
    });
    setServiceConnectionTypes(prevMap => {
      const newMap = { ...prevMap };
      if (!newMap[serviceId]) {
        newMap[serviceId] = { type: 'connects_to', direction: 'forward' };
      }
      return newMap;
    });
  };

  const handleToggleServiceItem = (itemId) => {
    setSelectedServiceItems(prev => {
      const newSelected = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      return newSelected;
    });
    setServiceItemConnectionTypes(prevMap => {
      const newMap = { ...prevMap };
      if (!newMap[itemId]) {
        newMap[itemId] = { type: 'connects_to', direction: 'forward' };
      }
      return newMap;
    });
  };

  const handleServiceTypeChange = (serviceId, typeSlug) => {
    setServiceConnectionTypes(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], type: typeSlug }
    }));
  };

  const handleServiceItemTypeChange = (itemId, typeSlug) => {
    setServiceItemConnectionTypes(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], type: typeSlug }
    }));
  };

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

  const handleSave = () => {
    if (typeof onSave !== 'function') {
      console.error('❌ onSave is not a function!', onSave);
      return;
    }

    onSave(itemConnectionTypes, groupConnectionTypes, {
      selectedServices,
      selectedServiceItems,
      serviceConnectionTypes,
      serviceItemConnectionTypes
    });
  };

  // Group services by CMDB Item
  const groupedServices = availableServices.reduce((acc, service) => {
    const cmdbItemId = service.cmdb_item_id;
    // Parse to number for comparison since service.cmdb_item_id might be string
    const parsedCmdbItemId = parseInt(cmdbItemId);
    const cmdbItem = items.find(i => i.id === parsedCmdbItemId || i.id === cmdbItemId);
    if (!acc[cmdbItemId]) {
      acc[cmdbItemId] = {
        cmdbItemId,
        cmdbItemName: cmdbItem?.name || `CMDB Item #${cmdbItemId}`,
        services: []
      };
    }
    acc[cmdbItemId].services.push(service);
    return acc;
  }, {});

  // Helper to find CMDB item name for service items
  const findCmdbItemName = (serviceItem) => {
    const cmdbItemId = parseInt(serviceItem.cmdb_item_id) || serviceItem.cmdb_item_id;
    const cmdbItem = items.find(i => i.id === cmdbItemId || i.id === serviceItem.cmdb_item_id);
    return cmdbItem?.name || `#${serviceItem.cmdb_item_id}`;
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
            <TabsList className={`grid w-full grid-cols-3`}>
              <TabsTrigger value="item">
                Ke Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="group">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
              <TabsTrigger value="service">
                Ke Service ({selectedServices.length + selectedServiceItems.length})
              </TabsTrigger>
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

            <TabsContent value="service" className="space-y-3 mt-4">
              {isLoadingServices ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Loading services...</p>
              ) : (
                <>
                  {/* Selected Services Section */}
                  {(selectedServices.length > 0 || selectedServiceItems.length > 0) && (
                    <div className="p-3 border rounded-lg bg-teal-50 border-teal-500">
                      <p className="font-semibold text-sm mb-3">Terpilih ({selectedServices.length + selectedServiceItems.length})</p>
                      <div className="space-y-3">
                        {/* Selected Services */}
                        {selectedServices.map((serviceId) => {
                          const service = availableServices.find(s => s.id === serviceId);
                          if (!service) return null;
                          const typeId = serviceConnectionTypes[serviceId]?.type || 'connects_to';

                          return (
                            <div key={`sel-service-${serviceId}`} className="p-3 bg-white rounded-lg border border-teal-200">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <Checkbox checked={true} onCheckedChange={() => handleToggleService(serviceId)} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Package className="h-4 w-4 text-teal-600" />
                                      <span className="text-sm font-medium">{service.name}</span>
                                      <Badge variant="outline" className="text-xs">Service</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      CMDB: {items.find(i => i.id === service.cmdb_item_id)?.name || `#${service.cmdb_item_id}`}
                                    </p>
                                    <div className="mt-2">
                                      <CrossServiceConnectionTypeSelector
                                        value={typeId}
                                        onChange={(typeSlug) => handleServiceTypeChange(serviceId, typeSlug)}
                                        connectionTypes={connectionTypes}
                                        placeholder="Pilih tipe koneksi"
                                        size="small"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Selected Service Items */}
                        {selectedServiceItems.map((itemId) => {
                          const item = availableServiceItems.find(i => i.id === itemId);
                          if (!item) return null;
                          const typeId = serviceItemConnectionTypes[itemId]?.type || 'connects_to';

                          return (
                            <div key={`sel-service-item-${itemId}`} className="p-3 bg-white rounded-lg border border-purple-200">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <Checkbox checked={true} onCheckedChange={() => handleToggleServiceItem(itemId)} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getTypeIcon(item.type)}
                                      <span className="text-sm font-medium">{item.name}</span>
                                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">Service Item</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      CMDB: {findCmdbItemName(item)}
                                    </p>
                                    <div className="mt-2">
                                      <CrossServiceConnectionTypeSelector
                                        value={typeId}
                                        onChange={(typeSlug) => handleServiceItemTypeChange(itemId, typeSlug)}
                                        connectionTypes={connectionTypes}
                                        placeholder="Pilih tipe koneksi"
                                        size="small"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <Input
                    type="text"
                    placeholder="Cari service atau service item..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />

                  {/* Service Tree Structure */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {Object.values(groupedServices).length > 0 ? (
                      Object.values(groupedServices).map((cmdbGroup) => (
                        <Collapsible
                          key={cmdbGroup.cmdbItemId}
                          open={openCmdbGroups[cmdbGroup.cmdbItemId]}
                          onOpenChange={(open) => setOpenCmdbGroups(prev => ({ ...prev, [cmdbGroup.cmdbItemId]: open }))}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                            {openCmdbGroups[cmdbGroup.cmdbItemId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <FolderOpen className="h-4 w-4 text-yellow-600" />
                            <span className="font-semibold text-sm">{cmdbGroup.cmdbItemName}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {cmdbGroup.services.length} Service(s)
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="ml-4 space-y-1">
                            {cmdbGroup.services.map((service) => (
                              <div key={service.id}>
                                {/* Service Node */}
                                <div
                                  onClick={() => handleToggleService(service.id)}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedServices.includes(service.id)
                                      ? 'bg-teal-50 border border-teal-500'
                                      : 'hover:bg-secondary border border-transparent'
                                  }`}
                                >
                                  <Checkbox checked={selectedServices.includes(service.id)} />
                                  <Package className="h-4 w-4 text-teal-600" />
                                  <div className="flex-1">
                                    <span className="font-medium text-sm">{service.name}</span>
                                    <Badge variant="outline" className="ml-1 text-xs">{service.status}</Badge>
                                  </div>
                                </div>

                                {/* Service Items - Show only when service is expanded or has selected items */}
                                {openServices[service.id] && (
                                  <div className="ml-6 space-y-1 mt-1">
                                    {availableServiceItems
                                      .filter(si => si.service_id === service.id)
                                      .filter(si =>
                                        !selectedServiceItems.includes(si.id) && (
                                          si.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                                          String(si.id).includes(serviceSearch)
                                        )
                                      )
                                      .map((item) => (
                                        <div
                                          key={item.id}
                                          onClick={() => handleToggleServiceItem(item.id)}
                                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                            selectedServiceItems.includes(item.id)
                                              ? 'bg-purple-50 border border-purple-500'
                                              : 'hover:bg-secondary border border-transparent'
                                          }`}
                                        >
                                          <Checkbox checked={selectedServiceItems.includes(item.id)} />
                                          {getTypeIcon(item.type)}
                                          <div className="flex-1">
                                            <span className="text-sm">{item.name}</span>
                                            {item.status !== 'active' && (
                                              <Badge variant="outline" className={`ml-1 text-xs ${
                                                item.status === 'inactive' ? 'bg-red-100 text-red-600' :
                                                item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' : ''
                                              }`}>
                                                {item.status}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-4">
                        {serviceSearch ? 'Tidak ada hasil' : 'Tidak ada service tersedia'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              Simpan ({selectedConnections.length + selectedGroupConnections.length + selectedServices.length + selectedServiceItems.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}