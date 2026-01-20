import {
  Eye, Save, Plus, Layers, MousePointer2, Square,
  GitBranch, Download, Hand, Undo2, Redo2,
  ToggleRight, ToggleLeft, Highlighter, ChevronDown, Table
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '../ui/sidebar';
import SearchBar from './SearchBar';

export default function VisualizationNavbar({
  draggedNode,
  selectionMode,
  highlightMode, 
  highlightedNodeId,
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
  onSetHighlightMode,
  onClearHighlight,
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
  showTableDrawer,
  onToggleTableDrawer,
}) {
  const getSelectionIcon = () => {
    switch (selectionMode) {
      case 'freeroam': return <Hand size={14} />;
      case 'single': return <MousePointer2 size={14} />;
      case 'rectangle': return <Square size={14} />;
      default: return <MousePointer2 size={14} />;
    }
  };

  const getSelectionLabel = () => {
    switch (selectionMode) {
      case 'freeroam': return 'Free';
      case 'single': return 'Single';
      case 'rectangle': return 'Rectangle';
      default: return 'Mode';
    }
  };

  return (
    <div className="bg-muted/10 relative z-5 shadow-md pt-3 pb-3">
      {/* Top Row - Main Actions */}
      <div className="px-1 py-0.5 items-center justify-between">
        <div className="flex items-center justify-between w-full">
          {/* Left Side - Actions */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="ml-2 transition-all" />
            <div className="h-8 w-px bg-linear-to-b from-transparent via-gray-300 to-transparent"></div>
            
            {/* Add Item & Groups */}
            <div className="flex items-center gap-1">
              <Button
                onClick={onOpenAddItem}
                variant="default"
                size="sm"
                title="Tambah Item Baru"
              >
                <Plus />
                <span className="hidden xl:inline ml-1">Item</span>
              </Button>

              <Button
                onClick={onOpenManageGroups}
                variant="secondary"
                size="sm"
                title="Kelola Groups"
              >
                <Layers />
                <span className="hidden xl:inline ml-1">Groups</span>
              </Button>

              <Button
                onClick={onOpenExportModal}
                title="Ekspor sebagai Gambar atau PDF"
                variant="secondary"
                size="sm"
              >
                <Download />
                <span className="hidden lg:inline ml-1">Export</span>
              </Button>

              <Button
                onClick={onToggleTableDrawer}
                variant={showTableDrawer ? "default" : "secondary"}
                className="px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                title="Lihat Tabel"
              >
                <Table size={16} />
                <span className="hidden md:inline">Tabel</span>
              </Button>
            </div>

            <div className="h-8 w-px bg-border"></div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <Button
                onClick={onUndo}
                disabled={!canUndo}
                variant="ghost"
                size="sm"
                title="Undo (Ctrl+Z)"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 size={14} />
              </Button>

              <Button
                onClick={onRedo}
                disabled={!canRedo}
                variant="ghost"
                size="sm"
                title="Redo (Ctrl+Y)"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Redo2 size={14} />
              </Button>
            </div>

            <div className="h-8 w-px bg-border"></div>

            {/* Save Controls */}
            <div className="flex items-center gap-1">
              <Button
                onClick={onToggleAutoSave}
                variant={isAutoSaveEnabled ? "default" : "ghost"}
                size="sm"
                title={isAutoSaveEnabled ? "Auto-save Aktif" : "Auto-save Nonaktif"}
                className={isAutoSaveEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {isAutoSaveEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                <span className="hidden xl:inline ml-1">Auto</span>
              </Button>

              <Button
                onClick={onSavePositions}
                disabled={isSaving || isAutoSaving}
                variant="ghost"
                size="sm"
                className={!isSaving && !isAutoSaving ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                title="Simpan Posisi Manual (Ctrl+S)"
              >
                <Save />
                <span className="hidden xl:inline ml-1">
                  {isSaving ? 'Saving...' : isAutoSaving ? 'Auto...' : 'Save'}
                </span>
              </Button>
            </div>

            {/* Auto-saving Indicator */}
            {isAutoSaving && isAutoSaveEnabled && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></div>
                <span className="font-medium hidden lg:inline">Auto-saving...</span>
              </div>
            )}

            {/* Drag Status */}
            {draggedNode && (
              <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 animate-pulse">
                <GitBranch className="animate-bounce" />
                <span className="font-medium hidden lg:inline">Dragging...</span>
              </div>
            )}
          </div>

          {/* Right Side - View & Search */}
          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <SearchBar 
              nodes={nodes}
              onNodeSelect={onNodeSearch}
              reactFlowInstance={reactFlowInstance}
            />

            <div className="h-8 w-px bg-border"></div>

            {/* View Controls */}
            <div className="flex items-center gap-1">
              <Button
                onClick={onToggleVisibilityPanel}
                variant={showVisibilityPanel ? "default" : "ghost"}
                size="sm"
                title="Panel Visibility"
              >
                <Eye size={14} />
                <span className="hidden lg:inline ml-1">Visibility</span>
              </Button>

              <Button
                onClick={() => {
                  onSetHighlightMode(!highlightMode);
                  if (highlightMode && highlightedNodeId) {
                    onClearHighlight();
                  }
                }}
                variant={highlightMode ? "default" : "ghost"}
                size="sm"
                title="Mode Highlight Dependencies"
                className={highlightMode ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
              >
                <Highlighter size={14} />
                <span className="hidden lg:inline ml-1">Highlight</span>
              </Button>
            </div>

            <div className="h-8 w-px bg-border"></div>

            {/* Selection Mode Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {getSelectionIcon()}
                  <span className="hidden sm:inline">{getSelectionLabel()}</span>
                  <ChevronDown size={10} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => onSetSelectionMode('freeroam')}
                  className={selectionMode === 'freeroam' ? 'bg-accent' : ''}
                >
                  <Hand className="mr-2" size={14} />
                  <div className="flex flex-col">
                    <span>Free Roam</span>
                    <span className="text-xs text-muted-foreground">Geser canvas bebas</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetSelectionMode('single')}
                  className={selectionMode === 'single' ? 'bg-accent' : ''}
                >
                  <MousePointer2 className="mr-2" size={14} />
                  <div className="flex flex-col">
                    <span>Single Select</span>
                    <span className="text-xs text-muted-foreground">Pilih satu node</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetSelectionMode('rectangle')}
                  className={selectionMode === 'rectangle' ? 'bg-accent' : ''}
                >
                  <Square className="mr-2" size={14} />
                  <div className="flex flex-col">
                    <span>Rectangle Select</span>
                    <span className="text-xs text-muted-foreground">Pilih area kotak</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Selection Info */}
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
                  <Eye size={14} />
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
                <Eye size={14} />
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