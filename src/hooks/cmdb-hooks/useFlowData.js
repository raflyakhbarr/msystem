import { useCallback } from 'react';
import {
  calculateGroupDimensions,
  getBestHandlePositions,
  createEdgeConfig,
  getConnectionTypeInfo,
  getStatusColor,
  shouldShowCrossMarker
} from '../../utils/cmdb-utils/flowHelpers';
import {
  calculatePropagatedStatuses
} from '../../utils/cmdb-utils/statusPropagation';
import { API_BASE_URL } from '../../utils/cmdb-utils/constants';

export const useFlowData = (items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap = {}, showConnectionLabels = true, onServiceClick = null, onServiceItemsClick = null, services = [], serviceItems = {}) => {
  const transformToFlowData = useCallback(() => {
    const flowNodes = [];
    const flowEdges = [];

    // Build a map from service_id to cmdb_item_id for quick lookup
    const serviceToItemMap = {};
    Object.entries(servicesMap).forEach(([itemId, services]) => {
      // Ensure services is an array before iterating
      if (Array.isArray(services)) {
        services.forEach(service => {
          serviceToItemMap[service.id] = parseInt(itemId);
        });
      }
    });

    // Build a reverse map from service_item_id to service_id for quick lookup
    // This is used when creating edges to service items - we need to connect to the parent service
    const serviceItemToServiceMap = {};
    Object.entries(serviceItems).forEach(([serviceId, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          serviceItemToServiceMap[item.id] = parseInt(serviceId);
        });
      }
    });

    // FIX: Hitung propagated statuses dengan services dan service items
    // Flatten serviceItems object ke array untuk calculatePropagatedStatuses
    const flattenedServiceItems = [];
    Object.entries(serviceItems).forEach(([serviceId, items]) => {
      if (Array.isArray(items)) {
        flattenedServiceItems.push(...items);
      }
    });

    console.log('🎨 useFlowData: Calculating edge statuses with service items:', {
      itemsCount: items.length,
      connectionsCount: connections.length,
      servicesCount: services.length,
      serviceItemsCount: flattenedServiceItems.length,
      sampleServiceItems: flattenedServiceItems.slice(0, 3).map(si => ({ id: si.id, name: si.name, status: si.status }))
    });

    const edgeStatuses = calculatePropagatedStatuses(
      items,
      connections,
      groups,
      groupConnections,
      services,
      flattenedServiceItems
    );

    console.log('🎨 useFlowData: Edge statuses calculated:', Object.keys(edgeStatuses).length, 'edges');
    console.log('🎨 Sample edge statuses:', Object.entries(edgeStatuses).slice(0, 3).map(([edgeId, status]) => ({ edgeId, status })));

    // Create group nodes
    groups.forEach((group) => {
      const groupItems = items
        .filter(item => item.group_id === group.id)
        .sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));

      const dimensions = calculateGroupDimensions(group.id, groupItems, servicesMap);
      
      const groupPos = group.position
        ? { x: group.position.x, y: group.position.y }
        : { x: Math.random() * 300, y: Math.random() * 200 };

      const groupNodeId = `group-${group.id}`;
      const isHidden = hiddenNodes.has(groupNodeId);

      flowNodes.push({
        id: groupNodeId,
        type: 'group',
        position: groupPos,
        data: {
          label: group.name, // Add label for search
          name: group.name,
          description: group.description,
          color: group.color,
          itemCount: groupItems.length,
          width: dimensions.width,
          height: dimensions.height,
          rowHeights: dimensions.rowHeights, // Tambahkan rowHeights untuk drag calculation
        },
        style: {
          width: dimensions.width,
          height: dimensions.height,
          zIndex: 0,
          opacity: isHidden ? 0.3 : 1,
          pointerEvents: isHidden ? 'none' : 'all',
          borderRadius: '8px',
          overflow: 'visible', // Allow child service edges to be visible outside boundary
        },
        draggable: !isHidden,
        hidden: isHidden,
      });

      // Create item nodes in group
      groupItems.forEach((item, index) => {
        // Ambil services untuk item ini dari servicesMap
        const itemServices = (servicesMap[item.id] || []).map(service => ({
          ...service,
          icon_preview: service.icon_type === 'upload' && service.icon_path
            ? `${API_BASE_URL}${service.icon_path}`
            : null
        }));
        const serviceCount = itemServices.length;

        // Hitung tinggi item berdasarkan jumlah service
        const itemHeight = dimensions.getItemHeight ? dimensions.getItemHeight(serviceCount) : dimensions.baseItemHeight;

        // Hitung posisi berdasarkan grid layout
        const row = Math.floor(index / dimensions.itemsPerRow);
        const col = index % dimensions.itemsPerRow;

        // Hitung Y position dengan row heights yang bervariasi
        let relativeY = dimensions.padding + 40; // Header height
        for (let r = 0; r < row; r++) {
          relativeY += dimensions.rowHeights[r] + dimensions.gapY;
        }

        // Hitung X position
        const relativeX = dimensions.padding + col * (dimensions.itemWidth + dimensions.gapX);

        const itemNodeId = String(item.id);
        const isItemHidden = hiddenNodes.has(itemNodeId) || isHidden;

        flowNodes.push({
          id: itemNodeId,
          type: 'custom',
          position: { x: relativeX, y: relativeY },  // ← Gunakan posisi dari DB!
          parentNode: groupNodeId,
          extent: 'parent',
          data: {
            id: item.id, // Add item ID for parent item lookup
            label: item.name, // Add label for search
            name: item.name,
            type: item.type,
            description: item.description,
            status: item.status,
            ip: item.ip,
            category: item.category,
            location: item.location,
            groupId: group.id,
            orderInGroup: item.order_in_group,
            env_type: item.env_type,
            services: itemServices,
            storage: item.storage || null,
            alias: item.alias || '',
            port: item.port || '',
            onServiceClick: onServiceClick, // Add service click handler
            onServiceItemsClick: onServiceItemsClick, // Add service items click handler
            workspaceId: items.find(i => i.id === item.id)?.workspace_id, // Add workspaceId for service items fetch
          },
          style: {
            width: dimensions.itemWidth,
            height: itemHeight,
            opacity: isItemHidden ? 0.3 : 1,
            pointerEvents: isItemHidden ? 'none' : 'all',
            overflow: 'visible', // Allow service child edges to be visible outside boundary
          },
          draggable: !isItemHidden,
          hidden: isItemHidden,
        });

        // Create service nodes as child nodes for grouped items
        if (itemServices.length > 0) {
          const servicesPerRow = 3;
          const serviceNodeWidth = 47; // Slightly larger for better visibility
          const serviceNodeHeight = 47; // Slightly larger
          const gapX = 10;
          const gapY = 10;
          const paddingX = 10;
          const paddingY = 10;

          itemServices.forEach((service, index) => {
            const row = Math.floor(index / servicesPerRow);
            const col = index % servicesPerRow;

            // Calculate position relative to parent item
            // Services section starts after base height (100px) + 20px padding
            const startY = 120 + (row * (serviceNodeHeight + gapY));
            const startX = paddingX + (col * (serviceNodeWidth + gapX));

            const serviceNodeId = `service-${service.id}`;

            flowNodes.push({
              id: serviceNodeId,
              type: 'serviceAsNode',
              parentNode: itemNodeId, // ← CRITICAL: Make service a child node
              extent: 'parent', // ← CRITICAL: Constrain to parent boundary
              position: { x: startX, y: startY }, // ← Position is RELATIVE to parent
              data: {
                service: {
                  ...service,
                  service_items_count: service.service_items_count || 0
                },
                cmdbItemName: item.name,
                cmdbItemId: item.id,
                workspaceId: items.find(i => i.id === item.id)?.workspace_id,
                width: serviceNodeWidth,
                height: serviceNodeHeight,
                onServiceClick: onServiceClick,
                onServiceItemsClick: onServiceItemsClick,
                isInsideItem: true // Flag to indicate this is inside item
              },
              style: {
                width: serviceNodeWidth,
                height: serviceNodeHeight,
                zIndex: 1000 // ← CRITICAL: Very high z-index for edges to be visible above parent
              },
              draggable: false // ← CRITICAL: Services cannot be dragged
            });
          });
        }
      });
    });

    // Create ungrouped item nodes
    const ungroupedItems = items.filter(item => !item.group_id);
    ungroupedItems.forEach((item) => {
      const pos = item.position
        ? { x: item.position.x, y: item.position.y }
        : { x: Math.random() * 400 + 600, y: Math.random() * 300 };

      const itemNodeId = String(item.id);
      const isHidden = hiddenNodes.has(itemNodeId);

      // Ambil services untuk item ini dari servicesMap dan tambahkan icon preview
      const itemServices = (servicesMap[item.id] || []).map(service => ({
        ...service,
        icon_preview: service.icon_type === 'upload' && service.icon_path
          ? `${API_BASE_URL}${service.icon_path}`
          : null
      }));

      // Calculate CMDB item dimensions based on service count
      // More accurate calculation to ensure service nodes fit properly
      const serviceCount = itemServices.length;
      const baseItemHeight = 67; // Tinggi dasar item (header, divider, info)
      const servicesPerRow = 3;

      // Service node dimensions (MUST MATCH with service node positioning below)
      const serviceNodeWidth = 47;   // Lebar service node
      const serviceNodeHeight = 47;   // Tinggi service node
      const gapY = 10;                // Gap vertikal antar service nodes
      const serviceRowHeight = serviceNodeHeight + gapY; // Total tinggi per baris = 57px

      let itemHeight = baseItemHeight + 20; // +20px untuk services header dan padding
      if (serviceCount > 0) {
        const serviceRows = Math.ceil(serviceCount / servicesPerRow);

        // Service nodes start at Y = 120 (see service node positioning below)
        // Calculate total height needed for service section
        const serviceSectionStart = 120;
        const serviceSectionHeight = serviceRows * serviceRowHeight;

        // Add space for service section + extra padding at bottom
        itemHeight = baseItemHeight + 20 + serviceSectionHeight + 15; // +15px extra padding di bawah
      } else {
        // Minimum height for "No services" text
        itemHeight = baseItemHeight + 25;
      }

      // Calculate dynamic width based on service presence and type
      // web_application type needs more width for URL display
      const baseItemWidth = item.type === 'web_application' ? 220 : 150;
      let itemWidth;
      if (serviceCount === 0) {
        itemWidth = baseItemWidth;
      } else {
        // With services: accommodate 3 services per row
        // Each service is 47px + 10px gap = 57px per service
        const horizontalPadding = 24; // 12px padding on each side
        const serviceSectionWidth = (servicesPerRow * serviceNodeWidth) + ((servicesPerRow - 1) * gapY);
        itemWidth = Math.max(baseItemWidth, serviceSectionWidth + horizontalPadding);
      }

      flowNodes.push({
        id: itemNodeId,
        type: 'custom',
        position: pos,
        data: {
          id: item.id, // Add item ID for parent item lookup
          label: item.name, // Add label for search
          name: item.name,
          type: item.type,
          description: item.description,
          status: item.status,
          ip: item.ip,
          category: item.category,
          location: item.location,
          env_type: item.env_type,
          services: itemServices,
          storage: item.storage || null,
          alias: item.alias || '',
          port: item.port || '',
          onServiceClick: onServiceClick, // Add service click handler
          onServiceItemsClick: onServiceItemsClick, // Add service items click handler
          workspaceId: item.workspace_id, // Add workspaceId for service items fetch
        },
        style: {
          width: itemWidth,
          height: itemHeight,
          zIndex: 1,
          opacity: isHidden ? 0.3 : 1,
          pointerEvents: isHidden ? 'none' : 'all',
          overflow: 'visible', // Allow child nodes to be visible outside boundary
        },
        draggable: !isHidden,
        hidden: isHidden,
      });

      // Create service nodes as child nodes for ungrouped items
      if (itemServices.length > 0) {
        const servicesPerRow = 3;
        const serviceNodeWidth = 47; // Slightly larger for better visibility
        const serviceNodeHeight = 47; // Slightly larger
        const gapX = 10;
        const gapY = 10;
        const paddingX = 10;
        const paddingY = 10;

        itemServices.forEach((service, index) => {
          const row = Math.floor(index / servicesPerRow);
          const col = index % servicesPerRow;

          // Calculate position relative to parent item
          // Services section starts after base height (100px) + 20px padding
          const startY = 120 + (row * (serviceNodeHeight + gapY));
          const startX = paddingX + (col * (serviceNodeWidth + gapX));

          const serviceNodeId = `service-${service.id}`;

          flowNodes.push({
            id: serviceNodeId,
            type: 'serviceAsNode',
            parentNode: itemNodeId, // ← CRITICAL: Make service a child node
            extent: 'parent', // ← CRITICAL: Constrain to parent boundary
            position: { x: startX, y: startY }, // ← Position is RELATIVE to parent
            data: {
              service: {
                ...service,
                service_items_count: service.service_items_count || 0
              },
              cmdbItemName: item.name,
              cmdbItemId: item.id,
              workspaceId: item.workspaceId,
              width: serviceNodeWidth,
              height: serviceNodeHeight,
              onServiceClick: onServiceClick,
              onServiceItemsClick: onServiceItemsClick,
              isInsideItem: true // Flag to indicate this is inside item
            },
            style: {
              width: serviceNodeWidth,
              height: serviceNodeHeight,
              zIndex: 1000 // ← CRITICAL: Very high z-index for edges to be visible above parent
            },
            draggable: false // ← CRITICAL: Services cannot be dragged
          });
        });
      }
    });

    // Create edges for item-to-item and item-to-group connections
    connections.forEach((conn) => {
      if (conn.source_group_id) return; // Skip, akan diprocess terpisah

      // Determine source node - could be cmdb_item, service, or service_item
      let sourceNode;
      let sourceIdForEdge;
      let sourceServiceItemId = null; // Track if source is a service item

      if (conn.source_service_item_id) {
        // Source is a service item - find its parent service and connect to that service node
        sourceServiceItemId = conn.source_service_item_id;
        const parentServiceId = serviceItemToServiceMap[conn.source_service_item_id];
        if (parentServiceId) {
          sourceNode = flowNodes.find(n => n.id === `service-${parentServiceId}`);
          sourceIdForEdge = `service-${parentServiceId}`; // Connect to parent service node
        } else {
          // Service item not in loaded services - this is normal when:
          // 1. Service item belongs to inactive service
          // 2. Service item belongs to service with inactive parent CMDB item
          // 3. Service is filtered out from current view
          // Skip this edge as the parent service node is not rendered
          if (process.env.NODE_ENV === 'development') {
            console.log(`ℹ️ Skipping edge for service item ${conn.source_service_item_id}: parent service not in current view`);
          }
          return;
        }
      } else if (conn.source_service_id) {
        sourceNode = flowNodes.find(n => n.id === `service-${conn.source_service_id}`);
        sourceIdForEdge = `service-${conn.source_service_id}`;
      } else {
        sourceNode = flowNodes.find(n => n.id === String(conn.source_id));
        sourceIdForEdge = String(conn.source_id);
      }

      let targetNode, targetId, edgeId, strokeColor, isGroupConnection, showCrossMarker;
      let isServiceConnection = false;

      if (conn.target_id) {
        targetNode = flowNodes.find(n => n.id === String(conn.target_id));
        targetId = String(conn.target_id);
        // Special edge ID format for source_service_item_id connections
        // This ensures EdgeContextMenu can detect that source is a service item
        if (sourceServiceItemId) {
          edgeId = `eservice-item-${sourceServiceItemId}-${conn.target_id}`;
        } else {
          edgeId = `e${sourceIdForEdge}-${conn.target_id}`;
        }
        isGroupConnection = false;
      } else if (conn.target_group_id) {
        targetNode = flowNodes.find(n => n.id === `group-${conn.target_group_id}`);
        targetId = `group-${conn.target_group_id}`;
        edgeId = `e${sourceIdForEdge}-group${conn.target_group_id}`;
        isGroupConnection = true;
      } else if (conn.target_service_id) {
        // Handle item-to-service OR service-to-item connection
        targetNode = flowNodes.find(n => n.id === `service-${conn.target_service_id}`);
        targetId = `service-${conn.target_service_id}`;
        edgeId = `e${sourceIdForEdge}-service-${conn.target_service_id}`;
        isGroupConnection = false;
        isServiceConnection = true;
      } else if (conn.target_service_item_id) {
        // Handle item-to-service-item OR service-to-service-item connection
        // In CMDBVisualization, service items are NOT rendered as separate nodes
        // So we connect the edge to the PARENT SERVICE node instead

        // Use the actual target_service_item_id in the edge ID so we can delete correctly later
        const parentServiceId = conn.target_service_id || serviceItemToServiceMap[conn.target_service_item_id];
        if (parentServiceId) {
          targetNode = flowNodes.find(n => n.id === `service-${parentServiceId}`);
          targetId = `service-${parentServiceId}`;
          edgeId = `e${sourceIdForEdge}-service-item-${conn.target_service_item_id}`;
          isGroupConnection = false;
          isServiceConnection = true;
        } else {
          // If we can't find the parent service, skip creating this edge in CMDBVisualization
          return;
        }
      }

      if (!sourceNode || !targetNode) {
        return;
      }

      // Gunakan status dari propagation calculation
      const edgeStatusInfo = edgeStatuses[edgeId];

      // Debug log for service-item-to-item edges
      if (sourceServiceItemId) {
        console.log('🔗 Service-item-to-item edge:', {
          edgeId,
          sourceServiceItemId,
          targetId,
          edgeStatusInfo,
          connType: conn.connection_type
        });
      }

      // Get connection type info (ONLY for label, NOT for color)
      const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);

      if (edgeStatusInfo) {
        // Gunakan effectiveEdgeStatus yang sudah memperhitungkan arah koneksi
        const effectiveStatus = edgeStatusInfo.effectiveEdgeStatus || edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.isPropagated);
        showCrossMarker = shouldShowCrossMarker(effectiveStatus);

        // Untuk group connection, gunakan warna purple jika active
        if (isGroupConnection && effectiveStatus === 'active') {
          strokeColor = '#8b5cf6';
        }
      } else {
        // Fallback ke logic lama
        const sourceItem = items.find(i => i.id === conn.source_id);
        if (sourceItem) {
          showCrossMarker = shouldShowCrossMarker(sourceItem.status);
          strokeColor = getStatusColor(sourceItem.status);
          if (isGroupConnection && sourceItem.status === 'active') {
            strokeColor = '#8b5cf6';
          }
        } else {
          strokeColor = isGroupConnection ? '#8b5cf6' : '#10b981';
          showCrossMarker = false;
        }
      }

      // Determine the actual source ID for the edge (must be before isEdgeHidden)
      // Must check source_service_item_id FIRST, then source_service_id, then source_id
      const actualSourceId = conn.source_service_item_id
        ? sourceIdForEdge // Already set to parent service node ID from line 367
        : (conn.source_service_id
          ? `service-${conn.source_service_id}`
          : String(conn.source_id));

      const isEdgeHidden = hiddenNodes.has(actualSourceId) || hiddenNodes.has(targetId);

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const connectionTypeLabel = conn.connection_type ? connectionTypeInfo.label : null;

      const edgeConfig = createEdgeConfig(
        edgeId,
        actualSourceId,
        targetId,
        sourceHandle,
        targetHandle,
        isGroupConnection,
        strokeColor,
        showCrossMarker,
        isEdgeHidden,
        conn.connection_type,
        connectionTypeLabel,
        showConnectionLabels
      );

      // Tambahkan info service item ke edge data untuk EdgeContextMenu
      // Jika edge mengandung "service-item" di ID, berarti ini terkait service item
      if (edgeId.includes('-service-item-')) {
        // Extract service item ID dari edge ID
        const serviceItemIdMatch = edgeId.match(/-service-item-(\d+)$/);
        if (serviceItemIdMatch) {
          const serviceItemId = serviceItemIdMatch[1];
          edgeConfig.data = {
            ...edgeConfig.data,
            serviceItemId: serviceItemId,
            // Jika source adalah service dan edge mengandung service-item,
            // berarti user memilih service item sebagai source dari service
            isSourceServiceItem: conn.source_service_id !== null && conn.target_id !== null
          };
        }
      }

      // Jika source adalah service item (dari source_service_item_id)
      if (sourceServiceItemId) {
        edgeConfig.data = {
          ...edgeConfig.data,
          serviceItemId: String(sourceServiceItemId),
          isSourceServiceItem: true
        };
      }

      // Tambahkan info propagasi ke edge data
      if (edgeStatusInfo && edgeStatusInfo.isPropagated) {
        edgeConfig.data = {
          ...edgeConfig.data,
          isPropagated: true,
          propagatedFrom: edgeStatusInfo.propagatedFrom,
          propagatedStatus: edgeStatusInfo.propagatedStatus,
        };

        edgeConfig.labelStyle = {
          ...edgeConfig.labelStyle,
          fontSize: 20,
          fontWeight: 'bold',
        };

        if (showCrossMarker) {
          edgeConfig.label = `✕`;
        }
      }

      flowEdges.push(edgeConfig);
    });

    // Create edges for group-to-item connections
    connections.forEach((conn) => {
      if (!conn.source_group_id || !conn.target_id) return;
      
      const sourceNode = flowNodes.find(n => n.id === `group-${conn.source_group_id}`);
      const targetNode = flowNodes.find(n => n.id === String(conn.target_id));
      
      if (!sourceNode || !targetNode) return;

      const edgeId = `group${conn.source_group_id}-e${conn.target_id}`;
      const isEdgeHidden = hiddenNodes.has(`group-${conn.source_group_id}`) || hiddenNodes.has(String(conn.target_id));

      // Gunakan status dari propagation calculation
      const edgeStatusInfo = edgeStatuses[edgeId];
      let strokeColor = '#8b5cf6';
      let showCrossMarker = false;

      if (edgeStatusInfo) {
        const effectiveStatus = edgeStatusInfo.effectiveEdgeStatus || edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.isPropagated);
        showCrossMarker = shouldShowCrossMarker(effectiveStatus);

        if (effectiveStatus === 'active') {
          strokeColor = '#8b5cf6';
        }
      }

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const edgeConfig = {
        id: edgeId,
        source: `group-${conn.source_group_id}`,
        target: String(conn.target_id),
        sourceHandle,
        targetHandle, 
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: { 
          stroke: strokeColor, 
          strokeWidth: 2.5,
          strokeDasharray: '8,4',
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        zIndex: 8,
        reconnectable: true, 
        hidden: isEdgeHidden,
      };

      // Tambahkan cross marker jika perlu
      if (showCrossMarker) {
        edgeConfig.label = '✕';
        edgeConfig.labelStyle = { 
          fill: strokeColor, 
          fontWeight: 'bold', 
          fontSize: 25,
          background: 'white',
          borderRadius: '50%',
        };
        edgeConfig.labelBgStyle = { 
          fill: 'white', 
          fillOpacity: 0,
        };
        edgeConfig.labelBgPadding = [8, 8];
        edgeConfig.labelBgBorderRadius = 50;
      }

      // Tambahkan info propagasi
      if (edgeStatusInfo && edgeStatusInfo.isPropagated) {
        edgeConfig.data = {
          isPropagated: true,
          propagatedFrom: edgeStatusInfo.propagatedFrom,
          propagatedStatus: edgeStatusInfo.propagatedStatus,
        };
        
        if (showCrossMarker) {
          edgeConfig.label = `✕`;
        }
      }

      flowEdges.push(edgeConfig);
    });

    // Create edges for group-to-group connections
    groupConnections.forEach((conn) => {
      const sourceId = `group-${conn.source_id}`;
      const targetId = `group-${conn.target_id}`;
      const sourceNode = flowNodes.find(n => n.id === sourceId);
      const targetNode = flowNodes.find(n => n.id === targetId);
      
      if (!sourceNode || !targetNode) return;
      
      const edgeId = `group-e${conn.source_id}-${conn.target_id}`;
      const isEdgeHidden = hiddenNodes.has(sourceId) || hiddenNodes.has(targetId);

      // Gunakan status dari propagation calculation
      const edgeStatusInfo = edgeStatuses[edgeId];
      let strokeColor = '#6366f1';
      let showCrossMarker = false;

      if (edgeStatusInfo) {
        const effectiveStatus = edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.propagatedStatus);
        showCrossMarker = shouldShowCrossMarker(effectiveStatus);
        
        if (effectiveStatus === 'active') {
          strokeColor = '#6366f1';
        }
      }

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const edgeConfig = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle, 
        targetHandle,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed', color: strokeColor },
        style: { 
          stroke: strokeColor, 
          strokeWidth: 3, 
          strokeDasharray: '5,5',
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        zIndex: 5,
        reconnectable: true, 
        hidden: isEdgeHidden,
      };

      // Tambahkan cross marker jika perlu
      if (showCrossMarker) {
        edgeConfig.label = '✕';
        edgeConfig.labelStyle = { 
          fill: strokeColor, 
          fontWeight: 'bold', 
          fontSize: 25,
          background: 'white',
          borderRadius: '50%',
        };
        edgeConfig.labelBgStyle = { 
          fill: 'white', 
          fillOpacity: 0,
        };
        edgeConfig.labelBgPadding = [8, 8];
        edgeConfig.labelBgBorderRadius = 50;
      }

      // Tambahkan info propagasi
      if (edgeStatusInfo && edgeStatusInfo.isPropagated) {
        edgeConfig.data = {
          isPropagated: true,
          propagatedFrom: edgeStatusInfo.propagatedFrom,
          propagatedStatus: edgeStatusInfo.propagatedStatus,
        };
        
        if (showCrossMarker) {
          edgeConfig.label = `✕`;
        }
      }

      flowEdges.push(edgeConfig);
    });

    return { flowNodes, flowEdges };
  }, [items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap, showConnectionLabels, onServiceClick, onServiceItemsClick, services, serviceItems]);

  return { transformToFlowData };
};