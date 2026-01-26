import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Layers,
  Plus,
  Check,
  Edit,
  Trash2,
  Copy,
  Star,
  ChevronDown,
  Eye,
  Database,
} from 'lucide-react';

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  viewAllMode = false, 
  onSwitch,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onSetDefault,
  onToggleViewAll,
  hideViewAllOption = false,
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState(null);
  const [duplicatingWorkspace, setDuplicatingWorkspace] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    
    const result = await onCreate(formData.name, formData.description);
    if (result.success) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !editingWorkspace) return;
    
    const result = await onUpdate(editingWorkspace.id, formData.name, formData.description);
    if (result.success) {
      setShowEditDialog(false);
      setEditingWorkspace(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingWorkspace) return;
    
    const result = await onDelete(deletingWorkspace.id);
    if (result.success) {
      setShowDeleteAlert(false);
      setDeletingWorkspace(null);
    }
  };

  const handleDuplicate = async () => {
    if (!formData.name.trim() || !duplicatingWorkspace) return;
    
    const result = await onDuplicate(duplicatingWorkspace.id, formData.name);
    if (result.success) {
      setShowDuplicateDialog(false);
      setDuplicatingWorkspace(null);
      resetForm();
    }
  };

  const openEditDialog = (workspace) => {
    setEditingWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteAlert = (workspace) => {
    setDeletingWorkspace(workspace);
    setShowDeleteAlert(true);
  };

  const openDuplicateDialog = (workspace) => {
    setDuplicatingWorkspace(workspace);
    setFormData({
      name: `${workspace.name} (Copy)`,
      description: workspace.description || '',
    });
    setShowDuplicateDialog(true);
  };

  // TAMBAHKAN: Handle switch ke View All mode
  const handleViewAllClick = () => {
    if (onToggleViewAll) {
      onToggleViewAll();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {viewAllMode ? (
                <>
                  <Database size={16} className="flex-shrink-0 text-purple-600" />
                  <span className="truncate font-medium text-purple-700">
                    View All Workspaces
                  </span>
                </>
              ) : (
                <>
                  <Layers size={16} className="flex-shrink-0" />
                  <span className="truncate font-medium">
                    {currentWorkspace?.name || 'Select Workspace'}
                  </span>
                </>
              )}
            </div>
            <ChevronDown size={14} className="flex-shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
          {!hideViewAllOption && (
            <>
              <DropdownMenuItem
                onClick={handleViewAllClick}
                className={`flex items-center justify-between ${
                  viewAllMode ? 'bg-purple-50 text-purple-700' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-purple-600" />
                  <span>View All Workspaces</span>
                </div>
                {viewAllMode && <Check size={14} className="text-purple-600" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Individual Workspaces
          </DropdownMenuLabel>
          
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onSwitch(workspace)}
              className={`flex items-center justify-between group ${
                currentWorkspace?.id === workspace.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentWorkspace?.id === workspace.id && !viewAllMode && (
                  <Check size={14} className="flex-shrink-0" />
                )}
                <span className="truncate flex-1">
                  {workspace.name}
                </span>
                {workspace.is_default && (
                  <Star size={12} className="flex-shrink-0 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(workspace);
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="Edit"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDuplicateDialog(workspace);
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </button>
                {!workspace.is_default && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteAlert(workspace);
                    }}
                    className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="text-primary"
          >
            <Plus size={14} className="mr-2" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your CMDB items separately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Workspace Name</Label>
              <Input
                id="create-name"
                placeholder="e.g., Production Environment"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-description">Description (Optional)</Label>
              <Textarea
                id="create-description"
                placeholder="Describe this workspace..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update workspace name and description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Workspace Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {editingWorkspace && !editingWorkspace.is_default && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await onSetDefault(editingWorkspace.id);
                    setShowEditDialog(false);
                  }}
                  className="w-full"
                >
                  <Star size={14} className="mr-2" />
                  Set as Default Workspace
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingWorkspace(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Workspace</DialogTitle>
            <DialogDescription>
              Create a copy of "{duplicatingWorkspace?.name}" with all its items and connections.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">New Workspace Name</Label>
              <Input
                id="duplicate-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicatingWorkspace(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!formData.name.trim()}>
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWorkspace?.name}"? 
              This will permanently delete all items, groups, and connections in this workspace.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingWorkspace(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}