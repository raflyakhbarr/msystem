import { Handle, Position } from 'reactflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Info,
  Server,
  Database,
  Network,
  Monitor,
  Shield,
  Wifi,
  Globe,
  Laptop,
  Smartphone,
  Cloud,
  Globe2,
  HardDrive,
  FileText,
  Printer,
  Users,
  Mail,
  Settings,
  Layout,
  Layers
} from 'lucide-react';
import ServiceIcon from './ServiceIcon';
import { API_BASE_URL } from '../../utils/cmdb-utils/constants';

export default function CustomServiceNode({ data, id }) {
  const parentService = data.parentService || null;
  const isExternal = data.isExternal || false;
  const externalSource = data.externalSource || null;

  const getIconComponent = (type) => {
    const iconProps = { size: 20, className: 'text-foreground' };

    switch (type) {
      case 'server': return <Server {...iconProps} />;
      case 'database': return <Database {...iconProps} />;
      case 'switch': return <Network {...iconProps} />;
      case 'workstation': return <Monitor {...iconProps} />;
      case 'firewall': return <Shield {...iconProps} />;
      case 'router': return <Wifi {...iconProps} />;
      case 'web_application': return <Globe {...iconProps} />;
      case 'desktop_application': return <Laptop {...iconProps} />;
      case 'mobile_application': return <Smartphone {...iconProps} />;
      case 'api_service': return <Cloud {...iconProps} />;
      case 'microservice': return <Layers {...iconProps} />;
      case 'container': return <Layout {...iconProps} />;
      case 'load_balancer': return <Wifi {...iconProps} />;
      case 'proxy_server': return <Globe2 {...iconProps} />;
      case 'application_server': return <Server {...iconProps} />;
      case 'file_server': return <FileText {...iconProps} />;
      case 'print_server': return <Printer {...iconProps} />;
      case 'domain_controller': return <Users {...iconProps} />;
      case 'mail_server': return <Mail {...iconProps} />;
      case 'dns_server':
      case 'dhcp_server': return <Settings {...iconProps} />;
      case 'storage': return <HardDrive {...iconProps} />;
      default: return <Server {...iconProps} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white border-green-600 dark:bg-green-600 dark:border-green-700';
      case 'inactive': return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      case 'maintenance': return 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-700';
      default: return 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-700';
    }
  };

  const getNodeBorderColor = (status) => {
    switch (status) {
      case 'active': return 'border-green-500 dark:border-green-400';
      case 'inactive': return 'border-red-500 dark:border-red-400';
      case 'maintenance': return 'border-yellow-500 dark:border-yellow-400';
      default: return 'border-gray-500 dark:border-gray-400';
    }
  };

  const getHandleColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'maintenance': return '#eab308';
      case 'inactive': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleColor = getHandleColor(data.status);

  return (
    <>
      {/* Node UI */}
      <div className={`relative bg-card border-2 rounded shadow-md min-w-[140px] ${
        isExternal
          ? 'border-dashed border-blue-500 bg-blue-50/30 dark:bg-blue-950/30'
          : getNodeBorderColor(data.status)
      }`}>
        {/* External Badge */}
        {isExternal && (
          <div className="absolute top-0 left-0 -translate-x-1 -translate-y-1">
            <div className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
              EXTERNAL
            </div>
          </div>
        )}

        {/* Info Button */}
        <div className={`absolute top-1 right-1 flex gap-1 z-10 ${isExternal ? 'top-3' : ''}`}>
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
                <h3 className="text-lg font-bold border-b border-border pb-2">Service Item Detail</h3>

                {/* Basic Info */}
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

                    <span className="font-semibold text-muted-foreground">Status:</span>
                    <span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(data.status)}`}>
                        {data.status || '—'}
                      </span>
                    </span>
                  </div>

                  {/* Description */}
                  {data.description && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="font-semibold text-muted-foreground mb-1">Deskripsi:</p>
                      <p className="text-foreground bg-muted p-2 rounded text-xs leading-relaxed">
                        {data.description}
                      </p>
                    </div>
                  )}

                  {/* Parent Service Section */}
                  {parentService && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Layers size={14} />
                          Parent Service:
                        </p>
                      </div>
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                        <div className="flex items-center gap-2">
                          {parentService.icon_type === 'preset' ? (
                            <div className="w-8 h-8 bg-white rounded border flex items-center justify-center">
                              <ServiceIcon name={parentService.icon_name} size={20} />
                            </div>
                          ) : (
                            <img
                              src={parentService.icon_preview || `${API_BASE_URL}${parentService.icon_path}`}
                              alt={parentService.name}
                              className="w-8 h-8 object-contain bg-white rounded border"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{parentService.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {parentService.status === 'active' ? (
                                <span className="text-green-600">Active</span>
                              ) : (
                                <span className="text-red-600">Inactive</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External Source Section */}
                  {isExternal && externalSource && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-blue-600 flex items-center gap-1">
                          <Globe size={14} />
                          External Source:
                        </p>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground">Service:</span>
                            <span className="font-medium">{externalSource.serviceName || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground">CMDB Item:</span>
                            <span className="font-medium">{externalSource.cmdbItemName || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Node Content - Style seperti CustomNode */}
        <div className={`p-2 ${isExternal ? 'pt-8' : 'pt-6'}`}>
          {/* External Source Badge (small) */}
          {isExternal && externalSource && (
            <div className="text-[9px] text-blue-600 font-semibold mb-1 truncate" title={`From: ${externalSource.serviceName} (${externalSource.cmdbItemName})`}>
              From: {externalSource.serviceName}
            </div>
          )}

          {/* Status Badge */}
          {data.status && (
            <div className="text-xs text-center mb-2">
              <span className={`px-1.5 py-0.5 rounded ${getStatusColor(data.status)}`}>
                {data.status}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2">
            {/* Icon di kiri */}
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {getIconComponent(data.type)}
            </div>

            {/* Text di kanan */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{data.name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground capitalize">{data.type || ''}</div>
              {/* {data.ip && (
                <div className="text-xs text-muted-foreground font-mono truncate">{data.ip}</div>
              )} */}
              {data.domain && (
                <div className="text-xs text-muted-foreground font-mono truncate">{data.domain}</div>
              )}
              {/* {data.port && (
                <div className="text-xs text-muted-foreground font-mono truncate">:{data.port}</div>
              )} */}
            </div>
          </div>
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