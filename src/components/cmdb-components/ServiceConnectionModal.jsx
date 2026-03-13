import { useState, useEffect } from 'react';
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
import { CONNECTION_TYPES } from '../../utils/cmdb-utils/flowHelpers';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Connection Type Selector Component
function ConnectionTypeSelector({ value, onChange, size = "default" }) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedType = CONNECTION_TYPES[value] || CONNECTION_TYPES.depends_on;

  const filteredTypes = Object.entries(CONNECTION_TYPES).filter(([key, type]) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      type.label.toLowerCase().includes(searchLower) ||
      key.toLowerCase().includes(searchLower) ||
      (type.description && type.description.toLowerCase().includes(searchLower))
    );
  });

  const sizeClasses = size === "small" ? "h-7 text-xs" : "";

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-between ${sizeClasses}`}
        onClick={() => setShowDialog(true)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedType.color }}
          />
          <span className="truncate">{selectedType.label}</span>
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {selectedType.propagation === 'both' ? '↔' : '→'}
        </span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Tipe Koneksi</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false}>
            <div className="p-3 border-b">
              <CommandInput
                placeholder="Cari tipe koneksi..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada tipe koneksi ditemukan
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredTypes.map(([key, type]) => (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={() => {
                      onChange(key);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mr-3"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({type.propagation === 'both' ? '↔' : '→'})
                        </span>
                      </div>
                      {type.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {type.description}
                        </p>
                      )}
                    </div>
                    {value === key && (
                      <Check size={14} className="text-primary ml-auto" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ServiceConnectionModal({
  show,
  onClose,
  selectedItem,
  allItems,
  groups,
  selectedConnections,
  selectedGroupConnections,
  itemConnectionTypes = {},
  itemToGroupConnectionTypes = {},
  onToggleConnection,
  onToggleGroupConnection,
  onConnectionTypeChange,
  onItemToGroupTypeChange,
  onSave
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('items');

  // Local state for connection types
  const [localItemTypes, setLocalItemTypes] = useState(itemConnectionTypes);
  const [localItemToGroupTypes, setLocalItemToGroupTypes] = useState(itemToGroupConnectionTypes);

  // Sync local state with props when modal opens
  useEffect(() => {
    if (show) {
      setLocalItemTypes(itemConnectionTypes);
      setLocalItemToGroupTypes(itemToGroupConnectionTypes);
      setSearchQuery('');
      setActiveTab('items');
    }
  }, [show, itemConnectionTypes, itemToGroupConnectionTypes]);

  const handleItemTypeChange = (itemId, typeSlug) => {
    const newTypes = { ...localItemTypes, [itemId]: typeSlug };
    setLocalItemTypes(newTypes);
    onConnectionTypeChange && onConnectionTypeChange(itemId, typeSlug);
  };

  const handleItemToGroupTypeChange = (groupId, typeSlug) => {
    const newTypes = { ...localItemToGroupTypes, [groupId]: typeSlug };
    setLocalItemToGroupTypes(newTypes);
    onItemToGroupTypeChange && onItemToGroupTypeChange(groupId, typeSlug);
  };

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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Koneksi Service</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-sm text-muted-foreground">Source Item:</p>
            <p className="font-semibold">{selectedItem?.name}</p>
          </div>

          <Tabs value={activeTab} onValueChange={(newTab) => {
            setActiveTab(newTab);
            setSearchQuery('');
          }} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">
                Ke Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-3">
              <Input
                type="text"
                placeholder="Cari items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="flex-1 overflow-y-auto space-y-3">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => {
                    const isConnected = selectedConnections.includes(item.id);
                    const currentType = localItemTypes[item.id] || 'depends_on';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border-2 transition-all ${
                          isConnected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="p-3 flex items-center gap-3">
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
                        </div>

                        {/* Connection Type Selector - Only show when connected */}
                        {isConnected && (
                          <div className="px-3 pb-3">
                            <ConnectionTypeSelector
                              value={currentType}
                              onChange={(typeSlug) => handleItemTypeChange(item.id, typeSlug)}
                              size="small"
                            />
                          </div>
                        )}
                      </div>
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

              <div className="flex-1 overflow-y-auto space-y-3">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(group => {
                    const isConnected = selectedGroupConnections.includes(group.id);
                    const currentType = localItemToGroupTypes[group.id] || 'depends_on';

                    return (
                      <div
                        key={group.id}
                        className={`rounded-lg border-2 transition-all ${
                          isConnected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: isConnected ? '#a855f7' : group.color || '#e0e7ff'
                        }}
                      >
                        <div className="p-3 flex items-center gap-3">
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
                        </div>

                        {/* Connection Type Selector - Only show when connected */}
                        {isConnected && (
                          <div className="px-3 pb-3">
                            <ConnectionTypeSelector
                              value={currentType}
                              onChange={(typeSlug) => handleItemToGroupTypeChange(group.id, typeSlug)}
                              size="small"
                            />
                          </div>
                        )}
                      </div>
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
          <Button onClick={() => onSave(localItemTypes, localItemToGroupTypes)}>
            Save Connections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
