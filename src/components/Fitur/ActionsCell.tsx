import {Edit, List} from 'lucide-react'
import type { FiturItem } from '@/types';

interface ActionCellProps{
  item: FiturItem ;
  onEdit: (item: FiturItem) => void;
  onShowDetails: (item: FiturItem) => void;
}

const ActionsCell = ({ item, onEdit, onShowDetails }: ActionCellProps) => {
  return (
    <div className="flex space-x-2">
      <button
        className="text-primary hover:text-primary/80"
        onClick={() => onEdit(item)}
        title="Edit"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => onShowDetails(item)}
        title="View Details"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ActionsCell;