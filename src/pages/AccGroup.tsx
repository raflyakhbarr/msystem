import { useState, useMemo } from 'react';
import { fetchAccGroup, saveAccGroup } from '../api/accgroupApi';
import type { AccGroupFormData } from '../components/accountgroup/EditModal';
import { useApiData } from '../hooks/useApiData';
import { useCrudForm } from '../hooks/useCrudForm';
import DataTable from '../components/common/DataTable';
import EditModal from '../components/accountgroup/EditModal';
import ActionsCell from '../components/accountgroup/ActionsCell';
import type { DataItem, AccGroupItem } from '@/types';


const AccGroup = () => {
  const { data: accGroups, loading, error, refetch } = useApiData<AccGroupItem>(fetchAccGroup);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AccGroupFormData | null>(null);

  const handleAddNew = () => {
    setFormData({
      namaGroup: '',
      codeGroup: '',
      idSistem: undefined,
      isAdministrator: false,
      status: true
    });
    setShowModal(true);
  };

  const handleEditAccGroup = (accGroup: AccGroupItem) => {
    setFormData(accGroup as AccGroupFormData);
    setShowModal(true);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    refetch();
  };

  const { handleSave } = useCrudForm({
    saveFunction: (data) => saveAccGroup(data as AccGroupItem),
    onSuccess: handleSuccess,
    successMessage: 'Account group',
    errorMessagePrefix: 'Error saving account group',
    showToast: false,  
  });

  const handleExport = <T extends DataItem>(data: T[]) => {
    const exportData = (data as AccGroupItem[]).map((item) => ({
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

  const columns = useMemo(() => [
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
      badgelabel: 'Active : Inactive'
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      sortable: false,
      exportable: false,
      render: (item: unknown) => <ActionsCell item={item as AccGroupItem} onEdit={handleEditAccGroup} />
    }
  ], []);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={accGroups || []}
        columns={columns}
        title="Account Group Management"
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

export default AccGroup;