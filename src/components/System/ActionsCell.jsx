import React from 'react';
import { PencilIcon, InformationCircleIcon, } from '@heroicons/react/24/outline';
import {Settings} from 'lucide-react';

const ActionsCell = ({ item, onEdit, onShowDetails, onSettingToken }) => {
  return (
    <div className="flex space-x-2">
      <button
        className="text-blue-600 hover:text-blue-900"
        onClick={() => onEdit(item)}
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        className="text-green-600 hover:text-green-900"
        onClick={() => onShowDetails(item)}
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      <button className='text-orange-600 hover:text-orange-900'
        onClick={()=> onSettingToken(item)}>
          <Settings className="h-4 w-4"/>
      </button>
    </div>
  );
};

export default ActionsCell;