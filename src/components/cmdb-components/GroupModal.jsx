import { useState } from 'react';
import { Link, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function GroupModal({
  show,
  editMode,
  formData,
  groups,
  onClose,
  onSubmit,
  onInputChange,
  onEditGroup,
  onDeleteGroup,
  onOpenGroupConnection,
}) {
  const [deleteId, setDeleteId] = useState(null);

  if (!show) return null;

  return (
    <>
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit Group' : 'Tambah Group'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Group *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={onInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={onInputChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Warna</Label>
                <Input
                  id="color"
                  name="color"
                  type="color"
                  value={formData.color}
                  onChange={onInputChange}
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit">
                {editMode ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>

          {!editMode && groups.length > 0 && (
            <div className="border-t pt-6 mt-6">
              <h3 className="font-semibold mb-3">Daftar Group:</h3>
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    style={{ backgroundColor: group.color + '20' }}
                  >
                    <div>
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-muted-foreground">
                          {group.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenGroupConnection(group)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Kelola Koneksi Group"
                      >
                        <Link />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditGroup(group)}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(group.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Group</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus group ini? Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteGroup(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}