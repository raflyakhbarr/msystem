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
      previousNodesRef.current = JSON.stringify(nodes);
      isInitialLoadRef.current = false;
      return;
    }

    const currentNodes = JSON.stringify(nodes);
    

    if (currentNodes !== previousNodesRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        debouncedSave();
        previousNodesRef.current = currentNodes;
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