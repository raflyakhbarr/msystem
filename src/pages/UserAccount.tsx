import React, { useState, useMemo } from 'react';
import { fetchAccounts, saveAccount } from '../api/accountApi';
import type { AccountItem } from '../api/accountApi';
import type { AccountFormData } from '../components/Account/EditModal';
import { useApiData } from '../hooks/useApiData';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/Account/EditModal';
import ActionsCell from '../components/Account/ActionsCell';
import { useCrudForm } from '@/hooks/useCrudForm';

const Account = () => {
  const { data: accounts, loading, error, refetch } = useApiData<AccountItem>(fetchAccounts);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AccountFormData | null>(null);

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

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    refetch();
  };

  const { handleSave } = useCrudForm({
    saveFunction: (data) => saveAccount(data as AccountItem),
    onSuccess: handleSuccess,
    successMessage: 'Account',
    errorMessagePrefix: 'Error saving account',
  });

  const handleExport = (data: any[]) => {
    const exportData = data.map((item: AccountItem) => ({
      NIPP: item.nipp || '',
      Email: item.email || ''
    }));

    return exportData;
  };

  const columns = useMemo(()=> [
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
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={accounts || []}
        columns={columns}
        title="Account Management"
        loading={loading}
        error={error}
        onRefresh={refetch}
        onExport={handleExport}
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
