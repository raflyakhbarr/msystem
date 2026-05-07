import { useState, useCallback, useMemo } from 'react';

export const useNodeRelationships = (nodes, edges) => {
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);

  // Build relationship map
  const relationshipMap = useMemo(() => {
    const map = {
      dependencies: {}, // nodes that this node depends on (incoming)
      dependents: {}, // nodes that depend on this node (outgoing)
      all: {}, // all related nodes
    };

    edges.forEach(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;

      // Dependencies: target depends on source
      if (!map.dependencies[targetId]) {
        map.dependencies[targetId] = new Set();
      }
      map.dependencies[targetId].add(sourceId);

      // Dependents: source has dependent target
      if (!map.dependents[sourceId]) {
        map.dependents[sourceId] = new Set();
      }
      map.dependents[sourceId].add(targetId);

      // All relationships
      if (!map.all[sourceId]) {
        map.all[sourceId] = new Set();
      }
      if (!map.all[targetId]) {
        map.all[targetId] = new Set();
      }
      map.all[sourceId].add(targetId);
      map.all[targetId].add(sourceId);
    });

    return map;
  }, [edges]);

  // Get all related nodes recursively
  const getRelatedNodes = useCallback((nodeId) => {
    if (!nodeId) return new Set();

    const related = new Set([nodeId]);
    const visited = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Add dependencies
      const dependencies = relationshipMap.dependencies[currentId];
      if (dependencies) {
        dependencies.forEach(depId => {
          related.add(depId);
          if (!visited.has(depId)) {
            queue.push(depId);
          }
        });
      }

      // Add dependents
      const dependents = relationshipMap.dependents[currentId];
      if (dependents) {
        dependents.forEach(depId => {
          related.add(depId);
          if (!visited.has(depId)) {
            queue.push(depId);
          }
        });
      }
    }

    // Include parent/child nodes (items in groups, ServiceAsNodes in CMDB items)
    const additionalNodes = new Set();

    // ✅ MULTIPLE PASS FIX: Keep adding parents/children until no more changes
    // This ensures we capture ALL hierarchical relationships (parent → child → grandchild, etc.)
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Safety limit to prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      const previousSize = additionalNodes.size;

      nodes.forEach(node => {
        // ✅ PASS 1: Include ALL connected nodes regardless of type
        // This ensures ServiceAsNodes and other independent nodes are included
        if (!related.has(node.id) && !additionalNodes.has(node.id)) {
          // Check if this node has any edge connection to nodes in related set
          const hasConnectionToRelated = edges.some(edge =>
            (related.has(edge.source) && edge.target === node.id) ||
            (related.has(edge.target) && edge.source === node.id) ||
            (additionalNodes.has(edge.source) && edge.target === node.id) ||
            (additionalNodes.has(edge.target) && edge.source === node.id)
          );

          if (hasConnectionToRelated) {
            additionalNodes.add(node.id);
            changed = true;
          }
        }

        // ✅ PASS 2: If ANY node (in related or additional) has parent, include parent
        // This ensures parent CMDB items of ServiceAsNodes are included
        if ((related.has(node.id) || additionalNodes.has(node.id)) && node.parentNode) {
          if (!additionalNodes.has(node.parentNode) && !related.has(node.parentNode)) {
            additionalNodes.add(node.parentNode);
            changed = true;
          }
        }

        // ✅ PASS 3: If parent is in related or additional, include all children
        // This ensures all ServiceAsNodes in a CMDB item are included
        if ((related.has(node.id) || additionalNodes.has(node.id)) &&
            (node.type === 'group' || node.type === 'custom' || node.type === 'serviceAsNode')) {
          nodes.forEach(child => {
            if (child.parentNode === node.id) {
              if (!additionalNodes.has(child.id) && !related.has(child.id)) {
                additionalNodes.add(child.id);
                changed = true;
              }
            }
          });
        }
      });

      // If no new nodes were added in this iteration, we're done
      if (additionalNodes.size === previousSize) {
        break;
      }
    }

    additionalNodes.forEach(id => related.add(id));

    return related;
  }, [relationshipMap, nodes]);

  const highlightNode = useCallback((nodeId) => {
    setHighlightedNodeId(nodeId);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedNodeId(null);
  }, []);

  const relatedNodes = useMemo(() => {
    if (!highlightedNodeId) return null;
    return getRelatedNodes(highlightedNodeId);
  }, [highlightedNodeId, getRelatedNodes]);

  const getRelatedEdges = useCallback((nodeId) => {
    if (!nodeId) return new Set();

    const relatedNodeSet = getRelatedNodes(nodeId);
    const relatedEdgeIds = new Set();

    edges.forEach(edge => {
      if (relatedNodeSet.has(edge.source) || relatedNodeSet.has(edge.target)) {
        relatedEdgeIds.add(edge.id);
      }
    });

    return relatedEdgeIds;
  }, [edges, getRelatedNodes]);

  const relatedEdges = useMemo(() => {
    if (!highlightedNodeId) return null;
    return getRelatedEdges(highlightedNodeId);
  }, [highlightedNodeId, getRelatedEdges]);

  return {
    highlightedNodeId,
    relatedNodes,
    relatedEdges,
    highlightNode,
    clearHighlight,
    getDependencies: (nodeId) => relationshipMap.dependencies[nodeId] || new Set(),
    getDependents: (nodeId) => relationshipMap.dependents[nodeId] || new Set(),
  };
};