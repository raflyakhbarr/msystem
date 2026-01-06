import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomGroupNode = memo(({ data }) => {
  // Warna handle berdasarkan primary color
  const handleColor = 'hsl(var(--primary))';
  
  return (
    <div
      style={{
        top: '-11px',
        left: '-11px',
        backgroundColor: data.color || 'hsl(var(--primary) / 0.15)',
        border: '2px solid hsl(var(--primary))',
        padding: '5px',
        minWidth: data.width || 200,
        minHeight: data.height || 250,
        position: 'relative',
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
      <div className="font-bold text-lg mb-1" style={{ color: 'hsl(var(--primary))' }}>
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

CustomGroupNode.displayName = 'CustomGroupNode';

export default CustomGroupNode;