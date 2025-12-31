import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystems } from '../hooks/useSystems'
import { saveSystemData } from '../api/SystemApi'
import DataTable from '../components/common/DataTable'
import EditModal from '../components/System/EditModal'
import DetailsModal from '../components/System/DetailsModal'
import ActionsCell from '../components/System/ActionsCell'

function SystemManagement() {
  const { systems, loading, error, loadSystems } = useSystems()
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [formData, setFormData] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadSystems()
    } catch (error) {
      console.error('Error refreshing systems:', error)
    } finally {
      setRefreshing(false)
    }
  }

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

  const handleCloseDetails = () => {
    setSelectedItem(null)
    setShowDetailsModal(false)
  }

  const handleSubmit = async () => {
    if (!formData) return

    try {
      const isEdit = !!formData.id
      await saveSystemData(formData)
      setShowModal(false)
      setFormData(null)
      handleRefresh()
    } catch (error) {
      console.error('Error saving system:', error)
      alert('Error saving system: ' + error.message)
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

  // Define columns for the DataTable inside the component to access the functions
  const columns = [
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
      render: (item) => <ActionsCell item={item} onEdit={handleEditSystem} onShowDetails={handleShowDetails} />
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <DataTable
        data={systems}
        columns={columns}
        title="System Management"
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
  )
}

export default SystemManagement;
