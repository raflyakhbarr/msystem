import React from 'react';

interface FiturItem {
  id?: number;
  menu: string;
  route: string;
  urutan: string;
  idSistem: number | { id: number; nama: string };
  icon: string;
  showFiture: string;
  status: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SystemItem {
  id: number;
  nama: string;
}

interface DetailsModalProps {
  showModal: boolean;
  item: FiturItem | null;
  systems?: SystemItem[];
  setShowModal: (show: boolean) => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ 
  showModal, 
  item, 
  systems = [], 
  setShowModal 
}) => {
  if (!showModal || !item) {
    return null;
  }

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Get system name based on idSistem
  const getSystemName = () => {
    if (!item.idSistem) return 'Not assigned';
    
    // If idSistem is an object with nama property
    if (typeof item.idSistem === 'object' && item.idSistem.nama) {
      return item.idSistem.nama;
    }
    
    // If idSistem is just an ID, find the system name
    const system = systems.find(s => s.id === item.idSistem);
    return system ? system.nama : `System ID: ${item.idSistem}`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-9999">
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] m-4 z-10000 border border-border/50">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">Fitur Details</h3>
          <button
            className="text-muted-foreground hover:text-foreground text-2xl font-light leading-none"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Menu</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item.menu}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Route</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item.route}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Order</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item.urutan}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Show Feature</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">{item.showFiture}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded">
                  {item.status ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            {/* Icon Information */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Icon</label>
              <div className="bg-muted/50 p-3 rounded">
                <div className="flex items-center space-x-3">
                  {item.icon && (
                    <img 
                      src={`/icons/${item.icon}`} 
                      alt={item.menu}
                      className="h-8 w-8"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <p className="text-sm text-foreground font-mono">{item.icon || 'No icon'}</p>
                    {item.icon && (
                      <p className="text-xs text-muted-foreground">/icons/{item.icon}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">System Information</label>
              <div className="bg-muted/50 p-3 rounded">
                <div>
                  <span className="text-xs text-muted-foreground">System Name:</span>
                  <p className="text-sm text-foreground">{getSystemName()}</p>
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
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Updated At:</span>
                    <p className="text-sm text-foreground">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Not available'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Created By:</span>
                    <p className="text-sm text-foreground">{item.createdBy || 'Not available'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Updated By:</span>
                    <p className="text-sm text-foreground">{item.updatedBy || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-border bg-muted/50">
            <button
              type="button"
              className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-md transition-colors"
              onClick={handleCloseModal}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;