import React from 'react';
import { formatDate } from '@/utils/formatDate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const DetailsModal = ({ showModal, item, setShowModal }) => {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-6 pb-2">
          <DialogTitle>System Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-6 pb-6 pt-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
              <p className="text-sm font-semibold text-foreground">{item.nama}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">URL</h4>
              <a href={`https://${item.url}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline decoration-dashed underline-offset-4">
                {item.url}
              </a>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Destination</h4>
              <p className="text-sm font-medium text-foreground">{item.destination}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">API Type</h4>
              <p className="text-sm font-medium text-foreground capitalize">{item.typeApi}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
              <Badge variant={item.status ? "default" : "secondary"} className={!item.status ? "bg-red-100 text-red-700 hover:bg-red-100" : ""}>
                {item.status ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="col-span-1">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
              <p className="text-sm font-medium text-foreground">{formatDate(item.updatedAt)}</p>
              <p className="text-xs text-muted-foreground mt-1">Created: {formatDate(item.createdAt)}</p>
            </div>

            <div className="col-span-2 border-t my-1"></div>

            <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Headers</h4>
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <pre className="text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                  {item.headers}
                </pre>
              </div>
            </div>

            {/* <div className="col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Token</h4>
               {item.token ? (
                <div className="rounded-md bg-muted/50 border border-border p-3 break-all">
                   <code className="text-xs font-mono text-foreground">{item.token}</code>
                </div>
               ) : (
                 <p className="text-sm text-muted-foreground italic">No token available</p>
               )}
            </div> */}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;