import React from 'react';

export default function DragHoverIndicator({ hoverPosition, draggedNode }) {
  if (!hoverPosition || !draggedNode) return null;

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 102,
        border: '3px dashed #3b82f6',
        borderRadius: '8px',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        width: '180px',
        height: '120px',
        transform: `translate(${hoverPosition.absoluteX}px, ${hoverPosition.absoluteY}px)`,
        transition: 'transform 0.1s ease-out',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#3b82f6',
        fontWeight: 'bold',
        fontSize: '14px',
        backgroundColor: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        Drop Here
      </div>
    </div>
  );
}