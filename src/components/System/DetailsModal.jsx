import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const DetailsModal = ({ showModal, item, setShowModal }) => {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>System Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Nama</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {item.nama}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">URL</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {item.url}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Destination</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {item.destination}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Type API</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {item.typeApi}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Status</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                <Badge variant={item.status ? "default" : "destructive"}>
                  {item.status ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Created At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Updated At</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {new Date(item.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground">Headers</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                <pre className="text-xs overflow-x-auto">
                  {item.headers}
                </pre>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground">Token</label>
              <div className="mt-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground">
                {item.token || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
