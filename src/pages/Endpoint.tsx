import React, { useState, useEffect } from 'react';
import { fetchMenu, saveMenu } from '../api/menuApi';
import type { MenuItem } from '../api/menuApi';
import DataTable from '../components/common/DataTable';
import ActionsCell from '../components/Endpoint/ActionsCell';
import EditModal from '../components/Endpoint/EditModal';
import DetailsModal from '../components/Endpoint/DetailsModal';

const Endpoint = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem> | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  

  

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const menuData = await fetchMenu();
      setMenus(menuData);
    } catch (error) {
      console.error("Error loading menus:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load menus';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchMenu();
      setMenus(data);
    } catch (error) {
      console.error("Error refreshing data:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      isSidebar: false,
      nama: '',
      fitur: '',
      pathMenu: '',
      group_menu: undefined,
      noMenu: undefined
    });
    setShowModal(true);
  };

  const handleEditMenu = (menu: MenuItem) => {
    // Extract group_menu ID if it's an object, otherwise use the value directly
    const groupId = typeof menu.group_menu === 'object' && menu.group_menu !== null
      ? menu.group_menu.id
      : menu.group_menu;

    setFormData({
      ...menu,
      group_menu: groupId,
      noMenu: groupId
    });
    setShowModal(true);
  };

  const handleViewDetails = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleSubmit = async () => {
    if (!formData) return;

    try {
      const isEdit = !!formData.id;

      const dataToSend: Partial<MenuItem> = {
        isSidebar: formData.isSidebar ?? false,
        nama: formData.nama || '',
        fitur: formData.fitur || '',
        pathMenu: formData.pathMenu || '',
        group_menu: formData.group_menu,
        noMenu: formData.noMenu
      };

      if (isEdit && formData.id) {
        dataToSend.id = formData.id;
      }

      await saveMenu(dataToSend as MenuItem);

      setShowModal(false);
      setFormData(null);
      handleRefresh();
    } catch (error) {
      console.error(`Error ${formData.id ? 'updating' : 'saving'} menu:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error ${formData.id ? 'updating' : 'saving'} menu: ` + errorMessage);
    }
  };

  const handleExport = (data: any[]) => {
    return data.map(item => ({
      'System': typeof item.group_menu === 'object' && item.group_menu?.sistem?.nama || '-',
      Name: item.nama || '',
      Feature: item.fitur || '',
      'Menu Path': item.pathMenu || '',
      'Group ID': typeof item.group_menu === 'object' ? item.group_menu?.id || '' : item.group_menu || '',
      'Sidebar': item.isSidebar ? 'Yes' : 'No',
      'Created By': item.createdBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
    }));
  };

  const columns = [
    { key: 'system', label: 'Sistem', searchable: true, sortable: true,
      render: (item: MenuItem) => {
        if (item.group_menu && typeof item.group_menu === 'object') {
            return item.group_menu.sistem?.nama || '-';
        }
        return item.group_menu ?? '-';
      }
    },
    { key: 'pathMenu', label: 'Endpoint', searchable: true, sortable: true },
    { key: 'fitur', label: 'Deskripsi', searchable: true, sortable: true },
    { key: 'baseurl', label: 'Base URL', searchable: true, sortable: true },
    { key: 'nama', label: 'Nama', searchable: true, sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: MenuItem) => (
        <ActionsCell item={item} onEdit={handleEditMenu} onViewDetails={handleViewDetails} />
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={menus}
        columns={columns}
        title="Endpoint Management"
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
        setShowModal={setShowDetailsModal}
      />
    </div>
  );
};

export default Endpoint;