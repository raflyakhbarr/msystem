import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, ListBulletIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import type { AccGroupItem } from '@/api/accgroupApi';

interface ActionsCellProps {
  item: AccGroupItem;
  onEdit: (item: AccGroupItem) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ item, onEdit }) => {
  const navigate = useNavigate();

  const handleShowSettingmenu = (accGroup: AccGroupItem) => {
    // Navigate to the SettingMenu page with the account group ID
    navigate(`/account-group/setting-menu/${accGroup.codeGroup || accGroup.id}`);
  };

  const handleShowSettingFeature = (accGroup: AccGroupItem) => {
    // Navigate to the SettingFeature page with the account group ID
    navigate(`/account-group/setting-feature/${accGroup.codeGroup || accGroup.id}`);
  };
  return (
    <div>
      <button
        className="text-primary hover:text-primary/80"
        onClick={() => onEdit(item)}
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        className="hover:text-purple-800 dark:hover:text-purple-300 text-purple-600 dark:text-purple-400 px-2"
        onClick={() => handleShowSettingmenu(item)}
      >
        <ListBulletIcon className="h-4 w-4" />
      </button>
      <button
        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        onClick={() => handleShowSettingFeature(item)}
      >
        <PuzzlePieceIcon className="h-4 w-4"/>
      </button>
    </div>
  );
};

export default ActionsCell;