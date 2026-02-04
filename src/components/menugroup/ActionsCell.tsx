import {Edit, List} from 'lucide-react'
import type { MenuGroupItem } from '@/types';


interface ActionsCellProps{
  item: MenuGroupItem;
  onEdit: (item: MenuGroupItem) => void;
  onShowDetails: (item: MenuGroupItem) => void;
}

const ActionsCell = ({ item, onEdit, onShowDetails }: ActionsCellProps) => {
  return (
    <div className="flex space-x-2">
      <button
        className="text-primary hover:text-primary/80"
        onClick={() => onEdit(item)}
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => onShowDetails(item)}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ActionsCell;