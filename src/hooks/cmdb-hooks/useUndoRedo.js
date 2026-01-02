import { useState, useCallback, useRef, useEffect } from 'react';

export const useUndoRedo = (maxHistorySize = 50) => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((state) => {
    // Skip jika ini adalah aksi undo/redo
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory(prev => {
      // Buang history setelah current index (jika ada redo history)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Tambah state baru
      newHistory.push(state);
      
      // Batasi ukuran history
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
    });
  }, [currentIndex, maxHistorySize]);

  const undo = useCallback(() => {
    if (!canUndo) return null;
    
    isUndoRedoAction.current = true;
    setCurrentIndex(prev => prev - 1);
    return history[currentIndex - 1];
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return null;
    
    isUndoRedoAction.current = true;
    setCurrentIndex(prev => prev + 1);
    return history[currentIndex + 1];
  }, [canRedo, currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    historyLength: history.length,
    currentIndex,
  };
};