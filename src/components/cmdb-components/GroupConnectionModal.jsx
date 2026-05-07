import { useState, useEffect } from 'react';
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
import { Layers } from 'lucide-react';
import api from '../../services/api';
import { ConnectionTypeSelector, MiniConnectionPreview } from './ConnectionComponents';

export default function GroupConnectionModal({
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
  selectedConnectionType = 'depends_on',
  onConnectionTypeChange,
  existingGroupConnectionTypes = {},
  existingItemConnectionTypes = {},
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionTargetType, setConnectionTargetType] = useState('group');
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [groupConnectionTypes, setGroupConnectionTypes] = useState({});
  const [itemConnectionTypes, setItemConnectionTypes] = useState({});

  useEffect(() => {
    const fetchConnectionTypes = async () => {
      try {
        const response = await api.get('/cmdb/connection-types');
        setConnectionTypes(response.data);
      } catch (error) {
        console.error('Failed to fetch connection types:', error);
      }
    };

    if (show) {
      fetchConnectionTypes();
    }
  }, [show]);

  // Load existing connection types when modal opens
  useEffect(() => {
    if (show && Object.keys(existingGroupConnectionTypes).length > 0) {
      setGroupConnectionTypes(existingGroupConnectionTypes);
    }
  }, [show, existingGroupConnectionTypes]);

  useEffect(() => {
    if (show && Object.keys(existingItemConnectionTypes).length > 0) {
      setItemConnectionTypes(existingItemConnectionTypes);
    }
  }, [show, existingItemConnectionTypes]);

  // Update group connection types when selectedGroupConnections change
  useEffect(() => {
    setGroupConnectionTypes(prev => {
      const newTypes = { ...prev };
      selectedGroupConnections.forEach(groupId => {
        if (!newTypes[groupId]) {
          newTypes[groupId] = selectedConnectionType || 'depends_on';
        }
      });
      // Remove types for groups that are no longer selected
      Object.keys(newTypes).forEach(groupId => {
        if (!selectedGroupConnections.includes(Number(groupId))) {
          delete newTypes[groupId];
        }
      });
      return newTypes;
    });
  }, [selectedGroupConnections, selectedConnectionType]);

  // Update item connection types when selectedItemConnections change
  useEffect(() => {
    setItemConnectionTypes(prev => {
      const newTypes = { ...prev };
      selectedItemConnections.forEach(itemId => {
        if (!newTypes[itemId]) {
          newTypes[itemId] = selectedConnectionType || 'depends_on';
        }
      });
      // Remove types for items that are no longer selected
      Object.keys(newTypes).forEach(itemId => {
        if (!selectedItemConnections.includes(Number(itemId))) {
          delete newTypes[itemId];
        }
      });
      return newTypes;
    });
  }, [selectedItemConnections, selectedConnectionType]);

  const handleGroupTypeChange = (groupId, typeSlug) => {
    setGroupConnectionTypes(prev => ({
      ...prev,
      [groupId]: typeSlug
    }));
  };

  const handleItemTypeChange = (itemId, typeSlug) => {
    setItemConnectionTypes(prev => ({
      ...prev,
      [itemId]: typeSlug
    }));
  };

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
          <DialogTitle>Kelola Koneksi Group</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-muted-foreground">Group Sumber:</p>
            <p className="font-semibold">{selectedGroup.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Group ini akan terhubung ke group/item yang dipilih di bawah.
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
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-500 dark:text-black">
                  <p className="font-semibold text-sm mb-3">Groups Terhubung ({selectedGroupConnections.length})</p>
                  <div className="space-y-3">
                    {selectedGroupConnections.map((groupId) => {
                      const group = groups.find(g => g.id === groupId);
                      const groupTypeId = groupConnectionTypes[groupId] || 'depends_on';
                      const groupTypeInfo = connectionTypes.find(ct => ct.type_slug === groupTypeId);

                      if (!group) return null;

                      return (
                        <div
                          key={`selected-${groupId}`}
                          className="p-3 bg-white rounded-lg border border-blue-200 dark:border-blue-800 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => onToggleGroupConnection(groupId)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Layers className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">{group.name}</span>
                                </div>

                                {/* Connection Type Selector for this group */}
                                <div className="flex items-center gap-2 flex-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Tipe:</label>
                                  <ConnectionTypeSelector
                                    value={groupTypeId}
                                    onChange={(value) => handleGroupTypeChange(groupId, value)}
                                    connectionTypes={connectionTypes}
                                    placeholder="Pilih tipe"
                                    size="small"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Mini Visualization */}
                            {groupTypeInfo && (
                              <div className="flex-shrink-0">
                                <MiniConnectionPreview
                                  connectionType={groupTypeInfo}
                                  sourceName={selectedGroup?.name || 'Source'}
                                  targetName={group.name}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                <div className="p-3 border rounded-lg bg-green-50 border-green-500 dark:text-black">
                  <p className="font-semibold text-sm mb-3">Items Terhubung ({selectedItemConnections.length})</p>
                  <div className="space-y-3">
                    {selectedItemConnections.map((itemId) => {
                      const item = items.find(i => i.id === itemId);
                      const itemTypeId = itemConnectionTypes[itemId] || 'depends_on';
                      const itemTypeInfo = connectionTypes.find(ct => ct.type_slug === itemTypeId);

                      if (!item) return null;

                      return (
                        <div
                          key={`selected-item-${itemId}`}
                          className="p-3 bg-white rounded-lg border border-green-200 dark:border-green-800 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => onToggleItemConnection(itemId)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getTypeIcon(item.type)}
                                  <span className="text-sm font-medium">{item.name}</span>
                                </div>

                                {/* Connection Type Selector for this item */}
                                <div className="flex items-center gap-2 flex-1">
                                  <label className="text-xs text-muted-foreground whitespace-nowrap">Tipe:</label>
                                  <ConnectionTypeSelector
                                    value={itemTypeId}
                                    onChange={(value) => handleItemTypeChange(itemId, value)}
                                    connectionTypes={connectionTypes}
                                    placeholder="Pilih tipe"
                                    size="small"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Mini Visualization */}
                            {itemTypeInfo && (
                              <div className="flex-shrink-0">
                                <MiniConnectionPreview
                                  connectionType={itemTypeInfo}
                                  sourceName={selectedGroup?.name || 'Source'}
                                  targetName={item.name}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
            <Button onClick={() => onSave(groupConnectionTypes, itemConnectionTypes)}>
              Simpan Koneksi ({selectedGroupConnections.length + selectedItemConnections.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}