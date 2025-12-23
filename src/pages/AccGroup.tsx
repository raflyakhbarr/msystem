import React, { useState, useEffect } from 'react';
import { fetchAccGroup, saveAccGroup } from '../api/accgroupApi';
import { fetchAllSystems } from '../api/SystemApi';
import type { AccGroupItem } from '../api/accgroupApi';
import type { SystemItem } from '../api/SystemApi';
import type { AccGroupFormData } from '../components/accountgroup/EditModal';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/accountgroup/EditModal';
import ActionsCell from '../components/accountgroup/ActionsCell';


const AccGroup = () => {
  const [accGroups, setAccGroups] = useState<AccGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AccGroupFormData | null>(null);
  const [systems, setSystems] = useState<SystemItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accGroupData, systemsData] = await Promise.all([
        fetchAccGroup(),
        fetchAllSystems()
      ]);
      setAccGroups(accGroupData);
      setSystems(systemsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load account groups';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchAccGroup();
      setAccGroups(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      namaGroup: '',
      codeGroup: '',
      idSistem: systems.length > 0 && systems[0].id !== undefined ? systems[0].id : '',
      isAdministrator: false,
      status: true
    });
    setShowModal(true);
  };

  const handleEditAccGroup = (accGroup: AccGroupItem) => {
    setFormData(accGroup as AccGroupFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!formData?.id) {
      // Only reset form data for add mode
      setFormData(null);
    }
  };

  const handleSave = async (data: AccGroupFormData) => {
    try {
      await saveAccGroup(data as AccGroupItem);
      setShowModal(false);
      setFormData(null);
      handleRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error saving account group: ' + errorMessage);
    }
  };

  const handleExport = (data: any[]) => {
    const exportData = data.map((item: AccGroupItem) => ({
      'Group Name': item.namaGroup || '',
      'Group Code': typeof item.codeGroup === 'string' ? item.codeGroup : item.codeGroup?.nama || '',
      Status: item.status ? 'Active' : 'Inactive',
      'Created By': item.createdBy || '',
      'Updated By': item.updatedBy || '',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
      'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
    }));

    return exportData;
  };

  // Column configuration for account group data
  const columns = [
    {
      key: 'namaGroup',
      label: 'Nama',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'codeGroup',
      label: 'Code',
      searchable: true,
      sortable: true,
      exportable: true
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
      sortable: false,
      exportable: false,
      render: (item: AccGroupItem) => <ActionsCell item={item} onEdit={handleEditAccGroup} />
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={accGroups}
        columns={columns}
        title="Account Group Management"
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onExport={handleExport}
        refreshing={refreshing}
        showAddButton={true}
        onAdd={handleAddNew}
      />

      <EditModal
        showModal={showModal}
        formData={formData}
        systems={systems}
        setFormData={setFormData}
        setShowModal={setShowModal}
        handleSubmit={handleSave}
      />
    </div>
  );
};

export default AccGroup;