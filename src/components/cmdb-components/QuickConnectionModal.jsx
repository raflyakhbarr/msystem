import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getConnectionTypeInfo, CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';
import api from '../../services/api';
import {
  Server,
  Database,
  Network,
  Monitor,
  GitBranch,
  Shield,
  Wifi,
  ArrowRight,
  ArrowRightLeft,
  Check,
  Layers,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';

export default function QuickConnectionModal({
  show,
  sourceItem,
  targetItem,
  onClose,
  onSave,
  mode = 'create',
  existingConnectionType = null,
  existingServiceItemId = null,
  workspaceId = null,
  services = [],
}) {
  // Determine default connection type based on source and target types
  const getDefaultConnectionType = () => {
    // If source is service/service-item and target is CMDB item (not service)
    const sourceIsService = sourceItem?.service || sourceItem?._entityType === 'service';
    const targetIsCMDBItem = targetItem && !targetItem?.service && targetItem?._entityType !== 'service';

    if (sourceIsService && targetIsCMDBItem) {
      return 'consumed_by'; // Service/Service Item → CMDB Item: use consumed_by
    }
    return 'depends_on'; // Default for item-to-item
  };

  const [selectedType, setSelectedType] = useState(() => getDefaultConnectionType());
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Service/Service Item selection state
  const [targetType, setTargetType] = useState('service'); // 'service' or 'service_item'
  const [sourceType, setSourceType] = useState('service'); // 'service' or 'service_item' - for when source is a service
  const [availableServiceItems, setAvailableServiceItems] = useState([]);
  const [selectedServiceItemIds, setSelectedServiceItemIds] = useState([]);
  const [isLoadingServiceItems, setIsLoadingServiceItems] = useState(false);

  // Helper function to get actual item data (handles both ReactFlow nodes and plain objects)
  const getItemData = (item) => {
    if (item && item.data && typeof item.data === 'object') {
      return item.data;
    }
    return item;
  };

  // Helper function to check if item is a group
  const isGroup = (item) => item && (item.color !== undefined || item.data?.color !== undefined);

  // Helper function to check if item is a service (service node)
  const isServiceNode = (item) => {
    const data = getItemData(item);
    const id = String(item?.id || '');
    return id.startsWith('service-') || data?.type === 'service' || item?._entityType === 'service';
  };

  const getItemIcon = (item) => {
    const iconProps = { size: 32, className: 'text-foreground' };
    const data = getItemData(item);

    if (isGroup(item)) {
      return <Layers {...iconProps} />;
    }

    switch (data.type) {
      case 'server': return <Server {...iconProps} />;
      case 'database': return <Database {...iconProps} />;
      case 'switch': return <Network {...iconProps} />;
      case 'workstation': return <Monitor {...iconProps} />;
      case 'hub': return <GitBranch {...iconProps} />;
      case 'firewall': return <Shield {...iconProps} />;
      case 'router': return <Wifi {...iconProps} />;
      case 'service': return <Package {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const getDisplayColor = (item) => {
    const data = getItemData(item);

    if (isGroup(item)) {
      const groupColor = item.color || data.color;
      return `border-2 style={{ borderColor: '${groupColor}' }}`;
    }

    const statusColor = {
      'active': 'bg-green-500 border-green-600',
      'inactive': 'bg-red-500 border-red-600',
      'maintenance': 'bg-yellow-500 border-yellow-600',
      'decommissioned': 'bg-gray-500 border-gray-600',
    };
    return statusColor[data.status] || 'bg-gray-500 border-gray-600';
  };

  const getItemTypeLabel = (item) => {
    const data = getItemData(item);
    if (isGroup(item)) return 'Group';
    if (isServiceNode(item)) return 'Service';
    return data.type || 'Item';
  };

  // Check if source or target is a service node
  const sourceIsService = isServiceNode(sourceItem);
  const targetIsService = isServiceNode(targetItem);
  const showServiceOptions = sourceIsService || targetIsService;

  // Fetch service items when component mounts or when needed
  useEffect(() => {
    if (!show || !workspaceId) return;

    // Compute showServiceOptions fresh inside the effect
    const sourceIsServiceLocal = sourceItem && (
      String(sourceItem?.id || '').startsWith('service-') ||
      sourceItem?._entityType === 'service'
    );
    const targetIsServiceLocal = targetItem && (
      String(targetItem?.id || '').startsWith('service-') ||
      targetItem?._entityType === 'service'
    );
    const showServiceOptionsLocal = sourceIsServiceLocal || targetIsServiceLocal;

    if (!showServiceOptionsLocal) return;
    if (targetType !== 'service_item' && sourceType !== 'service_item') return;

    const fetchServiceItems = async () => {
      setIsLoadingServiceItems(true);
      try {
        const serviceItemsData = [];
        const targetId = String(targetItem?.id || '');
        const sourceId = String(sourceItem?.id || '');
        let targetServiceId = null;
        let sourceServiceId = null;

        // When _entityType is 'service', the item IS the service - use its id directly
        if (targetItem?._entityType === 'service') {
          targetServiceId = String(targetItem.id);
        } else if (targetIsServiceLocal && targetId.startsWith('service-')) {
          targetServiceId = targetId.replace('service-', '');
        }
        if (sourceItem?._entityType === 'service') {
          sourceServiceId = String(sourceItem.id);
        } else if (sourceIsServiceLocal && sourceId.startsWith('service-')) {
          sourceServiceId = sourceId.replace('service-', '');
        }
        const serviceIdToUse = targetServiceId || sourceServiceId;

        if (serviceIdToUse && !isNaN(serviceIdToUse)) {
          const response = await api.get(`/services/${serviceIdToUse}/items?workspace_id=${workspaceId}`);
          if (response.data && response.data.length > 0) {
            serviceItemsData.push(...response.data.map(item => ({
              ...item,
              serviceName: services.find(s => String(s.id) === serviceIdToUse)?.name || 'Service'
            })));
          }
        } else {
          for (const service of services) {
            try {
              const response = await api.get(`/services/${service.id}/items?workspace_id=${workspaceId}`);
              if (response.data && response.data.length > 0) {
                serviceItemsData.push(...response.data.map(item => ({
                  ...item,
                  serviceName: service.name
                })));
              }
            } catch (err) {
              // Skip if no items
            }
          }
        }
        setAvailableServiceItems(serviceItemsData);
      } catch (error) {
        console.error('Failed to fetch service items:', error);
      } finally {
        setIsLoadingServiceItems(false);
      }
    };

    fetchServiceItems();
  }, [show, workspaceId, targetType, sourceType, services, targetItem, sourceItem]);

  // Reset state when modal opens/closes or when targetType changes
  useEffect(() => {
    if (show) {
      setSelectedServiceItemIds([]);
      // Reset both target and source types based on which is the service
      if (sourceIsService && !targetIsService) {
        // Source is service, target is item - reset sourceType to 'service'
        setSourceType('service');
        setTargetType('service'); // not used but reset
      } else if (targetIsService && !sourceIsService) {
        // Target is service, source is item - reset targetType to 'service'
        setTargetType('service');
        setSourceType('service'); // not used but reset
      } else {
        setTargetType('service');
        setSourceType('service');
      }

      // If editing a connection with existing service item, pre-populate
      if (mode === 'edit' && existingServiceItemId) {
        setSelectedServiceItemIds([existingServiceItemId]);
        setTargetType('service_item');
      }
    }
  }, [show, mode, existingServiceItemId, sourceIsService, targetIsService]);

  const handleToggleServiceItem = (itemId) => {
    setSelectedServiceItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const connectionTypeInfo = getConnectionTypeInfo(selectedType);

  const getArrowIcon = () => {
    switch (connectionTypeInfo.propagation) {
      case 'both':
        return <ArrowRightLeft size={28} style={{ color: connectionTypeInfo.color }} />;
      case 'target_to_source':
      case 'source_to_target':
      default:
        return <ArrowRight size={28} style={{ color: connectionTypeInfo.color }} />;
    }
  };

  const handleSave = () => {
    // If target type is service_item and we have selected items, pass them
    // Also check sourceType when source is the service
    const isSourceService = sourceIsService && !targetIsService;
    const effectiveTargetType = isSourceService ? sourceType : targetType;
    const serviceItemData = effectiveTargetType === 'service_item' && selectedServiceItemIds.length > 0
      ? { selectedServiceItemIds, isSourceService }
      : null;
    onSave(selectedType, serviceItemData);
  };

  // Filter connection types based on search query
  const filteredConnectionTypes = Object.entries(CONNECTION_TYPES).filter(([key, type]) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      type.label.toLowerCase().includes(searchLower) ||
      key.toLowerCase().includes(searchLower) ||
      (type.description && type.description.toLowerCase().includes(searchLower))
    );
  });

  if (!sourceItem || !targetItem) return null;

  return (
    <>
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Edit Tipe Koneksi' : 'Buat Koneksi Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 flex-1 overflow-y-auto">
            {/* Visual Connection Preview */}
            <div className="bg-muted rounded-lg p-6">
              <div className="text-center text-sm text-muted-foreground mb-4 font-medium">
                VISUALISASI KONEKSI
              </div>

              <div className="flex items-center justify-center gap-4">
                {/* Source Item */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${
                      isGroup(sourceItem) ? '' : getDisplayColor(sourceItem)
                    }`}
                    style={
                      isGroup(sourceItem)
                        ? {
                            borderColor: sourceItem.color || getItemData(sourceItem).color,
                            backgroundColor: `${sourceItem.color || getItemData(sourceItem).color}20`,
                          }
                        : {}
                    }
                  >
                    {getItemIcon(sourceItem)}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{getItemData(sourceItem).name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{getItemTypeLabel(sourceItem)}</div>
                  </div>
                </div>

                {/* Connection Arrow */}
                <div className="flex flex-col items-center gap-2 px-4">
                  <div className="rounded-full p-2 bg-background border-2 shadow-md">
                    {getArrowIcon()}
                  </div>
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded text-white"
                    style={{ backgroundColor: connectionTypeInfo.color }}
                  >
                    {connectionTypeInfo.label}
                  </div>
                </div>

                {/* Target Item */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-16 h-16 rounded-lg flex items-center justify-center border-2 ${
                      isGroup(targetItem) ? '' : getDisplayColor(targetItem)
                    }`}
                    style={
                      isGroup(targetItem)
                        ? {
                            borderColor: targetItem.color || getItemData(targetItem).color,
                            backgroundColor: `${targetItem.color || getItemData(targetItem).color}20`,
                          }
                        : {}
                    }
                  >
                    {getItemIcon(targetItem)}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{getItemData(targetItem).name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{getItemTypeLabel(targetItem)}</div>
                  </div>
                </div>
              </div>

              {/* Description based on propagation rule */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {connectionTypeInfo.propagation === 'target_to_source' && (
                  <span>
                    <strong>{getItemData(sourceItem).name}</strong> {connectionTypeInfo.label.toLowerCase()} <strong>{getItemData(targetItem).name}</strong>
                  </span>
                )}
                {connectionTypeInfo.propagation === 'source_to_target' && (
                  <span>
                    <strong>{getItemData(sourceItem).name}</strong> {connectionTypeInfo.label.toLowerCase()} <strong>{getItemData(targetItem).name}</strong>
                  </span>
                )}
                {connectionTypeInfo.propagation === 'both' && (
                  <span>
                    <strong>{getItemData(sourceItem).name}</strong> dan <strong>{getItemData(targetItem).name}</strong> memiliki hubungan {connectionTypeInfo.label.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Service/Service Item Toggle - Only show when source or target is a service */}
            {showServiceOptions && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {sourceIsService && !targetIsService ? 'Pilih Sumber' : targetIsService && !sourceIsService ? 'Pilih Target' : 'Pilih Target'}
                </Label>
                <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                  {sourceIsService && !targetIsService ? (
                    /* Source is service - show source toggle */
                    <>
                      <Button
                        variant={sourceType === 'service' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSourceType('service')}
                        className="flex-1"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Service
                      </Button>
                      <Button
                        variant={sourceType === 'service_item' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSourceType('service_item')}
                        className="flex-1"
                      >
                        Service Item
                      </Button>
                    </>
                  ) : (
                    /* Target is service - show target toggle */
                    <>
                      <Button
                        variant={targetType === 'service' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTargetType('service')}
                        className="flex-1"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Ke Service
                      </Button>
                      <Button
                        variant={targetType === 'service_item' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTargetType('service_item')}
                        className="flex-1"
                      >
                        Ke Service Item
                      </Button>
                    </>
                  )}
                </div>

                {/* Service Item Selection - for target (when target is service, source is not) */}
                {targetIsService && !sourceIsService && targetType === 'service_item' && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pilih Service Items:</span>
                      {selectedServiceItemIds.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs" onClick={() => setSelectedServiceItemIds([])}>
                          ×
                        </Button>
                      )}
                    </div>
                    {isLoadingServiceItems ? (
                      <p className="text-center py-4 text-muted-foreground text-sm">Loading...</p>
                    ) : availableServiceItems.length > 0 ? (
                      <div className="space-y-1">
                        {availableServiceItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleServiceItem(item.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedServiceItemIds.includes(item.id)
                                ? 'bg-purple-50 border border-purple-500'
                                : 'hover:bg-secondary border border-transparent'
                            }`}
                          >
                            <Checkbox checked={selectedServiceItemIds.includes(item.id)} />
                            {getTypeIcon(item.type)}
                            <div className="flex-1">
                              <span className="text-sm">{item.name}</span>
                              <Badge variant="outline" className="ml-1 text-xs bg-purple-100 text-purple-700">
                                {item.serviceName}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-2">
                        Tidak ada service item tersedia
                      </p>
                    )}
                  </div>
                )}

                {/* Service Item Selection - for source (when source is service, target is not) */}
                {sourceIsService && !targetIsService && sourceType === 'service_item' && (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pilih Service Items (Sumber):</span>
                      {selectedServiceItemIds.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs" onClick={() => setSelectedServiceItemIds([])}>
                          ×
                        </Button>
                      )}
                    </div>
                    {isLoadingServiceItems ? (
                      <p className="text-center py-4 text-muted-foreground text-sm">Loading...</p>
                    ) : availableServiceItems.length > 0 ? (
                      <div className="space-y-1">
                        {availableServiceItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleServiceItem(item.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedServiceItemIds.includes(item.id)
                                ? 'bg-purple-50 border border-purple-500'
                                : 'hover:bg-secondary border border-transparent'
                            }`}
                          >
                            <Checkbox checked={selectedServiceItemIds.includes(item.id)} />
                            {getTypeIcon(item.type)}
                            <div className="flex-1">
                              <span className="text-sm">{item.name}</span>
                              <Badge variant="outline" className="ml-1 text-xs bg-purple-100 text-purple-700">
                                {item.serviceName}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm italic text-center py-2">
                        Tidak ada service item tersedia
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Service Items Display (for target) */}
                {targetIsService && !sourceIsService && targetType === 'service_item' && selectedServiceItemIds.length > 0 && (
                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-xs text-muted-foreground">Terpilih:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedServiceItemIds.map(id => {
                        const item = availableServiceItems.find(i => i.id === id);
                        return (
                          <Badge key={id} variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                            {item?.name || `#${id}`}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Service Items Display (for source) */}
                {sourceIsService && !targetIsService && sourceType === 'service_item' && selectedServiceItemIds.length > 0 && (
                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-xs text-muted-foreground">Terpilih (Sumber):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedServiceItemIds.map(id => {
                        const item = availableServiceItems.find(i => i.id === id);
                        return (
                          <Badge key={id} variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                            {item?.name || `#${id}`}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Connection Type Selector with Search */}
            <div className="space-y-3">
              <Label htmlFor="connection-type" className="text-base font-semibold">
                Pilih Tipe Koneksi
              </Label>

              <Button
                variant="outline"
                className="w-full justify-between"
                id="connection-type"
                onClick={() => setShowTypeSelector(true)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: connectionTypeInfo.color }}
                  />
                  <span>{connectionTypeInfo.label}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  {connectionTypeInfo.propagation === 'both' ? '↔' : '→'}
                </span>
              </Button>

              {/* Connection Type Description */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                <p className="text-sm">
                  <span className="font-semibold">Definisi: </span>
                  {getConnectionTypeInfo(selectedType).description || getConnectionTypeInfo(selectedType).label}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={targetType === 'service_item' && selectedServiceItemIds.length === 0}
            >
              {mode === 'edit' ? 'Simpan Perubahan' : 'Buat Koneksi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Separate Dialog for Connection Type Selection */}
      <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
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
                {filteredConnectionTypes.map(([key, type]) => (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={() => {
                      setSelectedType(key);
                      setShowTypeSelector(false);
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
                    {selectedType === key && (
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