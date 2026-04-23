import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export const useAutoSave = (nodes, saveFunction, delay = 2000, enabled = true) => {
  const timeoutRef = useRef(null);
  const previousNodesRef = useRef(null);
  const isSavingRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  const debouncedSave = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    try {
      isSavingRef.current = true;
      await saveFunction();

    } catch (error) {
      toast.error('Gagal menyimpan otomatis', {
        description: error.message,
        duration: 2000,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFunction, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    if (isInitialLoadRef.current) {
      // Only clone node positions to avoid DataCloneError with functions in node.data
      previousNodesRef.current = nodes.map(node => ({
        id: node.id,
        position: { ...node.position }
      }));
      isInitialLoadRef.current = false;
      return;
    }

    // Optimized comparison - only check node positions, not entire data
    const nodesChanged = nodes.some((node, index) => {
      const prevNode = previousNodesRef.current[index];
      if (!prevNode) return true;

      // Only compare position, ignore other properties for performance
      return (
        node.position.x !== prevNode.position.x ||
        node.position.y !== prevNode.position.y ||
        node.id !== prevNode.id
      );
    });

    if (nodesChanged) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        debouncedSave();
        // Update previous nodes ref - only store positions
        previousNodesRef.current = nodes.map(node => ({
          id: node.id,
          position: { ...node.position }
        }));
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, debouncedSave, delay, enabled]);

  return { isSaving: isSavingRef.current };
};