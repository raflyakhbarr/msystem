import { MarkerType } from 'reactflow';
import api from '../../services/api';
import { calculatePropagatedStatuses } from './statusPropagation';

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

// Connection type definitions - must match backend
// Using explicit propagation rules instead of forward/backward
// Propagation rules:
//   - 'target_to_source': If TARGET is down, SOURCE is affected
//   - 'source_to_target': If SOURCE is down, TARGET is affected
//   - 'both': Both affect each other (bidirectional)
export const CONNECTION_TYPES = {
  // ==================== DEPENDENCY RELATIONSHIPS ====================
  depends_on: {
    label: 'Depends On',
    color: '#3b82f6',
    propagation: 'target_to_source',
    description: 'Source depends on target. Jika target down, source affected.',
    short_desc: 'Source → needs → Target'
  },

  // ==================== RESOURCE CONSUMPTION ====================
  consumed_by: {
    label: 'Consumed By',
    color: '#f59e0b',
    propagation: 'source_to_target',
    description: 'Source consumes resources/services dari target. Jika source down, target tidak terpakai. Jika target down, source affected.',
    short_desc: 'Source → consumes → Target'
  },

  // ==================== CONNECTIVITY ====================
  connects_to: {
    label: 'Connects To',
    color: '#8b5cf6',
    propagation: 'both',
    description: 'Koneksi jaringan dua arah. Saling mempengaruhi.',
    short_desc: 'Source ↔ connects ↔ Target'
  },

  // ==================== CONTAINMENT ====================
  contains: {
    label: 'Contains',
    color: '#10b981',
    propagation: 'source_to_target',
    description: 'Source berisi/mengelola target. Jika container (source) down, content (target) affected.',
    short_desc: 'Source → contains → Target'
  },

  // ==================== MANAGEMENT ====================
  managed_by: {
    label: 'Managed By',
    color: '#a855f7',
    propagation: 'target_to_source',
    description: 'Source dikelola oleh target. Jika manager (target) down, source affected.',
    short_desc: 'Source ← managed by ← Target'
  },

  // ==================== DATA FLOW ====================
  data_flow_to: {
    label: 'Data Flow To',
    color: '#06b6d4',
    propagation: 'source_to_target',
    description: 'Data mengalir dari source ke target. Jika source down, flow ke target terhenti. Target affected.',
    short_desc: 'Source → data → Target'
  },

  // ==================== BACKUP & RECOVERY ====================
  backup_to: {
    label: 'Backup To',
    color: '#14b8a6',
    propagation: 'source_to_target',
    description: 'Source melakukan backup ke target. Jika backup server (target) down, source tidak bisa backup. Source affected.',
    short_desc: 'Source → backs up to → Target'
  },

  backed_up_by: {
    label: 'Backed Up By',
    color: '#14b8a6',
    propagation: 'target_to_source',
    description: 'Source di-backup oleh target. Jika backup server (target) down, source affected.',
    short_desc: 'Source ← backed up by ← Target'
  },

  // ==================== HOSTING & INFRASTRUCTURE ====================
  hosted_on: {
    label: 'Hosted On',
    color: '#6366f1',
    propagation: 'target_to_source',
    description: 'Source di-hosting pada target. Jika host (target) down, source affected.',
    short_desc: 'Source ← hosted on ← Target'
  },

  hosting: {
    label: 'Hosting',
    color: '#6366f1',
    propagation: 'source_to_target',
    description: 'Source meng-hosting target. Jika host (source) down, target affected.',
    short_desc: 'Source → hosts → Target'
  },

  // ==================== LICENSING ====================
  licensed_by: {
    label: 'Licensed By',
    color: '#eab308',
    propagation: 'target_to_source',
    description: 'Source dilisensikan oleh target. Jika license server (target) down, source affected.',
    short_desc: 'Source ← licensed by ← Target'
  },

  licensing: {
    label: 'Licensing',
    color: '#eab308',
    propagation: 'source_to_target',
    description: 'Source memberikan lisensi ke target. Jika license server (source) down, target affected.',
    short_desc: 'Source → licenses → Target'
  },

  // ==================== COMPOSITION ====================
  part_of: {
    label: 'Part Of',
    color: '#a855f7',
    propagation: 'target_to_source',
    description: 'Source merupakan bagian dari target. Jika whole (target) down, part (source) affected.',
    short_desc: 'Source ← part of ← Target'
  },

  comprised_of: {
    label: 'Comprised Of',
    color: '#a855f7',
    propagation: 'source_to_target',
    description: 'Source terdiri dari target. Jika component (target) down, source affected.',
    short_desc: 'Source → comprised of → Target'
  },

  // ==================== GENERAL RELATIONSHIP ====================
  related_to: {
    label: 'Related To',
    color: '#94a3b8',
    propagation: 'both',
    description: 'Hubungan umum antar item. Saling mempengaruhi.',
    short_desc: 'Source ↔ related ↔ Target'
  },

  // ==================== WORKFLOW/PROCESS ====================
  preceding: {
    label: 'Preceding',
    color: '#f97316',
    propagation: 'source_to_target',
    description: 'Source berjalan sebelum target dalam workflow. Jika source down, target terhenti.',
    short_desc: 'Source → precedes → Target'
  },

  succeeding: {
    label: 'Succeeding',
    color: '#f97316',
    propagation: 'target_to_source',
    description: 'Source berjalan setelah target dalam workflow. Jika target down, source terhenti.',
    short_desc: 'Source ← succeeds ← Target'
  },

  // ==================== SECURITY ====================
  encrypted_by: {
    label: 'Encrypted By',
    color: '#be123c',
    propagation: 'target_to_source',
    description: 'Source di-enkripsi oleh target. Jika encryption service (target) down, source affected.',
    short_desc: 'Source ← encrypted by ← Target'
  },

  encrypting: {
    label: 'Encrypting',
    color: '#be123c',
    propagation: 'source_to_target',
    description: 'Source meng-enkripsi target. Jika encryption service (source) down, target affected.',
    short_desc: 'Source → encrypts → Target'
  },

  authenticated_by: {
    label: 'Authenticated By',
    color: '#059669',
    propagation: 'target_to_source',
    description: 'Source diautentikasi oleh target. Jika auth server (target) down, source affected.',
    short_desc: 'Source ← authenticated by ← Target'
  },

  authenticating: {
    label: 'Authenticating',
    color: '#059669',
    propagation: 'source_to_target',
    description: 'Source mengautentikasi target. Jika auth service (source) down, target affected.',
    short_desc: 'Source → authenticates → Target'
  },

  // ==================== MONITORING ====================
  monitored_by: {
    label: 'Monitored By',
    color: '#ec4899',
    propagation: 'target_to_source',
    description: 'Source dimonitor oleh target. Jika monitoring service (target) down, source affected.',
    short_desc: 'Source ← monitored by ← Target'
  },

  monitoring: {
    label: 'Monitoring',
    color: '#ec4899',
    propagation: 'source_to_target',
    description: 'Source memonitor target. Jika monitoring service (source) down, target affected.',
    short_desc: 'Source → monitors → Target'
  },

  // ==================== LOAD BALANCING & HIGH AVAILABILITY ====================
  load_balanced_by: {
    label: 'Load Balanced By',
    color: '#8b5cf6',
    propagation: 'target_to_source',
    description: 'Source traffic di-load-balance oleh target. Jika LB (target) down, source affected.',
    short_desc: 'Source ← load balanced by ← Target'
  },

  load_balancing: {
    label: 'Load Balancing',
    color: '#8b5cf6',
    propagation: 'source_to_target',
    description: 'Source melakukan load balancing untuk target. Jika LB (source) down, target affected.',
    short_desc: 'Source → load balances → Target'
  },

  failing_over_to: {
    label: 'Failing Over To',
    color: '#ef4444',
    propagation: 'source_to_target',
    description: 'Source failover ke target jika terjadi kegagalan. Target adalah backup.',
    short_desc: 'Source → fails over to → Target'
  },

  failover_from: {
    label: 'Failover From',
    color: '#ef4444',
    propagation: 'target_to_source',
    description: 'Source menerima failover dari target. Source adalah backup.',
    short_desc: 'Source ← fails over from ← Target'
  },

  // ==================== DATA REPLICATION ====================
  replicating_to: {
    label: 'Replicating To',
    color: '#06b6d4',
    propagation: 'source_to_target',
    description: 'Source mereplikasi data ke target. Jika source (master) down, replica (target) outdated. Target affected.',
    short_desc: 'Source → replicates to → Target'
  },

  replicated_by: {
    label: 'Replicated By',
    color: '#06b6d4',
    propagation: 'target_to_source',
    description: 'Source direplikasi oleh target. Jika target (master) down, source affected.',
    short_desc: 'Source ← replicated by ← Target'
  },

  // ==================== PROXY & ROUTING ====================
  proxying_for: {
    label: 'Proxying For',
    color: '#f59e0b',
    propagation: 'source_to_target',
    description: 'Source menjadi proxy untuk target. Jika proxy (source) down, target affected.',
    short_desc: 'Source → proxies → Target'
  },

  proxied_by: {
    label: 'Proxied By',
    color: '#f59e0b',
    propagation: 'target_to_source',
    description: 'Source diproxy oleh target. Jika proxy (target) down, source affected.',
    short_desc: 'Source ← proxied by ← Target'
  },

  routed_through: {
    label: 'Routed Through',
    color: '#10b981',
    propagation: 'target_to_source',
    description: 'Source traffic dirouting melalui target. Jika router (target) down, source affected.',
    short_desc: 'Source ← routed through ← Target'
  },

  routing: {
    label: 'Routing',
    color: '#10b981',
    propagation: 'source_to_target',
    description: 'Source merouting traffic untuk target. Jika router (source) down, target affected.',
    short_desc: 'Source → routes → Target'
  },
};

