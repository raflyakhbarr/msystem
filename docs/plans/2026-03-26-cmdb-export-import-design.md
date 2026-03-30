# CMDB Export & Import Feature - Design Document

**Date:** 2026-03-26
**Status:** Approved
**Author:** Claude Sonnet 4.6

---

## 1. Overview

Menambahkan fitur export dan import data CMDB yang lengkap untuk:
- Export data ke Excel (.xlsx) dan JSON (.json)
- Import data dari Excel dengan template
- Preview dan conflict handling saat import
- Dynamic template generation

---

## 2. Requirements

### 2.1 Export Features
- Export complete CMDB data (items, groups, services, service items, cross-service connections)
- Support Excel (.xlsx) format dengan 6 sheets
- Support JSON (.json) format untuk backup/restore
- Metadata sheet (export info, workspace details)
- Download template Excel untuk import

### 2.2 Import Features
- Upload Excel file
- Parse dan validate data structure
- Detect dan show data counts
- Conflict strategy: Merge / Overwrite / Skip
- Preview conflicts sebelum konfirmasi
- Template dengan contoh data dan validation hints

### 2.3 Libraries
- **xlsx** (npm: xlsx) - Generate/read Excel files
- Frontend: React components
- Backend: Express routes + PostgreSQL queries

---

## 3. Architecture

### 3.1 Frontend Components

#### **ExportModal.jsx** (Update)
```javascript
// Location: src/components/cmdb-components/ExportModal.jsx

Changes:
- Add "Data" export type option
- Add format selector: Excel / JSON
- Add scope selector: Current Workspace / All Workspaces
- Add "Download Template" button
```

#### **ImportModal.jsx** (New)
```javascript
// Location: src/components/cmdb-components/ImportModal.jsx

Features:
- File upload (drag & drop + click to upload)
- Template download button
- Detected data summary
- Conflict strategy selector
- Preview conflicts button
- Import confirmation
```

#### **ImportPreviewModal.jsx** (New)
```javascript
// Location: src/components/cmdb-components/ImportPreviewModal.jsx

Features:
- Show detected conflicts
- Side-by-side comparison (existing vs imported)
- Per-item resolution (keep/update)
- Import summary (new, updated, skipped counts)
```

### 3.2 Backend Routes

```javascript
// Location: cmdbapp-be/routes/exportImportRoutes.js

GET  /cmdb/export/excel       // Export to Excel
GET  /cmdb/export/json        // Export to JSON
GET  /cmdb/import/template    // Download template
POST /cmdb/import/excel       // Upload & parse Excel
POST /cmdb/import/preview     // Get conflicts preview
POST /cmdb/import/confirm     // Execute import
```

### 3.3 Database Queries

```sql
-- Export all data
-- CMDB Items: SELECT * FROM cmdb_items WHERE workspace_id = $1
-- Groups: SELECT * FROM cmdb_groups WHERE workspace_id = $1
-- Services: SELECT * FROM services WHERE workspace_id = $1
-- Service Items: SELECT * FROM service_items WHERE workspace_id = $1
-- Cross-Service: SELECT * FROM cross_service_connections WHERE workspace_id = $1
```

---

## 4. Excel Structure

### Sheet 1: CMDB Items
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | number | Yes | Item ID (auto-generated on import) |
| name | string | Yes | Item name |
| type | string | Yes | Item type (server, database, etc.) |
| status | string | Yes | active, inactive, maintenance, disabled |
| ip | string | No | IP address |
| domain | string | No | Domain name |
| port | string | No | Port number |
| description | text | No | Description |
| position_x | number | No | X coordinate |
| position_y | number | No | Y coordinate |
| group_id | number | No | Group ID |
| order_in_group | number | No | Order in group |

### Sheet 2: Groups
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | number | Yes | Group ID |
| name | string | Yes | Group name |
| description | text | No | Description |
| color | string | No | Color hex |
| position | string | No | Position JSON |

### Sheet 3: Services
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | number | Yes | Service ID |
| name | string | Yes | Service name |
| type | string | Yes | Service type |
| icon_type | string | No | upload/emoji |
| icon_path | string | No | Icon path |
| description | text | No | Description |

### Sheet 4: Service Items
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | number | Yes | Service Item ID |
| service_id | number | Yes | Service ID |
| name | string | Yes | Item name |
| type | string | Yes | Item type |
| status | string | Yes | Status |
| position | string | No | Position JSON |

### Sheet 5: Cross-Service Connections
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | number | Yes | Connection ID |
| source_service_item_id | number | Yes | Source ID |
| target_service_item_id | number | Yes | Target ID |
| connection_type | string | Yes | Type slug |
| direction | string | Yes | forward/backward |
| workspace_id | number | Yes | Workspace ID |

### Sheet 6: Metadata
| Column | Type | Description |
|--------|------|-------------|
| export_date | datetime | Export timestamp |
| export_by | string | User who exported |
| workspace_id | number | Workspace ID |
| workspace_name | string | Workspace name |
| version | string | Data version |

---

## 5. Import Conflict Strategies

### 5.1 Merge Strategy
- **New items:** Add to database
- **Existing items:** Update if data differs
- **Missing items:** Keep existing (not deleted)
- **Use case:** Update data yang sudah ada

### 5.2 Overwrite Strategy
- **New items:** Add to database
- **Existing items:** Replace with imported data
- **Missing items:** DELETE from database
- **Use case:** Full restore from backup

### 5.3 Skip Strategy
- **New items:** Add to database
- **Existing items:** Skip (keep existing)
- **Missing items:** Keep existing
- **Use case:** Add new data only

---

## 6. Error Handling

### 6.1 Validation Errors
- Missing required columns
- Invalid enum values (status, type, dll.)
- Invalid data types (number for ID, string for name, dll.)
- Broken references (group_id, service_id tidak ada)

### 6.2 Import Errors
- File format salah
- Sheet tidak lengkap
- Data korup atau tidak valid
- Database constraint violations

---

## 7. Success Criteria

✅ Export Excel dengan 6 sheets berhasil
✅ Export JSON berhasil
✅ Download template berhasil
✅ Import Excel dengan preview berhasil
✅ Conflict handling bekerja (merge/overwrite/skip)
✅ Real-time refresh setelah import
✅ Error handling dan validation
✅ Toast notifications untuk feedback

---

## 8. Next Steps

1. Implement backend export routes
2. Implement backend import routes
3. Update ExportModal component
4. Create ImportModal component
5. Create ImportPreviewModal component
6. Add xlsx library dependency
7. Test export/import flow
8. Add documentation
