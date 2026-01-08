import React, { useState, useMemo } from 'react';
import { fetchMenuGroup, saveMenuGroup } from '../api/menugroupApi';
import { useApiData } from '../hooks/useApiData';
import { useCrudForm } from '../hooks/useCrudForm';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/menugroup/EditModal';
import DetailsModal from '../components/menugroup/DetailsModal';
import ActionsCell from '../components/menugroup/ActionsCell';

const EndpointGroupManagement = () => {
  const { data: menuGroups, loading, error, refetch } = useApiData(fetchMenuGroup, []);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingMenuGroup, setEditingMenuGroup] = useState(null);
  const [detailsMenuGroup, setDetailsMenuGroup] = useState(null);

  const handleAddNew = () => {
    const newMenuGroup = {
      nama: '',
      idSistem: '',
      status: true,
      isAdministrator: false
    };
    setEditingMenuGroup(newMenuGroup);
    setShowModal(true);
  };

  const handleEditMenuGroup = (menuGroup) => {
    setEditingMenuGroup(menuGroup);
    setShowModal(true);
  };

  const handleShowDetails = (menuGroup) => {
    setDetailsMenuGroup(menuGroup);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setDetailsMenuGroup(null);
    setShowDetailsModal(false);
  };

  const handleCloseModal = () => {
    setEditingMenuGroup(null);
    setShowModal(false);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModal();
  };

  const { saving, handleSave } = useCrudForm({
    saveFunction: saveMenuGroup,
    onSuccess: handleSuccess,
    successMessage: 'Menu group',
    errorMessagePrefix: 'Error saving menu group',
    showToast: false,
  });

  const handleExport = (data) => {
    const exportData = data.map(item => ({
      'Endpoint Group': item.nama,
      'System': item.sistem?.nama || '-',
      Status: item.status ? 'Active' : 'Inactive',
      'Administrator': item.isAdministrator ? 'Yes' : 'No',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
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
      render: (item) => item.sistem?.nama || '-'
    },
    {
      key: 'status',
      label: 'Is Active?',
      searchable: true,
      sortable: true,
      exportable: true,
      isBoolean: true,
      trueLabel: 'Active',
      falseLabel: 'Inactive',
      trueColor: 'bg-green-100 text-green-800',
      falseColor: 'bg-red-100 text-red-800'
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      sortable: false,
      exportable: false,
      render: (item) => <ActionsCell item={item} onEdit={handleEditMenuGroup} onShowDetails={handleShowDetails} />
    }
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={menuGroups || []}
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

