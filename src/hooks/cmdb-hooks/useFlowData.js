import { useCallback } from 'react';
import { 
  calculateGroupDimensions, 
  getBestHandlePositions,
  createEdgeConfig 
} from '../../utils/cmdb-utils/flowHelpers';
import { 
  calculatePropagatedStatuses,
  getStatusColor,
  shouldShowCrossMarker 
} from '../../utils/cmdb-utils/statusPropagation';

export const useFlowData = (items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap = {}) => {
  const transformToFlowData = useCallback(() => {
    const flowNodes = [];
    const flowEdges = [];

    // Hitung propagated statuses untuk semua edges
    const edgeStatuses = calculatePropagatedStatuses(items, connections, groups, groupConnections);

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
        },
        draggable: !isHidden,
        hidden: isHidden,
      });

      // Create item nodes in group
      groupItems.forEach((item, index) => {
        const row = Math.floor(index / dimensions.itemsPerRow);
        const col = index % dimensions.itemsPerRow;

        // Ambil services untuk item ini dari servicesMap
        const itemServices = servicesMap[item.id] || [];
        const serviceCount = itemServices.length;

        // Hitung tinggi item berdasarkan jumlah service
        const itemHeight = dimensions.getItemHeight ? dimensions.getItemHeight(serviceCount) : dimensions.baseItemHeight;

        // Hitung posisi Y berdasarkan kumulatif tinggi baris sebelumnya
        let relativeY = dimensions.padding + 40;
        for (let r = 0; r < row; r++) {
          relativeY += dimensions.rowHeights[r] + dimensions.gapY;
        }

        const relativeX = dimensions.padding + col * (dimensions.itemWidth + dimensions.gapX);

        const itemNodeId = String(item.id);
        const isItemHidden = hiddenNodes.has(itemNodeId) || isHidden;

        flowNodes.push({
          id: itemNodeId,
          type: 'custom',
          position: { x: relativeX, y: relativeY },
          parentNode: groupNodeId,
          extent: 'parent',
          data: {
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
            storage: item.storage || null, // Tambahkan storage
          },
          style: {
            width: dimensions.itemWidth,
            height: itemHeight,
            opacity: isItemHidden ? 0.3 : 1,
            pointerEvents: isItemHidden ? 'none' : 'all',
          },
          draggable: !isItemHidden,
          hidden: isItemHidden,
        });
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

      // Ambil services untuk item ini dari servicesMap
      const itemServices = servicesMap[item.id] || [];

      flowNodes.push({
        id: itemNodeId,
        type: 'custom',
        position: pos,
        data: {
          name: item.name,
          type: item.type,
          description: item.description,
          status: item.status,
          ip: item.ip,
          category: item.category,
          location: item.location,
          env_type: item.env_type,
          services: itemServices,
          storage: item.storage || null, // Tambahkan storage
        },
        style: {
          zIndex: 1,
          opacity: isHidden ? 0.3 : 1,
          pointerEvents: isHidden ? 'none' : 'all',
        },
        draggable: !isHidden,
        hidden: isHidden,
      });
    });

    // Create edges for item-to-item and item-to-group connections
    connections.forEach((conn) => {
      if (conn.source_group_id) return; // Skip, akan diprocess terpisah
      
      const sourceNode = flowNodes.find(n => n.id === String(conn.source_id));
      
      let targetNode, targetId, edgeId, strokeColor, isGroupConnection, showCrossMarker;
      
      if (conn.target_id) {
        targetNode = flowNodes.find(n => n.id === String(conn.target_id));
        targetId = String(conn.target_id);
        edgeId = `e${conn.source_id}-${conn.target_id}`;
        isGroupConnection = false;
      } else if (conn.target_group_id) {
        targetNode = flowNodes.find(n => n.id === `group-${conn.target_group_id}`);
        targetId = `group-${conn.target_group_id}`;
        edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
        isGroupConnection = true;
      }
      
      if (!sourceNode || !targetNode) return;

      // Gunakan status dari propagation calculation
      const edgeStatusInfo = edgeStatuses[edgeId];
      
      if (edgeStatusInfo) {
        // Jika edge terpropagasi, gunakan propagated status
        const effectiveStatus = edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.propagatedStatus);
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

      const isEdgeHidden = hiddenNodes.has(String(conn.source_id)) || hiddenNodes.has(targetId);

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      const edgeConfig = createEdgeConfig(
        edgeId,
        String(conn.source_id),
        targetId,
        sourceHandle,
        targetHandle,
        isGroupConnection,
        strokeColor,
        showCrossMarker,
        isEdgeHidden
      );

      // Tambahkan info propagasi ke edge data
      if (edgeStatusInfo && edgeStatusInfo.isPropagated) {
        edgeConfig.data = {
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
        const effectiveStatus = edgeStatusInfo.propagatedStatus || edgeStatusInfo.sourceStatus;
        strokeColor = getStatusColor(effectiveStatus, !!edgeStatusInfo.propagatedStatus);
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
  }, [items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap]);

  return { transformToFlowData };
};