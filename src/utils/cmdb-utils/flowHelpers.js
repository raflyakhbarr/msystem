import { MarkerType } from 'reactflow';
import api from '../../services/api';

export const calculateGroupDimensions = (groupId, groupItems, servicesMap = {}) => {
  const itemsPerRow = 3;
  const itemWidth = 160;
  const baseItemHeight = 100;     // Tinggi dasar item TANPA service
  const serviceHeight = 36;       // Tambahan tinggi per baris service (40px + gap)
  const servicesPerRow = 3;       // Jumlah service per baris dalam item
  const gapX = 40;                // Gap horizontal antar item (kiri-kanan)
  const gapY = 40;                // Gap vertikal antar baris (atas-bawah)
  const padding = 20;

  const itemCount = groupItems.length;
  const rows = Math.ceil(itemCount / itemsPerRow);

  // Hitung tinggi maksimum per item secara dinamis berdasarkan jumlah service
  const getItemHeight = (servicesCount = 0) => {
    if (servicesCount === 0) return baseItemHeight;
    const serviceRows = Math.ceil(servicesCount / servicesPerRow);
    return baseItemHeight + 20 + (serviceRows * serviceHeight); // 20px untuk padding service section
  };

  // Hitung tinggi untuk setiap item - AMBIL DARI servicesMap
  const itemHeights = groupItems.map(item => {
    const itemServices = servicesMap[item.id] || [];
    return getItemHeight(itemServices.length);
  });

  // Hitung tinggi per baris (ambil maksimum dari item di baris tersebut)
  const rowHeights = [];
  for (let row = 0; row < rows; row++) {
    const startIdx = row * itemsPerRow;
    const endIdx = Math.min(startIdx + itemsPerRow, itemCount);
    const itemsInRow = itemHeights.slice(startIdx, endIdx);
    rowHeights.push(Math.max(...itemsInRow));
  }

  // Total tinggi = jumlah dari tinggi setiap baris + gap antar baris
  const totalRowHeights = rowHeights.reduce((sum, height) => sum + height, 0);
  const totalGapY = (rows - 1) * gapY;

  const width = Math.min(itemsPerRow, itemCount) * (itemWidth + gapX) + padding * 2;
  const height = totalRowHeights + totalGapY + padding * 2 + 40;

  return {
    width,
    height,
    itemsPerRow,
    itemWidth,
    itemHeights,       // Array tinggi untuk setiap item
    rowHeights,        // Array tinggi untuk setiap baris
    baseItemHeight,
    gapX,
    gapY,
    padding,
    getItemHeight      // Fungsi helper untuk menghitung tinggi per item
  };
};

export const getBestHandlePositions = (sourceNode, targetNode) => {
  const sourceInGroup = sourceNode.parentNode;
  const targetInGroup = targetNode.parentNode;
  
  if (sourceNode.type === 'group' || targetNode.type === 'group') {
    let sourcePosX = sourceNode.position.x;
    let sourcePosY = sourceNode.position.y;
    let targetPosX = targetNode.position.x;
    let targetPosY = targetNode.position.y;
    
    if (sourceNode.type === 'group') {
      sourcePosX += (sourceNode.data.width || 200) / 2;
      sourcePosY += (sourceNode.data.height || 250) / 2;
    }
    
    if (targetNode.type === 'group') {
      targetPosX += (targetNode.data.width || 200) / 2;
      targetPosY += (targetNode.data.height || 250) / 2;
    }
    
    const dx = targetPosX - sourcePosX;
    const dy = targetPosY - sourcePosY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > absDy) {
      if (dx > 0) {
        return { sourceHandle: 'source-right', targetHandle: 'target-left' };
      } else {
        return { sourceHandle: 'source-left', targetHandle: 'target-right' };
      }
    } else {
      if (dy > 0) {
        return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
      } else {
        return { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
      }
    }
  }
  
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
      return '#ef4444';
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

export const loadEdgeHandles = async () => {
  try {
    const response = await api.get('/edge-handles');
    return response.data;
  } catch (err) {
    console.error('Gagal memuat konfigurasi edge dari database:', err);
    
    try {
      const saved = localStorage.getItem('cmdb_edge_handles');
      if (saved) {
        const handles = JSON.parse(saved);
        await saveEdgeHandles(handles);
        localStorage.removeItem('cmdb_edge_handles');
        return handles;
      }
    } catch (localErr) {
      console.error('Gagal memuat dari localStorage:', localErr);
    }
    
    return {};
  }
};

export const saveEdgeHandles = async (handles) => {
  try {
    await api.post('/edge-handles/bulk', { edgeHandles: handles });
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi edge ke database:', err);
  }
};

export const saveEdgeHandle = async (edgeId, sourceHandle, targetHandle) => {
  try {
    await api.post('/edge-handles', { 
      edgeId, 
      sourceHandle, 
      targetHandle 
    });
  } catch (err) {
    console.error('Gagal menyimpan edge handle ke database:', err);
  }
};

export const deleteEdgeHandle = async (edgeId) => {
  try {
    await api.delete(`/edge-handles/${edgeId}`);
  } catch (err) {
    console.error('Gagal menghapus edge handle dari database:', err);
  }
};