import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { BiInfoCircle } from "react-icons/bi";
import { 
  FaServer, 
  FaDatabase, 
  FaNetworkWired as FaSwitch,
  FaDesktop as FaWorkstation,
  FaProjectDiagram as FaHub,
  FaShieldAlt as FaFirewall,
  FaWifi as FaRouter,
  FaExclamationTriangle
} from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:5000';

export default function CustomNode({ data, id }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [imageError, setImageError] = useState({});
  
  const getIconComponent = (type) => {
    const iconProps = { size: 20, className: 'text-foreground' };

    switch (type) {
        case 'server': return <FaServer {...iconProps} />;
        case 'database': return <FaDatabase {...iconProps} />;
        case 'switch': return <FaSwitch {...iconProps} />;
        case 'workstation': return <FaWorkstation {...iconProps} />;
        case 'hub': return <FaHub {...iconProps} />;
        case 'firewall': return <FaFirewall {...iconProps} />;
        case 'router': return <FaRouter {...iconProps} />;
        default: return <FaServer {...iconProps} />;
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
          <button
            onClick={() => setShowInfoModal(true)}
            className="bg-muted hover:bg-muted/80 text-muted-foreground p-1 rounded-full shadow-lg"
          >
            <BiInfoCircle className="w-3 h-3" />
          </button>
        </div>

        {/* Node Content */}
        <div className="p-2 pt-6">
          {data.status && (
            <div className="text-xs text-center mb-2">
              <span className={`px-1.5 py-0.5 rounded ${getStatusColor(data.status)}`}>
                {data.status}
                {/* {isStatusCascaded && (
                  <span className="ml-1" title="Status dari dependency">
                    <FaExclamationTriangle className='inline-block mb-1' />
                  </span>
                )} */}
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

      {/* Modal Info */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-card rounded-lg shadow-lg min-w-[180px] max-w-md p-4 relative max-h-[90vh] overflow-y-auto border border-border">
            <h3 className="text-lg font-bold mb-4">Detail Node</h3>

            <div className="space-y-2 text-sm">
              <p><strong>Nama:</strong> {data.name || '—'}</p>
              <p><strong>IP Address:</strong> {data.ip || '—'}</p>
              <p><strong>Tipe:</strong> {data.type || '—'}</p>
              <p><strong>Kategori:</strong> {data.category || '—'}</p>
              <p><strong>Lokasi:</strong> {data.location || '—'}</p>
              <p><strong>Tipe Env:</strong> {data.env_type || '—'}</p>
              <p><strong>Status:</strong>
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${getStatusColor(data.status)}`}>
                  {data.status || '—'}
                </span>
              </p>

              {/* {isStatusCascaded && (
                <div className="bg-accent/10 border border-accent/30 rounded p-2 text-xs">
                  <p className="font-semibold text-accent">
                    <FaExclamationTriangle className="inline-block"/> Status Terpengaruh
                  </p>
                  <p className="text-accent/80 mt-1">
                    Status asli: <strong>{data.originalStatus}</strong>
                    <br />
                    Status saat ini mengikuti dependency yang bermasalah.
                  </p>
                </div>
              )} */}

              <p><strong>Deskripsi:</strong></p>
              <p className="text-foreground bg-muted p-2 rounded text-xs">
                {data.description || '—'}
              </p>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}