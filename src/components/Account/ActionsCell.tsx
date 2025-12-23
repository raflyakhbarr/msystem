import React from 'react';
import { PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { AccountItem } from '@/api/accountApi';

interface ActionsCellProps {
  item: AccountItem;
  onEdit: (account: AccountItem) => void;
  onResetMac?: (account: AccountItem) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ item, onEdit, onResetMac }) => {
  const handleResetMac = () => {
    if (onResetMac) {
      onResetMac(item);
    } else {
      // Placeholder functionality since no API is available yet
      alert(`Reset MAC address for account: ${item.nipp}\n\nThis is a placeholder. API integration needed.`);
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        className="text-primary hover:text-primary/80 transition-colors"
        onClick={() => onEdit(item)}
        title="Edit Account"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
        onClick={handleResetMac}
        title="Reset MAC Address"
      >
        <ArrowPathIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ActionsCell;