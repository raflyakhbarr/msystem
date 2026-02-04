import { useState, useMemo } from 'react';
import { fetchMenuGroup, saveMenuGroup} from '../api/menugroupApi';
import { useApiData } from '../hooks/useApiData';
import { useCrudForm } from '../hooks/useCrudForm';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/menugroup/EditModal';
import DetailsModal from '../components/menugroup/DetailsModal';
import ActionsCell from '../components/menugroup/ActionsCell';
import type { DataItem, MenuGroupItem } from '@/types';


const EndpointGroupManagement = () => {
  const { data: menuGroups, loading, error, refetch } = useApiData(fetchMenuGroup);
  const [showModal, setShowModal] = useState(false);
  const [editingMenuGroup, setEditingMenuGroup] = useState<MenuGroupItem | null>(null);
  const [detailsMenuGroup, setDetailsMenuGroup] = useState<MenuGroupItem |null>(null);

  const handleAddNew = () => {
    const newMenuGroup = {
      nama: '',
      idSistem: '',
      status: true,
      isAdministrator: false
    } as MenuGroupItem;
    setEditingMenuGroup(newMenuGroup);
    setShowModal(true);
  };

  const handleEditMenuGroup = (menuGroup : MenuGroupItem) => {
    setEditingMenuGroup(menuGroup);
    setShowModal(true);
  };

  const handleShowDetails = (menuGroup : MenuGroupItem) => {
    setDetailsMenuGroup(menuGroup);
  };

  const handleCloseDetails = () => {
    setDetailsMenuGroup(null);
  };

  const handleCloseModal = () => {
    setEditingMenuGroup(null);
    setShowModal(false);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModal();
  };

  const { handleSave } = useCrudForm<MenuGroupItem>({
    saveFunction: saveMenuGroup,
    onSuccess: handleSuccess,
    successMessage: 'Menu group',
    errorMessagePrefix: 'Error saving menu group',
    showToast: false,
  });

  const handleExport = (data : DataItem[]) => {
    const exportData = data.map(item => ({
      'Endpoint Group': (item as MenuGroupItem).nama || '',
      'System': (item as MenuGroupItem).sistem?.nama || '-',
      Status: item.status ? 'Active' : 'Inactive',
      'Administrator': item.isAdministrator ? 'Yes' : 'No',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt as string).toLocaleDateString() : ''
    }));

    return exportData;
  };

  const columns = useMemo(() => [
    {
      key: 'nama',
      label: 'Nama',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'sistem.nama',
      label: 'Sistem',
      searchable: true,
      sortable: true,
      exportable: true,
      render: (item : unknown) => {
        const menuGroup = item as MenuGroupItem;
        return menuGroup.sistem?.nama || '-';
      }
    },
    {
      key: 'status',
      label: 'Is Active?',
      searchable: true,
      sortable: true,
      exportable: true,
      isBoolean: true,
      badgelabel:'Active:Inactive'
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      sortable: false,
      exportable: false,
      render: (item : unknown) => <ActionsCell item={item as MenuGroupItem} onEdit={handleEditMenuGroup} onShowDetails={handleShowDetails} />
    }
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={(menuGroups as unknown) as DataItem[] || []}
        columns={columns}
        title="Endpoint Group"
        loading={loading}
        error={error}
        onRefresh={refetch}
        onAdd={handleAddNew}
        onExport={handleExport}
      />

      {/* Edit/Add Modal */}
      {showModal && editingMenuGroup && (
        <EditModal
          editingMenuGroup={editingMenuGroup}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      )}

      <DetailsModal
        detailsMenuGroup={detailsMenuGroup}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default EndpointGroupManagement;

