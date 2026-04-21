import { Handle, Position } from 'reactflow';
import { MoreHorizontal, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusColors = {
  active: 'bg-green-500',
  inactive: 'bg-red-500',
  maintenance: 'bg-yellow-500',
  disabled: 'bg-gray-500',
  decommissioned: 'bg-gray-400',
};

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
  disabled: 'Disabled',
  decommissioned: 'Decommissioned',
};

export default function CustomLayananNode({ data, id }) {
  const status = data.status || 'active';
  const statusColor = statusColors[status] || statusColors.active;
  const statusLabel = statusLabels[status] || status;

  return (
    <div
      className="px-4 py-3 shadow-md rounded-md bg-white border-2 border-purple-200 hover:border-purple-400 min-w-[180px] transition-colors"
      style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
      }}
    >
      {/* Top Handle - Input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
      />

      {/* Left Handle - Input/Output */}
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
        id="left"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
        id="left-target"
      />

      {/* Right Handle - Input/Output */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
        id="right"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
        id="right-target"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Service Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-800 truncate" title={data.name}>
              {data.name}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} title={statusLabel} />
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="text-xs text-gray-600 line-clamp-2 mb-2" title={data.description}>
          {data.description}
        </div>
      )}

      {/* Type Badge */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
          Layanan
        </span>
      </div>

      {/* Bottom Handle - Output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-purple-500 border-2 border-purple-700"
      />
    </div>
  );
}
