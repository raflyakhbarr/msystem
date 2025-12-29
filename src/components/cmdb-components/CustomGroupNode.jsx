import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomGroupNode = memo(({ data }) => {
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
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'hsl(var(--primary))' }}
      />

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

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'hsl(var(--primary))' }}
      />
    </div>
  );
});

CustomGroupNode.displayName = 'CustomGroupNode';

export default CustomGroupNode;