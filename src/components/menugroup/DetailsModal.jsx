import React from 'react';

const DetailsModal = ({ detailsMenuGroup, onClose }) => {
  if (!detailsMenuGroup) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">Endpoint Group Details</h3>
          <button
            className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  detailsMenuGroup.status
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}>
                  {detailsMenuGroup.status ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Is Administrator</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  detailsMenuGroup.isAdministrator
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {detailsMenuGroup.isAdministrator ? 'Yes' : 'No'}
                </span>
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
      </div>
    </div>
  );
};

export default DetailsModal;