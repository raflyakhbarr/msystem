import React from 'react';

export default function VisibilityPanel({ 
  show, 
  hiddenNodes, 
  items, 
  groups, 
  onToggleVisibility 
}) {
  if (!show) return null;

  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-lg">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-bold text-lg">Node Visibility</h2>
        <p className="text-sm text-gray-600 mt-1">
          Click to show/hide nodes and groups
        </p>
      </div>
      <div className="p-4 space-y-4">
        {groups.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded"></span>
              Groups ({groups.length})
            </h3>
            <div className="space-y-1">
              {groups.map(group => {
                const nodeId = `group-${group.id}`;
                const isHidden = hiddenNodes.has(nodeId);
                return (
                  <button
                    key={nodeId}
                    onClick={() => onToggleVisibility(nodeId)}
                    className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-colors ${
                      isHidden
                        ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium truncate">{group.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {items.filter(i => !i.group_id).length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded"></span>
              Ungrouped Items ({items.filter(i => !i.group_id).length})
            </h3>
            <div className="space-y-1">
              {items.filter(item => !item.group_id).map(item => {
                const nodeId = String(item.id);
                const isHidden = hiddenNodes.has(nodeId);
                return (
                  <button
                    key={nodeId}
                    onClick={() => onToggleVisibility(nodeId)}
                    className={`w-full px-3 py-2 rounded text-left flex items-center justify-between transition-colors ${
                      isHidden
                        ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {groups.map(group => {
          const groupItems = items.filter(i => i.group_id === group.id);
          if (groupItems.length === 0) return null;
          
          return (
            <div key={`items-${group.id}`}>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: group.color || '#6366f1' }}
                ></span>
                {group.name} Items ({groupItems.length})
              </h3>
              <div className="space-y-1 pl-4">
                {groupItems.map(item => {
                  const nodeId = String(item.id);
                  const isHidden = hiddenNodes.has(nodeId);
                  const groupNodeId = `group-${group.id}`;
                  const isGroupHidden = hiddenNodes.has(groupNodeId);
                  
                  return (
                    <button
                      key={nodeId}
                      onClick={() => onToggleVisibility(nodeId)}
                      disabled={isGroupHidden}
                      className={`w-full px-3 py-2 rounded text-sm text-left flex items-center justify-between transition-colors ${
                        isGroupHidden
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : isHidden
                          ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}