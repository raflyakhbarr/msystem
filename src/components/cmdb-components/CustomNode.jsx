import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Server } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Info,
  HardDrive
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { getStatusBadgeClass, getStatusBorderClass, getStatusHandleColor } from '../../utils/cmdb-utils/flowHelpers';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';

export default function CustomNode({ data, id }) {
  const storage = data.storage || null;
  // Services are now rendered inside using ServiceAsNode component
  const services = data.services || [];
  const { socket } = useSocket();

  // Calculate dynamic height based on service count
  const calculateNodeHeight = () => {
    const baseHeight = 90; // Base height without services
    const servicesPerRow = 3;
    const serviceNodeHeight = 45;
    const gapY = 10;
    const serviceRowHeight = serviceNodeHeight + gapY; // 57px per row

    if (services.length === 0) {
      return baseHeight + 10; 
    }

    const serviceRows = Math.ceil(services.length / servicesPerRow);
    const serviceSectionHeight = serviceRows * serviceRowHeight;

    return baseHeight + 20 + serviceSectionHeight + 15; // +20 for header, +15 for bottom padding
  };

  const nodeHeight = calculateNodeHeight();

  // Calculate dynamic width based on service presence and item type
  const calculateNodeWidth = () => {
    const baseWidth = data.type === 'web_application' ? 220 : 150; // Width without services

    if (services.length === 0) {
      return baseWidth;
    }

    // With services: accommodate 3 services per row
    // Each service is 47px + 10px gap = 57px per service
    const serviceNodeWidth = 47;
    const serviceGap = 10;
    const servicesPerRow = 3;
    const horizontalPadding = 24; // 12px padding on each side

    const serviceSectionWidth = (servicesPerRow * serviceNodeWidth) + ((servicesPerRow - 1) * serviceGap);
    const totalWidth = Math.max(baseWidth, serviceSectionWidth + horizontalPadding);

    return totalWidth;
  };

  const nodeWidth = calculateNodeWidth();

  const handleColor = getStatusHandleColor(data.status);

  // Helper function to convert snake_case to Title Case
  const formatSnakeCase = (text) => {
    if (!text) return '';
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to count dead/inactive service items
  return (
    <>
      {/* Node UI */}
      <div
        className={`relative bg-card border-2 rounded shadow-md ${getStatusBorderClass(data.status)} pb-2`}
        style={{
          width: `${nodeWidth}px`,
          minWidth: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
          minHeight: `${nodeHeight}px`,
        }}
      >
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
                    <span className="text-foreground">{formatSnakeCase(data.type) || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Kategori:</span>
                    <span className="text-foreground">{formatSnakeCase(data.category) || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Lokasi:</span>
                    <span className="text-foreground">{data.location || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Tipe Env:</span>
                    <span className="text-foreground">{formatSnakeCase(data.env_type) || '—'}</span>

                    <span className="font-semibold text-muted-foreground">Status:</span>
                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBadgeClass(data.status)}`}>
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

                  {/* Services are now independent nodes - no longer shown in popover */}
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

                  {/* Services Section in Popover Footer */}
                  {services.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Server size={14} />
                          Services ({services.length}):
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {services.map((service) => {
                          const serviceStatusColor = service.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : service.status === 'inactive'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : service.status === 'maintenance'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200';

                          return (
                            <div
                              key={service.id}
                              className={`px-2 py-1 rounded border ${serviceStatusColor} text-[10px] font-medium truncate flex items-center gap-1`}
                              title={`${service.name} (${service.status})`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                service.status === 'active'
                                  ? 'bg-green-500'
                                  : service.status === 'inactive'
                                  ? 'bg-red-500'
                                  : service.status === 'maintenance'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-500'
                              }`} />
                              <span className="truncate">{service.name}</span>
                            </div>
                          );
                        })}
                      </div>
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
              <span className={`px-1.5 py-0.5 rounded ${getStatusBadgeClass(data.status)}`}>
                {data.status}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {getTypeIcon(data.type, { size: 20, className: 'text-foreground' })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{data.name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground">{formatSnakeCase(data.type) || ''}</div>
            </div>
          </div>

          {/* Services Section - Services are rendered as ReactFlow child nodes */}
          {services.length > 0 && (
            <hr className="border-t mt-5 border-gray-200 dark:border-gray-800" />
          )}
        </div>


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