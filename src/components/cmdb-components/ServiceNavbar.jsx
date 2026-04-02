import {
  Save, Plus, Layers, MousePointer2, Square,
  ToggleRight, ToggleLeft, Map, ChevronDown,
  Undo2, Redo2, Globe, ExternalLink, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ServiceSearchBar from './ServiceSearchBar';

export default function ServiceNavbar({
  draggedNode,
  isReorderingInGroup,
  isSaving,
  isAutoSaving,
  isAutoSaveEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleAutoSave,
  nodes,
  onNodeSearch,
  reactFlowInstance,
  onSetSelectionMode,
  selectionMode,
  onSavePositions,
  onOpenAddItem,
  onOpenManageGroups,
  showMiniMap,
  onToggleMiniMap,
  showExternalNodes,
  onToggleExternalNodes,
  showEdgeLabels,
  onToggleEdgeLabels,
}) {


  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left Side - Actions */}
          <div className="flex items-center gap-2">
            {/* Add Item & Groups */}
            <Button
              onClick={onOpenAddItem}
              variant="default"
              size="sm"
              title="Tambah Item Baru"
            >
              <Plus size={14} />
              <span className="hidden xl:inline ml-1">Item</span>
            </Button>

            <Button
              onClick={onOpenManageGroups}
              variant="secondary"
              size="sm"
              title="Kelola Groups"
            >
              <Layers size={14} />
              <span className="hidden xl:inline ml-1">Groups</span>
            </Button>

            <div className="h-6 w-px bg-border mx-1"></div>

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

            <div className="h-6 w-px bg-border mx-1"></div>

            {/* Save Controls */}
            <div className="flex items-center gap-1">
              <Button
                onClick={onToggleAutoSave}
                variant={isAutoSaveEnabled ? "default" : "ghost"}
                size="sm"
                title={isAutoSaveEnabled ? "Auto-save Aktif" : "Auto-save Nonaktif"}
                className={isAutoSaveEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {isAutoSaveEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
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
                <Save size={14} />
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
                <Layers className="animate-bounce" size={12} />
                <span className="font-medium hidden lg:inline">Dragging...</span>
              </div>
            )}
          </div>

          {/* Right Side - View & Search */}
          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <ServiceSearchBar
              nodes={nodes}
              onNodeSelect={onNodeSearch}
              reactFlowInstance={reactFlowInstance}
            />

            <div className="h-6 w-px bg-border"></div>

            {/* View Controls */}
            <div className="flex items-center gap-1">
              {/* MINIMAP TOGGLE BUTTON */}
              <Button
                onClick={onToggleMiniMap}
                variant={showMiniMap ? "default" : "ghost"}
                size="sm"
                title={showMiniMap ? "Sembunyikan MiniMap" : "Tampilkan MiniMap"}
              >
                <Map size={14} />
                <span className="hidden lg:inline ml-1">MiniMap</span>
              </Button>

              {/* EXTERNAL NODES TOGGLE BUTTON */}
              <Button
                onClick={onToggleExternalNodes}
                variant={showExternalNodes ? "default" : "ghost"}
                size="sm"
                title={showExternalNodes ? "Sembunyikan External Nodes" : "Tampilkan External Nodes"}
                className={showExternalNodes ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
              >
                {showExternalNodes ? <Globe size={14} /> : <ExternalLink size={14} />}
                <span className="hidden lg:inline ml-1">External</span>
              </Button>

              {/* EDGE LABELS TOGGLE BUTTON */}
              <Button
                onClick={onToggleEdgeLabels}
                variant={showEdgeLabels ? "default" : "ghost"}
                size="sm"
                title={showEdgeLabels ? "Sembunyikan Label Koneksi" : "Tampilkan Label Koneksi"}
                className={showEdgeLabels ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              >
                <Tag size={14} />
                <span className="hidden lg:inline ml-1">Labels</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
