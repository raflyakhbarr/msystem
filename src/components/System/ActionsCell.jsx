import React from 'react';
import {Edit, List, Settings} from 'lucide-react';

const ActionsCell = ({ item, onEdit, onShowDetails, onSettingToken }) => {
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
      <button className='text-orange-600 hover:text-orange-900'
        onClick={()=> onSettingToken(item)}>
          <Settings className="h-4 w-4"/>
      </button>
    </div>
  );
};

export default ActionsCell;