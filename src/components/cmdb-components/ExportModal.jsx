// msystem/src/components/cmdb-components/ExportModal.jsx
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
import { Download, FileSpreadsheet } from 'lucide-react';
import api from '../../services/api';

export default function ExportModal({ show, onClose, workspaceId, onImport, onExport }) {
  const [exportType, setExportType] = useState('visual'); // 'visual' | 'data'
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'json'
  const [visualFormat, setVisualFormat] = useState('png'); // 'png' | 'jpeg' | 'pdf'
  const [scope, setScope] = useState('viewport');
  const [bgType, setBgType] = useState('solid');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (exportType === 'visual') {
      // Visual export - use existing handler
      onExport({
        format: visualFormat,
        scope,
        background: bgType === 'transparent' ? null : bgColor,
      });
      onClose();
    } else {
      // Data export
      await handleDataExport();
      onClose();
    }
  };

  const handleDataExport = async () => {
    try {
      setIsExporting(true);

      const endpoint = format === 'xlsx'
        ? `/cmdb/export/excel?workspace_id=${workspaceId}`
        : `/cmdb/export/json?workspace_id=${workspaceId}`;

      const response = await api.get(endpoint, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;

      const filename = format === 'xlsx'
        ? `cmdb_export_${workspaceId}_${Date.now()}.xlsx`
        : `cmdb_export_${workspaceId}_${Date.now()}.json`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/cmdb/import/template', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cmdb_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Template download failed:', error);
      alert('Failed to download template');
    }
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ekspor Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Type */}
          <div>
            <Label className="text-sm font-medium block mb-2">Tipe Ekspor</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={exportType === 'visual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportType('visual')}
              >
                <FileSpreadsheet size={16} className="mr-2" />
                Visualisasi
              </Button>
              <Button
                type="button"
                variant={exportType === 'data' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportType('data')}
              >
                <Download size={16} className="mr-2" />
                Data
              </Button>
            </div>
          </div>

          {/* Data Export Options */}
          {exportType === 'data' && (
            <>
              <div>
                <Label className="text-sm font-medium block mb-2">Format</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={format === 'xlsx' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('xlsx')}
                  >
                    Excel (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant={format === 'json' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('json')}
                  >
                    JSON (.json)
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full"
                >
                  <Download size={16} className="mr-2" />
                  Download Template Import
                </Button>
              </div>
            </>
          )}

          {/* Visual Export Options (existing) */}
          {exportType === 'visual' && (
            <>
              <div>
                <Label className="text-sm font-medium block mb-2">Format</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={visualFormat === 'png' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualFormat('png')}
                  >
                    PNG
                  </Button>
                  <Button
                    type="button"
                    variant={visualFormat === 'jpeg' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualFormat('jpeg')}
                  >
                    JPEG
                  </Button>
                  <Button
                    type="button"
                    variant={visualFormat === 'pdf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualFormat('pdf')}
                  >
                    PDF
                  </Button>
                </div>
              </div>

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

              {visualFormat === 'png' && (
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
                      <input
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
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {exportType === 'data' && onImport && (
            <Button variant="outline" onClick={() => { onClose(); onImport(); }}>
              Import
            </Button>
          )}
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Mengekspor...' : 'Ekspor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
