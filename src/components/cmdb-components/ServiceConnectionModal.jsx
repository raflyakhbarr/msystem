import { useState } from 'react';
import { Check, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function ServiceConnectionModal({
  show,
  onClose,
  selectedItem,
  allItems,
  groups,
  selectedConnections,
  selectedGroupConnections,
  onToggleConnection,
  onToggleGroupConnection,
  onSave
}) {
  const [searchQuery, setSearchQuery] =('');
  const [activeTab, setActiveTab] = useState('items');

  if (!show) return null;

  const filteredItems = allItems
    .filter(item => item.id !== selectedItem?.id)
    .filter(item =>
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.id).includes(searchQuery) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredGroups = groups
    .filter(group =>
      !searchQuery ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(group.id).includes(searchQuery)
    );

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Connections</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-sm text-muted-foreground">Source Item:</p>
            <p className="font-semibold">{selectedItem?.name}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">
                To Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                To Groups ({selectedGroupConnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-3">
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const isConnected = selectedConnections.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isConnected
                            ? 'border-green-500 bg-green-50'
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
                          <Check className="text-green-600" size={20} />
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic text-center py-4">
                    {searchQuery ? 'No items match your search' : 'No items available'}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-3">
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(group => {
                    const isConnected = selectedGroupConnections.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isConnected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: isConnected ? '#a855f7' : group.color || '#e0e7ff'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isConnected}
                          onChange={() => onToggleGroupConnection(group.id)}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground">{group.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {group.itemCount || 0} items
                          </p>
                        </div>
                        {isConnected && (
                          <Check className="text-purple-600" size={20} />
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic text-center py-4">
                    {searchQuery ? 'No groups match your search' : 'No groups available'}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedConnections.length + selectedGroupConnections.length} connection(s) selected
          </div>
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
