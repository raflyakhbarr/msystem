import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystems } from '../hooks/useSystems'
import { saveSystemData } from '../api/SystemApi'
import DataTable from '../components/common/DataTable'
import EditModal from '../components/System/EditModal'
import DetailsModal from '../components/System/DetailsModal'
import ActionsCell from '../components/System/ActionsCell'

const exportToExcel = (data) => {
  return data.map(item => ({
    Name: item.nama,
    URL: item.url,
    Destination: item.destination,
    'API Type': item.typeApi,
    Status: item.status ? 'Active' : 'Inactive',
    'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
  }));
};

function SystemManagement() {
  const { systems, loading, error, loadSystems } = useSystems()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingSystem, setEditingSystem] = useState(null)
  const [detailsUser, setDetailsUser] = useState(null)

  const handleEditSystem = (system) => {
    setEditingSystem(system)
    setShowEditModal(true)
  }

  const handleShowDetails = (system) => {
    setDetailsUser(system)
    setShowDetailsModal(true)
  }

  const handleCancelEdit = () => {
    setEditingSystem(null)
    setShowEditModal(false)
  }

  const handleCloseDetails = () => {
    setDetailsUser(null)
    setShowDetailsModal(false)
  }

  const handleUpdateSystem = async (systemData) => {
    if (editingSystem) {
      try {
        await saveSystemData(systemData);
        // Refresh the data to show updated changes
        loadSystems();
        setEditingSystem(null);
        setShowEditModal(false);
      } catch (error) {
        console.error("Error saving system:", error);
        alert('Error saving system: ' + error.message);
      }
    }
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
        onRefresh={loadSystems}
        onAdd={() => {
          const newSystemConfig = {
              nama: '',
              url: '',
              destination: '',
              typeApi: 'not_token',
              status: true,
              headers: '{"Accept":"application/json"}',
              token: null
          }
          setEditingSystem(newSystemConfig)
          setShowEditModal(true)
        }}
        onExport={exportToExcel}
      />

      <EditModal
        editingSystem={editingSystem}
        onSave={handleUpdateSystem}
        onCancel={handleCancelEdit}
      />
      
      <DetailsModal
        detailsUser={detailsUser}
        onClose={handleCloseDetails}
      />
    </div>
  )
}

export default SystemManagement;
