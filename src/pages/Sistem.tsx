import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiData } from '../hooks/useApiData'
import { useCrudForm } from '../hooks/useCrudForm'
import { saveSystemData, fetchAllSystems } from '../api/SystemApi'
import DataTable from '../components/common/DataTable'
import EditModal from '../components/System/EditModal'
import DetailsModal from '../components/System/DetailsModal'
import ActionsCell from '../components/System/ActionsCell'
import type { SystemItem } from '@/types'

function SystemManagement() {
  const navigate = useNavigate()
  const { data: systems, loading, error, refetch } = useApiData(fetchAllSystems)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [formData, setFormData] = useState<Partial<SystemItem> | null>(null)
  const [selectedItem, setSelectedItem] = useState<SystemItem | null>(null)

  const handleAddNew = () => {
    setFormData({
      nama: '',
      url: '',
      destination: '',
      typeApi: 'not_token',
      status: true,
      headers: [],
      ip_whitelist: [],
      token: null
    })
    setShowModal(true)
  }

  const handleEditSystem = (system: SystemItem) => {
    setFormData(system)
    setShowModal(true)
  }

  const handleShowDetails = (system: SystemItem) => {
    setSelectedItem(system)
    setShowDetailsModal(true)
  }

  const handleSettingToken = (system: SystemItem) => {
    navigate(`/sistem/setting-token`, { state: { systemName: system.nama } })
  }

  const handleSuccess = () => {
    setShowModal(false);
    setFormData(null);
    refetch();
  };

  const {handleSave} = useCrudForm({
      saveFunction: (data: Partial<SystemItem>) => saveSystemData(data as SystemItem),
      onSuccess: handleSuccess,
      successMessage:'System',
      errorMessagePrefix: "Error saving System",
      showToast:false
  })

  const handleExport = (data: SystemItem[]) => {
    return data.map(item => ({
      Name: item.nama,
      URL: item.url,
      Destination: item.destination,
      'API Type': item.typeApi,
      Status: item.status ? 'Active' : 'Inactive',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
      'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
    }))
  }

  const columns = useMemo(()=> [
    {
      key: 'nama',
      label: 'Nama',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'url',
      label: 'path',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'destination',
      label: 'URL',
      searchable: true,
      sortable: true,
      exportable: true
    },
    {
      key: 'status',
      label: 'Is Active?',
      searchable: true,
      sortable: true,
      exportable: true,
      isBoolean: true,
      badgelabel: 'Active:Inactive'
    },
    {
      key: 'actions',
      label: 'Actions',
      searchable: false,
      sortable: false,
      exportable: false,
      render: (item: SystemItem) => 
          <ActionsCell item={item} 
              onEdit={handleEditSystem} 
              onShowDetails={handleShowDetails} 
              onSettingToken={handleSettingToken} />
    }
  ],[]);

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={systems || []}
        columns={columns}
        title="System Management"
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
        handleSubmit={handleSave}
      />

      <DetailsModal
        showModal={showDetailsModal}
        item={selectedItem}
        setShowModal={setShowDetailsModal}
      />
    </div>
  )
}

export default SystemManagement;
