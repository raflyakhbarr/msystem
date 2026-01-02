import { MarkerType } from 'reactflow';

export const calculateGroupDimensions = (groupId, groupItems) => {
  const itemsPerRow = 3;
  const itemWidth = 180;
  const itemHeight = 120;
  const gap = 60;
  const padding = 40;
  
  const itemCount = groupItems.length;
  const rows = Math.ceil(itemCount / itemsPerRow);
  
  const width = Math.min(itemsPerRow, itemCount) * (itemWidth + gap) + padding * 2;
  const height = rows * (itemHeight + gap) + padding * 2 + 40;
  
  return { width, height, itemsPerRow, itemWidth, itemHeight, gap, padding };
};

export const getBestHandlePositions = (sourceNode, targetNode) => {
  const sourceInGroup = sourceNode.parentNode;
  const targetInGroup = targetNode.parentNode;
  
  if (!sourceInGroup || !targetInGroup || sourceInGroup !== targetInGroup) {
    return {
      sourceHandle: 'source-bottom',
      targetHandle: 'target-top'
    };
  }

  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
    if (dx > 0) {
      return {
        sourceHandle: 'source-right',
        targetHandle: 'target-left'
      };
    } else {
      return {
        sourceHandle: 'source-left',
        targetHandle: 'target-right'
      };
    }
  } else {
    if (dy > 0) {
      return {
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top'
      };
    } else {
      return {
        sourceHandle: 'source-top',
        targetHandle: 'target-bottom'
      };
    }
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'inactive':
      return '#9ca3af';
    case 'maintenance':
      return '#f59e0b';
    case 'decommissioned':
      return '#ef4444';
    default:
      return '#10b981';
  }
};

export const shouldShowCrossMarker = (status) => {
  return ['inactive', 'maintenance', 'decommissioned'].includes(status);
};

export const createEdgeConfig = (edgeId, sourceId, targetId, sourceHandle, targetHandle, isGroupConnection, strokeColor, showCrossMarker, isHidden) => {
  const edgeStyle = { 
    stroke: strokeColor, 
    strokeWidth: isGroupConnection ? 2.5 : 2,
    strokeDasharray: isGroupConnection ? '8,4' : undefined,
    opacity: isHidden ? 0.2 : 1,
  };

  const edgeConfig = {
    id: edgeId,
    source: sourceId,
    target: targetId,
    sourceHandle: sourceHandle,
    targetHandle: targetHandle,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
    style: edgeStyle,
    zIndex: isGroupConnection ? 8 : 10,
    reconnectable: true,
    hidden: isHidden,
  };

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

  return edgeConfig;
};

export const loadEdgeHandles = () => {
  try {
    const saved = localStorage.getItem('cmdb_edge_handles');
    return saved ? JSON.parse(saved) : {};
  } catch (err) {
    console.error('Gagal memuat konfigurasi edge:', err);
    return {};
  }
};

export const saveEdgeHandles = (handles) => {
  try {
    localStorage.setItem('cmdb_edge_handles', JSON.stringify(handles));
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi edge:', err);
  }
};