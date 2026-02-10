import { Pencil, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ServiceItemContextMenu({
  show,
  position,
  item,
  onEdit,
  onDelete,
  onManageConnections,
  onClose,
}) {
  if (!show || !item) return null;

  const handleAction = (action) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Context Menu */}
      <div
        className="fixed z-50 bg-card rounded-lg shadow-xl border border-border py-2 min-w-[220px]"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">Service Item Actions</p>
          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          {/* Manage Connections */}
          <button
            onClick={() => handleAction(() => onManageConnections(item))}
            className="w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-3 text-sm text-foreground transition-colors"
          >
            <Link2 className="text-blue-600" size={16} />
            <span>Manage Connections</span>
          </button>

          {/* Edit */}
          <button
            onClick={() => handleAction(() => onEdit(item))}
            className="w-full px-4 py-2.5 text-left hover:bg-yellow-50 dark:hover:bg-yellow-950/20 flex items-center gap-3 text-sm text-foreground transition-colors"
          >
            <Pencil className="text-yellow-600" size={16} />
            <span>Edit Item</span>
          </button>

          <div className="my-1 border-t border-border"></div>

          {/* Delete */}
          <button
            onClick={() => handleAction(() => onDelete(item))}
            className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 text-sm text-red-600 transition-colors"
          >
            <Trash2 size={16} />
            <span>Delete Item</span>
          </button>
        </div>
      </div>
    </>
  );
}
