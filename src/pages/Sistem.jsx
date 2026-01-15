import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useApiData } from '../hooks/useApiData'
import { useCrudForm } from '../hooks/useCrudForm'
import { saveSystemData, fetchAllSystems } from '../api/SystemApi'
import DataTable from '../components/common/DataTable'
import EditModal from '../components/System/EditModal'
import DetailsModal from '../components/System/DetailsModal'
import ActionsCell from '../components/System/ActionsCell'
import { toast } from "sonner";

function SystemManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: systems, loading, error, refetch } = useApiData(fetchAllSystems)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [formData, setFormData] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  const handleAddNew = () => {
    setFormData({
      nama: '',
      url: '',
      destination: '',
      typeApi: 'not_token',
      status: true,
      headers: '{"Accept":"application/json"}',
      token: null
    })
    setShowModal(true)
  }

  const handleEditSystem = (system) => {
    setFormData(system)
    setShowModal(true)
  }

  const handleShowDetails = (system) => {
    setSelectedItem(system)
    setShowDetailsModal(true)
  }

  const handleSettingToken = (system) => {
    navigate(`/sistem/setting-token`, { state: { systemName: system.nama } })
  }

  const handleCloseDetails = () => {
    setSelectedItem(null)
    setShowDetailsModal(false)
  }

  const handleSubmit = async (data) => {
    if (!data) return

    try {
      await saveSystemData(data)
      setShowModal(false)
      setFormData(null)
      refetch()
    } catch (error) {
      console.error('Error saving system:', error)
      toast.error(error.message || 'Failed to save system')
    }
  }

  const handleExport = (data) => {
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
      render: (item) => 
          <ActionsCell item={item} 
              onEdit={handleEditSystem} 
              onShowDetails={handleShowDetails} 
              onSettingToken={handleSettingToken} />
    }
  ]);

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
        handleSubmit={handleSubmit}
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
