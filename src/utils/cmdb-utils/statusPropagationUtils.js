import api from '../services/api';

/**
 * Update status di backend untuk item/service/service item yang terpengaruh oleh propagation
 * @param {Object} affectedNodesMap - Map dari affected nodes dengan status mereka
 * @param {Object} itemStatusMap - Map dari item ID ke item object
 * @param {Object} serviceStatusMap - Map dari service ID ke service object
 * @param {Object} serviceItemStatusMap - Map dari service item ID ke service item object
 * @returns {Promise} Promise yang resolve ketika semua status selesai di-update
 */
export const updatePropagatedStatuses = async (affectedNodesMap, itemStatusMap, serviceStatusMap, serviceItemStatusMap) => {
  const updatePromises = [];

  // Update items
  affectedNodesMap.forEach((affectingSources, nodeId) => {
    if (!nodeId.startsWith('service-') && !nodeId.startsWith('service-item-') && !nodeId.startsWith('group-')) {
      // This is a CMDB item
      const item = itemStatusMap[nodeId];
      if (item) {
        // Get worst status from affecting sources
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };
        let worstStatus = 'active';
        affectingSources.forEach(({ status }) => {
          if (priorities[status] > priorities[worstStatus]) {
            worstStatus = status;
          }
        });

        // Only update if status is different
        if (item.status !== worstStatus) {
          console.log(`📤 Updating item ${nodeId} status: ${item.status} → ${worstStatus}`);
          updatePromises.push(
            api.patch(`/cmdb/${nodeId}/status`, { status: worstStatus })
              .catch(err => console.error(`Failed to update item ${nodeId} status:`, err))
          );
        }
      }
    }
  });

  // Update services
  affectedNodesMap.forEach((affectingSources, nodeId) => {
    if (nodeId.startsWith('service-')) {
      const serviceId = parseInt(nodeId.replace('service-', ''));
      const service = serviceStatusMap[nodeId];
      if (service) {
        // Get worst status from affecting sources
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };
        let worstStatus = 'active';
        affectingSources.forEach(({ status }) => {
          if (priorities[status] > priorities[worstStatus]) {
            worstStatus = status;
          }
        });

        // Only update if status is different
        if (service.status !== worstStatus) {
          console.log(`📤 Updating service ${serviceId} status: ${service.status} → ${worstStatus}`);
          updatePromises.push(
            api.patch(`/services/${serviceId}/status`, { status: worstStatus })
              .catch(err => console.error(`Failed to update service ${serviceId} status:`, err))
          );
        }
      }
    }
  });

  // Update service items
  affectedNodesMap.forEach((affectingSources, nodeId) => {
    if (nodeId.startsWith('service-item-')) {
      const serviceItemId = parseInt(nodeId.replace('service-item-', ''));
      const serviceItem = serviceItemStatusMap[nodeId];
      if (serviceItem) {
        // Get worst status from affecting sources
        const priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 };
        let worstStatus = 'active';
        affectingSources.forEach(({ status }) => {
          if (priorities[status] > priorities[worstStatus]) {
            worstStatus = status;
          }
        });

        // Only update if status is different
        if (serviceItem.status !== worstStatus) {
          console.log(`📤 Updating service item ${serviceItemId} status: ${serviceItem.status} → ${worstStatus}`);
          updatePromises.push(
            api.patch(`/service-items/${serviceItemId}/status`, { status: worstStatus })
              .catch(err => console.error(`Failed to update service item ${serviceItemId} status:`, err))
          );
        }
      }
    }
  });

  // Execute all updates in parallel
  await Promise.all(updatePromises);
  console.log(`✅ Updated ${updatePromises.length} propagated statuses`);
};

/**
 * Hitung semua nodes yang terpengaruh dan update status mereka di backend
 * @param {string} sourceNodeId - Node ID yang status-nya berubah
 * @param {string} newStatus - Status baru dari source node
 * @param {Array} items - Array semua items
 * @param {Array} connections - Array koneksi
 * @param {Array} groups - Array groups
 * @param {Array} groupConnections - Array group connections
 * @param {Array} services - Array services
 * @param {Object} serviceItems - Object service items (grouped by service ID)
 */
export const propagateStatusUpdate = async (sourceNodeId, newStatus, items, connections, groups, groupConnections, services, serviceItems) => {
  const { buildDependencyGraph, getAffectedNodesRecursive } = require('./statusPropagation');

  // Build dependency graph
  const graph = buildDependencyGraph(connections, groupConnections);

  // Get all affected nodes
  const affectedNodes = getAffectedNodesRecursive(sourceNodeId, graph);
  affectedNodes.delete(sourceNodeId); // Remove source node itself

  if (affectedNodes.size === 0) {
    console.log('ℹ️ No nodes affected by status change');
    return;
  }

  console.log(`🔄 Propagating status ${newStatus} from ${sourceNodeId} to ${affectedNodes.size} nodes`);

  // Create status maps
  const itemStatusMap = {};
  items.forEach((item) => {
    itemStatusMap[String(item.id)] = item;
  });

  const serviceStatusMap = {};
  services.forEach((service) => {
    serviceStatusMap[`service-${service.id}`] = service;
  });

  const serviceItemStatusMap = {};
  Object.entries(serviceItems).forEach(([serviceId, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        serviceItemStatusMap[`service-item-${item.id}`] = item;
      });
    }
  });

  // Create affected nodes map
  const affectedNodesMap = new Map();
  affectedNodes.forEach((nodeId) => {
    affectedNodesMap.set(nodeId, [{ sourceId: sourceNodeId, status: newStatus }]);
  });

  // Update all affected nodes in backend
  await updatePropagatedStatuses(affectedNodesMap, itemStatusMap, serviceStatusMap, serviceItemStatusMap);
};
