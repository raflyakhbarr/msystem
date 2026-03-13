import { Pencil, Trash2, MoreVertical, ArrowRight, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';

export default function ServiceEdgeContextMenu({
  show,
  position,
  edge,
  sourceNode,
  targetNode,
  onEdit,
  onDelete,
  onClose,
}) {
  if (!show || !edge) return null;

  const connectionType = CONNECTION_TYPES[edge.data?.connectionType] || CONNECTION_TYPES.depends_on;

  const items = [
    {
      label: 'Edit Tipe Koneksi',
      icon: <Pencil className="h-4 w-4" />,
      onClick: onEdit,
      color: 'hover:bg-blue-500 hover:text-white',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Hapus Koneksi',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      color: 'hover:bg-red-500 hover:text-white',
      iconColor: 'text-red-500',
      danger: true,
    },
  ];

  const radius = 64;
  const angleStep = (2 * Math.PI) / items.length;
  const glassSize = (radius + 40) * 2;

  const getDirectionIcon = () => {
    // Selalu arrow ke kanan (source → target) untuk semua tipe kecuali 'both'
    switch (connectionType.propagation) {
      case 'both':
        return <ArrowRightLeft className="h-3 w-3" />;
      case 'target_to_source':
      case 'source_to_target':
      default:
        return <ArrowRight className="h-3 w-3" />;
    }
  };

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

        {/* Connection info label */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: -70 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-gray-700 pointer-events-none bottom-10 max-w-xs overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
        >
          <div className="flex items-center gap-2">
            {sourceNode?.data?.name || 'Source'}
            <span className="flex items-center" style={{ color: connectionType.color }}>
              {getDirectionIcon()}
            </span>
            {targetNode?.data?.name || 'Target'}
          </div>
        </motion.div>

        {/* Connection type label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 50 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white pointer-events-none top-10"
          style={{
            background: connectionType.color,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {connectionType.label}
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
            const angle = index * angleStep;
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
