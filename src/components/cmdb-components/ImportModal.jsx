// msystem/src/components/cmdb-components/ImportModal.jsx
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { readExcelFile, validateExcelStructure } from '../../utils/fileUtils';
import * as XLSX from 'xlsx';

/**
 * Check if a row has valid data (not empty or minimal data)
 * Filters out rows that are completely empty or only have minor fields
 */
function isValidRow(row, requiredField = 'name') {
  const keys = Object.keys(row);
  if (keys.length === 0) return false;

  // If no required field specified (e.g., for connections), check if has substantial data
  if (!requiredField) {
    return keys.length >= 3; // At least 3 fields to be considered valid
  }

  // Check if row has required field
  const hasRequiredField = row[requiredField] !== undefined &&
                           row[requiredField] !== null &&
                           String(row[requiredField]).trim() !== '';

  // If has required field, it's valid
  if (hasRequiredField) return true;

  // If no required field but has substantial data (> 2 fields), still valid (might be empty name case)
  return keys.length > 2;
}

/**
 * Count valid rows in data
 */
function countValidRows(data, requiredField = 'name') {
  if (!Array.isArray(data)) return 0;
  return data.filter(row => isValidRow(row, requiredField)).length;
}

export default function ImportModal({ show, onClose, workspaceId, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [strategy, setStrategy] = useState('merge');
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  }, []);

  const parseFile = async (file) => {
    try {
      setIsParsing(true);
      const workbook = await readExcelFile(file);

      // Validate structure
      validateExcelStructure(workbook.SheetNames);

      // Convert to JSON
      const sheets = workbook.SheetNames.map(sheetName => ({
        name: sheetName,
        data: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      }));

      setParsedData(sheets);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePreview = async () => {
    if (!parsedData || !workspaceId) return;

    try {
      setIsUploading(true);
      setError(null);

      // Convert sheets to proper format and filter valid rows
      const cmdbItemsData = parsedData.find(s => s.name === 'CMDB Items')?.data || [];
      const groupsData = parsedData.find(s => s.name === 'Groups')?.data || [];
      const servicesData = parsedData.find(s => s.name === 'Services')?.data || [];
      const serviceItemsData = parsedData.find(s => s.name === 'Service Items')?.data || [];
      const serviceGroupsData = parsedData.find(s => s.name === 'Service Groups')?.data || [];
      const serviceGroupConnectionsData = parsedData.find(s => s.name === 'Service Group Connections')?.data || [];
      const connectionsData = parsedData.find(s => s.name === 'Cross-Service Connections')?.data || [];

      const importData = {
        cmdbItems: cmdbItemsData.filter(row => isValidRow(row, 'name')),
        groups: groupsData.filter(row => isValidRow(row, 'name')),
        services: servicesData.filter(row => isValidRow(row, 'name')),
        serviceItems: serviceItemsData.filter(row => isValidRow(row, 'name')),
        serviceGroups: serviceGroupsData.filter(row => isValidRow(row, 'name')),
        serviceGroupConnections: serviceGroupConnectionsData.filter(row => isValidRow(row, null)),
        crossServiceConnections: connectionsData.filter(row => isValidRow(row, null)),
      };

      const response = await api.post('/cmdb/import/preview', {
        workspace_id: workspaceId,
        file_data: importData,
        strategy: strategy
      });

      // Open preview modal
      onImportComplete(response.data.preview_id);

    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
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

    } catch (err) {
      console.error('Template download failed:', err);
    }
  };

  const getDataSummary = () => {
    if (!parsedData) return null;

    const cmdbItemsData = parsedData.find(s => s.name === 'CMDB Items')?.data || [];
    const groupsData = parsedData.find(s => s.name === 'Groups')?.data || [];
    const servicesData = parsedData.find(s => s.name === 'Services')?.data || [];
    const serviceItemsData = parsedData.find(s => s.name === 'Service Items')?.data || [];
    const serviceGroupsData = parsedData.find(s => s.name === 'Service Groups')?.data || [];
    const serviceGroupConnectionsData = parsedData.find(s => s.name === 'Service Group Connections')?.data || [];
    const connectionsData = parsedData.find(s => s.name === 'Cross-Service Connections')?.data || [];

    return {
      items: countValidRows(cmdbItemsData, 'name'),
      groups: countValidRows(groupsData, 'name'),
      services: countValidRows(servicesData, 'name'),
      serviceItems: countValidRows(serviceItemsData, 'name'),
      serviceGroups: countValidRows(serviceGroupsData, 'name'),
      serviceGroupConnections: countValidRows(serviceGroupConnectionsData, null),
      connections: countValidRows(connectionsData, null), // No required field for connections
    };
  };

  const summary = getDataSummary();

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Data CMDB</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download size={16} className="mr-2" />
              Download Template Excel
            </Button>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium block mb-2">Upload File Excel</Label>

            {/* Upload Area */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Drag & drop file Excel di sini atau klik untuk pilih file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hanya file .xlsx yang support
              </p>
            </div>
          </div>

          {/* Parsing Status */}
          {isParsing && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground mt-2">Membaca file...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Error:</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Summary */}
          {parsedData && summary && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Data Terdeteksi:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                <div>• {summary.items} CMDB Items</div>
                <div>• {summary.groups} Groups</div>
                <div>• {summary.services} Services</div>
                <div>• {summary.serviceItems} Service Items</div>
                <div>• {summary.serviceGroups} Service Groups</div>
                <div>• {summary.serviceGroupConnections} Service Group Connections</div>
                <div>• {summary.connections} Cross-Service Connections</div>
              </div>
            </div>
          )}

          {/* Conflict Strategy */}
          {parsedData && (
            <div>
              <Label className="text-sm font-medium block mb-2">Conflict Strategy</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="merge"
                    checked={strategy === 'merge'}
                    onChange={() => setStrategy('merge')}
                    className="cursor-pointer"
                  />
                  <label htmlFor="merge" className="text-sm cursor-pointer">
                    <span className="font-medium">Merge</span> - Update yang ada, tambah yang baru (aman)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="overwrite"
                    checked={strategy === 'overwrite'}
                    onChange={() => setStrategy('overwrite')}
                    className="cursor-pointer"
                  />
                  <label htmlFor="overwrite" className="text-sm cursor-pointer">
                    <span className="font-medium">Overwrite</span> - Timpa semua data (restore backup)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="skip"
                    checked={strategy === 'skip'}
                    onChange={() => setStrategy('skip')}
                    className="cursor-pointer"
                  />
                  <label htmlFor="skip" className="text-sm cursor-pointer">
                    <span className="font-medium">Skip</span> - Hanya tambah yang baru
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Batal
          </Button>
          <Button
            onClick={handlePreview}
            disabled={!parsedData || isUploading}
          >
            {isUploading ? 'Memproses...' : 'Preview & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
