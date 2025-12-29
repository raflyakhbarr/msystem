// src/components/cmdb-components/ExportModal.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function ExportModal({ show, onClose, onExport }) {
  const [exportFormat, setExportFormat] = useState('png');
  const [scope, setScope] = useState('viewport');
  const [bgType, setBgType] = useState('solid'); // 'solid' | 'transparent'
  const [bgColor, setBgColor] = useState('#ffffff'); // default white

  const handleExport = () => {
    onExport({
      format: exportFormat,
      scope,
      background: bgType === 'transparent' ? null : bgColor,
    });
    onClose();
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Ekspor Visualisasi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format */}
          <div>
            <Label className="text-sm font-medium block mb-2">Format</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={exportFormat === 'png' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('png')}
              >
                PNG
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'jpeg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('jpeg')}
              >
                JPEG
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('pdf')}
              >
                PDF
              </Button>
            </div>
          </div>

          {/* Cakupan */}
          <div>
            <Label className="text-sm font-medium block mb-2">Cakupan</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scope === 'viewport' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('viewport')}
              >
                Viewport
              </Button>
              <Button
                type="button"
                variant={scope === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('all')}
              >
                Semua Node
              </Button>
            </div>
          </div>

          {/* Background (only for PNG) */}
          {exportFormat === 'png' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium block">Background</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bgType === 'solid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBgType('solid')}
                >
                  Solid
                </Button>
                <Button
                  type="button"
                  variant={bgType === 'transparent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBgType('transparent')}
                >
                  Transparan
                </Button>
              </div>

              {bgType === 'solid' && (
                <div className="flex items-center gap-2 mt-1">
                  <Label htmlFor="bg-color" className="text-sm">Warna:</Label>
                  <Input
                    id="bg-color"
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 p-1 border cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{bgColor}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <Button onClick={handleExport}>Ekspor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}