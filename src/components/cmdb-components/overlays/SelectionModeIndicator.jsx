import React from 'react';
import { FaSquare, FaMousePointer } from 'react-icons/fa';

export default function SelectionModeIndicator({ selectionMode, isSelecting }) {
  if (selectionMode === 'rectangle' && !isSelecting) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] px-4 text-white py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <FaSquare />
        <span>Click and drag to select multiple nodes</span>
      </div>
    );
  }

  if (selectionMode === 'single') {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <FaMousePointer />
        <span>Click nodes to select/deselect</span>
      </div>
    );
  }

  return null;
}
