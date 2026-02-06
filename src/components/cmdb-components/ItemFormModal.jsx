import { X, Plus, Server, Trash2 } from 'lucide-react';
import { NODE_TYPES, PRESET_ICONS } from '../../utils/cmdb-utils/constants';
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
import ServiceIcon from './ServiceIcon';

export default function ItemFormModal({
  show,
  editMode,
  formData,
  groups,
  currentWorkspace,
  onClose,
  onSubmit,
  onInputChange,
  onServiceAdd,
  onServiceRemove,
  onServiceChange,
  onServiceIconUpload,
}) {
  const handleSelectChange = (name, value) => {
    onInputChange({
      target: { name, value }
    });
  };

  const services = formData.services || [];

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{editMode ? 'Edit Item' : 'Tambah Item Baru'}</span>
            {currentWorkspace && (
              <span className="text-sm font-normal text-muted-foreground">
                Workspace: {currentWorkspace.name}
              </span>
            )}
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
              <Label htmlFor="status">Status</Label>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                name="ip"
                type="text"
                placeholder="192.168.1.1"
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
                  <SelectItem value="external">External</SelectItem>
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
                  <SelectItem value="cloud">Cloud</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_id">Group</Label>
              <Select
                value={formData.group_id ? String(formData.group_id) : undefined}
                onValueChange={(value) => handleSelectChange('group_id', value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih group (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
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

            {/* Services Section */}
            <div className="md:col-span-2 space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Server />
                Services
              </Label>

              {services.map((service, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-gray-50">
                  {/* Icon Preview */}
                  <div className="flex-shrink-0">
                    {service.icon_type === 'preset' && service.icon_name ? (
                      <div className="w-12 h-12 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <ServiceIcon name={service.icon_name} size={24} />
                      </div>
                    ) : service.icon_type === 'upload' && (service.icon_path || service.icon_preview) ? (
                      <div className="w-12 h-12 bg-white rounded border border-gray-200 overflow-hidden">
                        <img
                          src={service.icon_preview || `http://localhost:5000${service.icon_path}`}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded border border-dashed border-gray-300 flex items-center justify-center">
                        <Server size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Service name (e.g., Citrix)"
                      value={service.name}
                      onChange={(e) => onServiceChange(index, 'name', e.target.value)}
                    />

                    <div className="flex gap-2">
                      <Select
                        value={service.status}
                        onValueChange={(value) => onServiceChange(index, 'status', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={service.icon_type}
                        onValueChange={(value) => onServiceChange(index, 'icon_type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preset">Preset</SelectItem>
                          <SelectItem value="upload">Upload</SelectItem>
                        </SelectContent>
                      </Select>

                      {service.icon_type === 'preset' ? (
                        <Select
                          value={service.icon_name}
                          onValueChange={(value) => onServiceChange(index, 'icon_name', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESET_ICONS.map(icon => (
                              <SelectItem key={icon.value} value={icon.value}>
                                <div className="flex items-center gap-2">
                                  <ServiceIcon name={icon.value} size={16} />
                                  {icon.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onServiceIconUpload(index, e)}
                            className="flex-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* File upload info */}
                    {service.icon_type === 'upload' && service.icon_name && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {service.icon_name}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => onServiceRemove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={onServiceAdd}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Add Service
              </Button>
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
