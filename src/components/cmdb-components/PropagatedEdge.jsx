import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { useState } from 'react';

/**
 * PropagatedEdge - Custom edge component untuk menampilkan info propagasi
 */
export default function PropagatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label,
  labelStyle,
  labelBgStyle,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isPropagated = data?.isPropagated;
  const propagatedFrom = data?.propagatedFrom || [];
  const propagatedStatus = data?.propagatedStatus;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: labelStyle?.fontSize || 12,
              fontWeight: labelStyle?.fontWeight || 'bold',
              color: labelStyle?.fill || '#000',
              background: labelStyle?.background || 'white',
              padding: '4px 8px',
              borderRadius: labelStyle?.borderRadius || '4px',
              pointerEvents: 'all',
              cursor: isPropagated ? 'help' : 'default',
              border: isPropagated ? '2px dashed rgba(0,0,0,0.2)' : 'none',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {label}
            
            {/* Tooltip untuk propagated edge */}
            {showTooltip && isPropagated && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  background: 'rgba(0, 0, 0, 0.9)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Status Propagated
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  Status: {propagatedStatus}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  From: {propagatedFrom.length} source(s)
                </div>
                {/* Triangle pointer */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid rgba(0, 0, 0, 0.9)',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}