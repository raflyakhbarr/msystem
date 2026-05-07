/**
 * Utility untuk menghitung propagasi status secara recursive
 * Status dari dependency akan merambat ke semua dependent nodes
 */

import { CONNECTION_TYPES, getStatusColor, shouldShowCrossMarker } from './flowHelpers';

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
    let sourceId, targetId;

    // Determine source ID
    if (conn.source_service_item_id) {
      sourceId = `service-item-${conn.source_service_item_id}`;
    } else if (conn.source_service_id) {
      sourceId = `service-${conn.source_service_id}`;
    } else if (conn.source_id) {
      sourceId = String(conn.source_id);
    } else if (conn.source_group_id) {
      sourceId = `group-${conn.source_group_id}`;
    } else {
      return; // Skip jika tidak ada valid source
    }

    // Determine target ID
    if (conn.target_service_item_id) {
      targetId = `service-item-${conn.target_service_item_id}`;
    } else if (conn.target_service_id) {
      targetId = `service-${conn.target_service_id}`;
    } else if (conn.target_id) {
      targetId = String(conn.target_id);
    } else if (conn.target_group_id) {
      targetId = `group-${conn.target_group_id}`;
    } else {
      return; // Skip jika tidak ada valid target
    }

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
 * @param {Array} services - Array services (optional)
 * @param {Array} serviceItems - Array service items (optional)
 * @returns {Object} Map { edgeId: { propagatedStatus, sourceStatus } }
 */
export const calculatePropagatedStatuses = (items, connections, groups, groupConnections, services = [], serviceItems = []) => {
  const graph = buildDependencyGraph(connections, groupConnections);
  const edgeStatuses = {};

  // Map untuk quick lookup item status
  const itemStatusMap = {};
  items.forEach((item) => {
    itemStatusMap[String(item.id)] = item.status;
  });

  // Map untuk service status (services belong to CMDB items)
  const serviceStatusMap = {};
  services.forEach((service) => {
    serviceStatusMap[`service-${service.id}`] = service.status;
  });

  // Map untuk service item status (service items belong to services)
  const serviceItemStatusMap = {};
  serviceItems.forEach((serviceItem) => {
    const key = `service-item-${serviceItem.id}`;
    serviceItemStatusMap[key] = serviceItem.status;
  });

  // Function untuk mendapatkan status node (item, group, service, atau service item)
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
    } else if (nodeId.startsWith('service-item-')) {
      // MUST check service-item BEFORE service! (service-item-98 starts with service-)
      const status = serviceItemStatusMap[nodeId] || 'active';
      return status;
    } else if (nodeId.startsWith('service-')) {
      const status = serviceStatusMap[nodeId] || 'active';
      return status;
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

  // Check services for problematic status
  services.forEach((service) => {
    if (['inactive', 'maintenance', 'decommissioned'].includes(service.status)) {
      problematicNodes.add(`service-${service.id}`);
    }
  });

  // Check service items for problematic status
  serviceItems.forEach((serviceItem) => {
    if (['inactive', 'maintenance', 'decommissioned'].includes(serviceItem.status)) {
      problematicNodes.add(`service-item-${serviceItem.id}`);
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

  // Process all connections (item-to-item, item-to-service, service-to-item, service-item-to-item, etc.)
  connections.forEach((conn) => {
    // Determine source ID
    let sourceId;
    if (conn.source_service_item_id) {
      sourceId = `service-item-${conn.source_service_item_id}`;
    } else if (conn.source_service_id) {
      sourceId = `service-${conn.source_service_id}`;
    } else if (conn.source_id) {
      sourceId = String(conn.source_id);
    } else if (conn.source_group_id) {
      sourceId = `group-${conn.source_group_id}`;
    } else {
      return; // Skip jika tidak ada valid source
    }

    // Determine target ID
    let targetId;
    if (conn.target_service_item_id) {
      targetId = `service-item-${conn.target_service_item_id}`;
    } else if (conn.target_service_id) {
      targetId = `service-${conn.target_service_id}`;
    } else if (conn.target_id) {
      targetId = String(conn.target_id);
    } else if (conn.target_group_id) {
      targetId = `group-${conn.target_group_id}`;
    } else {
      return; // Skip jika tidak ada valid target
    }

    // Generate edge ID based on connection type
    let edgeId;
    if (conn.source_service_item_id) {
      // Service item as source: eservice-item-{serviceItemId}-{targetId}
      edgeId = `eservice-item-${conn.source_service_item_id}-${conn.target_id || conn.target_service_id || conn.target_group_id || conn.target_service_item_id}`;
    } else if (conn.source_service_id) {
      // Service as source: eservice-{serviceId}-{targetId}
      edgeId = `eservice-${conn.source_service_id}-${conn.target_id || conn.target_service_id || conn.target_group_id || conn.target_service_item_id}`;
    } else if (conn.target_service_item_id && !conn.target_service_id) {
      // Item to service item: e{source_id}-service-item-{serviceItemId}
      edgeId = `e${conn.source_id || conn.source_service_id || conn.source_group_id}-service-item-${conn.target_service_item_id}`;
    } else if (conn.target_service_id) {
      // Item to service: e{source_id}-service-{serviceId}
      edgeId = `e${conn.source_id || conn.source_service_id || conn.source_group_id}-service-${conn.target_service_id}`;
    } else if (conn.target_group_id) {
      // Item to group: e{source_id}-group{groupId}
      edgeId = `e${conn.source_id}-group${conn.target_group_id}`;
    } else {
      // Item to item: e{source_id}-{target_id}
      edgeId = `e${conn.source_id}-${conn.target_id}`;
    }

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