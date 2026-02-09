import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const API_BASE_URL = 'http://localhost:5000';

export default function CustomNode({ data, id }) {
  const storage = data.storage || null;

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

  const isStatusCascaded = data.originalStatus === 'active' && data.status !== 'active';

  const services = data.services || [];

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

                  {/* Services Section in Popover */}
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
                            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 border"
                            title={`${service.name} (${service.status})`}
                          >
                            {service.icon_type === 'preset' ? (
                              <ServiceIcon name={service.icon_name} size={14} />
                            ) : (
                              <img
                                src={`${API_BASE_URL}${service.icon_path}`}
                                alt={service.name}
                                className="w-4 h-4 object-contain"
                              />
                            )}
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
                  <div
                    key={service.id}
                    className={`w-10 h-10 flex-shrink-0 rounded border overflow-hidden cursor-pointer
                      hover:border-primary hover:scale-110 transition-all
                      ${service.status === 'active' ? 'bg-green-50' : 'bg-red-50'}`}
                    title={`${service.name} (${service.status})`}
                    onClick={() => data.onServiceClick?.(service, data)}
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
                  </div>
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