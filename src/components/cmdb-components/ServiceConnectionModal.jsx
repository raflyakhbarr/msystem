import { useState, useEffect } from 'react';
import { Check, Link, Globe, ChevronRight, ChevronDown, Layers, FolderOpen, ArrowUpRight, ArrowDownRight, Server, Key, Puzzle, Shield, TrendingUp, RefreshCw, ArrowUp, ArrowDown, Lock, ShieldCheck, Eye, Scale, Zap, Database, Workflow, Route, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import api from '../../services/api';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getTypeIcon } from '../../utils/cmdb-utils/constants';

// Connection Type Selector Component (Internal - for items/groups)
function ConnectionTypeSelector({ value, onChange, size = "default" }) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedType = CONNECTION_TYPES[value] || CONNECTION_TYPES.depends_on;

  const filteredTypes = Object.entries(CONNECTION_TYPES).filter(([key, type]) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      type.label.toLowerCase().includes(searchLower) ||
      key.toLowerCase().includes(searchLower) ||
      (type.description && type.description.toLowerCase().includes(searchLower))
    );
  });

  const sizeClasses = size === "small" ? "h-7 text-xs" : "";

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-between ${sizeClasses}`}
        onClick={() => setShowDialog(true)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedType.color }}
          />
          <span className="truncate">{selectedType.label}</span>
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {selectedType.propagation === 'both' ? '↔' : '→'}
        </span>
      </Button>

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
            <CommandList style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada tipe koneksi ditemukan
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTypes.map(([key, type]) => (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={() => {
                      onChange(key);
                      setShowDialog(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mr-3"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({type.propagation === 'both' ? '↔' : '→'})
                        </span>
                      </div>
                      {type.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {type.description}
                        </p>
                      )}
                    </div>
                    {value === key && (
                      <Check size={14} className="text-primary ml-auto" />
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

// Cross-Service Connection Type Selector Component (External - for cross-service)
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
            {/* Search Input */}
            <div className="p-3 border-b">
              <Input
                placeholder="Cari tipe koneksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type List */}
            <div className="max-h-80 overflow-y-auto px-1" style={{ maxHeight: size === 'small' ? '200px' : '400px' }}>
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

// Helper function for connection icons
function getConnectionIcon(iconName) {
  const icons = {
    'arrow-up-right': <ArrowUpRight className="h-4 w-4" />,
    'arrow-down-right': <ArrowDownRight className="h-4 w-4" />,
    'link': <Link className="h-4 w-4" />,
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

export default function ServiceConnectionModal({
  show,
  onClose,
  selectedItem,
  allItems,
  groups,
  selectedConnections,
  selectedGroupConnections,
  itemConnectionTypes = {},
  itemToGroupConnectionTypes = {},
  onToggleConnection,
  onToggleGroupConnection,
  onConnectionTypeChange,
  onItemToGroupTypeChange,
  onSave,
  // Cross-Service props
  workspaceId,
  onCrossServiceSave,
  onLayananSave // Callback for layana connections save
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('items');

  // Local state for connection types
  const [localItemTypes, setLocalItemTypes] = useState(itemConnectionTypes);
  const [localItemToGroupTypes, setLocalItemToGroupTypes] = useState(itemToGroupConnectionTypes);

  // Cross-Service state
  const [crossServiceSearch, setCrossServiceSearch] = useState('');
  const [crossServiceAvailableItems, setCrossServiceAvailableItems] = useState([]);
  const [crossServiceSelectedIds, setCrossServiceSelectedIds] = useState([]);
  const [crossServiceTypesMap, setCrossServiceTypesMap] = useState({});
  const [crossServiceConnectionTypes, setCrossServiceConnectionTypes] = useState([]);
  const [isLoadingCrossService, setIsLoadingCrossService] = useState(false);
  const [openCmdbGroups, setOpenCmdbGroups] = useState({});
  const [openServices, setOpenServices] = useState({});

  // Layana connection state
  const [layananSearch, setLayananSearch] = useState('');
  const [availableLayananItems, setAvailableLayananItems] = useState([]);
  const [selectedLayananIds, setSelectedLayananIds] = useState([]);
  const [layananTypesMap, setLayananTypesMap] = useState({});
  const [isLoadingLayanan, setIsLoadingLayanan] = useState(false);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (show) {
      setLocalItemTypes(itemConnectionTypes);
      setLocalItemToGroupTypes(itemToGroupConnectionTypes);
      setSearchQuery('');
      setActiveTab('items');
      setCrossServiceSearch('');

      // Fetch cross-service connection count when modal opens (regardless of active tab)
      if (workspaceId && selectedItem) {
        const fetchCrossServiceCount = async () => {
          try {
            const existingResponse = await api.get(`/cross-service-connections/service-item/${selectedItem.id}`);
            const existingConnections = existingResponse.data;

            const selectedIds = existingConnections.map(conn => {
              const isSource = conn.source_service_item_id === selectedItem.id;
              return isSource ? conn.target_service_item_id : conn.source_service_item_id;
            });

            setCrossServiceSelectedIds(selectedIds);
          } catch (error) {
            console.error('Failed to fetch cross-service count:', error);
          }
        };

        fetchCrossServiceCount();
      }
    }
  }, [show, itemConnectionTypes, itemToGroupConnectionTypes, workspaceId, selectedItem]);

  // Fetch full cross-service data when tab switches to 'external'
  useEffect(() => {
    const fetchCrossServiceData = async () => {
      if (activeTab === 'external' && workspaceId && selectedItem) {
        setIsLoadingCrossService(true);
        try {
          // Fetch connection types
          const typesResponse = await api.get('/cmdb/connection-types');
          setCrossServiceConnectionTypes(typesResponse.data);

          // Fetch available service items
          const itemsResponse = await api.get(`/cross-service-connections/available/${workspaceId}/${selectedItem.id}`);
          setCrossServiceAvailableItems(itemsResponse.data);

          // Auto-expand groups
          const uniqueCmdbItems = [...new Set(itemsResponse.data.map(item => item.cmdb_item_id))];
          const uniqueServices = [...new Set(itemsResponse.data.map(item => item.service_id))];
          setOpenCmdbGroups(uniqueCmdbItems.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
          setOpenServices(uniqueServices.reduce((acc, id) => ({ ...acc, [id]: true }), {}));

          // Fetch existing connections
          const existingResponse = await api.get(`/cross-service-connections/service-item/${selectedItem.id}`);
          const existingConnections = existingResponse.data;

          const selectedIds = existingConnections.map(conn => {
            const isSource = conn.source_service_item_id === selectedItem.id;
            return isSource ? conn.target_service_item_id : conn.source_service_item_id;
          });

          setCrossServiceSelectedIds(selectedIds);

          const typesMap = {};
          existingConnections.forEach(conn => {
            const isSource = conn.source_service_item_id === selectedItem.id;
            const targetId = isSource ? conn.target_service_item_id : conn.source_service_item_id;
            typesMap[targetId] = {
              type: conn.connection_type,
              direction: conn.direction,
              id: conn.id
            };
          });
          setCrossServiceTypesMap(typesMap);
        } catch (error) {
          console.error('Failed to fetch cross-service data:', error);
        } finally {
          setIsLoadingCrossService(false);
        }
      }
    };

    fetchCrossServiceData();
  }, [activeTab, workspaceId, selectedItem]);

  // Fetch layana data when tab switches to 'layana'
  useEffect(() => {
    const fetchLayanaData = async () => {
      if (activeTab === 'layana' && workspaceId && selectedItem) {
        setIsLoadingLayanan(true);
        try {
          // Fetch available layana items
          const layanaResponse = await api.get(`/layanan?workspace_id=${workspaceId}`);
          setAvailableLayananItems(layanaResponse.data || []);

          // Fetch existing layana-service connections for this service item
          const existingResponse = await api.get(`/layanan-service-connections/service-item/${selectedItem.id}`);
          const existingConnections = existingResponse.data;

          const selectedIds = existingConnections.map(conn => conn.layanan_id);
          setSelectedLayananIds(selectedIds);

          const typesMap = {};
          existingConnections.forEach(conn => {
            typesMap[conn.layanan_id] = {
              type: conn.connection_type,
              propagationEnabled: conn.propagation_enabled,
              id: conn.id
            };
          });
          setLayananTypesMap(typesMap);
        } catch (error) {
          console.error('Failed to fetch layana data:', error);
        } finally {
          setIsLoadingLayanan(false);
        }
      }
    };

    fetchLayanaData();
  }, [activeTab, workspaceId, selectedItem]);

  const handleItemTypeChange = (itemId, typeSlug) => {
    const newTypes = { ...localItemTypes, [itemId]: typeSlug };
    setLocalItemTypes(newTypes);
    onConnectionTypeChange && onConnectionTypeChange(itemId, typeSlug);
  };

  const handleItemToGroupTypeChange = (groupId, typeSlug) => {
    const newTypes = { ...localItemToGroupTypes, [groupId]: typeSlug };
    setLocalItemToGroupTypes(newTypes);
    onItemToGroupTypeChange && onItemToGroupTypeChange(groupId, typeSlug);
  };

  // Cross-Service handlers
  const handleCrossServiceToggle = (itemId) => {
    setCrossServiceSelectedIds(prev => {
      if (prev.includes(itemId)) {
        setCrossServiceTypesMap(prevMap => {
          const newMap = { ...prevMap };
          delete newMap[itemId];
          return newMap;
        });
        return prev.filter(id => id !== itemId);
      } else {
        setCrossServiceTypesMap(prevMap => ({
          ...prevMap,
          [itemId]: { type: 'connects_to', direction: 'forward' }
        }));
        return [...prev, itemId];
      }
    });
  };

  const handleCrossServiceTypeChange = (itemId, typeSlug) => {
    setCrossServiceTypesMap(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], type: typeSlug }
    }));
  };

  const handleSaveCrossServiceConnections = async () => {
    try {
      setIsLoadingCrossService(true);

      const existingResponse = await api.get(`/cross-service-connections/service-item/${selectedItem.id}`);
      const existingConnections = existingResponse.data;
      const existingIds = existingConnections.map(conn => {
        const isSource = conn.source_service_item_id === selectedItem.id;
        return isSource ? conn.target_service_item_id : conn.source_service_item_id;
      });

      // Delete removed connections
      for (const connId of existingIds) {
        if (!crossServiceSelectedIds.includes(connId)) {
          const connData = existingConnections.find(c => {
            const isSource = c.source_service_item_id === selectedItem.id;
            const targetId = isSource ? c.target_service_item_id : c.source_service_item_id;
            return targetId === connId;
          });
          if (connData) {
            await api.delete(`/cross-service-connections/${connData.id}`);
          }
        }
      }

      // Create or update connections
      for (const itemId of crossServiceSelectedIds) {
        const connData = crossServiceTypesMap[itemId];
        if (connData && connData.id) {
          await api.put(`/cross-service-connections/${connData.id}`, {
            workspace_id: workspaceId,
            connection_type: connData.type,
            direction: connData.direction
          });
        } else {
          await api.post('/cross-service-connections', {
            source_service_item_id: selectedItem.id,
            target_service_item_id: itemId,
            workspace_id: workspaceId,
            connection_type: connData?.type || 'connects_to',
            direction: connData?.direction || 'forward'
          });
        }
      }

      onCrossServiceSave && onCrossServiceSave();
    } catch (error) {
      console.error('Failed to save cross-service connections:', error);
    } finally {
      setIsLoadingCrossService(false);
    }
  };

  // Layana handlers
  const handleLayanaToggle = (layananId) => {
    setSelectedLayananIds(prev => {
      if (prev.includes(layananId)) {
        setLayananTypesMap(prevMap => {
          const newMap = { ...prevMap };
          delete newMap[layananId];
          return newMap;
        });
        return prev.filter(id => id !== layananId);
      } else {
        setLayananTypesMap(prevMap => ({
          ...prevMap,
          [layananId]: { type: 'depends_on', propagationEnabled: true }
        }));
        return [...prev, layananId];
      }
    });
  };

  const handleLayanaTypeChange = (layananId, typeSlug) => {
    setLayananTypesMap(prev => ({
      ...prev,
      [layananId]: { ...prev[layananId], type: typeSlug }
    }));
  };

  const handleLayanaPropagationToggle = (layananId) => {
    setLayananTypesMap(prev => ({
      ...prev,
      [layananId]: { ...prev[layananId], propagationEnabled: !prev[layananId]?.propagationEnabled }
    }));
  };

  const handleSaveLayananConnections = async () => {
    try {
      setIsLoadingLayanan(true);

      const existingResponse = await api.get(`/layanan-service-connections/service-item/${selectedItem.id}`);
      const existingConnections = existingResponse.data;
      const existingIds = existingConnections.map(conn => conn.layanan_id);

      // Delete removed connections
      for (const layananId of existingIds) {
        if (!selectedLayananIds.includes(layananId)) {
          const connData = existingConnections.find(c => c.layanan_id === layananId);
          if (connData) {
            await api.delete(`/layanan-service-connections/${connData.id}`);
          }
        }
      }

      // Create or update connections
      for (const layananId of selectedLayananIds) {
        const connData = layananTypesMap[layananId];
        if (connData && connData.id) {
          await api.put(`/layanan-service-connections/${connData.id}`, {
            connection_type: connData.type,
            propagation_enabled: connData.propagationEnabled
          });
        } else {
          // Get service_id from selectedItem (service item should have service_id)
          await api.post('/layanan-service-connections', {
            layanan_id: layananId,
            service_id: selectedItem.service_id,
            service_item_id: selectedItem.id,
            workspace_id: workspaceId,
            connection_type: connData?.type || 'depends_on',
            propagation_enabled: connData?.propagationEnabled !== false
          });
        }
      }

      onLayananSave && onLayananSave(); // Call layana-specific callback
      onCrossServiceSave && onCrossServiceSave(); // Also call general callback for compatibility
    } catch (error) {
      console.error('Failed to save layanan connections:', error);
    } finally {
      setIsLoadingLayanan(false);
    }
  };

  if (!show) return null;

  const filteredItems = allItems
    .filter(item => item.id !== selectedItem?.id)
    .filter(item =>
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.id).includes(searchQuery) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredGroups = groups
    .filter(group =>
      !searchQuery ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(group.id).includes(searchQuery)
    );

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl overflow-hidden">
        <DialogHeader className="px-6 pb-4 border-b">
          <DialogTitle>Kelola Koneksi Service</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(90vh - 140px)' }}>
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 flex-shrink-0">
            <p className="text-sm text-muted-foreground">Service Item:</p>
            <p className="font-semibold">{selectedItem?.name}</p>
          </div>

          <Tabs value={activeTab} onValueChange={(newTab) => {
            setActiveTab(newTab);
            setSearchQuery('');
            if (newTab === 'external') {
              setCrossServiceSearch('');
            } else if (newTab === 'layana') {
              setLayananSearch('');
            }
          }} className="flex-1 flex flex-col min-h-0 pt-5">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="items">
                Ke Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
              <TabsTrigger value="layana">
                Ke Layana ({selectedLayananIds.length})
              </TabsTrigger>
              <TabsTrigger value="external">
                Ke Eksternal ({crossServiceSelectedIds.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="flex-1 overflow-hidden flex flex-col mt-4 min-h-0">
              <div className="space-y-3 px-1">
                <Input
                  type="text"
                  placeholder="Cari items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-shrink-0"
                />

                <div className="overflow-y-auto px-1" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const isConnected = selectedConnections.includes(item.id);
                    const currentType = localItemTypes[item.id] || 'depends_on';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border-2 transition-all ${
                          isConnected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="p-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isConnected}
                            onChange={() => onToggleConnection(item.id)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type} • {item.status}
                            </p>
                          </div>
                          {isConnected && (
                            <Check className="text-green-600" size={20} />
                          )}
                        </div>

                        {/* Connection Type Selector - Only show when connected */}
                        {isConnected && (
                          <div className="px-3 pb-3">
                            <ConnectionTypeSelector
                              value={currentType}
                              onChange={(typeSlug) => handleItemTypeChange(item.id, typeSlug)}
                              size="small"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic text-center py-4">
                    {searchQuery ? 'No items match your search' : 'No items available'}
                  </p>
                )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-hidden flex flex-col mt-4 min-h-0">
              <div className="space-y-3 px-1">
                <Input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-shrink-0"
                />

                <div className="overflow-y-auto px-1" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(group => {
                    const isConnected = selectedGroupConnections.includes(group.id);
                    const currentType = localItemToGroupTypes[group.id] || 'depends_on';

                    return (
                      <div
                        key={group.id}
                        className={`rounded-lg border-2 transition-all ${
                          isConnected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: isConnected ? '#a855f7' : group.color || '#e0e7ff'
                        }}
                      >
                        <div className="p-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isConnected}
                            onChange={() => onToggleGroupConnection(group.id)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{group.name}</p>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">{group.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {group.itemCount || 0} items
                            </p>
                          </div>
                          {isConnected && (
                            <Check className="text-purple-600" size={20} />
                          )}
                        </div>

                        {/* Connection Type Selector - Only show when connected */}
                        {isConnected && (
                          <div className="px-3 pb-3">
                            <ConnectionTypeSelector
                              value={currentType}
                              onChange={(typeSlug) => handleItemToGroupTypeChange(group.id, typeSlug)}
                              size="small"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic text-center py-4">
                    {searchQuery ? 'No groups match your search' : 'No groups available'}
                  </p>
                )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Layana Connections */}
            <TabsContent value="layana" className="flex-1 overflow-hidden flex flex-col mt-4 min-h-0">
              <div className="space-y-3 px-1">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Koneksi ke layanan (business service)</p>
                </div>

                {selectedLayananIds.length > 0 && (
                  <div className="p-3 border rounded-lg bg-purple-50 border-purple-500 flex-shrink-0">
                    <p className="font-semibold text-sm mb-3">Layanan Terpilih ({selectedLayananIds.length})</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {availableLayananItems
                        .filter(layanan => selectedLayananIds.includes(layanan.id))
                        .slice(0, 10)
                        .map((layanan) => {
                          const layananTypeId = layananTypesMap[layanan.id]?.type || 'depends_on';

                          return (
                            <div
                              key={`selected-${layanan.id}`}
                              className="p-3 bg-white rounded-lg border border-purple-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <Checkbox
                                    checked={true}
                                    onCheckedChange={() => handleLayanaToggle(layanan.id)}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Globe className="h-4 w-4 text-purple-600" />
                                      <span className="text-sm font-medium">{layanan.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Status: {layanan.status}
                                    </div>

                                    {/* Connection Type Selector */}
                                    <div className="mt-2">
                                      <ConnectionTypeSelector
                                        value={layananTypeId}
                                        onChange={(typeSlug) => handleLayanaTypeChange(layanan.id, typeSlug)}
                                        size="small"
                                      />
                                    </div>

                                    {/* Propagation Toggle */}
                                    <div className="mt-2 flex items-center gap-2">
                                      <Checkbox
                                        checked={layananTypesMap[layanan.id]?.propagationEnabled !== false}
                                        onCheckedChange={() => handleLayanaPropagationToggle(layanan.id)}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        Propagasi status
                                      </span>
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

                <Input
                  type="text"
                  placeholder="Cari layanan..."
                  value={layananSearch}
                  onChange={(e) => setLayananSearch(e.target.value)}
                  className="flex-shrink-0"
                />

                <div className="overflow-y-auto px-1" style={{ maxHeight: 'calc(90vh - 400px)' }}>
                {isLoadingLayanan ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>
                ) : (
                  <div className="space-y-1">
                    {availableLayananItems
                      .filter(layanan =>
                        !selectedLayananIds.includes(layanan.id) && (
                          !layananSearch ||
                          layanan.name.toLowerCase().includes(layananSearch.toLowerCase()) ||
                          String(layanan.id).includes(layananSearch)
                        )
                      )
                      .map((layanan) => {
                        const isSelected = selectedLayananIds.includes(layanan.id);

                        return (
                          <div
                            key={layanan.id}
                            onClick={() => handleLayanaToggle(layanan.id)}
                            className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                          >
                            <Checkbox checked={isSelected} />
                            <Globe className="h-4 w-4 text-purple-600" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{layanan.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                {layanan.status !== 'active' && (
                                  <span className={`ml-1 px-1 py-0.5 rounded text-[10px] ${
                                    layanan.status === 'inactive' ? 'bg-red-100 text-red-600' :
                                    layanan.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {layanan.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Cross-Service Connections */}
            <TabsContent value="external" className="flex-1 overflow-hidden flex flex-col mt-4 min-h-0">
              <div className="space-y-3 px-1">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Koneksi ke service item eksternal (dari service/CMDB lain)</p>
                </div>

                {crossServiceSelectedIds.length > 0 && (
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-500 flex-shrink-0">
                    <p className="font-semibold text-sm mb-3">Service Items Terpilih ({crossServiceSelectedIds.length})</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {crossServiceAvailableItems
                        .filter(item => crossServiceSelectedIds.includes(item.id))
                        .slice(0, 10)
                        .map((item) => {
                          const itemTypeId = crossServiceTypesMap[item.id]?.type || 'connects_to';

                          return (
                            <div
                              key={`selected-${item.id}`}
                              className="p-3 bg-white rounded-lg border border-blue-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <Checkbox
                                    checked={true}
                                    onCheckedChange={() => handleCrossServiceToggle(item.id)}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getTypeIcon(item.type)}
                                      <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                        {item.service_name || 'Service'}
                                      </span>
                                      <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                                        {item.cmdb_item_name || 'CMDB Item'}
                                      </span>
                                    </div>

                                    {/* Connection Type Selector - Simple & Clean */}
                                    <div className="mt-2">
                                      <CrossServiceConnectionTypeSelector
                                        value={itemTypeId}
                                        onChange={(typeSlug) => handleCrossServiceTypeChange(item.id, typeSlug)}
                                        connectionTypes={crossServiceConnectionTypes}
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

                <Input
                  type="text"
                  placeholder="Cari service item, service, atau CMDB item..."
                  value={crossServiceSearch}
                  onChange={(e) => setCrossServiceSearch(e.target.value)}
                  className="flex-shrink-0"
                />

                <div className="overflow-y-auto px-1" style={{ maxHeight: 'calc(90vh - 400px)' }}>
                {isLoadingCrossService ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>
                ) : (
                  <div className="space-y-1">
                    {Object.values(
                      crossServiceAvailableItems.reduce((acc, item) => {
                        if (!acc[item.cmdb_item_id]) {
                          acc[item.cmdb_item_id] = {
                            cmdbItemId: item.cmdb_item_id,
                            cmdbItemName: item.cmdb_item_name,
                            services: {}
                          };
                        }
                        if (!acc[item.cmdb_item_id].services[item.service_id]) {
                          acc[item.cmdb_item_id].services[item.service_id] = {
                            serviceId: item.service_id,
                            serviceName: item.service_name,
                            items: []
                          };
                        }
                        acc[item.cmdb_item_id].services[item.service_id].items.push(item);
                        return acc;
                      }, {})
                    ).map((cmdbGroup) => (
                      <Collapsible
                        key={cmdbGroup.cmdbItemId}
                        open={openCmdbGroups[cmdbGroup.cmdbItemId]}
                        onOpenChange={(open) => setOpenCmdbGroups(prev => ({ ...prev, [cmdbGroup.cmdbItemId]: open }))}
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary rounded-lg transition-colors text-left">
                          {openCmdbGroups[cmdbGroup.cmdbItemId] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <FolderOpen className="h-4 w-4 text-yellow-600" />
                          <span className="font-semibold text-sm">{cmdbGroup.cmdbItemName}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {Object.keys(cmdbGroup.services).length} Service(s)
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-4 space-y-1">
                          {Object.values(cmdbGroup.services).map((serviceGroup) => (
                            <Collapsible
                              key={serviceGroup.serviceId}
                              open={openServices[serviceGroup.serviceId]}
                              onOpenChange={(open) => setOpenServices(prev => ({ ...prev, [serviceGroup.serviceId]: open }))}
                            >
                              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-secondary/50 rounded-lg transition-colors text-left">
                                {openServices[serviceGroup.serviceId] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <Layers className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-sm">{serviceGroup.serviceName}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {serviceGroup.items.length} Item(s)
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="ml-4 space-y-1">
                                {serviceGroup.items
                                  .filter(item =>
                                    !crossServiceSelectedIds.includes(item.id) && (
                                      item.name.toLowerCase().includes(crossServiceSearch.toLowerCase()) ||
                                      String(item.id).includes(crossServiceSearch) ||
                                      item.type.toLowerCase().includes(crossServiceSearch.toLowerCase())
                                    )
                                  )
                                  .map((item) => {
                                    const isSelected = crossServiceSelectedIds.includes(item.id);

                                    return (
                                      <div
                                        key={item.id}
                                        onClick={() => handleCrossServiceToggle(item.id)}
                                        className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                                      >
                                        <Checkbox checked={isSelected} />
                                        {getTypeIcon(item.type)}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate">{item.name}</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <span className="capitalize">{item.type}</span>
                                            {item.status !== 'active' && (
                                              <span className={`ml-1 px-1 py-0.5 rounded text-[10px] ${
                                                item.status === 'inactive' ? 'bg-red-100 text-red-600' :
                                                item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-gray-100 text-gray-600'
                                              }`}>
                                                {item.status}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 justify-end px-6 py-4 border-t bg-background">
          <div className="flex-1 text-sm text-muted-foreground">
            {activeTab === 'layana'
              ? `${selectedLayananIds.length} koneksi layana`
              : activeTab === 'external'
              ? `${crossServiceSelectedIds.length} koneksi eksternal`
              : `${selectedConnections.length + selectedGroupConnections.length} koneksi`
            }
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (activeTab === 'layana') {
                await handleSaveLayananConnections();
                onClose(); // ✅ Tutup modal setelah save layana connections
              } else if (activeTab === 'external') {
                await handleSaveCrossServiceConnections();
                onClose(); // ✅ Tutup modal setelah save cross-service connections
              } else {
                onSave(localItemTypes, localItemToGroupTypes);
              }
            }}
            disabled={activeTab === 'layana' ? isLoadingLayanan : activeTab === 'external' ? isLoadingCrossService : false}
          >
            {(activeTab === 'layana' && isLoadingLayanan) || (activeTab === 'external' && isLoadingCrossService) ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
