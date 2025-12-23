import { useState, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  getPaginationRowModel,
  flexRender 
} from '@tanstack/react-table';
import { 
  FaSortUp, FaSortDown, FaSort, FaEdit, FaTrash, FaLink, FaPlus
} from 'react-icons/fa';
import api from '../../services/api';
import { useCMDB } from '../../hooks/cmdb-hooks/useCMDB';
import { useImageUpload } from '../../hooks/cmdb-hooks/useImageUpload';
import { INITIAL_ITEM_FORM, INITIAL_GROUP_FORM, STATUS_COLORS } from '../../utils/cmdb-utils/constants';
import ItemFormModal from '../../components/cmdb-components/ItemFormModal';
import ConnectionModal from '../../components/cmdb-components/ConnectionModal';
import GroupModal from '../../components/cmdb-components/GroupModal';
import GroupConnectionModal from '../../components/cmdb-components/GroupConnectionModal';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";


export default function CMDBItem() {
  const {
    items,
    connections,
    groups,
    groupConnections,
    fetchItems,
    fetchConnections,
    fetchGroups,
    deleteItem,
    deleteGroup,
  } = useCMDB();

  const {
    selectedFiles,
    imagePreviews,
    existingImages,
    handleFileSelect,
    handleRemoveNewImage,
    handleRemoveExistingImage,
    setImages,
    resetImages,
  } = useImageUpload();

  const [formData, setFormData] = useState(INITIAL_ITEM_FORM);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  
  // Connection modal state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedItemForConnection, setSelectedItemForConnection] = useState(null);
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [selectedGroupConnections, setSelectedGroupConnections] = useState([]);

  // Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupFormData, setGroupFormData] = useState(INITIAL_GROUP_FORM);
  const [editGroupMode, setEditGroupMode] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  // Group connection modal state
  const [showGroupConnectionModal, setShowGroupConnectionModal] = useState(false);
  const [selectedGroupForConnection, setSelectedGroupForConnection] = useState(null);
  const [selectedGroupToGroupConnections, setSelectedGroupToGroupConnections] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) {
        formDataToSend.append(key, formData[key]);
      }
    });

    if (editMode) {
      formDataToSend.append('existingImages', JSON.stringify(existingImages));
    }

    selectedFiles.forEach(file => {
      formDataToSend.append('images', file);
    });

    try {
      if (editMode) {
        await api.put(`/cmdb/${currentId}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/cmdb', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchItems();
      fetchConnections();
      fetchGroups();
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name || '',
      type: item.type || '',
      description: item.description || '',
      status: item.status || 'active',
      ip: item.ip || '',
      category: item.category || 'internal',
      location: item.location || '',
      group_id: item.group_id || null,
      env_type: item.env_type || 'fisik',
    });
    setCurrentId(item.id);
    setEditMode(true);
    setImages(item.images);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const result = await deleteItem(id);
    if (!result.success) {
      alert('Gagal menghapus: ' + result.error);
    }
  };


  const resetForm = () => {
    setFormData(INITIAL_ITEM_FORM);
    setEditMode(false);
    setCurrentId(null);
    resetImages();
  };

  // Connection handlers
  const handleOpenConnectionModal = (item) => {
    setSelectedItemForConnection(item);
    
    const existingItemConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_id)
      .map(conn => conn.target_id);
    
    const existingGroupConns = connections
      .filter(conn => conn.source_id === item.id && conn.target_group_id)
      .map(conn => conn.target_group_id);
    
    setSelectedConnections(existingItemConns);
    setSelectedGroupConnections(existingGroupConns);
    setShowConnectionModal(true);
  };

  const handleToggleConnection = (targetId) => {
    setSelectedConnections(prev => 
      prev.includes(targetId) 
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleToggleGroupConnection = (groupId) => {
    setSelectedGroupConnections(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSaveConnections = async () => {
    try {
      const currentItemConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_id)
        .map(conn => conn.target_id);

      const itemsToAdd = selectedConnections.filter(id => !currentItemConns.includes(id));
      const itemsToRemove = currentItemConns.filter(id => !selectedConnections.includes(id));

      for (const targetId of itemsToAdd) {
        await api.post('/cmdb/connections', {
          source_id: selectedItemForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of itemsToRemove) {
        await api.delete(`/cmdb/connections/${selectedItemForConnection.id}/${targetId}`);
      }

      const currentGroupConns = connections
        .filter(conn => conn.source_id === selectedItemForConnection.id && conn.target_group_id)
        .map(conn => conn.target_group_id);

      const groupsToAdd = selectedGroupConnections.filter(id => !currentGroupConns.includes(id));
      const groupsToRemove = currentGroupConns.filter(id => !selectedGroupConnections.includes(id));

      for (const groupId of groupsToAdd) {
        await api.post('/cmdb/connections/to-group', {
          source_id: selectedItemForConnection.id,
          target_group_id: groupId
        });
      }

      for (const groupId of groupsToRemove) {
        await api.delete(`/cmdb/connections/to-group/${selectedItemForConnection.id}/${groupId}`);
      }

      fetchConnections();
      setShowConnectionModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  // Group handlers
  const handleGroupInputChange = (e) => {
    const { name, value } = e.target;
    setGroupFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editGroupMode) {
        await api.put(`/groups/${currentGroupId}`, groupFormData);
      } else {
        await api.post('/groups', groupFormData);
      }
      fetchGroups();
      setShowGroupModal(false);
      setGroupFormData(INITIAL_GROUP_FORM);
      setEditGroupMode(false);
    } catch (err) {
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditGroup = (group) => {
    setGroupFormData({
      name: group.name || '',
      description: group.description || '',
      color: group.color || '#e0e7ff'
    });
    setCurrentGroupId(group.id);
    setEditGroupMode(true);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('Hapus group ini? Items di dalamnya tidak akan dihapus.')) return;
    const result = await deleteGroup(id);
    if (!result.success) {
      alert('Gagal menghapus: ' + result.error);
    }
  };

  const handleOpenGroupConnectionModal = (group) => {
    setSelectedGroupForConnection(group);
    
    const existingConns = groupConnections
      .filter(conn => conn.source_id === group.id)
      .map(conn => conn.target_id);
    
    setSelectedGroupToGroupConnections(existingConns);
    setShowGroupConnectionModal(true);
  };

  const handleToggleGroupToGroupConnection = (targetGroupId) => {
    setSelectedGroupToGroupConnections(prev =>
      prev.includes(targetGroupId)
        ? prev.filter(id => id !== targetGroupId)
        : [...prev, targetGroupId]
    );
  };

  const handleSaveGroupConnections = async () => {
    try {
      const currentConns = groupConnections
        .filter(conn => conn.source_id === selectedGroupForConnection.id)
        .map(conn => conn.target_id);

      const toAdd = selectedGroupToGroupConnections.filter(id => !currentConns.includes(id));
      const toRemove = currentConns.filter(id => !selectedGroupToGroupConnections.includes(id));

      for (const targetId of toAdd) {
        await api.post('/groups/connections', {
          source_id: selectedGroupForConnection.id,
          target_id: targetId
        });
      }

      for (const targetId of toRemove) {
        await api.delete(`/groups/connections/${selectedGroupForConnection.id}/${targetId}`);
      }

      fetchConnections();
      const res = await api.get('/groups/connections');
      setShowGroupConnectionModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan: ' + (err.response?.data?.error || err.message));
    }
  };

  const getConnectionInfo = (itemId) => {
    const asSource = connections.filter(c => c.source_id === itemId).length;
    const asTarget = connections.filter(c => c.target_id === itemId).length;
    return { dependencies: asTarget, dependents: asSource };
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <div>
            <div className="font-medium mb-1">Nama</div>
            <input
              type="text"
              placeholder="Cari Nama..."
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              value={(column.getFilterValue() ?? '')}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="border p-1 text-xs rounded w-full"
            />
          </div>
        ),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <div>
            <div className="font-medium mb-1">Status</div>
            <select
              value={column.getFilterValue() ?? ''}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="border p-1 text-xs rounded w-full"
            >
              <option value="">Semua</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
        ),
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'location',
        filterFn: 'includesString',
        header: ({ column }) => (
          <div>
            <div className="font-medium mb-1">Lokasi</div>
            <input
              type="text"
              placeholder="Cari Lokasi..."
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              value={(column.getFilterValue() ?? '')}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="border p-1 text-xs rounded w-full"
            />
          </div>
        ),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      },
      {
        accessorKey: 'group_id',
        header: 'Group',
        cell: ({ getValue }) => {
          const groupId = getValue();
          const group = groups.find(g => g.id === groupId);
          return group ? (
            <span className="px-2 py-1 rounded text-xs" style={{ 
              backgroundColor: group.color,
              border: '1px solid #6366f1'
            }}>
              {group.name}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          );
        },
      },
      {
        id: 'connections',
        header: 'Koneksi',
        enableSorting: false, 
        cell: ({ row }) => {
          const info = getConnectionInfo(row.original.id);
          return (
            <div className="text-xs">
              <div className="text-blue-600">↑ {info.dependencies} dependencies</div>
              <div className="text-green-600">↓ {info.dependents} dependents</div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Aksi',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenConnectionModal(row.original)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              title="Kelola Koneksi"
            >
              <FaLink size={16} />
            </button>
            <button
              onClick={() => handleEdit(row.original)}
              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
              title="Edit"
            >
              <FaEdit size={16} />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Hapus"
                >
                  <FaTrash size={16} />
                </button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Apakah Anda yakin?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Item ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(row.original.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Ya, Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [connections, groups]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
      <div className="py-6 px-6 mx-0">
        <h1 className="text-2xl font-bold mb-4">Items</h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FaPlus /> Tambah Item
          </button>
          <button
            onClick={() => {
              setGroupFormData(INITIAL_GROUP_FORM);
              setEditGroupMode(false);
              setShowGroupModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
          >
            <FaPlus /> Kelola Groups
          </button>
        </div>

        <ItemFormModal
          show={showModal}
          editMode={editMode}
          formData={formData}
          groups={groups}
          selectedFiles={selectedFiles}
          imagePreviews={imagePreviews}
          existingImages={existingImages}
          onClose={() => {
            setShowModal(false);
            setTimeout(() => resetForm(), 200);
          }}
          onSubmit={handleSubmit}
          onInputChange={handleInputChange}
          onFileSelect={handleFileSelect}
          onRemoveNewImage={handleRemoveNewImage}
          onRemoveExistingImage={(imgPath) => handleRemoveExistingImage(imgPath, currentId)}
        />

        <ConnectionModal
          show={showConnectionModal}
          selectedItem={selectedItemForConnection}
          items={items}
          groups={groups}
          selectedConnections={selectedConnections}
          selectedGroupConnections={selectedGroupConnections}
          onClose={() => setShowConnectionModal(false)}
          onSave={handleSaveConnections}
          onToggleConnection={handleToggleConnection}
          onToggleGroupConnection={handleToggleGroupConnection}
        />

        <GroupModal
          show={showGroupModal}
          editMode={editGroupMode}
          formData={groupFormData}
          groups={groups}
          onClose={() => {
            setShowGroupModal(false);
            setGroupFormData(INITIAL_GROUP_FORM);
            setEditGroupMode(false);
          }}
          onSubmit={handleGroupSubmit}
          onInputChange={handleGroupInputChange}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onOpenGroupConnection={handleOpenGroupConnectionModal}
        />

        <GroupConnectionModal
          show={showGroupConnectionModal}
          selectedGroup={selectedGroupForConnection}
          groups={groups}
          selectedConnections={selectedGroupToGroupConnections}
          onClose={() => setShowGroupConnectionModal(false)}
          onSave={handleSaveGroupConnections}
          onToggleConnection={handleToggleGroupToGroupConnection}
        />

        <div className="mb-4">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari data..."
            className="border p-2 rounded w-full md:w-96"
          />
        </div>

        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full table-fixed bg-white border">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`border px-4 py-3 text-left ${
                      header.column.getCanSort() ? 'cursor-pointer hover:bg-gray-200' : ''
                    }`}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() ? (
                          header.column.getIsSorted() === 'desc' ? (
                            <FaSortDown />
                          ) : (
                            <FaSortUp />
                          )
                        ) : (
                          <FaSort className="text-gray-400" />
                        )
                      )}
                    </div>
                  </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: table.getPageCount() }, (_, i) => i).map((pageIndex) => (
              <button
                key={pageIndex}
                onClick={() => table.setPageIndex(pageIndex)}
                className={`px-3 py-1 border rounded ${
                  table.getState().pagination.pageIndex === pageIndex
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {pageIndex + 1}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Halaman{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} dari{' '}
                {table.getPageCount()}
              </strong>
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="border p-1 rounded"
            >
              {[10, 20, 30, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Tampilkan {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
  );
}