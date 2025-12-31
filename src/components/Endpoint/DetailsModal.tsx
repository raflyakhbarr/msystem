import React from 'react';
import type { MenuItem } from '@/api/menuApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DetailsModalProps {
  showModal: boolean;
  item: MenuItem | null;
  setShowModal: (show: boolean) => void;
}

const DetailsModal = ({ showModal, item, setShowModal }: DetailsModalProps) => {
  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <Dialog open={showModal} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Endpoint Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Endpoint Name</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item?.nama}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Menu Number</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item?.noMenu}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Show in Sidebar</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">
                  {item?.isSidebar ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item?.fitur}</p>
            </div>

            {/* Endpoint Path */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Endpoint Path</label>
              <p className="text-sm text-foreground bg-muted/50 p-2 rounded font-mono break-all">{item?.pathMenu}</p>
            </div>

            {/* System Information */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">System Information</label>
              <div className="bg-muted/50 p-3 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {typeof item?.group_menu === 'object' && item?.group_menu?.sistem && (
                    <div>
                      <span className="text-xs text-muted-foreground">System Name:</span>
                      <p className="text-sm text-foreground">{item.group_menu.sistem.nama}</p>
                    </div>
                  )}
                  {!item?.group_menu && (
                    <div>
                      <span className="text-xs text-muted-foreground">System Name:</span>
                      <p className="text-sm text-foreground">Not assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Group Information */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Group Information</label>
              <div className="bg-muted/50 p-3 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {typeof item?.group_menu === 'object' ? (
                    <>
                      <div>
                        <span className="text-xs text-muted-foreground">Group ID:</span>
                        <p className="text-sm text-foreground">{item.group_menu.id || 'Not assigned'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Group Name:</span>
                        <p className="text-sm text-foreground">{item.group_menu.nama || 'Not assigned'}</p>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Group ID:</span>
                      <p className="text-sm text-foreground">{item?.group_menu || 'Not assigned'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Timestamps</label>
              <div className="bg-muted/50 p-3 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Created At:</span>
                    <p className="text-sm text-foreground">
                      {item?.createdAt ? new Date(item.createdAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Updated At:</span>
                    <p className="text-sm text-foreground">
                      {item?.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Created By:</span>
                    <p className="text-sm text-foreground">{item?.createdBy || 'Not available'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Updated By:</span>
                    <p className="text-sm text-foreground">{item?.updatedBy || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
