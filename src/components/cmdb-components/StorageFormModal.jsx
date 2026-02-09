import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardDrive, Plus, Trash2 } from 'lucide-react';

export default function StorageFormModal({ show, storage, onClose, onSave }) {
  const [total, setTotal] = useState(storage?.total || '');
  const [used, setUsed] = useState(storage?.used || '');
  const [unit, setUnit] = useState(storage?.unit || 'GB');
  const [partitions, setPartitions] = useState(
    storage?.partitions || [
      { name: 'C:', total: '', used: '', unit: 'GB' }
    ]
  );

  const handleSave = () => {
    const storageData = {
      total: parseFloat(total) || 0,
      used: parseFloat(used) || 0,
      unit,
      partitions: partitions
        .filter(p => p.name && p.total && p.used)
        .map(p => ({
          ...p,
          total: parseFloat(p.total),
          used: parseFloat(p.used)
        }))
    };

    // Jika tidak ada partitions yang valid, hapus field partitions
    if (storageData.partitions.length === 0) {
      delete storageData.partitions;
    }

    onSave(storageData);
  };

  const addPartition = () => {
    setPartitions([...partitions, { name: '', total: '', used: '', unit: 'GB' }]);
  };

  const removePartition = (index) => {
    const newPartitions = partitions.filter((_, i) => i !== index);
    setPartitions(newPartitions);
  };

  const updatePartition = (index, field, value) => {
    const newPartitions = [...partitions];
    newPartitions[index][field] = value;
    setPartitions(newPartitions);
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konfigurasi Storage</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total Storage */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="512"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="used">Terpakai</Label>
              <Input
                id="used"
                type="number"
                value={used}
                onChange={(e) => setUsed(e.target.value)}
                placeholder="256"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="GB">GB</option>
                <option value="MB">MB</option>
                <option value="TB">TB</option>
              </select>
            </div>
          </div>

          {/* Partitions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Partitions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPartition}
                className="h-7 text-xs"
              >
                <Plus size={12} />
                Tambah
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {partitions.map((partition, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Partition {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600 hover:text-red-700"
                      onClick={() => removePartition(idx)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1">
                      <Input
                        placeholder="Nama"
                        value={partition.name}
                        onChange={(e) => updatePartition(idx, 'name', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        placeholder="Total"
                        value={partition.total}
                        onChange={(e) => updatePartition(idx, 'total', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        placeholder="Used"
                        value={partition.used}
                        onChange={(e) => updatePartition(idx, 'used', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <select
                        value={partition.unit}
                        onChange={(e) => updatePartition(idx, 'unit', e.target.value)}
                        className="w-full h-8 px-2 rounded border border-input bg-background text-xs"
                      >
                        <option value="GB">GB</option>
                        <option value="MB">MB</option>
                        <option value="TB">TB</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Summary */}
          {total && used && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <HardDrive size={16} className="text-blue-600" />
                <span className="font-medium">
                  Free: {parseFloat(total) - parseFloat(used)} {unit}
                  ({(((parseFloat(total) - parseFloat(used)) / parseFloat(total)) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
