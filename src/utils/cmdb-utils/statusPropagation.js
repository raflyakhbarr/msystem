/**
 * Utility untuk menghitung propagasi status secara recursive
 * Status dari dependency akan merambat ke semua dependent nodes
 */

import { CONNECTION_TYPES } from './flowHelpers';

/**
 * Build dependency graph dari connections
 * Graph structure: { nodeId: { dependencies: Set, dependents: Set } }
 * - dependencies: nodes yang node ini bergantung padanya (jika dependency bermasalah, node ini terpengaruh)
 * - dependents: nodes yang bergantung pada node ini (jika node ini bermasalah, dependent terpengaruh)
 *
 * @param {Array} connections - Array koneksi item-to-item dan item-to-group
 * @param {Array} groupConnections - Array koneksi group-to-group
 * @returns {Object} Graph dengan struktur { nodeId: { dependencies: Set, dependents: Set } }
 */
export const buildDependencyGraph = (connections, groupConnections) => {
  const graph = {};

  // Helper untuk inisialisasi node di graph
  const ensureNode = (nodeId) => {
    if (!graph[nodeId]) {
      graph[nodeId] = {
        dependencies: new Set(), // nodes yang node ini bergantung padanya (incoming edges)
        dependents: new Set(),   // nodes yang bergantung pada node ini (outgoing edges)
      };
    }
  };

  // Process item-to-item dan item-to-group connections
  connections.forEach((conn) => {
    const sourceId = String(conn.source_id);
    let targetId;

    if (conn.target_id) {
      targetId = String(conn.target_id);
    } else if (conn.target_group_id) {
      targetId = `group-${conn.target_group_id}`;
    }

    if (targetId) {
      ensureNode(sourceId);
      ensureNode(targetId);

      // Dapatkan tipe koneksi untuk menentukan arah propagasi
      const connType = conn.connection_type || 'depends_on';
      const connectionInfo = CONNECTION_TYPES[connType] || CONNECTION_TYPES.depends_on;
      const propagation = connectionInfo.propagation || 'target_to_source';

      // ✅ EXPLICIT PROPAGATION RULES (bukan forward/backward yang membingungkan)
      if (propagation === 'target_to_source') {
        // Target affects Source
        // Jika TARGET bermasalah → SOURCE terpengaruh
        // Source bergantung pada target
        // Example: depends_on (source depends on target)
        graph[sourceId].dependencies.add(targetId); // Source ← depends on ← Target
        graph[targetId].dependents.add(sourceId);   // Target → affects → Source

      } else if (propagation === 'source_to_target') {
        // Source affects Target
        // Jika SOURCE bermasalah → TARGET terpengaruh
        // Target bergantung pada source
        // Example: contains (container affects content), consumed_by (consumer affects provider)
        graph[targetId].dependencies.add(sourceId); // Target ← depends on ← Source
        graph[sourceId].dependents.add(targetId);   // Source → affects → Target

      } else if (propagation === 'both') {
        // Bidirectional: Saling mempengaruhi
        // Jika salah satu bermasalah → yang lain terpengaruh
        // Example: connects_to, related_to
        graph[sourceId].dependencies.add(targetId); // Source ← depends on ← Target
        graph[targetId].dependents.add(sourceId);   // Target → affects → Source
        graph[targetId].dependencies.add(sourceId); // Target ← depends on ← Source
        graph[sourceId].dependents.add(targetId);   // Source → affects → Target
      }
    }
  });

  // Process group-to-item connections (dari connections dengan source_group_id)
  connections.forEach((conn) => {
    if (conn.source_group_id && conn.target_id) {
      const sourceId = `group-${conn.source_group_id}`;
      const targetId = String(conn.target_id);

      ensureNode(sourceId);
      ensureNode(targetId);

      graph[sourceId].dependents.add(targetId);
      graph[targetId].dependencies.add(sourceId);
    }
  });

  // Process group-to-group connections
  groupConnections.forEach((conn) => {
    const sourceId = `group-${conn.source_id}`;
    const targetId = `group-${conn.target_id}`;

    ensureNode(sourceId);
    ensureNode(targetId);

    graph[sourceId].dependents.add(targetId);
    graph[targetId].dependencies.add(sourceId);
  });

  return graph;
};

