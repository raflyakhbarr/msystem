# CMDB Export & Import Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add complete export/import functionality for CMDB data including items, groups, services, service items, and cross-service connections with Excel and JSON formats

**Architecture:**
- Frontend: React components with xlsx library for Excel generation/parsing
- Backend: Express routes with PostgreSQL queries
- Export: Multi-sheet Excel (6 sheets) + JSON format
- Import: Excel upload with validation, conflict preview, and 3 strategies (merge/overwrite/skip)

**Tech Stack:**
- Frontend: xlsx library, React hooks, shadcn/ui components
- Backend: Express.js, node-postgres, file-stream
- Database: PostgreSQL (existing tables)

---

## Phase 1: Setup & Dependencies

### Task 1: Install xlsx Library (Frontend)

**Files:**
- Modify: `msystem/package.json`

**Step 1: Add xlsx dependency**

Run: `cd msystem && npm install xlsx`

Expected: package.json updated with "xlsx": "^0.18.5"

**Step 2: Verify installation**

Run: `grep xlsx package.json`

Expected: `"xlsx": "^0.18.5"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add xlsx library for Excel export/import"
```

---

### Task 2: Add File Upload & Download Utilities (Frontend)

**Files:**
- Create: `msystem/src/utils/fileUtils.js`

**Step 1: Create file utilities**

```javascript
// src/utils/fileUtils.js
import * as XLSX from 'xlsx';

/**
 * Convert JSON data to Excel workbook
 */
export function jsonToExcel(data) {
  const wb = XLSX.utils.book_new();

  data.sheet.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  return wb;
}

/**
 * Convert Excel workbook to JSON data
 */
export function excelToJson(workbook) {
  const sheets = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    sheets.push({
      name: sheetName,
      data: data
    });
  });

  return sheets;
}

/**
 * Download file in browser
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Read Excel file
 */
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate Excel structure
 */
export function validateExcelStructure(sheets) {
  const requiredSheets = [
    'CMDB Items',
    'Groups',
    'Services',
    'Service Items',
    'Cross-Service Connections',
    'Metadata'
  ];

  const sheetNames = sheets.map(s => s.name);
  const missingSheets = requiredSheets.filter(rs => !sheetNames.includes(rs));

  if (missingSheets.length > 0) {
    throw new Error(`Missing sheets: ${missingSheets.join(', ')}`);
  }

  return true;
}
```

**Step 2: Commit**

```bash
git add src/utils/fileUtils.js
git commit -m "feat: add Excel file utilities for export/import"
```

---

## Phase 2: Backend - Export Routes

### Task 3: Create Export Routes Module

**Files:**
- Create: `cmdbapp-be/routes/exportImportRoutes.js`
- Modify: `cmdbapp-be/server.js` (register routes)

**Step 1: Create export/import routes file**

