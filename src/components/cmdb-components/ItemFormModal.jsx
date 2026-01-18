import { X, Image, Plus } from 'lucide-react';
import { NODE_TYPES, API_BASE_URL } from '../../utils/cmdb-utils/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ItemFormModal({
  show,
  editMode,
  formData,
  groups,
  selectedFiles,
  imagePreviews,
  existingImages,
  onClose,
  onSubmit,
  onInputChange,
  onFileSelect,
  onRemoveNewImage,
  onRemoveExistingImage,
}) {
  const handleSelectChange = (name, value) => {
    onInputChange({
      target: { name, value }
    });
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editMode ? 'Edit Item' : 'Tambah Item Baru'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nama"
                value={formData.name}
                onChange={onInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipe *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange('type', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="env_type">Tipe Env</Label>
              <Select
                value={formData.env_type}
                onValueChange={(value) => handleSelectChange('env_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisik">Fisik</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                name="ip"
                type="text"
                placeholder="IP Address"
                value={formData.ip}
                onChange={onInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="eksternal">Eksternal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                name="location"
                type="text"
                placeholder="Lokasi"
                value={formData.location}
                onChange={onInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_id">Group</Label>
              <Select
                value={formData.group_id ? String(formData.group_id) : "none"}
                onValueChange={(value) => {
                  handleSelectChange('group_id', value === "none" ? null : parseInt(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Group</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Deskripsi"
                value={formData.description}
                onChange={onInputChange}
                rows={3}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                <Image />
                Gambar (Maks. 10)
              </Label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFileSelect}
                className="hidden"
                id="image-upload"
              />

              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-dashed rounded-md hover:bg-secondary/80 transition-colors"
              >
                <Plus />
                Pilih Gambar
              </label>

              {existingImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Gambar Tersimpan:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {existingImages.map((imgPath, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <img
                          src={`${API_BASE_URL}${imgPath}`}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => onRemoveExistingImage(imgPath)}
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Gambar Baru:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={`preview-${index}`} className="relative group">
                        <img
                          src={preview.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => onRemoveNewImage(index)}
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit">
              {editMode ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}