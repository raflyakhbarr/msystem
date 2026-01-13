import React, { useState, useMemo } from 'react';
import { fetchFitur, saveFitur } from '../api/fiturApi';
import { fetchAllSystems } from '../api/SystemApi';
import { useApiData } from '../hooks/useApiData';
import { useCrudForm } from '../hooks/useCrudForm';
import DataTable from '../components/common/DataTable';
import ActionsCell from '../components/Fitur/ActionsCell';
import EditModal from '../components/Fitur/EditModal';
import DetailsModal from '../components/Fitur/DetailsModal.tsx';
import { toast } from 'sonner';

const Fitur = () => {
  const { data: fiturs, loading, error, refetch } = useApiData(fetchFitur);
  const { data: systems } = useApiData(fetchAllSystems);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);


  const handleAddNew = () => {
    setFormData({
      menu: '',
      route: '',
      urutan: '',
      icon: '',
      showFiture: '',
      status: true,
      idSistem: ''
    });
    setShowModal(true);
  };

  const handleEditFitur = (fitur) => {
    setFormData(fitur);
    setShowModal(true);
  };

  const handleViewFitur = (fitur) => {
    setSelectedItem(fitur);
    setShowDetailsModal(true);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    refetch();
  };

  const { saving, handleSave } = useCrudForm({
    saveFunction: saveFitur,
    onSuccess: handleSuccess,
    successMessage: 'Fitur',
    errorMessagePrefix: 'Error saving fitur',
    showToast: false,
  });

  const handleSubmitForm = async () => {
    if (formData) {
      await handleSave(formData, 'id');
    }
  };

  const handleExport = (data) => {
    return data.map(item => ({
      Menu: item.menu || '',
      Route: item.route || '',
      Order: item.urutan || '',
      Icon: item.icon || '',
      'Show Feature': item.showFiture || '',
      Status: item.status ? 'Active' : 'Inactive',
      'System ID': item.idSistem || '',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
    }));
  };

  const columns = useMemo(() => [
    {
      key: 'idSistem',
      label: 'System',
      searchable: true,
      sortable: true,
      render: (item) => {
        if (item.idSistem && typeof item.idSistem === 'object') {
            return item.idSistem.nama; 
        }
        const system = systems.find(s => s.id === item.idSistem);
        return system ? system.nama : item.idSistem; 
      }
    },
    { key: 'menu', label: 'Modul', searchable: true, sortable: true },
    { key: 'route', label: 'Deskripsi', searchable: true, sortable: true },
    {
      key: 'icon',
      label: 'Icon',
      searchable: true,
      sortable: true,
      render: (item) => (
        <span className="text-sm text-foreground">
          {item.icon || '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      searchable: true,
      sortable: true,
      exportable: true,
      isBoolean: true,
      trueLabel: 'Active',
      falseLabel: 'Inactive',
      trueColor: 'bg-green-500/10 text-green-700 dark:text-green-400',
      falseColor: 'bg-red-500/10 text-red-700 dark:text-red-400'
    },
    
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      render: (item) => (
        <ActionsCell item={item} onEdit={handleEditFitur} onView={handleViewFitur} />
      )
    }
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={fiturs || []}
        columns={columns}
        title="Fitur Management"
        loading={loading}
        error={error}
        onRefresh={refetch}
        onAdd={handleAddNew}
        onExport={handleExport}
      />

      <EditModal
        showModal={showModal}
        formData={formData}
        setFormData={setFormData}
        setShowModal={setShowModal}
        handleSubmit={handleSubmitForm}
      />

      <DetailsModal
        showModal={showDetailsModal}
        item={selectedItem}
        systems={systems}
        setShowModal={setShowDetailsModal}
      />
    </div>
  );
};

export default Fitur;