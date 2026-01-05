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

  // Helper for consistent date formatting
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={!!detailsMenuGroup} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-6 pb-2">
          <DialogTitle>Endpoint Group Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Primary Info */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Endpoint Name</h4>
              <p className="text-sm font-semibold text-foreground">{detailsMenuGroup.nama}</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">System Name</h4>
              <p className="text-sm font-medium text-foreground">
                {detailsMenuGroup.sistem?.nama || 'N/A'}
              </p>
            </div>

            {/* Statuses */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
              <Badge variant={detailsMenuGroup.status ? 'default' : 'secondary'} className={!detailsMenuGroup.status ? "bg-red-100 text-red-700 hover:bg-red-100" : ""}>
                {detailsMenuGroup.status ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Administrator Access</h4>
              <Badge variant={detailsMenuGroup.isAdministrator ? 'default' : 'outline'}>
                {detailsMenuGroup.isAdministrator ? 'Yes' : 'No'}
              </Badge>
            </div>

            {/* Visual Divider */}
            <div className="col-span-2 border-t my-1"></div>

            {/* Audit Logs - Grouped for better readability */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
              <p className="text-sm font-medium text-foreground">
                {formatDate(detailsMenuGroup.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium text-foreground">{detailsMenuGroup.createdBy || 'Unknown'}</span>
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
              <p className="text-sm font-medium text-foreground">
                {formatDate(detailsMenuGroup.updatedAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium text-foreground">{detailsMenuGroup.updatedBy || 'Unknown'}</span>
              </p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;