import { useState, useEffect,useMemo } from 'react';
import { fetchMenu, saveMenu } from '../api/menuApi';
import type { MenuItem } from '../api/menuApi';
import DataTable, { type DataItem } from '../components/common/DataTable';
import ActionsCell from '../components/Endpoint/ActionsCell';
import EditModal from '../components/Endpoint/EditModal';
import DetailsModal from '../components/Endpoint/DetailsModal';
import { useCrudForm } from '@/hooks/useCrudForm';

const Endpoint = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const data = await fetchMenu();
      setMenus(data);
    } catch (error) {
      console.error("Error loading menus:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load menus';
      setError(errorMessage);
    } finally {
      setLoading(false);
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

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    loadData();
  };

  const { handleSave } = useCrudForm({
    saveFunction: (data: Partial<MenuItem>) => saveMenu(data as MenuItem),
    onSuccess: handleSuccess,
    successMessage: 'Endpoint',
    errorMessagePrefix: 'Error saving endpoint',
    showToast: false,
  });

  const handleSubmitForm = async () => {
    if (formData) {
      await handleSave(formData, 'id');
    }
  };

  const handleExport = <T extends DataItem>(data: T[]) => {
    return (data as unknown as MenuItem[]).map(item => ({
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

  const columns = useMemo(() => [
    { key: 'system', label: 'Sistem', searchable: true, sortable: true,
      render: (item: unknown) => {
        const menuItem = item as MenuItem
        if (menuItem.group_menu && typeof menuItem.group_menu === 'object') {
            return menuItem.group_menu.sistem?.nama || '-';
        }
        return menuItem.group_menu ?? '-';
      }
    },
    { key: 'pathMenu', label: 'Endpoint', searchable: true, sortable: true },
    { key: 'fitur', label: 'Deskripsi', searchable: true, sortable: true },
    { key: 'baseurl', label: 'Base URL', searchable: true, sortable: true },
    { key: 'nama', label: 'Nama', searchable: true, sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: unknown) => (
        <ActionsCell item={item as MenuItem} onEdit={handleEditMenu} onViewDetails={handleViewDetails} />
      ),
      searchable:false,
      sortable:false
    }
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={menus || []}
        columns={columns}
        title="Endpoint Management"
        loading={loading}
        error={error}
        onRefresh={loadData}
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
        setShowModal={setShowDetailsModal}
      />
    </div>
  );
};

export default Endpoint;