export const getConnectionTypeInfo = (typeSlug) => {
  return CONNECTION_TYPES[typeSlug] || CONNECTION_TYPES.depends_on;
};

export const createEdgeConfig = (edgeId, sourceId, targetId, sourceHandle, targetHandle, isGroupConnection, strokeColor, showCrossMarker, isHidden, connectionType = null, connectionTypeLabel = null, showConnectionLabels = true) => {
  const edgeStyle = {
    stroke: strokeColor,
    strokeWidth: isGroupConnection ? 2.5 : 2,
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
    data: {
      connectionType: connectionType,
      connectionTypeLabel: connectionTypeLabel,
    },
  };

  // Show connection type label if available and labels are enabled
  if (connectionTypeLabel && !showCrossMarker && showConnectionLabels) {
    edgeConfig.label = connectionTypeLabel;
    edgeConfig.labelStyle = {
      fill: strokeColor,
      fontWeight: '500',
      fontSize: 11,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '4px',
      padding: '2px 6px',
    };
    edgeConfig.labelBgStyle = {
      fill: 'rgba(255, 255, 255, 0.95)',
      fillOpacity: 0.95,
    };
    edgeConfig.labelBgPadding = [4, 6];
    edgeConfig.labelBgBorderRadius = 4;
  }

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

export const saveEdgeHandles = async (handles, workspaceId) => {
  try {
    await api.post('/edge-handles/bulk', { edgeHandles: handles, workspace_id: workspaceId });
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi edge ke database:', err);
  }
};

export const saveEdgeHandle = async (edgeId, sourceHandle, targetHandle, workspaceId) => {
  try {
    await api.post('/edge-handles', {
      edgeId,
      sourceHandle,
      targetHandle,
      workspace_id: workspaceId
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

// ==================== SERVICE EDGE HANDLES ====================

// Load service edge handles from database
export const loadServiceEdgeHandles = async (serviceId, workspaceId) => {
  try {
    const response = await api.get(`/service-edge-handles/${serviceId}/edge-handles?workspace_id=${workspaceId}`);
    return response.data;
  } catch (err) {
    console.error('Gagal memuat konfigurasi service edge dari database:', err);
    return {};
  }
};

// Save a single service edge handle
export const saveServiceEdgeHandle = async (edgeId, sourceHandle, targetHandle, serviceId, workspaceId) => {
  try {
    await api.put(`/service-edge-handles/edge-handles/${edgeId}`, {
      sourceHandle,
      targetHandle,
      serviceId,
      workspace_id: workspaceId,
    });
  } catch (err) {
    console.error('Gagal menyimpan service edge handle ke database:', err);
  }
};

// Bulk save service edge handles
export const saveServiceEdgeHandles = async (handles, serviceId, workspaceId) => {
  try {
    await api.post(`/service-edge-handles/${serviceId}/edge-handles/bulk`, {
      edgeHandles: handles,
      workspace_id: workspaceId,
    });
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi service edge ke database:', err);
  }
};

// ==================== TRANSFORM HELPERS FOR SHARED VIEW ====================

/**
 * Transform items and groups to ReactFlow nodes (simplified version for shared view)
 */
export const transformItemsToNodes = (items, groups) => {
  const flowNodes = [];

  // Build servicesMap from items (services are already included in each item)
  const servicesMap = {};
  items.forEach(item => {
    servicesMap[item.id] = item.services || [];
  });

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
        rowHeights: dimensions.rowHeights,
      },
      style: {
        width: dimensions.width,
        height: dimensions.height,
        zIndex: 0,
      },
      draggable: false,
    });

    // Create item nodes in group
    groupItems.forEach((item, index) => {
      const itemServices = servicesMap[item.id] || [];
      const serviceCount = itemServices.length;
      const itemHeight = dimensions.getItemHeight
        ? dimensions.getItemHeight(serviceCount)
        : dimensions.baseItemHeight;

      const row = Math.floor(index / dimensions.itemsPerRow);
      const col = index % dimensions.itemsPerRow;

      let relativeY = dimensions.padding + 40;
      for (let r = 0; r < row; r++) {
        relativeY += dimensions.rowHeights[r] + dimensions.gapY;
      }

      const relativeX = dimensions.padding + col * (dimensions.itemWidth + dimensions.gapX);

      const itemNodeId = String(item.id);

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
          storage: item.storage || null,
        },
        style: {
          width: dimensions.itemWidth,
          height: itemHeight,
        },
        draggable: false,
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
        services: item.services || [],
        storage: item.storage || null,
      },
      style: {
        zIndex: 1,
      },
      draggable: false,
    });
  });

  return flowNodes;
};

