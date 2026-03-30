# CMDB Export & Import Guide

## Export Data

### Export ke Excel

1. Buka CMDB Visualization
2. Klik tombol "Export" di navbar
3. Pilih tipe export: "Data"
4. Pilih format: "Excel (.xlsx)"
5. Klik "Ekspor"
6. File akan terdownload dengan nama: `cmdb_export_{workspace_id}_{timestamp}.xlsx`

**File Excel berisi 6 sheets:**
- CMDB Items - Daftar semua item CMDB
- Groups - Daftar semua grup
- Services - Daftar semua services
- Service Items - Daftar semua service items
- Cross-Service Connections - Koneksi antar services
- Metadata - Informasi export (tanggal, workspace, versi)

### Export ke JSON

1. Buka CMDB Visualization
2. Klik tombol "Export" di navbar
3. Pilih tipe export: "Data"
4. Pilih format: "JSON (.json)"
5. Klik "Ekspor"
6. File JSON akan terdownload dengan nama: `cmdb_export_{workspace_id}_{timestamp}.json`

**File JSON berisi:**
```json
{
  "cmdbItems": [...],
  "groups": [...],
  "services": [...],
  "serviceItems": [...],
  "crossServiceConnections": [...],
  "metadata": {
    "export_date": "2026-03-26T10:00:00.000Z",
    "workspace_id": 1,
    "version": "1.0"
  }
}
```

## Import Data

### Download Template

1. Buka modal Export
2. Pilih "Data" → Pilih "Excel"
3. Klik "Download Template Import"
4. Template akan terdownload dengan nama: `cmdb_import_template.xlsx`

Template berisi:
- 6 sheets dengan struktur yang benar
- Data contoh untuk referensi
- Validasi hint di sheet Metadata

### Import File

1. Buka modal Import (klik tombol "Import" di navbar)
2. Download template dulu (opsional tapi disarankan)
3. Isi data di template Excel
4. Upload file Excel dengan drag & drop atau klik untuk pilih file
5. Pilih conflict strategy:
   - **Merge**: Update yang ada, tambah yang baru (aman)
   - **Overwrite**: Timpa semua data (restore backup)
   - **Skip**: Hanya tambah yang baru
6. Klik "Preview & Import"
7. Review conflicts (jika ada)
8. Klik "Konfirmasi Import" untuk menyelesaikan

## Excel Structure

### Sheet 1: CMDB Items

**Required columns:**
- `id` - Item ID (number)
- `name` - Nama item (string)
- `type` - Tipe item (string)
- `status` - Status (string)

**Optional columns:**
- `ip` - IP address
- `domain` - Domain name
- `port` - Port number
- `description` - Deskripsi
- `position` - Posisi JSON
- `group_id` - Group ID
- `order_in_group` - Urutan dalam grup

**Valid values:**
- `status`: active, inactive, maintenance, disabled
- `type`: server, database, application, load_balancer, firewall, dll.

### Sheet 2: Groups

**Required columns:**
- `id` - Group ID (number)
- `name` - Nama grup (string)

**Optional columns:**
- `description` - Deskripsi
- `color` - Warna hex (contoh: #10b981)
- `position` - Posisi JSON

### Sheet 3: Services

**Required columns:**
- `id` - Service ID (number)
- `name` - Nama service (string)
- `type` - Tipe service (string)

**Optional columns:**
- `icon_type` - Tipe icon (upload/emoji)
- `icon_path` - Path ke icon
- `description` - Deskripsi

### Sheet 4: Service Items

**Required columns:**
- `id` - Service Item ID (number)
- `service_id` - Service ID terkait (number)
- `name` - Nama item (string)
- `type` - Tipe item (string)
- `status` - Status (string)

**Optional columns:**
- `position` - Posisi JSON

### Sheet 5: Cross-Service Connections

**Required columns:**
- `id` - Connection ID (number)
- `source_service_item_id` - Source item ID (number)
- `target_service_item_id` - Target item ID (number)
- `connection_type` - Tipe koneksi (string)
- `direction` - Arah (forward/backward)
- `workspace_id` - Workspace ID (number)

### Sheet 6: Metadata

**Auto-generated** - Jangan dimodifikasi

Berisi informasi tentang export:
- export_date - Tanggal export
- workspace_id - ID workspace
- version - Versi data

## Conflict Strategies

### Merge Strategy (Default)
- **Item baru**: Ditambahkan ke database
- **Item existing**: Diupdate jika data berbeda
- **Item missing**: Dipertahankan (tidak dihapus)
- **Use case**: Update data yang sudah ada dengan aman

### Overwrite Strategy
- **Item baru**: Ditambahkan ke database
- **Item existing**: Diganti dengan data import
- **Item missing**: DIHAPUS dari database
- **Use case**: Full restore dari backup

### Skip Strategy
- **Item baru**: Ditambahkan ke database
- **Item existing**: Dipertahankan (tidak diubah)
- **Item missing**: Dipertahankan
- **Use case**: Hanya tambah data baru

## Troubleshooting

### Export gagal
- Pastikan workspace dipilih
- Cek koneksi internet
- Refresh halaman dan coba lagi

### Import gagal
- Pastikan file format .xlsx (bukan .xls)
- Pastikan semua 6 sheets ada
- Cek nama sheet harus persis sama (case-sensitive)
- Validasi data sebelum import

### Conflict tidak muncul
- Pastikan data di workspace sudah ada
- Conflict hanya muncul jika ada data yang sama
- Cek strategy yang dipilih

### Data tidak terimport
- Cek apakah workspace ID sama
- Validasi format data di Excel
- Cek error message di preview modal

## Tips & Best Practices

1. **Selalu download template terbaru** - Template mungkin update
2. **Backup dulu** - Export data sebelum import besar
3. **Gunakan Merge** - Paling aman untuk update data
4. **Review conflicts** - Selalu cek preview sebelum konfirmasi
5. **Test dengan kecil** - Import data sedikit dulu untuk testing
6. **Validasi data** - Pastikan format data benar sebelum import

## Support

Jika mengalami masalah:
1. Cek troubleshooting di atas
2. Lihat error message di UI
3. Cek browser console untuk error logs
4. Hubungi admin sistem
