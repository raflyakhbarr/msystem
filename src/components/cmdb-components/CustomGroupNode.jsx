import { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Fungsi untuk menentukan warna teks berdasarkan background (hitam atau putih)
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000000'; // Default black

  // Handle HSL values (like 'hsl(var(--primary) / 0.15)')
  if (hexColor.startsWith('hsl')) {
    return '#000000'; // Default untuk HSL
  }

  // Konversi hex ke RGB
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) return '#000000';

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Hitung luminance menggunakan rumus WCAG
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return hitam untuk background terang, putih untuk background gelap
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const CustomGroupNode = memo(({ data, selected }) => {
  // Warna handle berdasarkan primary color
  const handleColor = 'hsl(var(--primary))';

  // Tentukan warna teks berdasarkan warna background group
  const textColor = getContrastColor(data.color);

  // Cek jika group sedang di-hover oleh dragged node
  const isHovered = data.isHovered || false;
  const borderColor = isHovered ? 'hsl(var(--primary))' : 'hsl(var(--primary))';
  const borderWidth = isHovered ? '4px' : '2px';
  const boxShadow = isHovered ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none';

  return (
    <div
      style={{
        top: '-11px',
        left: '-11px',
        backgroundColor: data.color || 'hsl(var(--primary) / 0.15)',
        border: `${borderWidth} solid ${borderColor}`,
        padding: '5px',
        minWidth: data.width || 300,
        minHeight: data.height || 200,
        position: 'relative',
        borderRadius: '8px',
        boxShadow: boxShadow,
        transition: isHovered ? 'all 0.2s ease-in-out' : 'none',
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
      <div className="font-bold text-lg mb-1" style={{ color: textColor }}>
        {data.name}
      </div>

      {data.description && (
        <div className="text-xs mb-2" style={{ color: textColor, opacity: 0.8 }}>
          {data.description}
        </div>
      )}

      <div className="text-xs" style={{ color: textColor, opacity: 0.7 }}>
        {data.itemCount || 0} items
      </div>
    </div>
  );
});

CustomGroupNode.displayName = 'CustomGroupNode';

export default CustomGroupNode;