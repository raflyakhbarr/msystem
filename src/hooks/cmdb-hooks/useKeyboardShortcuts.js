import { useEffect } from 'react';
import { toast } from 'sonner';

export function useKeyboardShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
  setNodes,
  handleSavePositions,
  highlightMode,
  highlightedNodeId,
  clearHighlight,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'Escape' && highlightMode && highlightedNodeId) {
        clearHighlight();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          const previousState = undo();
          if (previousState) {
            setNodes(previousState);
            toast.info('Undo', { duration: 1000 });
          }
        }
      }
      
      if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
          ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        if (canRedo) {
          const nextState = redo();
          if (nextState) {
            setNodes(nextState);
            toast.info('Redo', { duration: 1000 });
          }
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSavePositions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo, setNodes, handleSavePositions, highlightMode, highlightedNodeId, clearHighlight]);
}