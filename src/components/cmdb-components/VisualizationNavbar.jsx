import {
  FaEye, FaSave, FaPlus, FaLayerGroup, FaMousePointer, FaSquare, FaProjectDiagram, FaDownload
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '../ui/sidebar';

export default function VisualizationNavbar({
  draggedNode,
  selectionMode,
  selectedForHiding,
  hiddenNodes,
  isSaving,
  showVisibilityPanel,
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
    <div className="bg-muted/10 relative z-1000 shadow-md">
      {/* Top Row - Main Actions */}
      <div className="px-1 py-0.5 items-center justify-between">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
          <SidebarTrigger className="ml-0 transition-all shadow-sm border border-gray-200 bg-white" />
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
              <span className="hidden md:inline">Ekspor</span>
            </Button>

            <div className="h-8 w-px bg-border"></div>

            {/* Save Button */}
            <Button
              onClick={onSavePositions}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className={!isSaving ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent" : ""}
              title="Simpan Posisi"
            >
              <FaSave />
              <span className="hidden md:inline">{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </Button>

            {/* Drag Status */}
            {draggedNode && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 animate-pulse">
                <FaProjectDiagram className="animate-bounce" />
                <span className="font-medium">Drag untuk mengubah urutan</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
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
        <div className="px-1 pb-1.5">
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