import { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Fungsi untuk menentukan warna teks berdasarkan background (hitam atau putih)
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000000'; // Default black

  // Handle HSL or RGB values
  if (hexColor.startsWith('hsl') || hexColor.startsWith('rgb')) {
    return '#000000'; // Default untuk HSL/RGB
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

const CustomServiceGroupNode = memo(({ data, style }) => {
  // Warna handle berdasarkan service theme (green/teal untuk service level)
  const handleColor = '#10b981';

  // Tentukan warna teks berdasarkan warna background group
  const textColor = getContrastColor(data.color);

  // Cek jika group sedang di-hover oleh dragged node
  const isHovered = data.isHovered || false;
  const borderColor = '#10b981';
  const borderWidth = isHovered ? '4px' : '2px';
  const boxShadow = isHovered ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none';

  return (
    <div
      style={{
        top: '-11px',
        left: '-11px',
        backgroundColor: data.color || 'rgba(16, 185, 129, 0.15)',
        border: `${borderWidth} solid ${borderColor}`,
        padding: '5px',
        width: style?.width || data.width || 200,
        height: style?.height || data.height || 200,
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
      <div className="font-bold text-base mb-1 text-center" style={{ color: textColor }}>
        {data.name}
      </div>

      {data.description && (
        <div className="text-xs mb-2 text-center" style={{ color: textColor, opacity: 0.8 }}>
          {data.description}
        </div>
      )}

      <div className="text-xs text-center" style={{ color: textColor, opacity: 0.7 }}>
        {data.itemCount || 0} items
      </div>
    </div>
  );
});

CustomServiceGroupNode.displayName = 'CustomServiceGroupNode';

export default CustomServiceGroupNode;
