import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { getTypeIcon } from '../../utils/cmdb-utils/constants';

export default function ServiceGroupConnectionModal({
  show,
  selectedGroup,
  groups,
  items,
  selectedGroupConnections,
  selectedItemConnections,
  onClose,
  onSave,
  onToggleGroupConnection,
  onToggleItemConnection,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionTargetType, setConnectionTargetType] = useState('group');

  if (!show || !selectedGroup) return null;

  const filteredGroups = groups.filter(g =>
    g.id !== selectedGroup.id &&
    !selectedGroupConnections.includes(g.id) &&
    (g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(g.id).includes(searchQuery))
  );

  const filteredItems = items.filter(item =>
    !selectedItemConnections.includes(item.id) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(item.id).includes(searchQuery) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Koneksi Service Group</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-sm text-muted-foreground">Service Group Sumber:</p>
            <p className="font-semibold">{selectedGroup.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Group ini akan terhubung ke service group/item yang dipilih di bawah.
            </p>
          </div>

          <Tabs value={connectionTargetType} onValueChange={setConnectionTargetType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="group">
                Ke Groups ({selectedGroupConnections.length})
              </TabsTrigger>
              <TabsTrigger value="item">
                Ke Items ({selectedItemConnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="group" className="space-y-3 mt-4">
              {selectedGroupConnections.length > 0 && (
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-500">
                  <p className="font-semibold text-sm mb-2">Groups Terhubung</p>
                  {selectedGroupConnections.map((groupId) => {
                    const group = groups.find(g => g.id === groupId);
                    return group ? (
                      <div
                        key={`selected-${groupId}`}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => onToggleGroupConnection(groupId)}
                          />
                          <span className="font-medium">{group.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={`group-conn-${group.id}`}
                      onClick={() => onToggleGroupConnection(group.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupConnections.includes(group.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'hover:bg-secondary'
                      }`}
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: group.color
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedGroupConnections.includes(group.id)}
                          />
                          <div>
                            <span className="font-medium">{group.name}</span>
                            {group.description && (
                              <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">ID: {group.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    {searchQuery ? 'Tidak ada group yang sesuai pencarian' : 'Tidak ada group lain tersedia'}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="item" className="space-y-3 mt-4">
              {selectedItemConnections.length > 0 && (
                <div className="p-3 border rounded-lg bg-green-50 border-green-500">
                  <p className="font-semibold text-sm mb-2">Items Terhubung</p>
                  {selectedItemConnections.map((itemId) => {
                    const item = items.find(i => i.id === itemId);
                    return item ? (
                      <div
                        key={`selected-item-${itemId}`}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={true}
                            onCheckedChange={() => onToggleItemConnection(itemId)}
                          />
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <Input
                type="text"
                placeholder="Cari item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div
                      key={`item-${item.id}`}
                      onClick={() => onToggleItemConnection(item.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItemConnections.includes(item.id)
                          ? 'bg-green-50 border-green-500'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedItemConnections.includes(item.id)}
                          />
                          {getTypeIcon(item.type)}
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    {searchQuery ? 'Tidak ada item yang sesuai pencarian' : 'Tidak ada item tersedia'}
                  </p>
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
              Simpan Koneksi ({selectedGroupConnections.length + selectedItemConnections.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
