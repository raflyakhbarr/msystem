import React, { useMemo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import ServiceIcon from './ServiceIcon';
import { API_BASE_URL } from '@/utils/cmdb-utils/constants';
import api from '@/services/api';

const STATUS_COLORS = {
  active: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500'
  },
  inactive: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500'
  },
  maintenance: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500'
  },
  disabled: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    dot: 'bg-gray-500'
  },
  decommissioned: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-600',
    dot: 'bg-gray-400'
  }
};

/**
 * ServiceAsNode - Component untuk menampilkan Service sebagai ReactFlow Node
 *
 * Props:
 * - data.service: Service object dari API
 * - data.onServiceClick: Callback ketika node diklik
 * - data.onServiceItemsClick: Callback ketika tombol service items diklik
 * - data.cmdbItemName: Nama parent CMDB item (untuk tooltip)
 * - data.width: Lebar node (default: 120)
 * - data.height: Tinggi node (default: 80)
 * - data.isInsideItem: Apakah service node berada di dalam CMDB item
 * - data.selected: Apakah node sedang dipilih
 */
export default function ServiceAsNode({ data, selected }) {
  const { service, onServiceClick, onServiceItemsClick, cmdbItemName, isInsideItem } = data;

  const statusConfig = STATUS_COLORS[service.status] || STATUS_COLORS.active;

  // Calculate service items count for badge
  const serviceItemsCount = service.service_items_count || 0;

  // Node dimensions
  const width = data.width || 120;
  const height = data.height || 80;

  // State for service items (for hover card and badge)
  const [serviceItems, setServiceItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [fetchedServiceId, setFetchedServiceId] = useState(null);

  // Fetch service items data on mount (for badge display)
  useEffect(() => {
    const fetchServiceItemsOnMount = async () => {
      if (serviceItemsCount === 0) return;

      const workspaceId = data.workspaceId || data.service?.workspace_id;
      if (!workspaceId) {
        console.warn('No workspaceId found for service');
        return;
      }

      setLoadingItems(true);
      setFetchedServiceId(service.id);

      try {
        const res = await api.get(`/service-items/${service.id}/items?workspace_id=${workspaceId}`);
        const items = res.data || [];
        setServiceItems(items);
      } catch (err) {
        console.error('Failed to fetch service items:', err);
        setServiceItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchServiceItemsOnMount();
  }, [service.id, serviceItemsCount, data.workspaceId, data.service?.workspace_id]);

  // Calculate problematic items (inactive + maintenance) for badge
  const problematicItemsCount = useMemo(() => {
    if (serviceItems.length === 0) return 0;
    return serviceItems.filter(item =>
      item.status === 'inactive' || item.status === 'maintenance'
    ).length;
  }, [serviceItems]);

  // Check if all items are active (no badge needed)
  const allItemsActive = useMemo(() => {
    if (serviceItems.length === 0) return true; // No items = no badge
    return serviceItems.every(item => item.status === 'active');
  }, [serviceItems]);

  // Handle color based on status
  const handleColor = useMemo(() => {
    switch (service.status) {
      case 'inactive': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      case 'disabled': return '#6b7280';
      case 'decommissioned': return '#9ca3af';
      default: return '#10b981';
    }
  }, [service.status]);

  const handleClick = (e) => {
    e.stopPropagation();
    onServiceClick?.(service);
  };

  const handleItemsClick = (e) => {
    e.stopPropagation();
    onServiceItemsClick?.(service);
  };

  // Fetch service items on hover
  const handleMouseEnter = async () => {
    // Skip if already fetched for this service
    if (fetchedServiceId === service.id) {
      return;
    }

    setLoadingItems(true);
    setFetchedServiceId(service.id);

    try {
      const workspaceId = data.workspaceId || data.service?.workspace_id;
      if (!workspaceId) {
        console.warn('No workspaceId found for service');
        return;
      }

      const res = await api.get(`/service-items/${service.id}/items?workspace_id=${workspaceId}`);
      const items = res.data || [];
      setServiceItems(items);
    } catch (err) {
      console.error('Failed to fetch service items:', err);
      setServiceItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Different styling for inside vs outside item
  if (isInsideItem) {
    // SMALL MODE - Inside CMDB item (55x55px)
    return (
      <HoverCard openDelay={300} closeDelay={200}>
        <HoverCardTrigger asChild>
          <div
            className={`
              relative bg-white border-2 rounded-md shadow-sm
              transition-all duration-200 cursor-pointer
              hover:shadow-md hover:scale-110
              ${statusConfig.bg} ${statusConfig.border}
              ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
            `}
            style={{
              width: `${width}px`,
              height: `${height}px`
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            title={`${service.name} (${service.status})`}
          >
            {/* Service Icon - Centered */}
            {service.icon_type === 'preset' ? (
              <div className="w-full h-full flex items-center justify-center p-1">
                <ServiceIcon name={service.icon_name} size={24} />
              </div>
            ) : (
              <img
                src={`${API_BASE_URL}${service.icon_path}`}
                alt={service.name}
                className="w-full h-full object-contain p-1"
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

            {/* Service Items Badge - Mini */}
            {/* Only show badge if there are problematic items (inactive/maintenance) */}
            {!allItemsActive && problematicItemsCount > 0 && (
              <div
                className="absolute -top-1 -right-1 min-w-[12px] h-3 px-0.5
                          bg-yellow-500 text-white font-bold text-[8px]
                          rounded-full dark:border-gray-800
                          flex items-center justify-center z-20
                          shadow-sm"
              >
                {problematicItemsCount > 99 ? '9+' : problematicItemsCount}
              </div>
            )}

            {/* Flow Handles - All 4 directions for small mode */}
            {/* Top */}
            <Handle
              type="target"
              position={Position.Top}
              id="target-top"
              style={{
                background: handleColor,
                left: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />
            <Handle
              type="source"
              position={Position.Top}
              id="source-top"
              style={{
                background: handleColor,
                left: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />

            {/* Right */}
            <Handle
              type="target"
              position={Position.Right}
              id="target-right"
              style={{
                background: handleColor,
                top: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="source-right"
              style={{
                background: handleColor,
                top: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />

            {/* Bottom */}
            <Handle
              type="target"
              position={Position.Bottom}
              id="target-bottom"
              style={{
                background: handleColor,
                left: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="source-bottom"
              style={{
                background: handleColor,
                left: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />

            {/* Left */}
            <Handle
              type="target"
              position={Position.Left}
              id="target-left"
              style={{
                background: handleColor,
                top: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
            />
            <Handle
              type="source"
              position={Position.Left}
              id="source-left"
              style={{
                background: handleColor,
                top: '50%',
                width: 6,
                height: 6,
                border: '1px solid hsl(var(--background))',
                opacity: 0
              }}
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
            {loadingItems ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-transparent"></div>
                <p className="text-xs text-muted-foreground mt-2">Loading items...</p>
              </div>
            ) : (
              /* Service Items by Status */
              (() => {
                if (serviceItems.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No service items</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to view details
                      </p>
                    </div>
                  );
                }

                const activeItems = serviceItems.filter(item => item.status === 'active');
                const maintenanceItems = serviceItems.filter(item => item.status === 'maintenance');
                const disabledItems = serviceItems.filter(item => item.status === 'disabled');
                const inactiveItems = serviceItems.filter(item => item.status === 'inactive');

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
                      Total: {serviceItems.length} item{serviceItems.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }
}
