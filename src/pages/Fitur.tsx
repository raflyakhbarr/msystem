import React, { useState, useMemo } from 'react';
import { fetchFitur, saveFitur, type FiturItem } from '../api/fiturApi.ts';
import { fetchAllSystems, type SystemItem } from '../api/SystemApi.ts';
import { useApiData } from '../hooks/useApiData.ts';
import { useCrudForm } from '../hooks/useCrudForm.ts';
import DataTable, {type DataItem} from '../components/common/DataTable.tsx';
import ActionsCell from '../components/Fitur/ActionsCell.jsx';
import EditModal from '../components/Fitur/EditModal.jsx';
import DetailsModal from '../components/Fitur/DetailsModal.tsx';

const Fitur = () => {
  const { data: fiturs, loading, error, refetch } = useApiData(fetchFitur);
  const { data: systems } = useApiData(fetchAllSystems);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState<FiturItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<FiturItem | null>(null);


  const handleAddNew = () => {
    setFormData({
      menu: '',
      route: '',
      urutan: '',
      icon: '',
      showFiture: '',
      status: true,
      idSistem: 0
    });
    setShowModal(true);
  };

  const handleEditFitur = (fitur: FiturItem) => {
    setFormData(fitur);
    setShowModal(true);
  };

  const handleViewFitur = (fitur: FiturItem) => {
    setSelectedItem(fitur);
    setShowDetailsModal(true);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    refetch();
  };

  const { handleSave } = useCrudForm<FiturItem>({
    saveFunction: saveFitur,
    onSuccess: handleSuccess,
    successMessage: 'Fitur',
    errorMessagePrefix: 'Error saving fitur',
    showToast: false,
  });

  const handleSubmitForm = async () => {
    if (formData) {
      await handleSave(formData as FiturItem, 'id');
    }
  };

  const handleExport = (data: DataItem[]) => {
    return data.map(item => ({
      Menu: item.menu || '',
      Route: item.route || '',
      Order: item.urutan || '',
      Icon: item.icon || '',
      'Show Feature': item.showFiture || '',
      Status: item.status ? 'Active' : 'Inactive',
      'System ID': item.idSistem || '',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt as string).toLocaleDateString() : ''
    }));
  };

  const columns = useMemo(() => [
    {
      key: 'idSistem',
      label: 'System',
      searchable: true,
      sortable: true,
      render: (item : unknown): React.ReactNode => {
        const fitur = item as FiturItem
        if (fitur.idSistem && typeof fitur.idSistem === 'object') {
            return (fitur.idSistem as SystemItem).nama;
        }
        const system = systems?.find(s => s.id && String(s.id) === String(fitur.idSistem));
        return system ? system.nama : '-';
      }
    },
    { key: 'menu', label: 'Modul', searchable: true, sortable: true },
    { key: 'route', label: 'Deskripsi', searchable: true, sortable: true },
    {
      key: 'icon',
      label: 'Icon',
      searchable: true,
      sortable: true,
      render: (item : unknown) =>{ 
        const fitur = item as FiturItem
      return <span className="text-sm text-foreground">{fitur.icon || '-'}</span>
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
      render: (item : unknown) => (
        <ActionsCell item={item} onEdit={handleEditFitur} onView={handleViewFitur} />
      )
    }
  ], [systems]);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={(fiturs as unknown) as DataItem[] || []}
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