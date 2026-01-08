import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

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
  if (!item) return null;

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const systemName = React.useMemo(() => {
    if (!item.idSistem) return 'Not assigned';
    if (typeof item.idSistem === 'object' && item.idSistem.nama) {
      return item.idSistem.nama;
    }
    const system = systems.find(s => s.id === item.idSistem);
    return system ? system.nama : `System ID: ${item.idSistem}`;
  }, [item.idSistem, systems]);

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

  return (
    <Dialog open={showModal} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-6 pb-2">
          <DialogTitle>Fitur Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Menu Name</h4>
              <p className="text-sm font-semibold text-foreground">{item.menu}</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Order Sequence</h4>
              <p className="text-sm font-medium text-foreground">#{item.urutan}</p>
            </div>

            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Route Path</h4>
              <div className="rounded-md bg-muted/50 border border-border p-2.5 inline-block">
                <code className="text-xs font-mono text-foreground break-all">
                  {item.route || '/'}
                </code>
              </div>
            </div>

            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Icon</h4>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-md border border-border bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                   {item.icon ? (
                      <img 
                      src={`/icons/${item.icon}`} 
                      alt={item.menu}
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                   ) : (
                     <span className="text-xs text-muted-foreground">N/A</span>
                   )}
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-medium text-foreground">{item.icon || 'No icon assigned'}</span>
                   {item.icon && <span className="text-xs text-muted-foreground font-mono">/icons/{item.icon}</span>}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Show Feature</h4>
              <p className="text-sm font-medium text-foreground capitalize">{item.showFiture}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
              <Badge variant={item.status ? 'default' : 'secondary'} className={!item.status ? "bg-red-100 text-red-700 hover:bg-red-100" : ""}>
                {item.status ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="col-span-2">
               <h4 className="text-sm font-medium text-muted-foreground mb-1">System</h4>
               <p className="text-sm font-medium text-foreground">{systemName}</p>
            </div>

            <div className="col-span-2 border-t my-1"></div>

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