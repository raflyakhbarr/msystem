import { 
  FaArrowLeft, FaEye, FaMousePointer, FaSquare, FaSave, 
  FaPlus, FaCog, FaLayerGroup, FaProjectDiagram 
} from 'react-icons/fa';

export default function VisualizationNavbar({
  draggedNode,
  selectionMode,
  selectedForHiding,
  hiddenNodes,
  isSaving,
  showVisibilityPanel,
  onNavigateBack,
  onSetSelectionMode,
  onShowOnlySelected,
  onToggleVisibilityPanel,
  onShowAllNodes,
  onSavePositions,
  onOpenAddItem,
  onOpenManageGroups,
}) {
  return (
    <div className="bg-white shadow-md z-10">
      {/* Top Row - Main Actions */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Kembali ke Dashboard"
          >
            <FaArrowLeft />
            <span className="font-medium">Dashboard</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-xl font-bold text-gray-800">Visualisasi CMDB</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Item */}
          <button
            onClick={onOpenAddItem}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            title="Tambah Item Baru"
          >
            <FaPlus />
            <span className="hidden md:inline">Item</span>
          </button>

          {/* Manage Groups */}
          <button
            onClick={onOpenManageGroups}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            title="Kelola Groups"
          >
            <FaLayerGroup />
            <span className="hidden md:inline">Groups</span>
          </button>

          <div className="h-8 w-px bg-gray-300"></div>

          {/* Save Button */}
          <button
            onClick={onSavePositions}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="Simpan Posisi"
          >
            <FaSave />
            <span className="hidden md:inline">{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Row - Tools & Filters */}
      <div className="px-4 py-2 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Selection Mode */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => onSetSelectionMode('single')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                selectionMode === 'single'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Mode Seleksi Tunggal"
            >
              <FaMousePointer size={14} />
              <span className="hidden sm:inline">Single</span>
            </button>
            <button
              onClick={() => onSetSelectionMode('rectangle')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                selectionMode === 'rectangle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Mode Seleksi Kotak"
            >
              <FaSquare size={14} />
              <span className="hidden sm:inline">Rectangle</span>
            </button>
          </div>

          {/* Drag Status */}
          {draggedNode && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-pulse">
              <FaProjectDiagram className="animate-bounce" />
              <span className="font-medium">Drag untuk mengubah urutan</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Selection Info */}
          {selectedForHiding.size > 0 && (
            <>
              <div className="text-sm bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 font-medium">
                {selectedForHiding.size} dipilih
              </div>
              <button
                onClick={onShowOnlySelected}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors shadow-sm"
                title="Tampilkan Hanya yang Dipilih"
              >
                <FaEye size={14} />
                <span className="hidden lg:inline">Tampilkan Pilihan</span>
              </button>
            </>
          )}

          {/* Visibility Panel Toggle */}
          <button
            onClick={onToggleVisibilityPanel}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 text-sm transition-all shadow-sm ${
              showVisibilityPanel
                ? 'bg-blue-600 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
            }`}
            title="Panel Visibility"
          >
            <FaEye size={14} />
            <span className="hidden md:inline">Visibility</span>
          </button>

          {/* Show All Button */}
          {hiddenNodes.size > 0 && (
            <button
              onClick={onShowAllNodes}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors shadow-sm"
              title="Tampilkan Semua Node"
            >
              <FaEye size={14} />
              <span className="hidden lg:inline">Tampilkan Semua</span>
              <span className="bg-green-700 px-1.5 py-0.5 rounded text-xs">
                {hiddenNodes.size}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}