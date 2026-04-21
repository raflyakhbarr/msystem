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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getConnectionTypeInfo, CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import api from '@/services/api';
import {
  Server,
  Database,
  Network,
  Monitor,
  GitBranch,
  Shield,
  Wifi,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Search,
  Check,
  Layers,
  Briefcase,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function QuickConnectionModal({
  show,
  sourceItem,
  targetItem,
  onClose,
  onSave,
  mode = 'create', // 'create' or 'edit'
  existingConnectionType = null,
  workspaceId = null,
  nodes = [], // Tambah nodes prop untuk checking node types
}) {
  const [selectedType, setSelectedType] = useState('depends_on');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Service item selection states
  const [isLayananConnection, setIsLayananConnection] = useState(false);
  const [cmdbItemsWithServices, setCmdbItemsWithServices] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceItem, setSelectedServiceItem] = useState(null);
  const [propagationEnabled, setPropagationEnabled] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [connectionTargetType, setConnectionTargetType] = useState('service_item'); // 'service' or 'service_item'
  const [selectedDirectService, setSelectedDirectService] = useState(null);

  useEffect(() => {
    if (show) {
      setSelectedType(existingConnectionType || 'depends_on');
      setSearchQuery('');

      // Check if this is a layanan connection
      checkLayananConnection();
    }
  }, [show, existingConnectionType]);

  // Helper function to get actual item data (handles both ReactFlow nodes and plain objects)
  const getItemData = (item) => {
    // ReactFlow nodes have data in .data property
    if (item && item.data && typeof item.data === 'object') {
      return item.data;
    }
    // Groups and plain objects use properties directly
    return item;
  };

  // Helper function to check if item is a group
  const isGroup = (item) => item && (item.color !== undefined || item.data?.color !== undefined);

  // Helper function to get item ID
  const getItemId = (item) => {
    // ReactFlow nodes have id directly
    if (item && item.id) {
      return item.id;
    }
    return null;
  };

  // Helper function to check if item is a layanan node
  const isLayananNode = (item) => {
    // Prioritaskan cek _entityType (dari connect handler)
    if (item?._entityType === 'layanan') {
      return true;
    }

    // Cek node type
    if (item?.type === 'layanan') {
      return true;
    }

    // Cek data type
    if (item?.data?.type === 'layanan') {
      return true;
    }

    // Cek ID dengan prefix layanan-
    const id = getItemId(item);
    if (id && String(id).startsWith('layanan-')) {
      return true;
    }

    // Cek di nodes array berdasarkan ID
    if (id && nodes && nodes.length > 0) {
      const node = nodes.find(n => String(n.id) === String(id));
      if (node && node.type === 'layanan') {
        return true;
      }
    }

    return false;
  };

  // Check if connection involves layanan nodes and load CMDB items with services
  const checkLayananConnection = async () => {
    const isSourceLayanan = isLayananNode(sourceItem);
    const isTargetLayanan = isLayananNode(targetItem);

    if ((isSourceLayanan || isTargetLayanan) && workspaceId) {
      setIsLayananConnection(true);
      await fetchCmdbItemsWithServices();
    } else {
      setIsLayananConnection(false);
    }
  };

  if (!sourceItem || !targetItem) return null;

  // Fetch CMDB items with their services
  const fetchCmdbItemsWithServices = async () => {
    if (!workspaceId) return;

    setLoadingServices(true);
    try {
      const response = await api.get('/cmdb', { params: { workspace_id: workspaceId } });

      // Fetch services for each CMDB item
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

  const getItemIcon = (item) => {
    const iconProps = { size: 32, className: 'text-foreground' };
    const data = getItemData(item);

    // Check if it's a layanan node
    if (isLayananNode(item)) {
      return getLayananIcon();
    }

    // Check if it's a group
    if (isGroup(item)) {
      return <Layers {...iconProps} />;
    }

    // Otherwise it's an item
    switch (data.type) {
      case 'server': return <Server {...iconProps} />;
      case 'database': return <Database {...iconProps} />;
      case 'switch': return <Network {...iconProps} />;
      case 'workstation': return <Monitor {...iconProps} />;
      case 'hub': return <GitBranch {...iconProps} />;
      case 'firewall': return <Shield {...iconProps} />;
      case 'router': return <Wifi {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const getDisplayColor = (item) => {
    const data = getItemData(item);

    // For groups, use their color
    if (isGroup(item)) {
      const groupColor = item.color || data.color;
      return `border-2 style={{ borderColor: '${groupColor}' }}`;
    }

    // For items, use status color
    const statusColor = {
      'active': 'bg-green-500 border-green-600',
      'inactive': 'bg-red-500 border-red-600',
      'maintenance': 'bg-yellow-500 border-yellow-600',
      'decommissioned': 'bg-gray-500 border-gray-600',
    };
    return statusColor[data.status] || 'bg-gray-500 border-gray-600';
  };

  const getItemTypeLabel = (item) => {
    if (isLayananNode(item)) {
      return 'Layanan';
    }
    const data = getItemData(item);
    return isGroup(item) ? 'Group' : (data.type || 'Item');
  };

  const connectionTypeInfo = getConnectionTypeInfo(selectedType);

  const getArrowIcon = () => {
    switch (connectionTypeInfo.propagation) {
      case 'both':
        // Bidirectional - double arrow
        return <ArrowRightLeft size={28} style={{ color: connectionTypeInfo.color }} />;
      case 'target_to_source':
      case 'source_to_target':
      default:
        // Selalu arrow ke kanan (source → target) untuk semua tipe kecuali 'both'
        return <ArrowRight size={28} style={{ color: connectionTypeInfo.color }} />;
    }
  };

  const handleSave = () => {
    // If this is a layanan connection, validate selection based on target type
    if (isLayananConnection) {
      if (connectionTargetType === 'service_item') {
        // Connecting to service item
        if (!selectedService || !selectedServiceItem) {
          alert('Silakan pilih service item terlebih dahulu untuk koneksi layanan.');
          return;
        }
        onSave(selectedType, {
          connectionTargetType: 'service_item',
          serviceId: selectedService.id,
          serviceItemId: selectedServiceItem.id,
          propagationEnabled: propagationEnabled,
        });
      } else {
        // Connecting to service directly
        if (!selectedDirectService) {
          alert('Silakan pilih service terlebih dahulu untuk koneksi layanan.');
          return;
        }
        onSave(selectedType, {
          connectionTargetType: 'service',
          serviceId: selectedDirectService.id,
          propagationEnabled: propagationEnabled,
        });
      }
    } else {
      onSave(selectedType, null);
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

  const getLayananIcon = () => {
    return <Briefcase size={32} className="text-purple-600" />;
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

  return (
    <>
      <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Tipe Koneksi' : 'Buat Koneksi Baru'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                    isGroup(sourceItem) || isLayananNode(sourceItem) ? '' : getDisplayColor(sourceItem)
                  }`}
                  style={
                    isGroup(sourceItem)
                      ? {
                          borderColor:
                            sourceItem.color || getItemData(sourceItem).color,
                          backgroundColor: `${sourceItem.color || getItemData(sourceItem).color}20`,
                        }
                      : isLayananNode(sourceItem)
                      ? {
                          borderColor: '#a855f7',
                          backgroundColor: 'rgba(168, 85, 247, 0.1)',
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
                    isGroup(targetItem) || isLayananNode(targetItem) ? '' : getDisplayColor(targetItem)
                  }`}
                  style={
                    isGroup(targetItem)
                      ? {
                          borderColor:
                            targetItem.color || getItemData(targetItem).color,
                          backgroundColor: `${targetItem.color || getItemData(targetItem).color}20`,
                        }
                      : isLayananNode(targetItem)
                      ? {
                          borderColor: '#a855f7',
                          backgroundColor: 'rgba(168, 85, 247, 0.1)',
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

          {/* Service Item Selection (Only for Layanan connections) */}
          {isLayananConnection && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Pilih Service di CMDB Item
                <span className="text-red-500 ml-1">*</span>
              </Label>

              {/* Connection Target Type Selector */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 border rounded">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="connect-service"
                    name="connection-target"
                    value="service"
                    checked={connectionTargetType === 'service'}
                    onChange={(e) => {
                      setConnectionTargetType(e.target.value);
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
                    name="connection-target"
                    value="service_item"
                    checked={connectionTargetType === 'service_item'}
                    onChange={(e) => {
                      setConnectionTargetType(e.target.value);
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
                                {connectionTargetType === 'service' ? (
                                  // Direct Service Selection
                                  <div
                                    className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                                      selectedDirectService?.id === service.id
                                        ? 'bg-purple-50 border-2 border-purple-500'
                                        : ''
                                    }`}
                                    onClick={() => {
                                      setSelectedDirectService(service);
                                      setSelectedService(null);
                                      setSelectedServiceItem(null);
                                    }}
                                  >
                                    <div
                                      className={`w-4 h-4 border rounded flex items-center justify-center ${
                                        selectedDirectService?.id === service.id
                                          ? 'bg-purple-500 border-purple-500'
                                          : 'border-gray-300'
                                      }`}
                                    >
                                      {selectedDirectService?.id === service.id && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                    <Briefcase className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium">{service.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ({service.items?.length || 0} items)
                                    </span>
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
                                          service.items.map((serviceItem) => (
                                            <div
                                              key={serviceItem.id}
                                              className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer ${
                                                selectedServiceItem?.id === serviceItem.id
                                                  ? 'bg-blue-50 border-2 border-blue-500'
                                                  : ''
                                              }`}
                                              onClick={() =>
                                                handleSelectServiceItem(service, serviceItem)
                                              }
                                            >
                                              <div
                                                className={`w-4 h-4 border rounded flex items-center justify-center ${
                                                  selectedServiceItem?.id === serviceItem.id
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-gray-300'
                                                }`}
                                              >
                                                {selectedServiceItem?.id === serviceItem.id && (
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
                                            </div>
                                          ))
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
              {connectionTargetType === 'service' && selectedDirectService && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="text-sm">
                    <span className="font-medium">Selected Service:</span> {selectedDirectService.name}
                  </div>
                </div>
              )}

              {connectionTargetType === 'service_item' && selectedService && selectedServiceItem && (
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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLayananConnection &&
              ((connectionTargetType === 'service_item' && (!selectedService || !selectedServiceItem)) ||
               (connectionTargetType === 'service' && !selectedDirectService))
            }
            className="bg-blue-600 hover:bg-blue-700"
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
