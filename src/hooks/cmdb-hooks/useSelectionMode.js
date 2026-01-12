import { useMemo, useCallback, useRef } from 'react';

export function useSelectionMode(
  state,
  actions,
  reactFlowWrapper,
  reactFlowInstance,
  nodes
) {
  const { selectionMode, isSelecting, selectionStart, selectionEnd } = state;
  
  // Use ref to avoid recreating callbacks
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onMouseDown = useCallback((event) => {
    if (selectionMode !== 'rectangle') return;
    
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    actions.startSelection({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, [selectionMode, actions, reactFlowWrapper]);

  const onMouseMove = useCallback((event) => {
    if (!isSelecting || selectionMode !== 'rectangle') return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    actions.updateSelection({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, [isSelecting, selectionMode, actions, reactFlowWrapper]);

  const onMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !reactFlowInstance.current) {
      actions.endSelection();
      return;
    }

    const viewport = reactFlowInstance.current.getViewport();
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    const flowMinX = (minX - viewport.x) / viewport.zoom;
    const flowMaxX = (maxX - viewport.x) / viewport.zoom;
    const flowMinY = (minY - viewport.y) / viewport.zoom;
    const flowMaxY = (maxY - viewport.y) / viewport.zoom;

    const currentNodes = nodesRef.current;
    const selectedNodes = currentNodes.filter(node => {
      if (node.type === 'group') {
        const centerX = node.position.x + (node.data.width || 0) / 2;
        const centerY = node.position.y + (node.data.height || 0) / 2;
        return centerX >= flowMinX && centerX <= flowMaxX &&
               centerY >= flowMinY && centerY <= flowMaxY;
      }
      
      const nodeX = node.parentNode 
        ? currentNodes.find(n => n.id === node.parentNode)?.position.x + node.position.x
        : node.position.x;
      const nodeY = node.parentNode
        ? currentNodes.find(n => n.id === node.parentNode)?.position.y + node.position.y
        : node.position.y;
      
      return nodeX >= flowMinX && nodeX <= flowMaxX &&
             nodeY >= flowMinY && nodeY <= flowMaxY;
    });

    actions.addSelectedForHiding(selectedNodes.map(n => n.id));
    actions.endSelection();
  }, [isSelecting, selectionStart, selectionEnd, actions, reactFlowInstance]);

  const selectionRect = useMemo(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;
    
    return {
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };
  }, [isSelecting, selectionStart, selectionEnd]);

  return {
    selectionRect,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
    }
  };
}