import { useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';

export function usePositionSaving(nodes) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  const isSavingRef = useRef(false);
  const changedNodesRef = useRef(new Set());
  const lastNodePositionsRef = useRef({});
  const isManualActionRef = useRef(false);

  const autoSavePositions = useCallback(async () => {
    if (!isManualActionRef.current || isSavingRef.current) return;
    
    const changedNodeIds = Array.from(changedNodesRef.current);
    
    if (changedNodeIds.length === 0) return;
    
    isSavingRef.current = true;
    setIsAutoSaving(true);
    
    try {
      const updatePromises = [];
      
      changedNodeIds.forEach((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        if (node.type === 'custom' && !node.parentNode) {
          updatePromises.push(
            api.put(`/cmdb/${node.id}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true
            })
          );
        } else if (node.type === 'group') {
          const groupId = node.id.replace('group-', '');
          updatePromises.push(
            api.put(`/groups/${groupId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true
            })
          );
        }
      });

      await Promise.all(updatePromises);
      await api.post('/cmdb/trigger-update');
      
      nodes.forEach(node => {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      });
      changedNodesRef.current.clear();
      isManualActionRef.current = false;
      
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setIsAutoSaving(false);
      isSavingRef.current = false;
    }
  }, [nodes]);

  const handleSavePositions = useCallback(async () => {
    if (isSavingRef.current) {
      console.log('Save already in progress, skipping...');
      return;
    }
    
    const changedNodeIds = Array.from(changedNodesRef.current);
    
    if (changedNodeIds.length === 0) {
      toast.info('Tidak ada perubahan untuk disimpan');
      return;
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    
    try {
      const updatePromises = [];
      
      changedNodeIds.forEach((nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        if (node.type === 'custom' && !node.parentNode) {
          updatePromises.push(
            api.put(`/cmdb/${node.id}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true
            })
          );
        } else if (node.type === 'group') {
          const groupId = node.id.replace('group-', '');
          updatePromises.push(
            api.put(`/groups/${groupId}/position`, {
              position: { x: node.position.x, y: node.position.y },
              skipEmit: true
            })
          );
        }
      });

      await Promise.all(updatePromises);
      await api.post('/cmdb/trigger-update');
      
      nodes.forEach(node => {
        lastNodePositionsRef.current[node.id] = { ...node.position };
      });
      changedNodesRef.current.clear();
      
      toast.success(`Posisi berhasil disimpan!`);
      
    } catch (err) {
      toast.error('Gagal menyimpan posisi', {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [nodes]);

  const trackNodeChange = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const lastPos = lastNodePositionsRef.current[nodeId];
    const newPos = node.position;

    if (!lastPos || 
        Math.abs(lastPos.x - newPos.x) > 1 || 
        Math.abs(lastPos.y - newPos.y) > 1) {
      changedNodesRef.current.add(nodeId);
      isManualActionRef.current = true;
    }
  }, [nodes]);

  return {
    isSaving,
    isAutoSaving,
    changedNodesRef,
    lastNodePositionsRef,
    isManualActionRef,
    handleSavePositions,
    autoSavePositions,
    trackNodeChange,
  };
}