import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function GroupConnectionModal({
  show,
  selectedGroup,
  groups,
  selectedConnections,
  onClose,
  onSave,
  onToggleConnection,
}) {
  if (!show || !selectedGroup) return null;

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
              Group ini akan terhubung ke group yang dipilih di bawah.
            </p>
          </div>

          {selectedConnections.length > 0 && (
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-500">
              <p className="font-semibold text-sm mb-2">Groups Terhubung</p>
              {selectedConnections.map((groupId) => {
                const group = groups.find(g => g.id === groupId);
                return group ? (
                  <div
                    key={`selected-${groupId}`}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => onToggleConnection(groupId)}
                      />
                      <span className="font-medium">{group.name}</span>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Pilih Groups untuk Dihubungkan:</p>
            {groups.filter(g => g.id !== selectedGroup.id).length > 0 ? (
              groups.filter(g => g.id !== selectedGroup.id).map((group) => (
                <div
                  key={`group-conn-${group.id}`}
                  onClick={() => onToggleConnection(group.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedConnections.includes(group.id)
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
                        checked={selectedConnections.includes(group.id)}
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
              <p className="text-muted-foreground text-sm italic">Tidak ada group lain tersedia</p>
            )}
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={onSave}>
              Simpan Koneksi ({selectedConnections.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}