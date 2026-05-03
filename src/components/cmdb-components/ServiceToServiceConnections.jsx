import React, { useMemo, useState } from 'react';
import { X, Info } from 'lucide-react';
import { getStatusColor } from '../../utils/cmdb-utils/flowHelpers';

/**
 * ServiceToServiceConnections Component
 *
 * Renders visual connections between services within a CMDB item node.
 * These connections are displayed as curved lines between service badges.
 * NOW WITH STATUS-BASED STYLING - propagates service status to edge appearance
 *
 * Props:
 * - services: Array of services in this CMDB item
 * - connections: Array of service-to-service connections with status info
 * - onConnectionClick: Callback when connection is clicked
 */
const ServiceToServiceConnections = ({ services = [], connections = [], onConnectionClick }) => {
  const [hoveredConnection, setHoveredConnection] = useState(null);

  // Create a service status map for fallback
  const serviceStatusMap = useMemo(() => {
    const map = {};
    services.forEach(service => {
      map[service.id] = service.status || 'active';
    });
    return map;
  }, [services]);

  // Create a map of service positions
  const servicePositions = useMemo(() => {
    const positions = {};
    services.forEach((service, index) => {
      positions[service.id] = {
        index,
        x: 20 + (index % 5) * 44, // 44px per service badge (40px width + 4px gap)
        y: 20 + Math.floor(index / 5) * 44 // New row every 5 services
      };
    });
    return positions;
  }, [services]);

  // Filter connections to only those between services in this item
  const validConnections = useMemo(() => {
    return connections.filter(conn => {
      const sourceExists = services.some(s => s.id === conn.source_service_id);
      const targetExists = services.some(s => s.id === conn.target_service_id);
      return sourceExists && targetExists;
    });
  }, [connections, services]);

  if (validConnections.length === 0) {
    return null;
  }

  // Generate SVG path for connection between two services
  const generateConnectionPath = (sourceId, targetId) => {
    const source = servicePositions[sourceId];
    const target = servicePositions[targetId];

    if (!source || !target) return null;

    // Calculate control points for curved line
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const offset = 10;

    // Create curved path
    return `M ${source.x + 20} ${source.y + 20}
            Q ${midX} ${midY - offset} ${target.x + 20} ${target.y + 20}`;
  };

  // Get color based on connection type (fallback jika tidak ada status info)
  const getConnectionColor = (connectionType) => {
    const colors = {
      depends_on: '#ef4444', // red
      consumed_by: '#f97316', // orange
      connects_to: '#3b82f6', // blue
      contains: '#8b5cf6', // purple
      managed_by: '#06b6d4', // cyan
      data_flow_to: '#10b981', // green
      backup_to: '#6366f1', // indigo
      hosted_on: '#f59e0b', // amber
      licensing: '#ec4899', // pink
      part_of: '#14b8a6', // teal
      related_to: '#a3a3a3', // gray
    };
    return colors[connectionType] || '#3b82f6';
  };

  // Determine edge status based on service statuses (PROPAGATION LOGIC)
  const getEdgeStatus = (connection) => {
    // Try to get status from connection data (from backend JOIN)
    let sourceStatus = connection.source_service_status;
    let targetStatus = connection.target_service_status;

    // Fallback to serviceStatusMap from services prop
    if (!sourceStatus) {
      sourceStatus = serviceStatusMap[connection.source_service_id] || 'active';
    }
    if (!targetStatus) {
      targetStatus = serviceStatusMap[connection.target_service_id] || 'active';
    }

    let edgeStatus = 'active';
    let showCrossMarker = false;

    // Priority: inactive > maintenance > active
    if (sourceStatus === 'inactive' || targetStatus === 'inactive') {
      edgeStatus = 'inactive';
      showCrossMarker = true;
    } else if (sourceStatus === 'maintenance' || targetStatus === 'maintenance') {
      edgeStatus = 'maintenance';
    }

    return { edgeStatus, showCrossMarker };
  };

  // Get stroke dash array based on status AND direction
  const getStrokeDasharray = (edgeStatus, direction) => {
    // Inactive and Maintenance always get dashed lines
    if (edgeStatus === 'inactive') {
      return '8 4'; // Dotted for inactive
    }
    if (edgeStatus === 'maintenance') {
      return '12 6'; // Dashed for maintenance
    }

    // Active status - only show direction if not forward
    switch (direction) {
      case 'forward':
        return ''; // Solid line (no dash)
      case 'backward':
        return '8 4'; // Dotted opposite
      case 'bidirectional':
        return '12 6'; // Dashed both ways
      default:
        return ''; // Solid line default
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5, position: 'absolute', top: 0, left: 0 }}
      width="100%"
      height="100%"
    >
      <defs>
        {/* Dynamic arrowhead markers untuk setiap status color */}
        <marker
          id="arrowhead-active"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#10b981"
          />
        </marker>
        <marker
          id="arrowhead-inactive"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#ef4444"
          />
        </marker>
        <marker
          id="arrowhead-maintenance"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#f59e0b"
          />
        </marker>
      </defs>

      {validConnections.map((conn) => {
        const path = generateConnectionPath(conn.source_service_id, conn.target_service_id);
        if (!path) return null;

        // DETERMINE EDGE STATUS berdasarkan service status (PROPAGASI)
        const { edgeStatus, showCrossMarker } = getEdgeStatus(conn);

        // TEMPORARY HARDCODE TEST - Force inactive for testing
        // const edgeStatus = 'inactive'; // TEST THIS
        // const showCrossMarker = true; // TEST THIS

        // Gunakan warna berdasarkan STATUS, bukan connection_type
        const color = getStatusColor(edgeStatus);
        const strokeDasharray = getStrokeDasharray(edgeStatus, conn.direction);

        // Calculate midpoint for cross marker
        const source = servicePositions[conn.source_service_id];
        const target = servicePositions[conn.target_service_id];
        const midX = ((source?.x || 0) + (target?.x || 0)) / 2 + 20;
        const midY = ((source?.y || 0) + (target?.y || 0)) / 2 + 20;

        return (
          <g
            key={conn.id}
            className="pointer-events-auto cursor-pointer"
            onClick={() => onConnectionClick?.(conn)}
            onMouseEnter={() => setHoveredConnection(conn)}
            onMouseLeave={() => setHoveredConnection(null)}
          >
            {/* Connection line dengan STATUS-BASED COLOR */}
            <path
              d={path}
              stroke={color}
              strokeWidth={edgeStatus === 'inactive' ? '2.5' : '2'} // Lebih tebal jika inactive
              fill="none"
              strokeDasharray={strokeDasharray || undefined}
              markerEnd={conn.direction !== 'backward' ? `url(#arrowhead-${edgeStatus})` : ''}
              opacity={edgeStatus === 'inactive' ? '0.8' : '0.6'} // Lebih opacity jika inactive
              className="hover:opacity-100 hover:stroke-width-3 transition-all"
            />

            {/* Cross Marker untuk INACTIVE status */}
            {showCrossMarker && (
              <g
                style={{
                  transform: `translate(${midX}px, ${midY}px)`,
                  pointerEvents: 'none'
                }}
              >
                {/* White background circle */}
                <circle
                  r="8"
                  fill="white"
                  opacity="0.9"
                />
                {/* X mark */}
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight="bold"
                  fill={color}
                  style={{
                    userSelect: 'none'
                  }}
                >
                  ✕
                </text>
              </g>
            )}

            {/* Info tooltip untuk status propagation */}
            {hoveredConnection?.id === conn.id && (
              <g
                style={{
                  transform: `translate(${midX}px, ${midY - 30}px)`,
                  pointerEvents: 'none'
                }}
              >
                <foreignObject
                  width="200"
                  height="80"
                  style={{
                    overflow: 'visible'
                  }}
                >
                  <div
                    className="bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg"
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'system-ui'
                    }}
                  >
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <Info size={12} />
                      Status Propagation
                    </div>
                    <div className="opacity-90">
                      Edge Status: <span className="font-semibold">{edgeStatus}</span>
                    </div>
                    <div className="opacity-75 mt-0.5">
                      Source: <span className={
                        conn.source_service_status === 'inactive' ? 'text-red-400' :
                        conn.source_service_status === 'maintenance' ? 'text-yellow-400' :
                        'text-green-400'
                      }>{conn.source_service_status || 'active'}</span>
                      {' → '}
                      Target: <span className={
                        conn.target_service_status === 'inactive' ? 'text-red-400' :
                        conn.target_service_status === 'maintenance' ? 'text-yellow-400' :
                        'text-green-400'
                      }>{conn.target_service_status || 'active'}</span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}

            {/* Connection label (small badge) - hanya tampilkan jika tidak ada cross marker */}
            {conn.connection_type && !showCrossMarker && (
              <foreignObject
                x={
                  (servicePositions[conn.source_service_id]?.x || 0) +
                  (servicePositions[conn.target_service_id]?.x || 0)
                }
                y={
                  (servicePositions[conn.source_service_id]?.y || 0) +
                  (servicePositions[conn.target_service_id]?.y || 0)
                }
                width="80"
                height="20"
                style={{
                  transform: 'translate(-40px, -10px)',
                  overflow: 'visible'
                }}
              >
                <div className="flex items-center justify-center">
                  <div
                    className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium shadow-xs"
                    style={{
                      backgroundColor: color,
                      whiteSpace: 'nowrap'
                    }}
                    title={`${conn.connection_type} (${edgeStatus})`}
                  >
                    {conn.connection_type}
                  </div>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default ServiceToServiceConnections;
