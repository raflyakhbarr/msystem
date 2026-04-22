import React, { useMemo } from 'react';

/**
 * ServiceToServiceConnections Component
 *
 * Renders visual connections between services within a CMDB item node.
 * These connections are displayed as curved lines between service badges.
 *
 * Props:
 * - services: Array of services in this CMDB item
 * - connections: Array of service-to-service connections
 * - onConnectionClick: Callback when connection is clicked
 */
const ServiceToServiceConnections = ({ services = [], connections = [], onConnectionClick }) => {
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

  // Get color based on connection type
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

  // Get stroke dash array based on direction
  const getStrokeDasharray = (direction) => {
    switch (direction) {
      case 'forward':
        return '4 2'; // Solid with direction
      case 'backward':
        return '2 4'; // Dotted opposite
      case 'bidirectional':
        return '4 4'; // Dashed both ways
      default:
        return '4 2';
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
      width="100%"
      height="100%"
    >
      <defs>
        {/* Arrowhead marker for directed connections */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#3b82f6"
          />
        </marker>
      </defs>

      {validConnections.map((conn) => {
        const path = generateConnectionPath(conn.source_service_id, conn.target_service_id);
        if (!path) return null;

        const color = getConnectionColor(conn.connection_type);
        const strokeDasharray = getStrokeDasharray(conn.direction);

        return (
          <g
            key={conn.id}
            className="pointer-events-auto cursor-pointer"
            onClick={() => onConnectionClick?.(conn)}
          >
            {/* Connection line */}
            <path
              d={path}
              stroke={color}
              strokeWidth="2"
              fill="none"
              strokeDasharray={strokeDasharray}
              markerEnd={conn.direction !== 'backward' ? 'url(#arrowhead)' : ''}
              opacity="0.6"
              className="hover:opacity-100 hover:stroke-width-3 transition-all"
            />

            {/* Connection label (small badge) */}
            {conn.connection_type && (
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
                    title={conn.connection_type}
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