/**
 * Transform connections to ReactFlow edges (simplified version for shared view)
 */
export const transformConnectionsToEdges = (connections, nodes) => {
  const flowEdges = [];

  connections.forEach((conn) => {
    if (conn.source_group_id) return; // Skip group-to-item, process separately

    const sourceNode = nodes.find(n => n.id === String(conn.source_id));

    let targetNode, targetId, edgeId, isGroupConnection;

    if (conn.target_id) {
      targetNode = nodes.find(n => n.id === String(conn.target_id));
      targetId = String(conn.target_id);
      edgeId = `e${conn.source_id}-${conn.target_id}`;
      isGroupConnection = false;
    } else if (conn.target_group_id) {
      targetNode = nodes.find(n => n.id === `group-${conn.target_group_id}`);
      targetId = `group-${conn.target_group_id}`;
      edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
      isGroupConnection = true;
    }

    if (!sourceNode || !targetNode) return;

    const handles = getBestHandlePositions(sourceNode, targetNode);

    // Get connection type info (ONLY for label, NOT for color)
    const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);
    // Use default green color for non-group connections (status-based color)
    const strokeColor = isGroupConnection ? '#8b5cf6' : '#10b981';
    const connectionTypeLabel = conn.connection_type ? connectionTypeInfo.label : null;

    const edgeConfig = createEdgeConfig(
      edgeId,
      String(conn.source_id),
      targetId,
      handles.sourceHandle,
      handles.targetHandle,
      isGroupConnection,
      strokeColor,
      false,
      false,
      conn.connection_type,
      connectionTypeLabel
    );

    flowEdges.push(edgeConfig);
  });

  // Process group-to-item connections
  connections.forEach((conn) => {
    if (!conn.source_group_id || !conn.target_id) return;

    const sourceNode = nodes.find(n => n.id === `group-${conn.source_group_id}`);
    const targetNode = nodes.find(n => n.id === String(conn.target_id));

    if (!sourceNode || !targetNode) return;

    const edgeId = `group${conn.source_group_id}-e${conn.target_id}`;
    const handles = getBestHandlePositions(sourceNode, targetNode);

    flowEdges.push({
      id: edgeId,
      source: `group-${conn.source_group_id}`,
      target: String(conn.target_id),
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      style: {
        stroke: '#8b5cf6',
        strokeWidth: 2.5,
      },
      zIndex: 8,
      reconnectable: true,
    });
  });

  return flowEdges;
};

