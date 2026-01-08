import React from 'react';
import { useNavigate } from 'react-router-dom';
import {Edit, MonitorCog, SlidersVertical} from 'lucide-react'
import type { AccGroupItem } from '@/api/accgroupApi';

interface ActionsCellProps {
  item: AccGroupItem;
  onEdit: (item: AccGroupItem) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ item, onEdit }) => {
  const navigate = useNavigate();

  const handleShowSettingmenu = (accGroup: AccGroupItem) => {
    navigate(`/account-group/setting-menu/${accGroup.codeGroup || accGroup.id}`);
  };

  const handleShowSettingFeature = (accGroup: AccGroupItem) => {
    navigate(`/account-group/setting-feature/${accGroup.codeGroup || accGroup.id}`);
  };
  return (
    <div>
      <button
        className="text-primary hover:text-primary/80"
        onClick={() => onEdit(item)}
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        className="hover:text-purple-800 dark:hover:text-purple-300 text-purple-600 dark:text-purple-400 px-2"
        onClick={() => handleShowSettingmenu(item)}
      >
        <MonitorCog className="h-4 w-4" />
      </button>
      <button
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => handleShowSettingFeature(item)}
      >
        <SlidersVertical className="h-4 w-4"/>
      </button>
    </div>
  );
};

export default ActionsCell;