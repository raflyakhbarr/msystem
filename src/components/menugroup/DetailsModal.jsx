import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const DetailsModal = ({ detailsMenuGroup, onClose }) => {
  if (!detailsMenuGroup) {
    return null;
  }

  return (
    <Dialog open={!!detailsMenuGroup} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Endpoint Group Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Endpoint Name</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.nama}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">System Name</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.sistem?.nama || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Status</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                <Badge variant={detailsMenuGroup ? 'default' : 'secondary'}>
                  {detailsMenuGroup.status ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Is Administrator</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                <Badge variant={detailsMenuGroup.isAdministrator ? 'default' : 'outline'}>
                  {detailsMenuGroup.isAdministrator ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Created By</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.createdBy || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Created At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.createdAt ? new Date(detailsMenuGroup.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Updated By</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.updatedBy || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Updated At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsMenuGroup.updatedAt ? new Date(detailsMenuGroup.updatedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
