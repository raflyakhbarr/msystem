import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";

export default function ServiceItemFormModal({
  show,
  editMode,
  formData,
  groups,
  onClose,
  onSubmit,
  onInputChange,
}) {
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!show) {
      // Form will be reset by parent component
    }
  }, [show]);

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? 'Edit Service Item' : 'Add New Service Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={onInputChange}
              placeholder="e.g., Web Server"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => onInputChange({ target: { name: 'type', value } })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
                <SelectItem value="workstation">Workstation</SelectItem>
                <SelectItem value="firewall">Firewall</SelectItem>
                <SelectItem value="router">Router</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => onInputChange({ target: { name: 'status', value } })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* IP Address */}
          <div className="space-y-2">
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              name="ip"
              type="text"
              value={formData.ip}
              onChange={onInputChange}
              placeholder="192.168.1.1"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => onInputChange({ target: { name: 'category', value } })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={onInputChange}
              placeholder="e.g., Data Center 1"
            />
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="group_id">Group</Label>
            <Select
              value={formData.group_id ? String(formData.group_id) : "none"}
              onValueChange={(value) => {
                const groupId = value === "none" ? null : parseInt(value);
                onInputChange({ target: { name: 'group_id', value: groupId } });
              }}
            >
              <SelectTrigger id="group_id" className="w-full">
                <div className="flex items-center gap-2">
                  <Folder size={16} className="text-muted-foreground" />
                  <SelectValue placeholder="Select a group" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Without Group</span>
                  </div>
                </SelectItem>
                {groups && groups.length > 0 && groups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded border"
                        style={{
                          backgroundColor: group.color || '#e0e7ff',
                          borderColor: group.color || '#e0e7ff',
                        }}
                      />
                      <span>{group.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.group_id && (
              <p className="text-xs text-muted-foreground">
                Item will be added to: {groups?.find(g => g.id === formData.group_id)?.name || 'Unknown Group'}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows={3}
              placeholder="Item description..."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
