import { useCallback } from 'react';
import { 
  calculateGroupDimensions, 
  getBestHandlePositions, 
  getStatusColor, 
  shouldShowCrossMarker,
  createEdgeConfig 
} from '../../utils/cmdb-utils/flowHelpers';

export const useFlowData = (items, connections, groups, groupConnections, edgeHandles, hiddenNodes) => {
  const transformToFlowData = useCallback(() => {
    const flowNodes = [];
    const flowEdges = [];

    groups.forEach((group) => {
      const groupItems = items
        .filter(item => item.group_id === group.id)
        .sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));
      
      const dimensions = calculateGroupDimensions(group.id, groupItems);
      
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

      groupItems.forEach((item, index) => {
        const row = Math.floor(index / dimensions.itemsPerRow);
        const col = index % dimensions.itemsPerRow;
        
        const relativeX = dimensions.padding + col * (dimensions.itemWidth + dimensions.gap);
        const relativeY = dimensions.padding + 40 + row * (dimensions.itemHeight + dimensions.gap);

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
          },
          style: {
            width: dimensions.itemWidth,
            opacity: isItemHidden ? 0.3 : 1,
            pointerEvents: isItemHidden ? 'none' : 'all',
          },
          draggable: !isItemHidden,
          hidden: isItemHidden,
        });
      });
    });

    const ungroupedItems = items.filter(item => !item.group_id);
    ungroupedItems.forEach((item) => {
      const pos = item.position
        ? { x: item.position.x, y: item.position.y }
        : { x: Math.random() * 400 + 600, y: Math.random() * 300 };

      const itemNodeId = String(item.id);
      const isHidden = hiddenNodes.has(itemNodeId);

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

    connections.forEach((conn) => {
      if (conn.source_group_id) return;
      
      const sourceNode = flowNodes.find(n => n.id === String(conn.source_id));
      
      let targetNode, targetId, edgeId, strokeColor, isGroupConnection, showCrossMarker;
      
      if (conn.target_id) {
        targetNode = flowNodes.find(n => n.id === String(conn.target_id));
        targetId = String(conn.target_id);
        edgeId = `e${conn.source_id}-${conn.target_id}`;
        isGroupConnection = false;
        
        const sourceItem = items.find(i => i.id === conn.source_id);
        if (sourceItem) {
          showCrossMarker = shouldShowCrossMarker(sourceItem.status);
          strokeColor = getStatusColor(sourceItem.status);
        } else {
          strokeColor = '#10b981';
          showCrossMarker = false;
        }
      } else if (conn.target_group_id) {
        targetNode = flowNodes.find(n => n.id === `group-${conn.target_group_id}`);
        targetId = `group-${conn.target_group_id}`;
        edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
        isGroupConnection = true;
        
        const sourceItem = items.find(i => i.id === conn.source_id);
        if (sourceItem) {
          showCrossMarker = shouldShowCrossMarker(sourceItem.status);
          strokeColor = getStatusColor(sourceItem.status === 'active' ? 'active-group' : sourceItem.status);
          if (sourceItem.status === 'active') strokeColor = '#8b5cf6';
        } else {
          strokeColor = '#8b5cf6';
          showCrossMarker = false;
        }
      }
      
      if (!sourceNode || !targetNode) return;

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

      flowEdges.push(edgeConfig);
    });

    connections.forEach((conn) => {
      if (!conn.source_group_id || !conn.target_id) return;
      
      const sourceNode = flowNodes.find(n => n.id === `group-${conn.source_group_id}`);
      const targetNode = flowNodes.find(n => n.id === String(conn.target_id));
      
      if (!sourceNode || !targetNode) return;

      const edgeId = `group${conn.source_group_id}-e${conn.target_id}`;
      const isEdgeHidden = hiddenNodes.has(`group-${conn.source_group_id}`) || hiddenNodes.has(String(conn.target_id));

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      flowEdges.push({
        id: edgeId,
        source: `group-${conn.source_group_id}`,
        target: String(conn.target_id),
        sourceHandle,
        targetHandle, 
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed', color: '#8b5cf6' },
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2.5,
          strokeDasharray: '8,4',
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        zIndex: 8,
        reconnectable: true, 
        hidden: isEdgeHidden,
      });
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

      let sourceHandle, targetHandle;
      if (edgeHandles[edgeId]) {
        sourceHandle = edgeHandles[edgeId].sourceHandle;
        targetHandle = edgeHandles[edgeId].targetHandle;
      } else {
        const handles = getBestHandlePositions(sourceNode, targetNode);
        sourceHandle = handles.sourceHandle;
        targetHandle = handles.targetHandle;
      }

      flowEdges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle, 
        targetHandle,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed', color: '#6366f1' },
        style: { 
          stroke: '#6366f1', 
          strokeWidth: 3, 
          strokeDasharray: '5,5',
          opacity: isEdgeHidden ? 0.2 : 1,
        },
        zIndex: 5,
        reconnectable: true, 
        hidden: isEdgeHidden,
      });
    });
    return { flowNodes, flowEdges };
  }, [items, connections, groups, groupConnections, edgeHandles, hiddenNodes]);

  return { transformToFlowData };
};