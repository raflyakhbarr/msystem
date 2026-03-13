import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Info,
  Server,
  Database,
  Network,
  Monitor,
  GitBranch,
  Shield,
  Wifi,
  HardDrive,
  Plus
} from 'lucide-react';
import ServiceIcon from './ServiceIcon';
import { API_BASE_URL } from '../../utils/cmdb-utils/constants';
import api from '@/services/api';
import { io } from 'socket.io-client';

export default function CustomNode({ data, id }) {
  const storage = data.storage || null;
  const services = data.services || [];

  // Local state for service items (for hover card)
  const [serviceItemsMap, setServiceItemsMap] = useState({});
  const [fetchingServiceId, setFetchingServiceId] = useState(null);
  // Store pending status updates for items not yet fetched
  const pendingStatusUpdatesRef = useRef({});

  // Use ref to always get latest serviceItemsMap (avoid stale closures)
  const serviceItemsMapRef = useRef(serviceItemsMap);
  useEffect(() => {
    serviceItemsMapRef.current = serviceItemsMap;
  }, [serviceItemsMap]);

  // Socket.io connection for real-time service item updates
  useEffect(() => {
    if (!data.workspaceId) return;

    const socket = io(API_BASE_URL, {
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected for service items hover in node:', data.label);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected from service items hover');
    });

    // Listen for service item status updates
    socket.on('service_item_status_update', (updateData) => {
      const { serviceItemId, newStatus, workspaceId } = updateData;

      // Update the service item in our local state
      setServiceItemsMap(prev => {
        const updated = { ...prev };
        let itemFound = false;

        // Loop through all services' items
        Object.keys(updated).forEach(serviceId => {
          const items = updated[serviceId];
          if (Array.isArray(items)) {
            // Find and update the specific item
            const itemIndex = items.findIndex(item => item.id === parseInt(serviceItemId));
            if (itemIndex !== -1) {
              itemFound = true;
              updated[serviceId] = [
                ...items.slice(0, itemIndex),
                { ...items[itemIndex], status: newStatus },
                ...items.slice(itemIndex + 1)
              ];
            }
          }
        });

        // If item not found, store as pending update
        if (!itemFound) {
          pendingStatusUpdatesRef.current[serviceItemId] = newStatus;
        }

        return updated;
      });
    });

    // Listen for service item updates (position, name, etc.)
    socket.on('service_item_update', (updateData) => {
      const { serviceItemId, workspaceId } = updateData;

      // Only update if this is for our workspace
      if (workspaceId !== data.workspaceId) {
        return;
      }

      // Use ref to get latest serviceItemsMap
      const currentMap = serviceItemsMapRef.current;

      // Refetch the service items for the affected service
      // Find which service this item belongs to
      Object.keys(currentMap).forEach(serviceId => {
        const items = currentMap[serviceId];
        if (Array.isArray(items) && items.find(item => item.id === serviceItemId)) {  
          api.get(`/service-items/${serviceId}/items?workspace_id=${data.workspaceId}`)
            .then(response => {
              if (Array.isArray(response.data)) {
                setServiceItemsMap(prev => ({
                  ...prev,
                  [serviceId]: response.data
                }));
              }
            })
            .catch(err => console.error('Failed to refresh service items:', err));
        }
      });
    });

    return () => {
      socket.off('service_item_status_update');
      socket.off('service_item_update');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [data.workspaceId, data.label]);

  // Fetch service items when hover opens
  const handleFetchServiceItems = async (serviceId) => {
    // Check if already fetched
    if (serviceItemsMap[serviceId]) {
      return;
    }

    setFetchingServiceId(serviceId);

    try {
      const response = await api.get(`/service-items/${serviceId}/items?workspace_id=${data.workspaceId}`);
      let items = response.data;

      // Ensure items is always an array
      if (Array.isArray(items)) {
        // Apply any pending status updates
        const pendingUpdates = pendingStatusUpdatesRef.current;
        if (Object.keys(pendingUpdates).length > 0) {
          items = items.map(item => {
            // Check both string and number versions of the ID
            const pendingStatus = pendingUpdates[item.id] || pendingUpdates[String(item.id)];
            if (pendingStatus) {
              return { ...item, status: pendingStatus };
            }
            return item;
          });
        }

        setServiceItemsMap(prev => ({
          ...prev,
          [serviceId]: items
        }));

        // Also update the parent node data for persistence
        if (data.onFetchServiceItems) {
          data.onFetchServiceItems(serviceId);
        }
      } else {
        console.error('Invalid response: expected array, got', typeof items);
        setServiceItemsMap(prev => ({
          ...prev,
          [serviceId]: []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch service items:', err);
      setServiceItemsMap(prev => ({
        ...prev,
        [serviceId]: []
      }));
    } finally {
      setFetchingServiceId(null);
    }
  };

  const getIconComponent = (type) => {
    const iconProps = { size: 20, className: 'text-foreground' };

    switch (type) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white border-green-600 dark:bg-green-600 dark:border-green-700';
      case 'inactive': return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      case 'maintenance': return 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-700';
      case 'decommissioned': return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      default: return 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-700';
    }
  };

  const getNodeBorderColor = (status) => {
    switch (status) {
      case 'active': return 'border-green-500 dark:border-green-400';
      case 'inactive': return 'border-red-500 dark:border-red-400';
      case 'maintenance': return 'border-yellow-500 dark:border-yellow-400';
      case 'decommissioned': return 'border-red-500 dark:border-red-400';
      default: return 'border-gray-500 dark:border-gray-400';
    }
  };

  const getHandleColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'maintenance': return '#eab308';
      case 'inactive': return '#ef4444';
      case 'decommissioned': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleColor = getHandleColor(data.status);

  return (
    <>
      {/* Node UI */}
      <div className={`relative bg-card border-2 rounded shadow-md min-w-[140px] ${getNodeBorderColor(data.status)}`}>
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          {/* Info/Detail Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                onClick={(e) => e.stopPropagation()}
                variant="default"
                size="icon"
                className="h-5 w-5 p-0 bg-gray-900 hover:bg-gray-700 text-white rounded-full shadow-lg"
              >
                <Info className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="start" side="right">
              <div className="space-y-3">
                <h3 className="text-lg font-bold border-b border-border pb-2">Detail Node</h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1.5">
                    <span className="font-semibold text-muted-foreground">Nama:</span>
                    <span className="text-foreground">{data.name || '—'}</span>

                    <span className="font-semibold text-muted-foreground">IP Address:</span>
                    <span className="text-foreground font-mono text-xs">{data.ip || '—'}</span>

                    {data.domain && (
                      <>
                        <span className="font-semibold text-muted-foreground">Domain:</span>
                        <span className="text-foreground font-mono text-xs">{data.domain}</span>
                      </>
                    )}

                    {data.port && (
                      <>
                        <span className="font-semibold text-muted-foreground">Port:</span>
                        <span className="text-foreground font-mono text-xs">{data.port}</span>
                      </>
                    )}

                    <span className="font-semibold text-muted-foreground">Tipe:</span>
                    <span className="text-foreground capitalize">{data.type || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Kategori:</span>
                    <span className="text-foreground capitalize">{data.category || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Lokasi:</span>
                    <span className="text-foreground">{data.location || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Tipe Env:</span>
                    <span className="text-foreground capitalize">{data.env_type || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Status:</span>
                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(data.status)}`}>
                        {data.status || '—'}
                      </span>
                    </span>
                  </div>

                  {data.description && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="font-semibold text-muted-foreground mb-1">Deskripsi:</p>
                      <p className="text-foreground bg-muted p-2 rounded text-xs leading-relaxed">
                        {data.description}
                      </p>
                    </div>
                  )}

                  {/* Services Section */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-muted-foreground">Services:</p>
                      {data.onAddService && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            data.onAddService?.({ ...data, id });
                          }}
                          size="sm"
                          className="h-6 px-2 py-0 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus size={12} />
                          Add Service
                        </Button>
                      )}
                    </div>
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 border relative"
                            title={`${service.name} (${service.status})`}
                          >
                            <div className="relative">
                              {service.icon_type === 'preset' ? (
                                <ServiceIcon name={service.icon_name} size={14} />
                              ) : (
                                <img
                                  src={`${API_BASE_URL}${service.icon_path}`}
                                  alt={service.name}
                                  className="w-4 h-4 object-contain"
                                />
                              )}
                              {/* Status Indicator Dot */}
                              <div
                                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white shadow-sm ${
                                  service.status === 'active' ? 'bg-green-500' :
                                  service.status === 'inactive' ? 'bg-red-500' :
                                  service.status === 'maintenance' ? 'bg-yellow-500' :
                                  service.status === 'disabled' ? 'bg-gray-500' :
                                  'bg-gray-500'
                                }`}
                              />
                            </div>
                            <span className="text-xs">{service.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No services</p>
                    )}
                  </div>

                  {/* Storage Section in Popover */}
                  {storage && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1">
                          <HardDrive size={14} />
                          Storage:
                        </p>
                      </div>

                      {/* Storage Summary */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold text-sm">{storage.total} {storage.unit}</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <p className="text-xs text-muted-foreground">Used</p>
                          <p className="font-semibold text-sm text-blue-600">{storage.used} {storage.unit}</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-xs text-muted-foreground">Free</p>
                          <p className="font-semibold text-sm text-green-600">
                            {storage.total - storage.used} {storage.unit}
                          </p>
                        </div>
                      </div>

                      {/* Storage Progress Bar - Total Storage */}
                      {storage.total > 0 && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Total Storage Usage</span>
                            <span className="text-xs text-muted-foreground">
                              {((storage.used / storage.total) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={(storage.used / storage.total) * 100}
                            className="h-3"
                          />
                          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>{storage.used} {storage.unit} Terpakai</span>
                            <span>{storage.total - storage.used} {storage.unit} Bebas</span>
                          </div>
                        </div>
                      )}

                      {/* Storage Partitions */}
                      {storage.partitions && storage.partitions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Partitions:</p>
                          <div className="space-y-2">
                            {storage.partitions.map((partition, idx) => {
                              const usedPercent = (partition.used / partition.total) * 100;
                              const isWarning = usedPercent > 80;
                              const isCritical = usedPercent > 90;

                              return (
                                <div key={idx} className="p-2 bg-muted rounded text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold">{partition.name}</span>
                                    <span className={`font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
                                      {partition.used}/{partition.total} {partition.unit}
                                    </span>
                                  </div>
                                  <Progress
                                    value={usedPercent}
                                    className={`h-2 ${isCritical ? '[&>[data-progress]:bg-red-500]' : isWarning ? '[&>[data-progress]:bg-yellow-500]' : '[&>[data-progress]:bg-blue-500]'}`}
                                  />
                                  <div className="flex justify-between mt-1 text-muted-foreground">
                                    <span>Used: {usedPercent.toFixed(1)}%</span>
                                    <span>Free: {(100 - usedPercent).toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Node Content */}
        <div className="p-2 pt-6">
          {data.status && (
            <div className="text-xs text-center mb-2">
              <span className={`px-1.5 py-0.5 rounded ${getStatusColor(data.status)}`}>
                {data.status}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {getIconComponent(data.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{data.name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground capitalize">{data.type || ''}</div>
            </div>
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {services.map((service) => (
                  <HoverCard key={service.id} openDelay={300} closeDelay={200}>
                    <HoverCardTrigger asChild>
                      <div
                        className={`w-10 h-10 flex-shrink-0 rounded border overflow-hidden cursor-pointer relative
                          hover:border-primary hover:scale-110 transition-all
                          ${service.status === 'active' ? 'bg-green-50 border-green-200' :
                            service.status === 'disabled' ? 'bg-gray-50 border-gray-200' :
                            service.status === 'maintenance' ? 'bg-yellow-50 border-yellow-200' :
                            service.status === 'inactive' ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'}`}
                        title={`${service.name} (${service.status})`}
                        onClick={() => data.onServiceClick?.(service, data)}
                        onMouseEnter={() => handleFetchServiceItems(service.id)}
                      >
                        {service.icon_type === 'preset' ? (
                          <div className="w-full h-full flex items-center justify-center p-1">
                            <ServiceIcon name={service.icon_name} size={32} />
                          </div>
                        ) : (
                          <img
                            src={`${API_BASE_URL}${service.icon_path}`}
                            alt={service.name}
                            className="w-full h-full object-contain"
                            crossOrigin="anonymous"
                          />
                        )}
                        {/* Status Indicator Dot */}
                        <div
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                            service.status === 'active' ? 'bg-green-500' :
                            service.status === 'inactive' ? 'bg-red-500' :
                            service.status === 'maintenance' ? 'bg-yellow-500' :
                            service.status === 'disabled' ? 'bg-gray-500' :
                            'bg-gray-500'
                          }`}
                        />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-72 z-50"
                      align="start"
                      side="right"
                    >
                      <div className="space-y-3">
                        {/* Service Header */}
                        <div className="flex items-center gap-2 pb-2 border-b">
                          {service.icon_type === 'preset' ? (
                            <div className="w-8 h-8 bg-gray-100 rounded border flex items-center justify-center">
                              <ServiceIcon name={service.icon_name} size={20} />
                            </div>
                          ) : (
                            <img
                              src={`${API_BASE_URL}${service.icon_path}`}
                              alt={service.name}
                              className="w-8 h-8 object-contain bg-gray-100 rounded border"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{service.name}</p>
                            <p className="text-xs text-muted-foreground">Service Items</p>
                          </div>
                        </div>

                        {/* Loading State */}
                        {fetchingServiceId === service.id ? (
                          <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-transparent"></div>
                            <p className="text-xs text-muted-foreground mt-2">Loading items...</p>
                          </div>
                        ) : (
                          /* Service Items by Status */
                          (() => {
                            const items = serviceItemsMap[service.id] || [];

                            if (items.length === 0) {
                              return (
                                <div className="text-center py-4">
                                  <p className="text-sm text-muted-foreground">No service items</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Click to view details
                                  </p>
                                </div>
                              );
                            }

                            const activeItems = items.filter(item => item.status === 'active');
                            const maintenanceItems = items.filter(item => item.status === 'maintenance');
                            const disabledItems = items.filter(item => item.status === 'disabled');
                            const inactiveItems = items.filter(item => item.status === 'inactive');

                            return (
                              <div className="space-y-2">
                                {/* Active Items */}
                                {activeItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span className="text-xs font-medium text-green-700">
                                        Active ({activeItems.length})
                                      </span>
                                    </div>
                                    <div className="space-y-1 pl-4">
                                      {activeItems.map(item => (
                                        <div key={item.id} className="text-xs text-gray-700 truncate py-0.5">
                                          • {item.name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Maintenance Items */}
                                {maintenanceItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                      <span className="text-xs font-medium text-yellow-700">
                                        Maintenance ({maintenanceItems.length})
                                      </span>
                                    </div>
                                    <div className="space-y-1 pl-4">
                                      {maintenanceItems.map(item => (
                                        <div key={item.id} className="text-xs text-gray-700 truncate py-0.5">
                                          • {item.name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Disabled Items */}
                                {disabledItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                                      <span className="text-xs font-medium text-gray-700">
                                        Disabled ({disabledItems.length})
                                      </span>
                                    </div>
                                    <div className="space-y-1 pl-4">
                                      {disabledItems.map(item => (
                                        <div key={item.id} className="text-xs text-gray-700 truncate py-0.5">
                                          • {item.name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Inactive Items */}
                                {inactiveItems.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                      <span className="text-xs font-medium text-red-700">
                                        Inactive ({inactiveItems.length})
                                      </span>
                                    </div>
                                    <div className="space-y-1 pl-4">
                                      {inactiveItems.map(item => (
                                        <div key={item.id} className="text-xs text-gray-700 truncate py-0.5">
                                          • {item.name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Summary */}
                                <div className="pt-2 border-t text-xs text-muted-foreground">
                                  Total: {items.length} item{items.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flow Handles - Multiple directions */}
        {/* Top handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="target-top"
          style={{
            background: handleColor,
            left: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />
        <Handle
          type="source"
          position={Position.Top}
          id="source-top"
          style={{
            background: handleColor,
            left: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />

        {/* Bottom handles */}
        <Handle
          type="target"
          position={Position.Bottom}
          id="target-bottom"
          style={{
            background: handleColor,
            left: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-bottom"
          style={{
            background: handleColor,
            left: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />

        {/* Left handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="target-left"
          style={{
            background: handleColor,
            top: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="source-left"
          style={{
            background: handleColor,
            top: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />

        {/* Right handles */}
        <Handle
          type="target"
          position={Position.Right}
          id="target-right"
          style={{
            background: handleColor,
            top: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="source-right"
          style={{
            background: handleColor,
            top: '50%',
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--background))'
          }}
        />
      </div>
    </>
  );
}