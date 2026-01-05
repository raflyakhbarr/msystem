import React from 'react';
import type { MenuItem } from '@/api/menuApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface DetailsModalProps {
  showModal: boolean;
  item: MenuItem | null;
  setShowModal: (show: boolean) => void;
}

const DetailsModal = ({ showModal, item, setShowModal }: DetailsModalProps) => {
  if (!item) return null;

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Helper for consistent date formatting
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // specific logic to safely access nested group/system data
  const systemName = typeof item.group_menu === 'object' && item.group_menu?.sistem 
    ? item.group_menu.sistem.nama 
    : 'N/A';

  const groupName = typeof item.group_menu === 'object' 
    ? item.group_menu.nama 
    : (item.group_menu || 'N/A');

  return (
    <Dialog open={showModal} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-6 pb-2">
          <DialogTitle>Endpoint Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            {/* --- Core Identity --- */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Endpoint Name</h4>
              <p className="text-sm font-semibold text-foreground">{item.nama}</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Menu Number</h4>
              <p className="text-sm font-medium text-foreground">{item.noMenu || '-'}</p>
            </div>

            {/* --- Description (Full Width) --- */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm text-foreground leading-relaxed">
                {item.fitur || <span className="text-muted-foreground italic">No description provided</span>}
              </p>
            </div>

            {/* --- Technical Path (Full Width) --- */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Endpoint Path</h4>
              <div className="rounded-md bg-muted/50 border border-border p-2.5">
                <code className="text-xs font-mono text-foreground break-all">
                  {item.pathMenu}
                </code>
              </div>
            </div>

            {/* --- Configuration --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Sidebar Visibility</h4>
              <Badge variant={item.isSidebar ? 'default' : 'outline'}>
                {item.isSidebar ? 'Visible' : 'Hidden'}
              </Badge>
            </div>

             {/* Spacer to keep grid alignment if needed, or System Name */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">System Name</h4>
              <p className="text-sm font-medium text-foreground">{systemName}</p>
            </div>

            {/* --- Grouping Info --- */}
            <div className="col-span-2 sm:col-span-1">
               <h4 className="text-sm font-medium text-muted-foreground mb-1">Group Name</h4>
               <p className="text-sm font-medium text-foreground">{groupName}</p>
            </div>

            {/* Divider */}
            <div className="col-span-2 border-t my-1"></div>

            {/* --- Timestamps / Audit --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
              <p className="text-sm font-medium text-foreground">
                {formatDate(item.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium text-foreground">{item.createdBy || 'Unknown'}</span>
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
              <p className="text-sm font-medium text-foreground">
                {formatDate(item.updatedAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium text-foreground">{item.updatedBy || 'Unknown'}</span>
              </p>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;