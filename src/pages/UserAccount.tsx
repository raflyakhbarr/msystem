import React, { useState, useEffect } from 'react';
import { fetchAccounts, saveAccount } from '../api/accountApi';
import type { AccountItem } from '../api/accountApi';
import type { AccountFormData } from '../components/Account/EditModal';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/Account/EditModal';
import ActionsCell from '../components/Account/ActionsCell';

const Account = () => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AccountFormData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const accountData = await fetchAccounts();
      setAccounts(accountData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load accounts';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      nipp: '',
      email: ''
    });
    setShowModal(true);
  };

  const handleEditAccount = (account: AccountItem) => {
    setFormData(account as AccountFormData);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!formData?.id) {
      setFormData(null);
    }
  };

  const handleSave = async (data: AccountFormData) => {
    try {
      await saveAccount(data as AccountItem);
      setShowModal(false);
      setFormData(null);
      handleRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Error saving account: ' + errorMessage);
    }
  };

  const handleExport = (data: any[]) => {
    const exportData = data.map((item: AccountItem) => ({
      NIPP: item.nipp || '',
      Email: item.email || ''
    }));

    return exportData;
  };

  // Column configuration for account data
  const columns = [
    {
      key: 'nipp',
      label: 'NIPP',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'email',
      label: 'Email',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      sortable: false,
      exportable: false,
      render: (item: AccountItem) => (
        <ActionsCell
          item={item}
          onEdit={handleEditAccount}
        />
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={accounts}
        columns={columns}
        title="Account Management"
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
        setFormData={setFormData}
        setShowModal={setShowModal}
        handleSubmit={handleSave}
      />
    </div>
  );
};

export default Account;
