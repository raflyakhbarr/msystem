import React from 'react';
import { PencilIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const ActionsCell = ({ item, onEdit, onView }) => {
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
        onClick={() => onView(item)}
        title="View Details"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ActionsCell;