```javascript
// cmdbapp-be/routes/exportImportRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getExportData, getImportTemplate, validateImportData, executeImport } = require('../controllers/exportImportController');

// Export to Excel
router.get('/cmdb/export/excel', authenticateToken, async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    const data = await getExportData(workspace_id);

    // Convert to Excel
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    // CMDB Items
    const itemsWs = XLSX.utils.json_to_sheet(data.cmdbItems);
    XLSX.utils.book_append_sheet(wb, itemsWs, 'CMDB Items');

    // Groups
    const groupsWs = XLSX.utils.json_to_sheet(data.groups);
    XLSX.utils.book_append_sheet(wb, groupsWs, 'Groups');

    // Services
    const servicesWs = XLSX.utils.json_to_sheet(data.services);
    XLSX.utils.book_append_sheet(wb, servicesWs, 'Services');

    // Service Items
    const serviceItemsWs = XLSX.utils.json_to_sheet(data.serviceItems);
    XLSX.utils.book_append_sheet(wb, serviceItemsWs, 'Service Items');

    // Cross-Service Connections
    const connectionsWs = XLSX.utils.json_to_sheet(data.crossServiceConnections);
    XLSX.utils.book_append_sheet(wb, connectionsWs, 'Cross-Service Connections');

    // Metadata
    const metadataWs = XLSX.utils.json_to_sheet(data.metadata);
    XLSX.utils.book_append_sheet(wb, metadataWs, 'Metadata');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    const filename = `cmdb_export_${workspace_id}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(excelBuffer);
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export to JSON
router.get('/cmdb/export/json', authenticateToken, async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    const data = await getExportData(workspace_id);

    const filename = `cmdb_export_${workspace_id}_${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(data);
  } catch (err) {
    console.error('Export JSON error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Download template
router.get('/cmdb/import/template', authenticateToken, async (req, res) => {
  try {
    const template = await getImportTemplate();

    const filename = `cmdb_import_template_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(template);
  } catch (err) {
    console.error('Template download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import Excel - Parse & Preview
router.post('/cmdb/import/preview', authenticateToken, async (req, res) => {
  try {
    const { workspace_id, file_data, strategy } = req.body;

    if (!workspace_id || !file_data) {
      return res.status(400).json({ error: 'workspace_id and file_data are required' });
    }

    const preview = await validateImportData(workspace_id, file_data, strategy);

    res.json(preview);
  } catch (err) {
    console.error('Import preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import Excel - Confirm
router.post('/cmdb/import/confirm', authenticateToken, async (req, res) => {
  try {
    const { workspace_id, user_id, preview_id, strategy, resolutions } = req.body;

    if (!workspace_id || !preview_id) {
      return res.status(400).json({ error: 'workspace_id and preview_id are required' });
    }

    const result = await executeImport(workspace_id, user_id, preview_id, strategy, resolutions);

    res.json(result);
  } catch (err) {
    console.error('Import confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 2: Register routes in server.js**

```javascript
// In cmdbapp-be/server.js, add:
const exportImportRoutes = require('./routes/exportImportRoutes');
app.use('/api', exportImportRoutes);
```

**Step 3: Commit**

```bash
git add cmdbapp-be/routes/exportImportRoutes.js cmdbapp-be/server.js
git commit -m "feat: add export/import API routes structure"
```

---

### Task 4: Create Export Controller

**Files:**
- Create: `cmdbapp-be/controllers/exportImportController.js`

**Step 1: Create export/import controller**

```javascript
// cmdbapp-be/controllers/exportImportController.js
const { getExportDataQuery, getServicesQuery, getServiceItemsQuery, getCrossServiceConnectionsQuery } = require('../database/queries');

/**
 * Get all data for export
 */
async function getExportData(workspaceId) {
  try {
    const pool = require('../db').pool;

    // Fetch CMDB Items
    const itemsResult = await pool.query(`
      SELECT
        id, name, type, status, ip, domain, port, description,
        position, group_id, order_in_group, workspace_id
      FROM cmdb_items
      WHERE workspace_id = $1
      ORDER BY id
    `, [workspaceId]);

    // Fetch Groups
    const groupsResult = await pool.query(`
      SELECT id, name, description, color, position
      FROM cmdb_groups
      WHERE workspace_id = $1
      ORDER BY id
    `, [workspaceId]);

    // Fetch Services
    const servicesResult = await pool.query(`
      SELECT id, name, type, icon_type, icon_path, description
      FROM services
      WHERE workspace_id = $1
      ORDER BY id
    `, [workspaceId]);

    // Fetch Service Items
    const serviceItemsResult = await pool.query(`
      SELECT id, service_id, name, type, status, position
      FROM service_items
      WHERE workspace_id = $1
      ORDER BY id
    `, [workspaceId]);

    // Fetch Cross-Service Connections
    const connectionsResult = await pool.query(`
      SELECT
        id, source_service_item_id, target_service_item_id,
        connection_type, direction, workspace_id
      FROM cross_service_connections
      WHERE workspace_id = $1
      ORDER BY id
    `, [workspaceId]);

    return {
      cmdbItems: itemsResult.rows,
      groups: groupsResult.rows,
      services: servicesResult.rows,
      serviceItems: serviceItemsResult.rows,
      crossServiceConnections: connectionsResult.rows,
      metadata: {
        export_date: new Date().toISOString(),
        workspace_id: workspaceId,
        version: '1.0'
      }
    };
  } catch (err) {
    throw new Error(`Failed to fetch export data: ${err.message}`);
  }
}

/**
 * Generate import template with sample data
 */
async function getImportTemplate() {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();

    // Template structure with sample data
    const sampleItems = [
      { id: 1, name: 'Database Server', type: 'database', status: 'active', ip: '192.168.1.10', domain: '', port: '5432', description: 'Production DB', position_x: 100, position_y: 200, group_id: null, order_in_group: 0 },
    ];

    const sampleGroups = [
      { id: 1, name: 'Production', description: 'Production servers', color: '#10b981', position: '{"x":0,"y":0}' },
    ];

    const sampleServices = [
      { id: 1, name: 'API Service', type: 'api', icon_type: 'emoji', icon_path: '', description: 'Backend API' },
    ];

    const sampleServiceItems = [
      { id: 1, service_id: 1, name: 'API Server', type: 'server', status: 'active', position: '{"x":0,"y":0}' },
    ];

    const sampleConnections = [
      { id: 1, source_service_item_id: 1, target_service_item_id: 1, connection_type: 'depends_on', direction: 'forward', workspace_id: 1 },
    ];

    const metadata = [
      { key: 'Description', value: 'CMDB Import Template - Fill with your data' },
      { key: 'Version', value: '1.0' },
      { key: 'Status Values', value: 'active, inactive, maintenance, disabled' },
      { key: 'Type Values', value: 'server, database, application, load_balancer, firewall' },
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleItems), 'CMDB Items');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleGroups), 'Groups');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleServices), 'Services');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleServiceItems), 'Service Items');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleConnections), 'Cross-Service Connections');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metadata), 'Metadata');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } catch (err) {
    throw new Error(`Failed to generate template: ${err.message}`);
  }
}

/**
 * Validate import data and generate preview
 */
async function validateImportData(workspaceId, fileData, strategy) {
  // Implementation will be in Task 5
  return { preview_id: 'temp-id', conflicts: [], summary: {} };
}

/**
 * Execute import with resolutions
 */
async function executeImport(workspaceId, userId, previewId, strategy, resolutions) {
  // Implementation will be in Task 6
  return { success: true, imported: 0, updated: 0, skipped: 0 };
}

module.exports = {
  getExportData,
  getImportTemplate,
  validateImportData,
  executeImport
};
```

**Step 2: Commit**

```bash
git add cmdbapp-be/controllers/exportImportController.js
git commit -m "feat: add export/import controller with template generation"
```

---

## Phase 3: Frontend - Update Export Modal

### Task 5: Update ExportModal Component

**Files:**
- Modify: `msystem/src/components/cmdb-components/ExportModal.jsx`

**Step 1: Update ExportModal component**

```javascript
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

export default function ExportModal({ show, onClose, workspaceId, onImport }) {
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
    } else {
      // Data export
      await handleDataExport();
    }
    onClose();
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
```

**Step 2: Commit**

```bash
git add src/components/cmdb-components/ExportModal.jsx
git commit -m "feat: update ExportModal with data export and template download"
```

---

## Phase 4: Frontend - Import Modals

### Task 6: Create ImportModal Component

**Files:**
- Create: `msystem/src/components/cmdb-components/ImportModal.jsx`

**Step 1: Create ImportModal component**

```javascript
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

      // Convert sheets to proper format
      const importData = {
        cmdbItems: parsedData.find(s => s.name === 'CMDB Items')?.data || [],
        groups: parsedData.find(s => s.name === 'Groups')?.data || [],
        services: parsedData.find(s => s.name === 'Services')?.data || [],
        serviceItems: parsedData.find(s => s.name === 'Service Items')?.data || [],
        crossServiceConnections: parsedData.find(s => s.name === 'Cross-Service Connections')?.data || [],
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

    return {
      items: parsedData.find(s => s.name === 'CMDB Items')?.data?.length || 0,
      groups: parsedData.find(s => s.name === 'Groups')?.data?.length || 0,
      services: parsedData.find(s => s.name === 'Services')?.data?.length || 0,
      serviceItems: parsedData.find(s => s.name === 'Service Items')?.data?.length || 0,
      connections: parsedData.find(s => s.name === 'Cross-Service Connections')?.data?.length || 0,
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
```

**Step 2: Commit**

```bash
git add src/components/cmdb-components/ImportModal.jsx
git commit -m "feat: add ImportModal with file upload and conflict strategy"
```

---

### Task 7: Create ImportPreviewModal Component

**Files:**
- Create: `msystem/src/components/cmdb-components/ImportPreviewModal.jsx`

**Step 1: Create preview modal**

```javascript
// mystem/src/components/cmdb-components/ImportPreviewModal.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, X } from 'lucide-react';
import api from '../../services/api';

export default function ImportPreviewModal({ show, onClose, workspaceId, previewId, onConfirm }) {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  React.useEffect(() => {
    if (show && previewId) {
      fetchPreview();
    }
  }, [show, previewId]);

  const fetchPreview = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/cmdb/import/preview?preview_id=${previewId}`);
      setPreview(response.data);
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    try {
      setIsExecuting(true);

      const response = await api.post('/cmdb/import/confirm', {
        workspace_id: workspaceId,
        preview_id: previewId,
        // Resolutions would be collected from user choices
      });

      if (response.data.success) {
        onConfirm(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed: ' + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={show} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading preview...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!preview) return null;

  const { conflicts, summary } = preview;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Import</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Ringkasan Import:</p>
            <div className="grid grid-cols-3 gap-2 text-sm text-blue-700">
              <div>• Baru: {summary.new || 0}</div>
              <div>• Update: {summary.update || 0}</div>
              <div>• Skip: {summary.skip || 0}</div>
            </div>
          </div>

          {/* Conflicts */}
          {conflicts && conflicts.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                <AlertTriangle className="inline mr-2" size={14} />
                {conflicts.length} Conflict Terdeteksi:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="p-2 bg-white rounded border border-yellow-300">
                    <p className="text-sm font-medium">{conflict.type}: {conflict.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Existing: {conflict.existing} → Imported: {conflict.imported}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conflicts && conflicts.length === 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <Check className="inline mr-2" size={14} />
                Tidak ada conflict! Import siap dilakukan.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Batal
          </Button>
          <Button onClick={handleExecuteImport} disabled={isExecuting}>
            {isExecuting ? 'Mengimport...' : 'Konfirmasi Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/cmdb-components/ImportModal.jsx src/components/cmdb-components/ImportPreviewModal.jsx
git commit -m "feat: add ImportPreviewModal with conflict display"
```

---

## Phase 5: Backend Import Implementation

### Task 8: Implement Import Validation Logic

**Files:**
- Modify: `cmdbapp-be/controllers/exportImportController.js`

**Step 1: Add validation implementation**

```javascript
// Add to exportImportController.js

const { storePreview } = require('../utils/importStore');

/**
 * Validate import data and generate preview
 */
async function validateImportData(workspaceId, fileData, strategy) {
  try {
    const pool = require('../db').pool;

    // Get existing data for conflict detection
    const [existingItems, existingGroups, existingServices, existingServiceItems, existingConnections] = await Promise.all([
      pool.query('SELECT id, name FROM cmdb_items WHERE workspace_id = $1', [workspaceId]),
      pool.query('SELECT id, name FROM cmdb_groups WHERE workspace_id = $1', [workspaceId]),
      pool.query('SELECT id, name FROM services WHERE workspace_id = $1', [workspaceId]),
      pool.query('SELECT id, name FROM service_items WHERE workspace_id = $1', [workspaceId]),
      pool.query('SELECT id FROM cross_service_connections WHERE workspace_id = $1', [workspaceId]),
    ]);

    const conflicts = [];

    // Validate CMDB Items
    const itemMap = new Map(existingItems.rows.map(i => [i.name, i]));
    fileData.cmdbItems.forEach(item => {
      if (itemMap.has(item.name)) {
        const existing = itemMap.get(item.name);
        if (existing.status !== item.status) {
          conflicts.push({
            type: 'CMDB Item',
            name: item.name,
            existing: existing.status,
            imported: item.status
          });
        }
      }
    });

    // Validate Groups
    const groupMap = new Map(existingGroups.rows.map(g => [g.name, g]));
    fileData.groups.forEach(group => {
      if (groupMap.has(group.name)) {
        conflicts.push({
          type: 'Group',
          name: group.name,
          existing: 'exists',
          imported: 'exists'
        });
      }
    });

    // Generate preview
    const previewId = `preview_${Date.now()}`;
    const summary = {
      total: fileData.cmdbItems.length + fileData.groups.length + fileData.services.length,
      new: 0,
      update: conflicts.length,
      skip: 0
    };

    // Store preview for later import
    storePreview(previewId, { workspaceId, fileData, strategy, conflicts, summary });

    return {
      preview_id: previewId,
      conflicts,
      summary
    };
  } catch (err) {
    throw new Error(`Validation failed: ${err.message}`);
  }
}

/**
 * Execute import with resolutions
 */
async function executeImport(workspaceId, userId, previewId, strategy, resolutions) {
  try {
    const preview = storePreview(previewId);
    if (!preview) {
      throw new Error('Preview not found or expired');
    }

    const { fileData, strategy: importStrategy } = preview;
    const pool = require('../db').pool;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      const existingItems = await pool.query(
        'SELECT id, name, status FROM cmdb_items WHERE workspace_id = $1',
        [workspaceId]
      );
      const itemMap = new Map(existingItems.rows.map(i => [i.name, i]));

      // Import CMDB Items
      for (const item of fileData.cmdbItems) {
        const existing = itemMap.get(item.name);

        if (existing) {
          if (importStrategy === 'overwrite') {
            await pool.query(
              'UPDATE cmdb_items SET status = $1 WHERE id = $2',
              [item.status, existing.id]
            );
            updated++;
          } else if (importStrategy === 'merge') {
            // Update if different
            if (existing.status !== item.status) {
              await pool.query(
                'UPDATE cmdb_items SET status = $1 WHERE id = $2',
                [item.status, existing.id]
              );
              updated++;
            } else {
              skipped++;
            }
          } else {
            // Skip
            skipped++;
          }
        } else {
          // Insert new
          const result = await pool.query(
            `INSERT INTO cmdb_items (name, type, status, workspace_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [item.name, item.type, item.status || 'active', workspaceId]
          );
          imported++;
        }
      }

      // Import Groups
      // ... similar logic for groups, services, service items, connections

      await client.query('COMMIT');

      return {
        success: true,
        imported,
        updated,
        skipped
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    throw new Error(`Import failed: ${err.message}`);
  }
}
```

**Step 2: Create import store utility**

```javascript
// cmdbapp-be/utils/importStore.js
const previews = new Map();

function storePreview(previewId, data) {
  previews.set(previewId, {
    ...data,
    timestamp: Date.now()
  });

  // Clean up old previews (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, preview] of previews.entries()) {
    if (preview.timestamp < oneHourAgo) {
      previews.delete(id);
    }
  }
}

function storePreview(previewId) {
  return previews.get(previewId);
}

module.exports = { storePreview, getPreview };
```

**Step 3: Commit**

```bash
git add cmdbapp-be/controllers/exportImportController.js cmdbapp-be/utils/importStore.js
git commit -m "feat: implement import validation and execution logic"
```

---

## Phase 6: Integration

### Task 9: Wire Up Modals in CMDBVisualization

**Files:**
- Modify: `msystem/src/pages/cmdb-pages/CMDBVisualization.jsx`

**Step 1: Add import modal state and handlers**

```javascript
// Add to CMDBVisualization.jsx state section:
const [showImportModal, setShowImportModal] = useState(false);
const [importPreviewId, setImportPreviewId] = useState(null);

// Add handlers:
const handleOpenImport = () => {
  setShowImportModal(true);
};

const handleImportComplete = (previewId) => {
  setImportPreviewId(previewId);
  setShowImportModal(false);
};

const handleImportConfirm = (result) => {
  // Refresh data after import
  toast.success(`Import selesai! ${result.imported} baru, ${result.updated} update`);
  fetchAll(); // Refresh data
  // Emit socket update
  if (socket) {
    socket.emit('cmdb_update');
  }
};
```

**Step 2: Add Import button to navbar or add menu**

```javascript
// In VisualizationNavbar or add to existing buttons:
<Button
  onClick={handleOpenImport}
  variant="secondary"
  size="sm"
  title="Import Data"
>
  <Upload size={16} className="mr-2" />
  <span className="hidden lg:inline">Import</span>
</Button>

// Add modals:
<ImportModal
  show={showImportModal}
  onClose={() => setShowImportModal(false)}
  workspaceId={workspaceId}
  onImportComplete={handleImportComplete}
/>

<ImportPreviewModal
  show={!!importPreviewId}
  onClose={() => setImportPreviewId(null)}
  workspaceId={workspaceId}
  previewId={importPreviewId}
  onConfirm={handleImportConfirm}
/>
```

**Step 3: Commit**

```bash
git add src/pages/cmdb-pages/CMDBVisualization.jsx
git commit -m "feat: integrate import modals with refresh and toast"
```

---

## Phase 7: Testing & Documentation

### Task 10: Create Import Validation Tests

**Files:**
- Create: `cmdbapp-be/tests/exportImport.test.js`

**Step 1: Create validation tests**

```javascript
// cmdbapp-be/tests/exportImport.test.js
const request = require('supertest');
const express = require('express');
const { pool } = require('../db');

describe('Export/Import API', () => {
  let app;

  beforeEach(async () => {
    // Setup test database
    await pool.query('TRUNCATE cmdb_items, cmdb_groups, services, service_items');
  });

  test('GET /cmdb/export/excel - exports all data', async () => {
    // Insert test data
    await pool.query(`
      INSERT INTO cmdb_items (name, type, status, workspace_id)
      VALUES ('Test DB', 'database', 'active', 1)
    `);

    const response = await request(app)
      .get('/api/cmdb/export/excel?workspace_id=1')
      .expect('Content-Type', /vnd.openxmlformats/)
      .expect(200);

    expect(response.body).toBeInstanceOf(Buffer);
  });

  test('POST /cmdb/import/preview - validates data', async () => {
    const importData = {
      cmdbItems: [{ id: 1, name: 'New Item', type: 'server', status: 'active' }],
      // ... other sheets
    };

    const response = await request(app)
      .post('/api/cmdb/import/preview')
      .send({
        workspace_id: 1,
        file_data: importData,
        strategy: 'merge'
      })
      .expect(200)
      .expect('body')
      .to.have.property('preview_id');
  });
});
```

**Step 2: Commit**

```bash
git add cmdbapp-be/tests/exportImport.test.js
git commit -m "test: add export/import validation tests"
```

---

### Task 11: Create Documentation

**Files:**
- Create: `docs/export-import-guide.md`

**Step 1: Write user guide**

```markdown
# CMDB Export & Import Guide

## Export Data

### Export ke Excel
1. Buka CMDB Visualization
2. Klik tombol "Export" di navbar
3. Pilih tipe export: "Data"
4. Pilih format: "Excel (.xlsx)"
5. Klik "Ekspor"
6. File akan terdownload dengan nama: `cmdb_export_{workspace_id}_{timestamp}.xlsx`

### Export ke JSON
1. Ikuti langkah di atas
2. Pilih format: "JSON (.json)"
3. File JSON akan terdownload

## Import Data

### Download Template
1. Buka modal Export
2. Pilih "Data" → Pilih "Excel"
3. Klik "Download Template Import"
4. Template akan terdownload dengan nama: `cmdb_import_template.xlsx`

### Import File
1. Buka modal Import (klik tombol "Import" di navbar)
2. Download template dulu (opsional)
3. Isi data di template Excel
4. Upload file Excel
5. Pilih conflict strategy:
   - **Merge**: Update yang ada, tambah yang baru (aman)
   - **Overwrite**: Timpa semua data
   - **Skip**: Hanya tambah yang baru
6. Klik "Preview & Import"
7. Review conflicts (jika ada)
8. Klik "Konfirmasi Import"

## Excel Structure

### Sheet 1: CMDB Items
Required columns: id, name, type, status
Optional: ip, domain, port, description, position_x, position_y, group_id

### Sheet 2: Groups
Required columns: id, name
Optional: description, color, position

### Sheet 3: Services
Required columns: id, name, type
Optional: icon_type, icon_path, description

### Sheet 4: Service Items
Required columns: id, service_id, name, type, status
Optional: position

### Sheet 5: Cross-Service Connections
Required columns: id, source_service_item_id, target_service_item_id, connection_type, direction, workspace_id

### Sheet 6: Metadata
Auto-generated, do not modify
```

**Step 2: Commit**

```bash
git add docs/export-import-guide.md
git commit -m "docs: add export/import user guide"
```

---

## Success Criteria Verification

After completing all tasks:

✅ Export Excel dengan 6 sheets - Test export dari CMDBVisualization
✅ Export JSON - Test export JSON format
✅ Download template - Test download template Excel
✅ Import Excel dengan preview - Test import dan preview modal
✅ Conflict handling (merge/overwrite/skip) - Test semua strategy
✅ Real-time refresh setelah import - Verify socket.emit works
✅ Error handling dan validation - Test invalid data upload
✅ Toast notifications - Verify feedback appears

---

## Summary

**Total Tasks:** 11 tasks
**Estimated Time:** 2-3 hours for implementation
**Priority Order:**
1. Setup (Tasks 1-2)
2. Backend Export (Tasks 3-4)
3. Frontend Export UI (Task 5)
4. Frontend Import UI (Tasks 6-7)
5. Backend Import Logic (Task 8)
6. Integration (Task 9)
7. Testing (Task 10)
8. Documentation (Task 11)

**Dependencies:**
- Frontend: xlsx library
- Backend: node-postgres, xlsx
- Both: Express routes setup
