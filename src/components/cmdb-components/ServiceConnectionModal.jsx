import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ServiceConnectionModal({
  show,
  onClose,
  selectedItem,
  allItems,
  selectedConnections,
  onToggleConnection,
  onSave
}) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Service Item Connections</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select service items to connect with <strong>{selectedItem?.name}</strong>
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allItems
              .filter(item => item.id !== selectedItem?.id)
              .map(item => {
                const isConnected = selectedConnections.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isConnected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isConnected}
                      onChange={() => onToggleConnection(item.id)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type} • {item.status}
                      </p>
                    </div>
                    {isConnected && (
                      <Check className="text-blue-600" size={20} />
                    )}
                  </label>
                );
              })}
          </div>

          {selectedConnections.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                {selectedConnections.length} connection(s) selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Connections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
