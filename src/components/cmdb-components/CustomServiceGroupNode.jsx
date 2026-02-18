import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomServiceGroupNode = memo(({ data, style }) => {
  // Warna handle berdasarkan service theme (green/teal untuk service level)
  const handleColor = '#10b981';

  return (
    <div
      style={{
        top: '-11px',
        left: '-11px',
        backgroundColor: data.color || 'rgba(16, 185, 129, 0.15)',
        border: '2px solid #10b981',
        padding: '5px',
        width: style?.width || data.width || 200,
        height: style?.height || data.height || 200,
        position: 'relative',
        borderRadius: '8px',
      }}
    >
      {/* TOP HANDLES */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={{
          background: handleColor,
          left: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        style={{
          background: handleColor,
          left: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />

      {/* BOTTOM HANDLES */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        style={{
          background: handleColor,
          left: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{
          background: handleColor,
          left: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />

      {/* LEFT HANDLES */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{
          background: handleColor,
          top: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        style={{
          background: handleColor,
          top: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />

      {/* RIGHT HANDLES */}
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={{
          background: handleColor,
          top: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{
          background: handleColor,
          top: '50%',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
      />

      {/* GROUP CONTENT */}
      <div className="font-bold text-base mb-1" style={{ color: '#059669' }}>
        {data.name}
      </div>

      {data.description && (
        <div className="text-xs text-muted-foreground mb-2">
          {data.description}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {data.itemCount || 0} items
      </div>
    </div>
  );
});

CustomServiceGroupNode.displayName = 'CustomServiceGroupNode';

export default CustomServiceGroupNode;
