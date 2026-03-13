import { useState, useEffect } from 'react';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';
import api from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowUpRight, ArrowDownRight, Link2, Layers, Shield, TrendingUp, RefreshCw, ArrowRight,
  Server, Key, Puzzle, ArrowUp, ArrowDown, Lock, ShieldCheck, Eye, Scale, Zap,
  Database, Workflow, Route, Search, Check, ChevronRight, ChevronDown, FolderOpen,
  FolderClosed
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

// Mini Connection Preview Component
export function MiniConnectionPreview({ connectionType, sourceName, targetName }) {
  const getArrowDirection = () => {
    switch (connectionType.default_direction) {
      case 'backward':
        return '←';
      case 'bidirectional':
        return '↔';
      case 'forward':
      default:
        return '→';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-20 truncate" title={sourceName}>{sourceName}</span>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded text-white font-medium"
        style={{ backgroundColor: connectionType.color }}
        title={connectionType.label}
      >
        {getArrowDirection()}
      </div>
      <span className="max-w-20 truncate" title={targetName}>{targetName}</span>
    </div>
  );
}

// Connection Type Selector Component
export function CrossServiceConnectionTypeSelector({
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

export default function CrossServiceConnectionModal({
  show,
  selectedItem,
  allServiceItems,
  workspaceId,
  onClose,
  onSave,
}) {
  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [connectionTypesMap, setConnectionTypesMap] = useState({});
  const [availableItems, setAvailableItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // Track which collapsible groups are open
  const [openServices, setOpenServices] = useState({}); // Track which services are open

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch connection types
        const typesResponse = await api.get('/cmdb/connection-types');
        setConnectionTypes(typesResponse.data);

        // Fetch available service items for connection
        if (selectedItem && workspaceId) {
          const itemsResponse = await api.get(`/cross-service-connections/available/${workspaceId}/${selectedItem.id}`);
          setAvailableItems(itemsResponse.data);

          // Auto-expand all groups on load
          const uniqueCmdbItems = [...new Set(itemsResponse.data.map(item => item.cmdb_item_id))];
          const uniqueServices = [...new Set(itemsResponse.data.map(item => item.service_id))];

          setOpenGroups(uniqueCmdbItems.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
          setOpenServices(uniqueServices.reduce((acc, id) => ({ ...acc, [id]: true }), {}));

          // Fetch existing connections
          const existingResponse = await api.get(`/cross-service-connections/service-item/${selectedItem.id}`);
          const existingConnections = existingResponse.data;

          // Set selected connections and their types
          const selectedIds = existingConnections.map(conn => {
            const isSource = conn.source_service_item_id === selectedItem.id;
            return isSource ? conn.target_service_item_id : conn.source_service_item_id;
          });

          setSelectedConnections(selectedIds);

          // Set connection types for each connection
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
          setConnectionTypesMap(typesMap);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (show) {
      fetchData();
    }
  }, [show, selectedItem, workspaceId]);

  const handleToggleConnection = (itemId) => {
    setSelectedConnections(prev => {
      if (prev.includes(itemId)) {
        // Remove connection and its type
        setConnectionTypesMap(prevMap => {
          const newMap = { ...prevMap };
          delete newMap[itemId];
          return newMap;
        });
        return prev.filter(id => id !== itemId);
      } else {
        // Add connection with default type
        setConnectionTypesMap(prevMap => ({
          ...prevMap,
          [itemId]: { type: 'connects_to', direction: 'forward' }
        }));
        return [...prev, itemId];
      }
    });
  };

  const handleConnectionTypeChange = (itemId, typeSlug) => {
    setConnectionTypesMap(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], type: typeSlug }
    }));
  };

  // Group items by CMDB Item and Service
  const groupedItems = availableItems.reduce((acc, item) => {
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
  }, {});

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    String(item.id).includes(connectionSearch) ||
    item.type.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    item.cmdb_item_name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    item.service_name.toLowerCase().includes(connectionSearch.toLowerCase())
  );

  const selectedItems = filteredItems.filter(item =>
    selectedConnections.includes(item.id)
  );

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Get current connections from database to compare
      const existingResponse = await api.get(`/cross-service-connections/service-item/${selectedItem.id}`);
      const existingConnections = existingResponse.data;
      const existingConnectionIds = existingConnections.map(conn => {
        const isSource = conn.source_service_item_id === selectedItem.id;
        return isSource ? conn.target_service_item_id : conn.source_service_item_id;
      });

      // Delete connections that were removed (exist in DB but not in selected)
      for (const connId of existingConnectionIds) {
        if (!selectedConnections.includes(connId)) {
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
      for (const itemId of selectedConnections) {
        const connData = connectionTypesMap[itemId];

        if (connData && connData.id) {
          // Update existing connection
          await api.put(`/cross-service-connections/${connData.id}`, {
            workspace_id: workspaceId,
            connection_type: connData.type,
            direction: connData.direction
          });
        } else {
          // Create new connection
          const response = await api.post('/cross-service-connections', {
            source_service_item_id: selectedItem.id,
            target_service_item_id: itemId,
            workspace_id: workspaceId,
            connection_type: connData?.type || 'connects_to',
            direction: connData?.direction || 'forward'
          });
        }
      }

      onSave();
    } catch (error) {
      console.error('Failed to save connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!show || !selectedItem) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Koneksi Antar Service (Cross-Service)</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4">
          {/* Source Item Info */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Service Item Sumber</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedItem.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih service item tujuan untuk membuat koneksi dari {selectedItem.name} ke service item dari CMDB item lain
            </p>
          </div>

          {selectedItems.length > 0 && (
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-500 dark:text-black">
              <p className="font-semibold text-sm mb-3">Service Items Terpilih ({selectedItems.length})</p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedItems.map((item) => {
                  const itemTypeId = connectionTypesMap[item.id]?.type || 'connects_to';
                  const itemTypeInfo = connectionTypes.find(ct => ct.type_slug === itemTypeId);

                  return (
                    <div
                      key={`selected-${item.id}`}
                      className="p-3 bg-white rounded-lg border border-blue-200 dark:border-blue-800 dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => handleToggleConnection(item.id)}
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

                            {/* Connection Type Selector */}
                            <div className="flex items-center gap-2 mt-2">
                              <label className="text-xs text-muted-foreground whitespace-nowrap">Tipe:</label>
                              <CrossServiceConnectionTypeSelector
                                value={itemTypeId}
                                onChange={(value) => handleConnectionTypeChange(item.id, value)}
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
            placeholder="Cari service item, service, atau CMDB item..."
            value={connectionSearch}
            onChange={(e) => setConnectionSearch(e.target.value)}
          />

          {/* Folder Structure: CMDB Items > Services > Service Items */}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {Object.values(groupedItems).length > 0 ? (
              Object.values(groupedItems).map((cmdbGroup) => (
                <Collapsible
                  key={cmdbGroup.cmdbItemId}
                  open={openGroups[cmdbGroup.cmdbItemId]}
                  onOpenChange={(open) => setOpenGroups(prev => ({ ...prev, [cmdbGroup.cmdbItemId]: open }))}
                >
                  <CollapsibleTrigger
                    className="flex items-center gap-2 w-full p-2 hover:bg-secondary rounded-lg transition-colors text-left"
                  >
                    {openGroups[cmdbGroup.cmdbItemId] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <FolderOpen className="h-4 w-4 text-yellow-600" />
                    <span className="font-semibold text-sm">{cmdbGroup.cmdbItemName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Object.keys(cmdbGroup.services).length} services
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-1">
                    {Object.values(cmdbGroup.services).map((serviceGroup) => (
                      <Collapsible
                        key={serviceGroup.serviceId}
                        open={openServices[serviceGroup.serviceId]}
                        onOpenChange={(open) => setOpenServices(prev => ({ ...prev, [serviceGroup.serviceId]: open }))}
                      >
                        <CollapsibleTrigger
                          className="flex items-center gap-2 w-full p-2 hover:bg-secondary/50 rounded-lg transition-colors text-left"
                        >
                          {openServices[serviceGroup.serviceId] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Layers className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">{serviceGroup.serviceName}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {serviceGroup.items.length} items
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-4 space-y-1">
                          {serviceGroup.items
                            .filter(item =>
                              !selectedConnections.includes(item.id) && (
                                item.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
                                String(item.id).includes(connectionSearch) ||
                                item.type.toLowerCase().includes(connectionSearch.toLowerCase())
                              )
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleToggleConnection(item.id)}
                                className="flex items-center gap-2 p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
                              >
                                <Checkbox checked={false} />
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
                            ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <p className="text-muted-foreground text-sm italic text-center py-4">
                {isLoading ? 'Loading...' : connectionSearch ? 'Tidak ada service item ditemukan' : 'Tidak ada service item tersedia'}
              </p>
            )}
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : `Simpan (${selectedConnections.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
