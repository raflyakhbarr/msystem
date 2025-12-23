import React, { useState, useEffect } from 'react';
import { fetchFitur, saveFitur } from '../api/fiturApi';
import { fetchAllSystems } from '../api/SystemApi';
import DataTable from '../components/common/DataTable';
import ActionsCell from '../components/Fitur/ActionsCell';
import EditModal from '../components/Fitur/EditModal';
import DetailsModal from '../components/Fitur/DetailsModal.tsx';

const Fitur = () => {
  const [fiturs, setFiturs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Data for Dropdowns
  const [systems, setSystems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fiturData, systemsData] = await Promise.all([
        fetchFitur(),
        fetchAllSystems()
      ]);
      setFiturs(fiturData);
      setSystems(systemsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load fiturs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchFitur();
      setFiturs(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

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

  const handleSubmit = async () => {
    if (!formData) return;

    try {
      const isEdit = formData.id;

      const sistemId = formData.idSistem && typeof formData.idSistem === 'object'
        ? formData.idSistem.id
        : formData.idSistem;

      const dataToSend = {
        menu: formData.menu,
        route: formData.route,
        urutan: parseInt(formData.urutan) || 0,
        icon: formData.icon,
        showFiture: formData.showFiture,
        status: formData.status,
        idSistem: parseInt(sistemId) || 0
      };

      if (isEdit) {
        dataToSend.id = formData.id;
      }

      await saveFitur(dataToSend);

      setShowModal(false);
      setFormData(null);
      handleRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error ${formData.id ? 'updating' : 'saving'} fitur: ` + errorMessage);
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

  const columns = [
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
      key: 'idSistem',
      label: 'System',
      searchable: true,
      sortable: true,
      render: (item) => {
        if (item.idSistem && typeof item.idSistem === 'object') {
            return item.idSistem.nama; // Ambil namanya saja
        }
        // If it's just an ID, find the system name
        const system = systems.find(s => s.id === item.idSistem);
        return system ? system.nama : item.idSistem; // Jika ternyata string/number, tampilkan apa adanya
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      render: (item) => (
        <ActionsCell item={item} onEdit={handleEditFitur} onView={handleViewFitur} />
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={fiturs}
        columns={columns}
        title="Fitur Management"
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onAdd={handleAddNew}
        onExport={handleExport}
        refreshing={refreshing}
      />

      <EditModal
        showModal={showModal}
        formData={formData}
        setFormData={setFormData}
        setShowModal={setShowModal}
        handleSubmit={handleSubmit}
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