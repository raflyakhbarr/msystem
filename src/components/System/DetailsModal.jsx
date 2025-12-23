import React from 'react';

const DetailsModal = ({ detailsUser, onClose }) => {
  if (!detailsUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">System Details</h3>
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
              <label className="block text-sm font-medium text-foreground">ID</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {detailsUser.id}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Nama</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {detailsUser.nama}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">URL</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {detailsUser.url}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Destination</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {detailsUser.destination}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Type API</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {detailsUser.typeApi}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Status</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      detailsUser.status ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {detailsUser.status ? 'Active' : 'Inactive'}
                    </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Created At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {new Date(detailsUser.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Updated At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {new Date(detailsUser.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Headers</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    <pre className="text-xs overflow-x-auto">
                      {detailsUser.headers}
                    </pre>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Token</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                    {detailsUser.token || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;