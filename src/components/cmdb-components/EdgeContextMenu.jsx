import { Pencil, Trash2, MoreVertical, ArrowRight, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';

export default function EdgeContextMenu({
  show,
  position,
  edge,
  sourceNode,
  targetNode,
  servicesMap = {},
  serviceItems = {},
  onEdit,
  onDelete,
  onClose,
}) {
  if (!show || !edge) return null;

  const connectionTypeKey = edge.data?.connection_type || edge.data?.connectionType || 'depends_on';
  const connectionType = CONNECTION_TYPES[connectionTypeKey] || CONNECTION_TYPES.depends_on;

  const getServiceItemName = (nodeId, servicesMap) => {
    const serviceItemId = String(nodeId).replace('service-item-', '');
    // Search in all service items from all services
    for (const itemServices of Object.values(servicesMap)) {
      for (const service of itemServices) {
        if (service.service_items) {
          const serviceItem = service.service_items.find(si => String(si.id) === serviceItemId);
          if (serviceItem) {
            return serviceItem.name || 'Service Item';
          }
        }
      }
    }
    return 'Service Item';
  };

  const getServiceName = (nodeType, nodeId) => {
    if (nodeType === 'service' || String(nodeId).startsWith('service-')) {
      const serviceId = String(nodeId).replace('service-', '');
      for (const itemServices of Object.values(servicesMap)) {
        const service = itemServices.find(s => String(s.id) === serviceId);
        if (service) {
          return service.name || 'Service';
        }
      }
      return 'Service';
    }
    return null;
  };

  // Check if edge is a service-item connection by inspecting edge ID
  const isSourceServiceItem = String(edge.source).startsWith('service-item-');
  const isTargetServiceItem = String(edge.target).startsWith('service-item-');
  const isSourceService = String(edge.source).startsWith('service-') && !isSourceServiceItem;
  const isTargetService = String(edge.target).startsWith('service-') && !isTargetServiceItem;

  // Extract service item ID from edge ID
  // Edge ID format varies:
  // - CMDB item to service item: e{source_id}-service-item-{serviceItemId} (e.g., e469-service-item-85)
  // - Service to service item: e{service-id}-service-item-{serviceItemId} (e.g., e47-service-item-85)
  // - Service item as source: eservice-item-{serviceItemId}-{targetId} (e.g., eservice-item-85-469)
  const edgeIdStr = String(edge.id || '');
  let edgeIdServiceItemId = null;

  if (edgeIdStr.startsWith('eservice-item-')) {
    // New format: eservice-item-{serviceItemId}-{targetId}
    // Extract service item ID from the beginning
    const match = edgeIdStr.match(/^eservice-item-(\d+)-/);
    if (match) {
      edgeIdServiceItemId = match[1];
    }
  } else if (edgeIdStr.includes('-service-item-')) {
    // Old format: edge ID ends with "-service-item-{serviceItemId}"
    const match = edgeIdStr.match(/-service-item-(\d+)$/);
    if (match) {
      edgeIdServiceItemId = match[1];
    }
  }

  // Find service item name by searching all services' service_items
  // Searches both servicesMap (by cmdb_item_id with nested service_items)
  // and serviceItems (by service id, where each key maps to an array of service items)
  const findServiceItemName = (serviceItemId) => {
    if (!serviceItemId) return null;

    // Search in servicesMap first (keyed by cmdb_item_id)
    // Each service in servicesMap may have a service_items array
    for (const itemServices of Object.values(servicesMap)) {
      for (const service of itemServices) {
        if (service.service_items && Array.isArray(service.service_items)) {
          const serviceItem = service.service_items.find(si => String(si.id) === serviceItemId);
          if (serviceItem) {
            return serviceItem.name || 'Service Item';
          }
        }
      }
    }

    // Search in serviceItems (keyed by service id - each value is array of service items)
    for (const serviceItemsArray of Object.values(serviceItems)) {
      if (Array.isArray(serviceItemsArray)) {
        const serviceItem = serviceItemsArray.find(si => String(si.id) === serviceItemId);
        if (serviceItem) {
          return serviceItem.name || 'Service Item';
        }
      }
    }

    return null;
  };

  const items = [
    {
      label: 'Edit Tipe Koneksi',
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
      color: 'hover:bg-blue-500 hover:text-white',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Hapus Koneksi',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      color: 'hover:bg-red-500 hover:text-white',
      iconColor: 'text-red-500',
      danger: true,
    },
  ];

  const radius = 64;
  const angleStep = (2 * Math.PI) / items.length;
  const glassSize = (radius + 40) * 2;

  const getDirectionIcon = () => {
    switch (connectionType.propagation) {
      case 'both':
        return <ArrowRightLeft className="h-3 w-3" />;
      case 'target_to_source':
      case 'source_to_target':
      default:
        return <ArrowRight className="h-3 w-3" />;
    }
  };

  const handleAction = (action) => {
    action();
    onClose();
  };

  const getConnectionName = (node, nodeType, nodeId) => {
    if (!node) return 'Unknown';

    const nodeIdStr = String(node.id || '');
    const nodeIsServiceItem = nodeIdStr.startsWith('service-item-');
    const nodeIsService = nodeIdStr.startsWith('service-') && !nodeIsServiceItem;

    // Use the edgeIdServiceItemId that was extracted earlier (from line 64-81)
    let serviceItemTargetId = edgeIdServiceItemId;

    // Case 1: Node is explicitly a service item node (not common in CMDBVisualization)
    if (nodeIsServiceItem) {
      const serviceItemId = nodeIdStr.replace('service-item-', '');
      return findServiceItemName(serviceItemId) || 'Service Item';
    }

    // Case 2: Edge connects to a service item
    // The edge ID tells us the actual service item ID (even if target appears as service node in CMDBVisualization)
    if (serviceItemTargetId) {
      const isSourceNode = String(edge.source) === nodeIdStr;

      if (nodeIsService) {
        if (isSourceNode) {
          // We're the source of the connection
          // Edge ID format: e{source}-service-item-{targetServiceItemId}
          // If source is service, it means: Service -> Service Item (user selected service item as source from service)
          // OR: Service -> Item (where edge.data.serviceItemId is set)
          // We need to show the SERVICE ITEM NAME if available, not the service name

          // Check if edge.data has serviceItemId (set by useFlowData)
          let serviceItemNameToUse = null;
          if (edge.data?.serviceItemId) {
            serviceItemNameToUse = findServiceItemName(edge.data.serviceItemId);
          } else if (serviceItemTargetId) {
            serviceItemNameToUse = findServiceItemName(serviceItemTargetId);
          }

          if (serviceItemNameToUse) {
            return serviceItemNameToUse;
          }
          // Fallback to service name if service item not found
          return node.data?.service?.name || node.data?.name || 'Service';
        } else {
          // We're the target of the connection (edge goes TO this service node which represents a service item)
          // Show the actual service item name
          const serviceItemName = findServiceItemName(serviceItemTargetId);
          return serviceItemName || 'Service Item';
        }
      } else {
        // This is NOT a service node (CMDB item or other)
        if (isSourceNode) {
          // We're the source - show our item name
          return node.data?.name || 'Item';
        } else {
          // We're the target (edge goes TO us) - we're the non-service end
          return node.data?.name || 'Item';
        }
      }
    }

    // Case 3: Regular service node (no service-item edge)
    if (node.type === 'serviceAsNode' || node.id.startsWith('service-')) {
      return node.data?.service?.name || node.data?.name || 'Service';
    }

    return node.data?.name || 'Node';
  };

  const getConnectionLabel = () => {
    return (
      <div className="flex items-center gap-2">
        {getConnectionName(sourceNode, edge.data?.source_type, edge.source)}
        <span className="flex items-center" style={{ color: connectionType.color }}>
          {getDirectionIcon()}
        </span>
        {getConnectionName(targetNode, edge.data?.target_type, edge.target)}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Radial Context Menu */}
      <div
        className="fixed z-50"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={{
            width: glassSize,
            height: glassSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            willChange: 'opacity',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.15) 65%, rgba(255,255,255,0) 100%)',
            maskImage: 'radial-gradient(circle, black 45%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 75%)',
          }}
        />

        {/* Connection info label */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: -70 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 pointer-events-none bottom-10 max-w-xs overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        >
          {getConnectionLabel()}
        </motion.div>

        {/* Connection type label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 50 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white pointer-events-none top-10"
          style={{
            background: connectionType.color,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {connectionType.label}
        </motion.div>

        {/* Center button */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
          style={{
            background: 'rgba(30, 30, 40, 0.78)',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            color: 'white',
          }}
          onClick={onClose}
        >
          <MoreVertical className="h-4 w-4" />
        </motion.div>

        {/* Radial item buttons */}
        <AnimatePresence>
          {items.map((item, index) => {
            const angle = index * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.button
                key={item.label}
                initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                animate={{ scale: 1, opacity: 1, x, y }}
                exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 320,
                  damping: 22,
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAction(item.onClick)}
                title={item.label}
                className={`absolute flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md transition-colors ${item.color} ${item.iconColor}`}
                style={{
                  top: '50%',
                  left: '50%',
                  marginTop: -20,
                  marginLeft: -20,
                }}
              >
                {item.icon}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}