import { Pencil, Trash2, Link, Eye, EyeOff, MoreVertical, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function NodeContextMenu({
  show,
  position,
  node,
  isHidden,
  onEdit,
  onDelete,
  onManageConnections,
  onManageGroupConnections,
  onRemoveFromGroup,
  onToggleVisibility,
  onClose,
}) {
  if (!show || !node) return null;

  const isGroupNode = node.type === 'group';
  const isInGroup = node.parentNode && !isGroupNode; // Item dalam group

  const items = [
    isGroupNode
      ? {
          label: 'Kelola Koneksi Group',
          icon: <Link className="h-4 w-4" />,
          onClick: onManageGroupConnections,
          color: 'hover:bg-purple-500 hover:text-white',
          iconColor: 'text-purple-600',
        }
      : {
          label: 'Kelola Koneksi',
          icon: <Link className="h-4 w-4" />,
          onClick: onManageConnections,
          color: 'hover:bg-blue-500 hover:text-white',
          iconColor: 'text-blue-600',
        },
    ...(isInGroup ? [{
      label: 'Keluarkan dari Group',
      icon: <LogOut className="h-4 w-4" />,
      onClick: onRemoveFromGroup,
      color: 'hover:bg-orange-500 hover:text-white',
      iconColor: 'text-orange-600',
    }] : []),
    {
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
      color: 'hover:bg-yellow-400 hover:text-white',
      iconColor: 'text-yellow-600',
    },
    {
      label: isHidden ? 'Tampilkan' : 'Sembunyikan',
      icon: isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
      onClick: onToggleVisibility,
      color: isHidden ? 'hover:bg-green-500 hover:text-white' : 'hover:bg-gray-400 hover:text-white',
      iconColor: isHidden ? 'text-green-600' : 'text-gray-600',
    },
    {
      label: 'Hapus',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      color: 'hover:bg-red-500 hover:text-white',
      iconColor: 'text-red-500',
      danger: true,
    },
  ];

  const radius = 72;
  const angleStep = (2 * Math.PI) / items.length;
  const glassSize = (radius + 40) * 2;

  const handleAction = (action) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Radial Context Menu */}
      <div
        className="fixed z-50"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={{
            width: glassSize,
            height: glassSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            willChange: 'opacity',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.15) 65%, rgba(255,255,255,0) 100%)',
            maskImage: 'radial-gradient(circle, black 45%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 75%)',
          }}
        />

        {/* Node name label */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: -70 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-gray-700 pointer-events-none bottom-12"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        >
          {isGroupNode ? 'Group' : 'Node'}: {node.data?.name}
        </motion.div>

        {/* Center button */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
          style={{
            background: 'rgba(30, 30, 40, 0.78)',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            color: 'white',
          }}
          onClick={onClose}
        >
          <MoreVertical className="h-4 w-4" />
        </motion.div>

        {/* Radial item buttons */}
        <AnimatePresence>
          {items.map((item, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.button
                key={item.label}
                initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                animate={{ scale: 1, opacity: 1, x, y }}
                exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 320,
                  damping: 22,
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleAction(item.onClick)}
                title={item.label}
                className={`absolute flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md transition-colors ${item.color} ${item.iconColor}`}
                style={{
                  top: '50%',
                  left: '50%',
                  marginTop: -20,
                  marginLeft: -20,
                }}
              >
                {item.icon}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}