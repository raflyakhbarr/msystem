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
    const iconProps = { size: 20, className: 'text-gray-700' };
    
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
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'decommissioned': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNodeBorderColor = (status) => {
    switch (status) {
      case 'active': return 'border-green-400';
      case 'inactive': return 'border-gray-400';
      case 'maintenance': return 'border-yellow-400';
      case 'decommissioned': return 'border-red-400';
      default: return 'border-gray-300';
    }
  };

  const getHandleColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'maintenance': return '#f59e0b';
      case 'inactive': return '#9ca3af';
      case 'decommissioned': return '#ef4444';
      default: return '#9ca3af';
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
      <div className={`relative bg-white border-2 rounded shadow-md min-w-[140px] ${getNodeBorderColor(data.status)}`}>
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          <button
            onClick={() => setShowInfoModal(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white p-1 rounded-full shadow-lg"
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
              <div className="text-xs text-gray-500 capitalize">{data.type || ''}</div>
            </div>
          </div>

          {/* Technology/Vendor Images */}
          {images.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {images.map((imgPath, index) => (
                  !imageError[index] && (
                    <div 
                      key={index}
                      className="w-10 h-10 flex-shrink-0 bg-white rounded border border-gray-200 overflow-hidden hover:border-blue-400 transition-colors"
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
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
            border: '2px solid white'
          }}
        />
      </div>

      {/* Modal Info */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg shadow-lg min-w-[180px] max-w-md p-4 relative max-h-[90vh] overflow-y-auto">
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
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                  <p className="font-semibold text-yellow-800">
                    <FaExclamationTriangle className="inline-block"/> Status Terpengaruh
                  </p>
                  <p className="text-yellow-700 mt-1">
                    Status asli: <strong>{data.originalStatus}</strong>
                    <br />
                    Status saat ini mengikuti dependency yang bermasalah.
                  </p>
                </div>
              )} */}
              
              <p><strong>Deskripsi:</strong></p>
              <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs">
                {data.description || '—'}
              </p>
            </div>
            
            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}