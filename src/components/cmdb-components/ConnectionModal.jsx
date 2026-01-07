import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { getTypeIcon } from '../../utils/cmdb-utils/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function ConnectionModal({
  show,
  selectedGroup,
  selectedItem,
  items,
  groups,
  selectedConnections,
  selectedGroupConnections,
  onClose,
  onSave,
  onToggleConnection,
  onToggleGroupConnection,
}) {
  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionTargetType, setConnectionTargetType] = useState('item');

  if (!show || !selectedItem) return null;

  const filteredItems = items.filter(item => 
    item.id !== selectedItem.id && 
    (item.name.toLowerCase().includes(connectionSearch.toLowerCase()) || 
     String(item.id).includes(connectionSearch) ||
     item.type.toLowerCase().includes(connectionSearch.toLowerCase()))
  );

  const selectedItems = filteredItems.filter(item =>
    selectedConnections.includes(item.id)
  );

  const availableItems = filteredItems.filter(item =>
    !selectedConnections.includes(item.id)
  );

  const filteredGroups = groups.filter(g => 
    g.id !== selectedItem.group_id &&
    !selectedGroupConnections.includes(g.id) &&
    (g.name.toLowerCase().includes(connectionSearch.toLowerCase()) ||
    String(g.id).includes(connectionSearch))
  );
  

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Koneksi</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">Item:</p>
            <p className="font-semibold">{selectedItem.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Item ini bergantung pada item/group yang dipilih di bawah.
            </p>
          </div>

          <Tabs value={connectionTargetType} onValueChange={setConnectionTargetType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="item">
                Ke Items ({selectedConnections.length})
              </TabsTrigger>
              <TabsTrigger value="group">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="item" className="space-y-3 mt-4">
              {selectedItems.length > 0 && (
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-500">
                  <p className="font-semibold text-sm mb-2">Items Terpilih</p>
                  {selectedItems.map((item) => (
                    <div
                      key={`selected-${item.id}`}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => onToggleConnection(item.id)}
                        />
                        {getTypeIcon(item.type)}
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari item..."
                value={connectionSearch}
                onChange={(e) => setConnectionSearch(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableItems.length > 0 ? (
                  availableItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleConnection(item.id)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={false} />
                          {getTypeIcon(item.type)}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {item.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">Tidak ada item tersedia</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-3 mt-4">
              {selectedGroupConnections.length > 0 && (
                <div className="p-3 border rounded-lg bg-purple-50 border-purple-500">
                  <p className="font-semibold text-sm mb-2">Groups Terpilih</p>
                  {selectedGroupConnections.map((groupId) => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? (
                      <div
                        key={`selected-group-${groupId}`}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => onToggleGroupConnection(groupId)}
                          />
                          <span className="text-sm font-medium">{group.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari group..."
                value={connectionSearch}
                onChange={(e) => setConnectionSearch(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={`group-${group.id}`}
                      onClick={() => onToggleGroupConnection(group.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupConnections.includes(group.id)
                          ? 'bg-purple-50 border-purple-500'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedGroupConnections.includes(group.id)}
                          />
                          <span className="font-medium">{group.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {group.id}</span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{group.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">Tidak ada group tersedia</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={onSave}>
              Simpan ({selectedConnections.length + selectedGroupConnections.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}