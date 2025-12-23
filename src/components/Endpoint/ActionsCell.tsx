import React from 'react';
import { PencilIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { MenuItem } from '@/api/menuApi';

interface ActionsCellProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onViewDetails: (item: MenuItem) => void;
}

const ActionsCell = ({ item, onEdit, onViewDetails }: ActionsCellProps) => {
  return (
    <div className="flex space-x-2">
      <button
        className="text-primary hover:text-primary/80"
        onClick={() => onEdit(item)}
        title="Edit"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => onViewDetails(item)}
        title="View Details"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ActionsCell;