/**
 * Transform connections to edges WITH status propagation support
 * Used in Share Mode where we need to show propagated status
 */
export const transformConnectionsWithPropagation = (
  connections,
  groupConnections,
  items,
  groups,
  nodes,
  edgeHandles = {}
) => {
  const flowEdges = [];

  // Calculate propagated statuses untuk warna edge yang tepat
  const edgeStatuses = calculatePropagatedStatuses(items, connections, groups, groupConnections);

  // Process item-to-item and item-to-group connections
  connections.forEach((conn) => {
    if (conn.source_group_id) return; // Skip group-to-item, process separately

    const sourceNode = nodes.find(n => n.id === String(conn.source_id));

    let targetNode, targetId, edgeId, isGroupConnection;

    if (conn.target_id) {
      targetNode = nodes.find(n => n.id === String(conn.target_id));
      targetId = String(conn.target_id);
      edgeId = `e${conn.source_id}-${conn.target_id}`;
      isGroupConnection = false;
    } else if (conn.target_group_id) {
      targetNode = nodes.find(n => n.id === `group-${conn.target_group_id}`);
      targetId = `group-${conn.target_group_id}`;
      edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
      isGroupConnection = true;
    }

    if (!sourceNode || !targetNode) return;

    // Gunakan status dari propagation calculation
    const edgeStatusInfo = edgeStatuses[edgeId];

    let strokeColor, showCrossMarker;

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
      // Fallback ke logic default
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

    // Gunakan edgeHandles jika tersedia, fallback ke getBestHandlePositions
    let sourceHandle, targetHandle;
    if (edgeHandles[edgeId]) {
      sourceHandle = edgeHandles[edgeId].sourceHandle;
      targetHandle = edgeHandles[edgeId].targetHandle;
    } else {
      const handles = getBestHandlePositions(sourceNode, targetNode);
      sourceHandle = handles.sourceHandle;
      targetHandle = handles.targetHandle;
    }

    // Get connection type info
    const connectionTypeInfo = getConnectionTypeInfo(conn.connection_type);
    const connectionTypeLabel = conn.connection_type ? connectionTypeInfo.label : null;

    const edgeConfig = createEdgeConfig(
      edgeId,
      String(conn.source_id),
      targetId,
      sourceHandle,
      targetHandle,
      isGroupConnection,
      strokeColor,
      showCrossMarker,
      false, // isHidden
      conn.connection_type,
      connectionTypeLabel
    );

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

  // Process group-to-item connections
  connections.forEach((conn) => {
    if (!conn.source_group_id || !conn.target_id) return;

    const sourceNode = nodes.find(n => n.id === `group-${conn.source_group_id}`);
    const targetNode = nodes.find(n => n.id === String(conn.target_id));

    if (!sourceNode || !targetNode) return;

    const edgeId = `group${conn.source_group_id}-e${conn.target_id}`;

    // Gunakan edgeHandles jika tersedia, fallback ke getBestHandlePositions
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
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      style: {
        stroke: '#8b5cf6',
        strokeWidth: 2.5,
      },
      zIndex: 8,
      reconnectable: true,
    });
  });

  // Process group-to-group connections
  groupConnections.forEach((conn) => {
    const edgeId = `ge${conn.source_id}-${conn.target_id}`;

    const sourceNode = nodes.find(n => n.id === `group-${conn.source_id}`);
    const targetNode = nodes.find(n => n.id === `group-${conn.target_id}`);

    if (!sourceNode || !targetNode) return;

    // Gunakan edgeHandles jika tersedia, fallback ke getBestHandlePositions
    let sourceHandle, targetHandle;
    if (edgeHandles[edgeId]) {
      sourceHandle = edgeHandles[edgeId].sourceHandle;
      targetHandle = edgeHandles[edgeId].targetHandle;
    } else {
      const handles = getBestHandlePositions(sourceNode, targetNode);
      sourceHandle = handles.sourceHandle;
      targetHandle = handles.targetHandle;
    }

    // Cek status group untuk menentukan warna
    let strokeColor = '#94a3b8';
    let showCrossMarker = false;

    if (conn.source_id) {
      const sourceGroup = groups.find(g => g.id === conn.source_id);
      if (sourceGroup) {
        const groupItems = items.filter(item => item.group_id === sourceGroup.id);
        const hasIssue = groupItems.some(item =>
          ['inactive', 'maintenance', 'decommissioned'].includes(item.status)
        );

        if (hasIssue) {
          const statuses = groupItems.map(item => item.status);
          if (statuses.includes('inactive') || statuses.includes('decommissioned')) {
            strokeColor = getStatusColor('inactive', false);
            showCrossMarker = shouldShowCrossMarker('inactive');
          } else if (statuses.includes('maintenance')) {
            strokeColor = getStatusColor('maintenance', false);
            showCrossMarker = shouldShowCrossMarker('maintenance');
          }
        }
      }
    }

    const edgeConfig = createEdgeConfig(
      edgeId,
      `group-${conn.source_id}`,
      `group-${conn.target_id}`,
      sourceHandle,
      targetHandle,
      true, // isGroupConnection
      strokeColor,
      showCrossMarker,
      false // isHidden
    );

    flowEdges.push(edgeConfig);
  });

  return flowEdges;
};