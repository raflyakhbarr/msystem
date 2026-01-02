import {
  FaEye, FaSave, FaPlus, FaLayerGroup, FaMousePointer, FaSquare, 
  FaProjectDiagram, FaDownload, FaHandPaper, FaUndo, FaRedo,
  FaToggleOn, FaToggleOff
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '../ui/sidebar';
import SearchBar from './SearchBar';

export default function VisualizationNavbar({
  draggedNode,
  selectionMode,
  selectedForHiding,
  hiddenNodes,
  isSaving,
  isAutoSaving,
  isAutoSaveEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleAutoSave, 
  showVisibilityPanel,
  nodes,
  onNodeSearch,
  reactFlowInstance,
  onSetSelectionMode,
  onShowOnlySelected,
  onToggleVisibilityPanel,
  onShowAllNodes,
  onSavePositions,
  onOpenAddItem,
  onOpenManageGroups,
  onOpenExportModal,
}) {
  return (
    <div className="bg-muted/10 relative z-5 shadow-md">
      {/* Top Row - Main Actions */}
      <div className="px-1 py-0.5 items-center justify-between">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="ml-0 transition-all ml-2" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
            
            {/* Add Item */}
            <Button
              onClick={onOpenAddItem}
              variant="default"
              size="sm"
              title="Tambah Item Baru"
            >
              <FaPlus />
              <span className="hidden md:inline">Item</span>
            </Button>

            {/* Manage Groups */}
            <Button
              onClick={onOpenManageGroups}
              variant="secondary"
              size="sm"
              title="Kelola Groups"
            >
              <FaLayerGroup />
              <span className="hidden md:inline">Groups</span>
            </Button>

            {/* Export Button */}
            <Button
              onClick={onOpenExportModal}
              title="Ekspor sebagai Gambar atau PDF"
              variant="secondary"
              size="sm"
            >
              <FaDownload />
              <span className="hidden md:inline">Export</span>
            </Button>

            <div className="h-8 w-px bg-border"></div>

            {/* Undo Button */}
            <Button
              onClick={onUndo}
              disabled={!canUndo}
              variant="outline"
              size="sm"
              title="Undo (Ctrl+Z)"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaUndo size={14} />
            </Button>

            {/* Redo Button */}
            <Button
              onClick={onRedo}
              disabled={!canRedo}
              variant="outline"
              size="sm"
              title="Redo (Ctrl+Y)"
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaRedo size={14} />
            </Button>

            <div className="h-8 w-px bg-border"></div>

            {/* Auto-Save Toggle */}
            <Button
              onClick={onToggleAutoSave}
              variant={isAutoSaveEnabled ? "default" : "outline"}
              size="sm"
              title={isAutoSaveEnabled ? "Auto-save Aktif (klik untuk nonaktifkan)" : "Auto-save Nonaktif (klik untuk aktifkan)"}
              className={isAutoSaveEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            >
              {isAutoSaveEnabled ? <FaToggleOn size={16} /> : <FaToggleOff size={16} />}
              <span className="hidden lg:inline">Auto-save</span>
            </Button>

            {/* Save Button */}
            <Button
              onClick={onSavePositions}
              disabled={isSaving || isAutoSaving}
              variant="outline"
              size="sm"
              className={!isSaving && !isAutoSaving ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent" : ""}
              title="Simpan Posisi Manual (Ctrl+S)"
            >
              <FaSave />
              <span className="hidden md:inline">
                {isSaving ? 'Menyimpan...' : isAutoSaving ? 'Auto-saving...' : 'Save'}
              </span>
            </Button>

            {/* Auto-saving Indicator */}
            {isAutoSaving && isAutoSaveEnabled && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="font-medium">Auto-saving...</span>
              </div>
            )}

            {/* Drag Status */}
            {draggedNode && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 animate-pulse">
                <FaProjectDiagram className="animate-bounce" />
                <span className="font-medium">Drag untuk mengubah urutan</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <SearchBar 
              nodes={nodes}
              onNodeSelect={onNodeSearch}
              reactFlowInstance={reactFlowInstance}
            />

            <div className="h-8 w-px bg-border"></div>

            {/* Visibility Panel Toggle */}
            <Button
              onClick={onToggleVisibilityPanel}
              variant={showVisibilityPanel ? "default" : "outline"}
              size="sm"
              title="Panel Visibility"
            >
              <FaEye size={14} />
              <span className="hidden md:inline">Visibility</span>
            </Button>

            {/* Selection Mode */}
            <div className="flex items-center gap-1 bg-card rounded-lg p-1 shadow-sm border border-border">
              <Button
                onClick={() => onSetSelectionMode('freeroam')}
                variant={selectionMode === 'freeroam' ? "default" : "ghost"}
                size="sm"
                title="Mode Free Roam - Geser canvas bebas"
              >
                <FaHandPaper size={14} />
                <span className="hidden sm:inline">Free</span>
              </Button>
              <Button
                onClick={() => onSetSelectionMode('single')}
                variant={selectionMode === 'single' ? "default" : "ghost"}
                size="sm"
                title="Mode Seleksi Tunggal"
              >
                <FaMousePointer size={14} />
                <span className="hidden sm:inline">Single</span>
              </Button>
              <Button
                onClick={() => onSetSelectionMode('rectangle')}
                variant={selectionMode === 'rectangle' ? "default" : "ghost"}
                size="sm"
                title="Mode Seleksi Kotak"
              >
                <FaSquare size={14} />
                <span className="hidden sm:inline">Rectangle</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {(selectedForHiding.size > 0 || hiddenNodes.size > 0) && (
        <div className="absolute left-0 right-0 top-full mt-2 px-4 py-2 bg-muted/95 backdrop-blur-sm border-b border-border shadow-lg z-50">
          <div className="flex items-center gap-2">
            {/* Selection Info */}
            {selectedForHiding.size > 0 && (
              <>
                <div className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20 font-medium">
                  {selectedForHiding.size} dipilih
                </div>
                <button
                  onClick={onShowOnlySelected}
                  className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium flex items-center gap-2 text-sm transition-colors shadow-sm"
                  title="Tampilkan Hanya yang Dipilih"
                >
                  <FaEye size={14} />
                  <span className="hidden lg:inline">Tampilkan Pilihan</span>
                </button>
              </>
            )}

            {/* Show All Button */}
            {hiddenNodes.size > 0 && (
              <button
                onClick={onShowAllNodes}
                className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium flex items-center gap-2 text-sm transition-colors shadow-sm"
                title="Tampilkan Semua Node"
              >
                <FaEye size={14} />
                <span className="hidden lg:inline">Tampilkan Semua</span>
                <span className="bg-accent/80 px-1.5 py-0.5 rounded text-xs">
                  {hiddenNodes.size}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}