import React from 'react';

export default function SelectionRectangle({ selectionRect }) {
  if (!selectionRect) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: selectionRect.left,
        top: selectionRect.top,
        width: selectionRect.width,
        height: selectionRect.height,
        border: '2px dashed #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  );
}