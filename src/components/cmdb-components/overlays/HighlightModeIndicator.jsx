import React from 'react';
import { FaProjectDiagram } from 'react-icons/fa';

export default function HighlightModeIndicator({ highlightMode, highlightedNodeId, onClear }) {
  if (!highlightMode) return null;

  if (!highlightedNodeId) {
    return (
      <div className="absolute top-30 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <FaProjectDiagram />
        <span>Click node to highlight dependencies</span>
      </div>
    );
  }

  return (
    <div className="absolute top-30 left-1/2 transform -translate-x-1/2 bg-[rgba(0,105,140,0.5)] px-4 text-white py-2 rounded-lg shadow-lg z-50 flex items-center gap-3">
      <FaProjectDiagram />
      <span>Selected node and highlighted dependencies</span>
      <button
        onClick={onClear}
        className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs transition-colors"
      >
        Clear (ESC)
      </button>
    </div>
  );
}
