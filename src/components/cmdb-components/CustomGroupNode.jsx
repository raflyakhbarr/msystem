import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const CustomGroupNode = memo(({ data }) => {
  return (
    <div
      style={{
        top: '-11px',
        left: '-11px',
        backgroundColor: data.color || '#e0e7ff',
        border: '2px solid #6366f1',
        padding: '5px',
        minWidth: data.width || 200,
        minHeight: data.height || 250,
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#6366f1' }}
      />
      
      <div className="font-bold text-lg mb-1" style={{ color: '#312e81' }}>
        {data.name}
      </div>
      
      {data.description && (
        <div className="text-xs text-gray-600 mb-2">
          {data.description}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        {data.itemCount || 0} items
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#6366f1' }}
      />
    </div>
  );
});

CustomGroupNode.displayName = 'CustomGroupNode';

export default CustomGroupNode;