/**
 * Menghitung semua nodes yang terpengaruh oleh status tertentu secara recursive
 * @param {string} nodeId - ID node yang menjadi sumber propagasi
 * @param {Object} graph - Dependency graph
 * @param {Set} visited - Set untuk tracking nodes yang sudah dikunjungi
 * @returns {Set} Set berisi semua nodeId yang terpengaruh
 */
const getAffectedNodesRecursive = (nodeId, graph, visited = new Set()) => {
  if (visited.has(nodeId) || !graph[nodeId]) {
    return visited;
  }

  visited.add(nodeId);

  // Traverse ke semua dependents (nodes yang bergantung pada node ini)
  const dependents = graph[nodeId].dependents;
  dependents.forEach((dependentId) => {
    getAffectedNodesRecursive(dependentId, graph, visited);
  });

  return visited;
};

/**
 * Menghitung propagated status untuk semua edges
 * @param {Array} items - Array semua items
 * @param {Array} connections - Array koneksi
 * @param {Array} groups - Array groups
 * @param {Array} groupConnections - Array group connections
 * @returns {Object} Map { edgeId: { propagatedStatus, sourceStatus } }
 */
export const calculatePropagatedStatuses = (items, connections, groups, groupConnections) => {
  const graph = buildDependencyGraph(connections, groupConnections);
  const edgeStatuses = {};

  // Map untuk quick lookup item status
  const itemStatusMap = {};
  items.forEach((item) => {
    itemStatusMap[String(item.id)] = item.status;
  });

  // Function untuk mendapatkan status node (item atau group)
  const getNodeStatus = (nodeId) => {
    if (nodeId.startsWith('group-')) {
      // Untuk group, kita cek apakah ada item di dalamnya yang bermasalah
      const groupId = parseInt(nodeId.replace('group-', ''));
      const groupItems = items.filter(item => item.group_id === groupId);
      
      // Jika ada item inactive/maintenance/decommissioned, group dianggap bermasalah
      const hasIssue = groupItems.some(item => 
        ['inactive', 'maintenance', 'decommissioned'].includes(item.status)
      );
      
      if (hasIssue) {
        // Ambil status terburuk
        const statuses = groupItems.map(item => item.status);
        if (statuses.includes('inactive') || statuses.includes('decommissioned')) {
          return 'inactive';
        }
        if (statuses.includes('maintenance')) {
          return 'maintenance';
        }
      }
      
      return 'active';
    } else {
      return itemStatusMap[nodeId] || 'active';
    }
  };

  // Collect semua nodes dengan status bermasalah
  const problematicNodes = new Set();
  
  // Check items
  items.forEach((item) => {
    if (['inactive', 'maintenance', 'decommissioned'].includes(item.status)) {
      problematicNodes.add(String(item.id));
    }
  });

  // Check groups (jika ada item bermasalah di dalamnya)
  groups.forEach((group) => {
    const groupItems = items.filter(item => item.group_id === group.id);
    const hasIssue = groupItems.some(item => 
      ['inactive', 'maintenance', 'decommissioned'].includes(item.status)
    );
    if (hasIssue) {
      problematicNodes.add(`group-${group.id}`);
    }
  });

  // Untuk setiap problematic node, hitung semua affected nodes
  const affectedNodesMap = new Map();
  problematicNodes.forEach((nodeId) => {
    const status = getNodeStatus(nodeId);
    const affected = getAffectedNodesRecursive(nodeId, graph, new Set());
    affected.delete(nodeId); // Hapus node itu sendiri
    
    affected.forEach((affectedId) => {
      if (!affectedNodesMap.has(affectedId)) {
        affectedNodesMap.set(affectedId, []);
      }
      affectedNodesMap.get(affectedId).push({ sourceId: nodeId, status });
    });
  });

  // Process item-to-item and item-to-group connections
  connections.forEach((conn) => {
    if (conn.source_group_id) return; // Skip group-to-item, process nanti

    const sourceId = String(conn.source_id);
    let targetId;
    let edgeId;

    if (conn.target_id) {
      targetId = String(conn.target_id);
      edgeId = `e${conn.source_id}-${conn.target_id}`;
    } else if (conn.target_group_id) {
      targetId = `group-${conn.target_group_id}`;
      edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
    }

    if (!targetId) return;

    const sourceStatus = getNodeStatus(sourceId);
    const targetStatus = getNodeStatus(targetId);

    // Dapatkan tipe koneksi untuk menentukan arah propagasi
    const connType = conn.connection_type || 'depends_on';
    const connectionInfo = CONNECTION_TYPES[connType] || CONNECTION_TYPES.depends_on;
    const propagation = connectionInfo.propagation || 'target_to_source';

    // Tentukan node mana yang merupakan dependent (yang terpengaruh)
    // dan node mana yang merupakan dependency (yang mempengaruhi)
    let dependentId, dependencyId;

    if (propagation === 'target_to_source') {
      // Target affects Source (source depends on target)
      dependentId = sourceId;
      dependencyId = targetId;
    } else if (propagation === 'source_to_target') {
      // Source affects Target (target depends on source)
      dependentId = targetId;
      dependencyId = sourceId;
    } else {
      // Bidirectional: Keduanya bisa terpengaruh, cek keduanya
      dependentId = null; // Special case
      dependencyId = null;
    }

    let propagatedStatus = null;
    let propagatedFrom = null;
    let isPropagated = false;
    let effectiveEdgeStatus = sourceStatus; // Default

    if (propagation === 'both') {
      // Untuk bidirectional, cek apakah salah satu node terpengaruh oleh node lain
      const sourceAffected = affectedNodesMap.has(sourceId);
      const targetAffected = affectedNodesMap.has(targetId);

      if (sourceAffected || targetAffected) {
        isPropagated = true;
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

        // Collect semua affecting sources
        let allAffecting = [];
        if (sourceAffected) allAffecting = allAffecting.concat(affectedNodesMap.get(sourceId));
        if (targetAffected) allAffecting = allAffecting.concat(affectedNodesMap.get(targetId));

        // Ambil status terburuk
        let worstStatus = 'active';
        allAffecting.forEach(({ status, sourceId: affSourceId }) => {
          if (priorities[status] > priorities[worstStatus]) {
            worstStatus = status;
          }
        });

        propagatedStatus = worstStatus;
        propagatedFrom = allAffecting.map(s => s.sourceId);
        effectiveEdgeStatus = worstStatus;
      } else {
        // Tidak ada propagasi, gunakan status terburuk dari source/target
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };
        effectiveEdgeStatus = priorities[sourceStatus] > priorities[targetStatus] ? sourceStatus : targetStatus;
      }
    } else {
      // Untuk source_to_target atau target_to_source, cek apakah dependent terpengaruh oleh dependency (atau node lain)
      const dependentAffected = affectedNodesMap.has(dependentId);

      if (dependentAffected) {
        isPropagated = true;
        const affectingSources = affectedNodesMap.get(dependentId);
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

        let worstStatus = 'active';
        affectingSources.forEach(({ status }) => {
          if (priorities[status] > priorities[worstStatus]) {
            worstStatus = status;
          }
        });

        propagatedStatus = worstStatus;
        propagatedFrom = affectingSources.map(s => s.sourceId);
        effectiveEdgeStatus = worstStatus;
      } else {
        // Tidak ada propagasi, edge menunjukkan status dependency
        effectiveEdgeStatus = dependencyId === targetId ? targetStatus : sourceStatus;
      }
    }

    edgeStatuses[edgeId] = {
      sourceId,
      targetId,
      sourceStatus,
      targetStatus,
      propagatedStatus,
      propagatedFrom,
      isPropagated,
      effectiveEdgeStatus,
      connectionType: connType,
      propagation,
    };
  });

  // Process group-to-item connections
  connections.forEach((conn) => {
    if (!conn.source_group_id || !conn.target_id) return;

    const sourceId = `group-${conn.source_group_id}`;
    const targetId = String(conn.target_id);
    const edgeId = `group${conn.source_group_id}-e${conn.target_id}`;

    const sourceStatus = getNodeStatus(sourceId);
    const targetStatus = getNodeStatus(targetId);

    // Group-to-item connections: Group affects items (group is dependency)
    const dependentId = targetId; // Item depends on group
    const dependencyId = sourceId; // Group affects item

    const dependentAffected = affectedNodesMap.has(dependentId);

    let propagatedStatus = null;
    let propagatedFrom = null;
    let isPropagated = false;
    let effectiveEdgeStatus = sourceStatus;

    if (dependentAffected) {
      isPropagated = true;
      const affectingSources = affectedNodesMap.get(dependentId);
      const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

      let worstStatus = 'active';
      affectingSources.forEach(({ status }) => {
        if (priorities[status] > priorities[worstStatus]) {
          worstStatus = status;
        }
      });

      propagatedStatus = worstStatus;
      propagatedFrom = affectingSources.map(s => s.sourceId);
      effectiveEdgeStatus = worstStatus;
    } else {
      // Tidak ada propagasi, edge menunjukkan status dependency (group)
      effectiveEdgeStatus = sourceStatus;
    }

    edgeStatuses[edgeId] = {
      sourceId,
      targetId,
      sourceStatus,
      targetStatus,
      propagatedStatus,
      propagatedFrom,
      isPropagated,
      effectiveEdgeStatus,
      connectionType: 'group_to_item',
      direction: 'forward',
    };
  });

  // Process group-to-group connections
  groupConnections.forEach((conn) => {
    const sourceId = `group-${conn.source_id}`;
    const targetId = `group-${conn.target_id}`;
    const edgeId = `group-e${conn.source_id}-${conn.target_id}`;

    const sourceStatus = getNodeStatus(sourceId);
    const targetStatus = getNodeStatus(targetId);

    // Group-to-group connections: Source group affects target group
    const dependentId = targetId; // Target depends on source
    const dependencyId = sourceId; // Source affects target

    const dependentAffected = affectedNodesMap.has(dependentId);

    let propagatedStatus = null;
    let propagatedFrom = null;
    let isPropagated = false;
    let effectiveEdgeStatus = sourceStatus;

    if (dependentAffected) {
      isPropagated = true;
      const affectingSources = affectedNodesMap.get(dependentId);
      const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };

      let worstStatus = 'active';
      affectingSources.forEach(({ status }) => {
        if (priorities[status] > priorities[worstStatus]) {
          worstStatus = status;
        }
      });

      propagatedStatus = worstStatus;
      propagatedFrom = affectingSources.map(s => s.sourceId);
      effectiveEdgeStatus = worstStatus;
    } else {
      // Tidak ada propagasi, edge menunjukkan status dependency (source group)
      effectiveEdgeStatus = sourceStatus;
    }

    edgeStatuses[edgeId] = {
      sourceId,
      targetId,
      sourceStatus,
      targetStatus,
      propagatedStatus,
      propagatedFrom,
      isPropagated,
      effectiveEdgeStatus,
      connectionType: 'group_to_group',
      direction: 'forward',
    };
  });

  return edgeStatuses;
};

/**
 * Mendapatkan warna berdasarkan status
 * @param {string} status - Status node
 * @param {boolean} isPropagated - Apakah status ini hasil propagasi
 * @returns {string} Hex color
 */
export const getStatusColor = (status, isPropagated = false) => {
  const colors = {
    active: '#10b981',      // green
    maintenance: '#f59e0b', // yellow/orange
    inactive: '#ef4444',    // red
    decommissioned: '#ef4444', // red
  };

  const color = colors[status] || colors.active;

  // Jika propagated, bisa kita buat sedikit lebih transparan atau berbeda
  // Untuk sekarang kita pakai warna yang sama
  return color;
};

/**
 * Cek apakah edge harus menampilkan cross marker
 * @param {string} status - Status untuk dicek
 * @returns {boolean}
 */
export const shouldShowCrossMarker = (status) => {
  return ['inactive', 'maintenance', 'decommissioned'].includes(status);
};