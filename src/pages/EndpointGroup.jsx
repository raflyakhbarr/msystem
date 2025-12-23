import React, { useState, useEffect } from 'react';
import { fetchMenuGroup, saveMenuGroup } from '../api/menugroupApi';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/menugroup/EditModal';
import DetailsModal from '../components/menugroup/DetailsModal';
import ActionsCell from '../components/menugroup/ActionsCell';

const EndpointGroupManagement = () => {
  const [menuGroups, setMenuGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingMenuGroup, setEditingMenuGroup] = useState(null);
  const [detailsMenuGroup, setDetailsMenuGroup] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const menuData = await fetchMenuGroup();
      setMenuGroups(menuData);
    } catch (error) {
      console.error("Error loading menu groups:", error);
      setError(error.message || 'Failed to load menu groups');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchMenuGroup();
      setMenuGroups(data);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError(error.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

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

  const handleSave = async (data) => {
    try {
      if (editingMenuGroup?.id) {
        // Update existing menu group
        const dataToSend = {
          id: data.id,
          nama: data.nama,
          idSistem: data.idSistem,
          status: data.status,
          isAdministrator: data.isAdministrator || false
        };
        await saveMenuGroup(dataToSend);
      } else {
        // Add new menu group
        const dataToSend = {
          nama: data.nama,
          idSistem: data.idSistem,
          status: data.status,
          isAdministrator: data.isAdministrator || false
        };
        await saveMenuGroup(dataToSend);
      }

      handleRefresh();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving menu group:", error);
      alert('Error saving menu group: ' + error.message);
    }
  };

  const handleExport = (data) => {
    const exportData = data.map(item => ({
      'Endpoint Group': item.nama,
      'System': item.sistem?.nama || '-',
      Status: item.status ? 'Active' : 'Inactive',
      'Administrator': item.isAdministrator ? 'Yes' : 'No',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
    }));

  // This will be handled by DataTable component's default export
    return exportData;
  };

  // Column configuration for endpoint group data
  const columns = [
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
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={menuGroups}
        columns={columns}
        title="Endpoint Group"
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onAdd={handleAddNew}
        onExport={handleExport}
        refreshing={refreshing}
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

