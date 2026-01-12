import { useState, useCallback, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';

const DIMENSIONS = {
  itemsPerRow: 3,
  itemWidth: 180,
  itemHeight: 120,
  gap: 60,
  padding: 40,
};

export function useDragAndDrop(nodes, setNodes, fetchAll) {
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const nodesRef = useRef([]);
  const isReorderingRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, startTime: 0 });

  const onNodeDragStart = useCallback((event, node) => {
    if (node.parentNode) {
      setDraggedNode(node.id);
      dragStateRef.current = { isDragging: true, startTime: Date.now() };
    }
  }, []);

  const onNodeDrag = useCallback((event, node) => {
    if (!node.parentNode || !draggedNode) return;

    const currentNodes = nodesRef.current;
    const groupNode = currentNodes.find(n => n.id === node.parentNode);
    if (!groupNode) return;

    const { itemsPerRow, itemWidth, itemHeight, gap, padding } = DIMENSIONS;
    const relX = node.position.x - padding;
    const relY = node.position.y - padding - 40;

    const col = Math.max(0, Math.min(itemsPerRow - 1, Math.round(relX / (itemWidth + gap))));
    const row = Math.max(0, Math.round(relY / (itemHeight + gap)));
    
    const newIndex = row * itemsPerRow + col;
    
    if (newIndex >= 0 && newIndex <= currentNodes.filter(n => n.parentNode === node.parentNode && n.id !== draggedNode).length) {
      setHoverPosition({
        groupId: node.parentNode,
        index: newIndex,
        relativeX: padding + col * (itemWidth + gap),
        relativeY: padding + 40 + row * (itemHeight + gap),
        absoluteX: groupNode.position.x + padding + col * (itemWidth + gap),
        absoluteY: groupNode.position.y + padding + 40 + row * (itemHeight + gap),
      });
    }
  }, [draggedNode]);

  const onNodeDragStop = useCallback(async (event, node) => {
    const dragDuration = Date.now() - dragStateRef.current.startTime;
    dragStateRef.current = { isDragging: false, startTime: 0 };

    if (dragDuration < 100) {
      setDraggedNode(null);
      setHoverPosition(null);
      return;
    }

    if (!draggedNode || !hoverPosition || !node.parentNode) {
      setDraggedNode(null);
      setHoverPosition(null);
      isReorderingRef.current = false;
      return;
    }

    try {
      await api.patch(`/cmdb/${node.id}/reorder`, {
        new_order: hoverPosition.index
      });

      setNodes(prevNodes => {
        const updatedNodes = prevNodes.map(n => {
          if (n.id === draggedNode) {
            return {
              ...n,
              position: {
                x: hoverPosition.relativeX,
                y: hoverPosition.relativeY
              },
              data: { 
                ...n.data, 
                orderInGroup: hoverPosition.index 
              }
            };
          }
          return n;
        });
        
        nodesRef.current = updatedNodes;
        return updatedNodes;
      });

      setTimeout(() => {
        isReorderingRef.current = false;
        fetchAll();
      }, 500);

    } catch (err) {
      console.error('Failed to reorder:', err);
      toast.error(`Gagal: ${err.response?.data?.error || err.message}`);
      isReorderingRef.current = false;
    } finally {
      setDraggedNode(null);
      setHoverPosition(null);
    }
  }, [draggedNode, hoverPosition, setNodes, fetchAll]);

  return {
    draggedNode,
    hoverPosition,
    nodesRef,
    handlers: {
      onNodeDragStart,
      onNodeDrag,
      onNodeDragStop,
    }
  };
}