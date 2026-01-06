import { FaEdit, FaTrash, FaLink, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function NodeContextMenu({
  show,
  position,
  node,
  isHidden,
  onEdit,
  onDelete,
  onManageConnections,
  onManageGroupConnections, // TAMBAHKAN PROP BARU
  onToggleVisibility,
  onClose,
}) {
  if (!show || !node) return null;

  const handleAction = (action) => {
    action();
    onClose();
  };

  const isGroupNode = node.type === 'group';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="px-3 py-2 border-b border-gray-200">
          <p className="text-xs text-gray-500">
            {isGroupNode ? 'Group Actions' : 'Node Actions'}
          </p>
          <p className="text-sm font-semibold text-gray-800 truncate">{node.data?.name}</p>
        </div>
        
        <div className="py-1">
          {/* Kelola Koneksi - Berbeda untuk Group dan Item */}
          {isGroupNode ? (
            <button
              onClick={() => handleAction(onManageGroupConnections)}
              className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
            >
              <FaLink className="text-purple-600" />
              <span>Kelola Koneksi Group</span>
            </button>
          ) : (
            <button
              onClick={() => handleAction(onManageConnections)}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
            >
              <FaLink className="text-blue-600" />
              <span>Kelola Koneksi</span>
            </button>
          )}
          
          <button
            onClick={() => handleAction(onEdit)}
            className="w-full px-4 py-2 text-left hover:bg-yellow-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
          >
            <FaEdit className="text-yellow-600" />
            <span>Edit</span>
          </button>
          
          <button
            onClick={() => handleAction(onToggleVisibility)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
          >
            {isHidden ? (
              <>
                <FaEye className="text-green-600" />
                <span>Tampilkan</span>
              </>
            ) : (
              <>
                <FaEyeSlash className="text-gray-600" />
                <span>Sembunyikan</span>
              </>
            )}
          </button>
          
          <div className="my-1 border-t border-gray-200"></div>
          
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition-colors"
          >
            <FaTrash />
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </>
  );
}