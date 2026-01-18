import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Info,
  Server,
  Database,
  Network,
  Monitor,
  GitBranch,
  Shield,
  Wifi,
  AlertTriangle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000';

export default function CustomNode({ data, id }) {
  const [imageError, setImageError] = useState({});
  
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
      case 'inactive': return 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-700';
      case 'maintenance': return 'bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-700';
      case 'decommissioned': return 'bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-700';
      default: return 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:border-gray-700';
    }
  };

  const getNodeBorderColor = (status) => {
    switch (status) {
      case 'active': return 'border-green-500 dark:border-green-400';
      case 'inactive': return 'border-gray-500 dark:border-gray-400';
      case 'maintenance': return 'border-yellow-500 dark:border-yellow-400';
      case 'decommissioned': return 'border-red-500 dark:border-red-400';
      default: return 'border-gray-500 dark:border-gray-400';
    }
  };

  const getHandleColor = (status) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'maintenance': return '#eab308';
      case 'inactive': return '#6b7280';
      case 'decommissioned': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const isStatusCascaded = data.originalStatus === 'active' && data.status !== 'active';

  const images = (() => {
    if (!data.images) return [];
    if (Array.isArray(data.images)) return data.images;
    try {
      return JSON.parse(data.images);
    } catch {
      return [];
    }
  })();

  const handleImageError = (index) => {
    setImageError(prev => ({ ...prev, [index]: true }));
  };

  const handleColor = getHandleColor(data.status);

  return (
    <>
      {/* Node UI */}
      <div className={`relative bg-card border-2 rounded shadow-md min-w-[140px] ${getNodeBorderColor(data.status)}`}>
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <button className="bg-gray-900 hover:bg-gray-700 text-white p-1 rounded-full shadow-lg transition-colors duration-200">
                <Info className="w-3 h-3" />
              </button>
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

          {/* Technology/Vendor Images */}
          {images.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {images.map((imgPath, index) => (
                  !imageError[index] && (
                    <div
                      key={index}
                      className="w-10 h-10 flex-shrink-0 bg-card rounded border border-border overflow-hidden hover:border-primary transition-colors"
                      title={`Technology ${index + 1}`}
                    >
                      <img
                        src={`${API_BASE_URL}${imgPath}`}
                        alt={`Tech ${index + 1}`}
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onError={() => handleImageError(index)}
                      />
                    </div>
                  )
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