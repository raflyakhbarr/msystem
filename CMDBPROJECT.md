# CMDB Project Analysis - Dated 30-04-2026
**Project**: CMDB Management System (CMDBMSYS)
**Analysis Date**: 07-05-2026
**Document Version**: 1.0

---

## 🎯 Executive Summary

Project CMDBMSYS adalah sistem Configuration Management Database yang kompleks dengan fitur propagasi status secara recursive/propagasi melalui multi-level node hierarchy. Sistem ini memungkinkan tracking infrastruktur IT dari level CMDB items (server, database, aplikasi) down ke level service items terkecil dengan kemampuan propagasi status otomatis.

---

## 📊 Architecture Overview

### **Project Structure**
```
cmdbmsys/
├── msystem/              # Frontend (React + Vite)
│   └── src/
│       ├── pages/cmdb-pages/        # CMDB pages
│       ├── components/cmdb-components/  # CMDB components
│       ├── hooks/cmdb-hooks/        # Custom hooks
│       ├── services/api.js          # API endpoints
│       └── utils/cmdb-utils/        # Utilities & helpers
│
├── cmdbapp-be/           # Backend (Node.js + Express + PostgreSQL)
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── migrations/       # Database migrations
│   └── SQL BACKUP/       # Database dumps
│
└── memory/               # Project documentation & memory
```

---

## 🔗 Core Entities & Relationships

### **1. CMDB Items (Top Level)**
**Table**: `cmdb_items`
**Purpose**: Representasi infrastruktur IT level tinggi (server, database, aplikasi, network devices)

**Key Fields**:
- `id`: Primary key
- `name`: Nama item
- `type`: Tipe (server, database, application, network, dll)
- `status`: active, inactive, maintenance, decommissioned
- `workspace_id`: Workspace grouping
- `group_id`: Grouping dalam workspace
- `position`: JSONB position untuk visualization
- `ip`: IP address
- `location`: Lokasi fisik
- `category`: internal/external
- `env_type`: fisik/virtual

**Relationships**:
- Item ↔ Item: Direct connections (depends_on, connects_to, dll)
- Item ↔ Group: Bisa masuk group
- Item ↔ Service: Item bisa memiliki multiple services

---

### **2. Services (Mid-Level)**
**Table**: `services`
**Purpose**: Representasi service-level komponen dalam CMDB item (microservices, modules, sub-systems)

**Key Fields**:
- `id`: Primary key
- `cmdb_item_id`: Foreign key ke cmdb_items (PARENT)
- `workspace_id`: Workspace (inherited dari parent item)
- `name`: Nama service
- `status`: active, inactive, disabled, maintenance
- `icon_type`: preset/upload
- `icon_path` / `icon_name`: Icon display
- `position`: JSONB position (sebagai independent node di visualization)
- `width` / `height`: Dimensi node
- `is_expanded`: Expanded state untuk visualization

**Critical Insight**: Service bisa menjadi **independent node** di visualization dengan position sendiri, bukan hanya child dari CMDB item!

**Relationships**:
- Service ↔ CMDB Item: Many-to-One (service belongs to item)
- Service ↔ Service Items: One-to-Many (service contains multiple service items)
- Service ↔ Service: Service-to-Service connections (horizontal)
- Service ↔ CMDB Item: Direct service-to-item connections

---

### **3. Service Items (Lowest Level)**
**Table**: `service_items`
**Purpose**: Representasi unit terkecil dalam service (individual instances, pods, containers, endpoints)

**Key Fields**:
- `id`: Primary key
- `service_id`: Foreign key ke services (PARENT)
- `workspace_id`: Workspace
- `name`: Nama service item
- `type`: Tipe (pod, container, instance, endpoint, dll)
- `status`: active, inactive, maintenance, decommissioned
- `position`: JSONB position
- `ip`: IP address
- `domain`: Domain name
- `port`: Port number
- `category`: Kategori
- `location`: Lokasi
- `group_id`: Grouping dalam service
- `order_in_group`: Urutan dalam group

**Relationships**:
- Service Item ↔ Service: Many-to-One (belongs to service)
- Service Item ↔ Service Item: Cross-service connections (horizontal antar services)
- Service Item ↔ CMDB Item: Direct connections ke parent atau external items

---

### **4. Connection Types**

#### **A. Item-to-Item Connections**
**Table**: `connections`
**Purpose**: Koneksi antar CMDB items

**Connection Types** (ENUM):
- `depends_on`: Target affects source (propagation: target_to_source)
- `consumed_by`: Source affects target (propagation: source_to_target)
- `connects_to`: Bidirectional (propagation: both)
- `contains`: Source affects target (propagation: source_to_target)
- `managed_by`, `data_flow_to`, `backup_to`, dll

**Fields**:
- `source_id` / `source_group_id`: Source (item atau group)
- `target_id` / `target_group_id`: Target (item atau group)
- `connection_type`: Tipe koneksi (ENUM)
- `direction`: forward/bidirectional
- `workspace_id`: Workspace scoping

**Propagation Rules**:
```javascript
target_to_source:    Target → Source (depends_on)
source_to_target:    Source → Target (consumed_by, contains)
both:               Source ↔ Target (connects_to, related_to)
```

#### **B. Service-to-Service Connections**
**Table**: `service_to_service_connections`
**Purpose**: Koneksi horizontal antar services dalam CMDB item yang sama

**Fields**:
- `source_service_id`: Service sumber
- `target_service_id`: Service target
- `cmdb_item_id`: Parent CMDB item
- `connection_type`: Tipe koneksi
- `direction`: forward
- `propagation`: source_to_target, target_to_source, both
- `workspace_id`: Workspace scoping

**Critical Feature**: Supports recursive propagation! Jika service A inactive, semua services yang bergantung pada A akan ikut inactive secara recursive.

#### **C. Cross-Service Connections**
**Table**: `cross_service_connections`
**Purpose**: Koneksi antar service items dari BERBEDA services

**Fields**:
- `source_service_item_id`: Service item sumber
- `target_service_item_id`: Service item target
- `connection_type`: Tipe koneksi
- `direction`: forward
- `propagation_enabled`: boolean (default: true)
- `workspace_id`: Workspace scoping

**Critical Feature**: Enables cross-service propagation! Service item di service A bisa mempengaruhi service item di service B.

#### **D. External Item Positions**
**Table**: `external_item_positions`
**Purpose**: Melacak posisi external service items di visualization service

**Fields**:
- `workspace_id`: Workspace
- `service_id`: Service yang sedang dilihat
- `external_service_item_id`: Service item dari service lain
- `position`: JSONB position
- `is_auto_layouted`: Auto-layout flag
- `layout_hash`: Hash untuk validasi layout

---

## 🔄 Propagation System (Recursive/Propagasi)

### **Propagation Levels**

#### **Level 1: CMDB Item Level**
**File**: `msystem/src/utils/cmdb-utils/statusPropagation.js`

**Mechanism**:
1. Build dependency graph dari connections
2. Identify problematic nodes (inactive, maintenance, decommissioned)
3. Recursive traversal through dependents
4. Calculate propagated status untuk setiap edge

**Graph Structure**:
```javascript
{
  nodeId: {
    dependencies: Set,  // Nodes yang bergantung pada node ini
    dependents: Set     // Nodes yang bergantung pada node ini
  }
}
```

**Propagation Logic**:
```javascript
// depends_on: Target affects Source
propagation: 'target_to_source'
graph[sourceId].dependencies.add(targetId)
graph[targetId].dependents.add(sourceId)

// consumed_by: Source affects Target
propagation: 'source_to_target'
graph[targetId].dependencies.add(sourceId)
graph[sourceId].dependents.add(targetId)

// connects_to: Bidirectional
propagation: 'both'
// Keduanya saling mempengaruhi
```

**Status Priority**:
```javascript
priorities = {
  'inactive': 3,
  'decommissioned': 3,
  'maintenance': 2,
  'active': 1
}
```

#### **Level 2: Service Level**
**File**: `cmdbapp-be/models/serviceModel.js`

**Function**: `propagateStatusToConnectedServices()`

**Mechanism**:
1. Saat service status berubah ke inactive/maintenance/disabled
2. Get semua outgoing service-to-service connections
3. Recursive update target services (max depth: 10)
4. Update semua service items dalam affected services
5. Emit socket events untuk realtime updates

**Code Flow**:
```javascript
updateServiceStatus(serviceId, 'inactive')
  ↓
propagateStatusToConnectedServices(serviceId, 'inactive', workspaceId)
  ↓
For each connection:
  - Check if propagation enabled
  - Update target service status
  - Update target service items status
  - Recursive ke next level (depth++)
  - Emit socket events
```

**Critical Feature**: Service-level propagation MEMICU internal propagation ke service items dan cross-service propagation!

#### **Level 3: Service Item Level**
**File**: `cmdbapp-be/models/serviceModel.js`

**Function**: `updateServiceItemStatus()`

**Mechanism**:
1. Update service item status
2. Cross-service propagation ke external service items
3. CMDB item propagation dari service item ke connected CMDB items
4. Parent service status update (jika perlu)
5. Internal propagation dalam parent service

**Propagation Chains**:
```
Service Item inactive
  ↓
Cross-Service Propagation:
  - Find connected service items di lain services
  - Update status mereka
  - Update parent services mereka
  - Trigger internal propagation di those services
  ↓
CMDB Item Propagation:
  - Find connected CMDB items
  - Update status mereka (jika active)
  - Emit cmdb_update event
```

#### **Level 4: Cross-Service Propagation**
**File**: `cmdbapp-be/models/crossServiceConnectionModel.js`

**Function**: `propagateStatusToConnectedServiceItems()`

**Mechanism**:
1. Service item status berubah
2. Get semua cross-service connections
3. Recursive update external service items
4. Update parent services dari affected items
5. Trigger internal propagation di those services

**Depth Control**: Max 10 levels untuk prevent infinite loops

---

## 🎨 Node Types & Visualization

### **1. CMDB Item Node**
**Component**: `CustomNode.jsx`
**Usage**: Representasi server, database, aplikasi di main visualization

**Features**:
- Status indicator (active, inactive, maintenance)
- Group color coding
- Service count badge
- Image/icon display
- Expandable untuk melihat services

### **2. Service Node (LayananNode)**
**Component**: `CustomServiceNode.jsx`
**Usage**: Representasi service sebagai independent node di visualization

**Critical Difference**: Service bisa menjadi node TERpisah dari parent CMDB item dengan position sendiri!

**Features**:
- Independent positioning (x, y)
- Resizable (width, height)
- Expandable/collapsible
- Service items count badge
- Multiple connection handles (12 positions)
- Status indicator dengan animation
- Hover card dengan service items breakdown

**Two Display Modes**:
1. **Inside Item Mode** (55x55px): Compact, di dalam CMDB item
2. **Independent Node Mode** (120x80px): Full-size, di canvas

### **3. Service Item Node**
**Component**: Part of `CustomServiceNode.jsx`
**Usage**: Representasi unit terkecil (pods, containers, instances)

**Features**:
- Nested dalam service node
- Individual status tracking
- Groupable dalam service
- Cross-service connections
- Position tracking dalam service canvas

### **4. Group Nodes**
**Component**: `CustomServiceGroupNode.jsx`
**Usage**: Grouping service items

**Features**:
- Collapsible
- Color-coded
- Position tracking
- Connection points

---

## 🔌 Connection System

### **Connection Handles**
**Table**: `edge_handles`, `service_edge_handles`, `cross_service_edge_handles`

**Purpose**: Melacak handle positions untuk edge routing

**Handle Positions**:
- Top: top-left, top-center, top-right
- Right: right-top, right-center, right-bottom
- Bottom: bottom-left, bottom-center, bottom-right
- Left: left-top, left-center, left-bottom

**Total**: 12 handles per node untuk flexible connections

### **Edge Status Calculation**
**File**: `msystem/src/utils/cmdb-utils/statusPropagation.js`

**Function**: `calculatePropagatedStatuses()`

**Output**: Map edge ID → status info
```javascript
{
  edgeId: {
    sourceId,
    targetId,
    sourceStatus,
    targetStatus,
    propagatedStatus,      // Status setelah propagasi
    propagatedFrom,        // Array source IDs
    isPropagated,          // Boolean flag
    effectiveEdgeStatus,   // Final edge status
    connectionType,
    propagation
  }
}
```

---

## 📡 Real-time Updates

### **Socket Events**
**File**: `cmdbapp-be/socket.js`

**Events**:
- `cmdb_update`: CMDB items/connections update
- `item_updated`: Single item update
- `connection_updated`: Connection update
- `group_updated`: Group update
- `service_update`: Service status update
- `service_item_status_update`: Service item status update

**Usage**: Frontend auto-refresh visualization saat ada perubahan

---

## 🗄️ Database Schema Highlights

### **Key Tables**:
1. `cmdb_items`: CMDB items (top level)
2. `cmdb_groups`: Item grouping
3. `services`: Service nodes (mid-level)
4. `service_items`: Service item units (lowest level)
5. `service_groups`: Service item grouping
6. `connections`: Item-to-item connections
7. `service_to_service_connections`: Service horizontal connections
8. `cross_service_connections`: Cross-service item connections
9. `external_item_positions`: External item positions tracking
10. `connection_type_definitions`: Connection type metadata

### **Enums**:
- `connection_type_enum`: 30+ connection types (depends_on, consumed_by, connects_to, dll)

---

## 🔑 Key Differences: LayananNode vs Service

### **LayananNode (Service Node)**
**Concept**: Service sebagai **independent node** di visualization

**Characteristics**:
- Memiliki position sendiri (x, y)
- Bisa di-resize (width, height)
- Dapat di-expand/collapse
- Memiliki multiple connection handles
- Berdiri terpisah dari parent CMDB item
- Digunakan untuk complex visualizations

**Use Cases**:
- High-detail service architecture visualization
- Multi-level service hierarchies
- Complex service-to-service relationships
- Service-centric views

### **Service (Standard)**
**Concept**: Service sebagai **child component** dalam CMDB item

**Characteristics**:
- Tidak memiliki position independent
- Ditampilkan sebagai icon/mini card dalam item
- Tidak resizable
- Simpler visualization
- Fokus pada hierarchy item → service → service items

**Use Cases**:
- Simple CMDB overviews
- Item-centric visualizations
- Quick service status checks
- Minimalist views

---

## 🚀 Critical Features

### **1. Recursive Propagation**
- Multi-level status propagation
- Depth-limited (max 10 levels)
- Cycle detection (visited Set)
- Priority-based status resolution
- Real-time socket updates

### **2. Cross-Service Communication**
- Service items dari berbeda services bisa connect
- Propagation across service boundaries
- Parent service auto-update
- Bidirectional propagation support

### **3. Workspace Isolation**
- Semua entities scoped ke workspace
- Cross-workspace sharing via share links
- Independent state management

### **4. Dynamic Visualization**
- Multiple node types (item, service, service item, group)
- Flexible connection handles
- Auto-layout support
- Position persistence
- Real-time updates

### **5. Status Management**
- 5 status levels: active, inactive, maintenance, disabled, decommissioned
- Priority-based conflict resolution
- Propagation-aware status updates
- Manual override support

---

## 📋 API Endpoints Summary

### **Service APIs** (`/api/services`):
- `GET /workspace/:workspaceId` - Get all services
- `GET /:serviceId` - Get service by ID
- `GET /:itemId` - Get services by CMDB item ID
- `POST /` - Create service
- `PUT /:serviceId` - Update service
- `PATCH /:serviceId/status` - Update service status (triggers propagation!)
- `DELETE /:serviceId` - Delete service
- `POST /:serviceId/propagate-status` - Manual propagation trigger
- `GET /:serviceId/propagation-preview` - Preview propagation effects

### **Service Item APIs** (`/api/service-items`):
- `GET /:serviceId/items` - Get service items
- `POST /` - Create service item
- `PUT /:itemId` - Update service item
- `PATCH /:itemId/status` - Update status (triggers cross-service propagation!)
- `DELETE /:itemId` - Delete service item

### **Connection APIs**:
- `/api/cmdb/connections` - Item-to-item connections
- `/api/service-to-service-connections` - Service horizontal connections
- `/api/cross-service-connections` - Cross-service item connections

---

## 🎯 Use Cases & Workflows

### **1. Service Failure Impact Analysis**
**Workflow**:
1. Service A goes inactive
2. System identifies dependent services (B, C, D)
3. Recursive propagation ke B, C, D
4. Service items dalam B, C, D juga update
5. Connected CMDB items terupdate
6. Real-time dashboard updates

**Benefit**: Immediate visibility ke impact scope

### **2. Multi-Level Dependency Tracking**
**Workflow**:
1. CMDB Item (Database) → Service (PostgreSQL) → Service Items (Primary, Replica)
2. Service Item (Primary) connects ke external Service Items (App Server pods)
3. Primary failure → Replica promotion trigger + App pods reconnection
4. Cross-service propagation ensures consistency

**Benefit**: Complex dependency visualization & management

### **3. Workspace-Based Segregation**
**Workflow**:
1. Production workspace: Critical services
2. Staging workspace: Test environment
3. Development workspace: Dev experiments
4. Independent state management
5. Cross-workspace sharing via links

**Benefit**: Environment isolation dengan controlled sharing

---

## 🔍 Technical Highlights

### **1. Cycle Prevention**
```javascript
visitedServices = new Set([startingId])
// Skip jika sudah visited
if (visitedServices.has(targetId)) continue
```

### **2. Depth Limiting**
```javascript
if (depth >= maxDepth) {
  console.warn('Max recursion depth reached')
  return []
}
```

### **3. Priority-Based Resolution**
```javascript
priorities = { 'inactive': 3, 'decommissioned': 3, 'maintenance': 2, 'active': 1 }
// Ambil worst status
worstStatus = max(priorities[status1], priorities[status2])
```

### **4. Socket Event Optimization**
```javascript
// Batch emit events
emitServiceUpdate(targetServiceId, workspaceId)
emitServiceItemStatusUpdate(itemId, status, workspaceId, serviceId)
emitCmdbUpdate() // Refresh CMDB view
```

---

## 📊 Dashboard Metrics

**File**: `msystem/src/pages/cmdb-pages/CMDBDashboard.jsx`

**Metrics**:
- Total Items & Health Score
- Connection Density & Isolated Items
- Total Services & Service Health Score
- Critical Items & Critical Services
- Top Items by Service Count
- Highly Connected Items

**Visualizations**:
- Status distribution (pie/bar/progress)
- Type/location/environment/category breakdowns
- Service type distribution
- Workspace distribution (view-all mode)

---

## 🛠️ Debugging Tools

**File**: `cmdbapp-be/debug-propagation.js`

**Usage**:
```bash
node debug-propagation.js <service_id>
```

**Output**:
- Service details
- Service items info
- Service-to-service connections
- Propagation settings
- Target service status
- Troubleshooting tips

---

## 🚨 Potential Issues & Solutions

### **1. Propagation Not Working**
**Causes**:
- No service-to-service connections
- Propagation setting disabled
- Target service already inactive
- Workspace ID mismatch

**Solution**: Use debug-propagation.js untuk identify issue

### **2. Circular Dependencies**
**Prevention**: Visited Set tracking
**Detection**: Max depth limit

### **3. Status Conflicts**
**Resolution**: Priority-based (inactive > maintenance > active)

### **4. Socket Event Storms**
**Prevention**: Batched emits, event throttling

---

## 📝 Development Notes

### **Code Organization**:
- Frontend: Feature-based (pages, components, hooks, utils)
- Backend: Layered (models, routes, controllers)
- Database: Migration-based schema evolution

### **State Management**:
- React hooks untuk local state
- Socket.io untuk real-time updates
- Server-side propagation logic

### **Testing Strategy**:
- Debug scripts untuk propagation testing
- Preview API untuk impact analysis
- Comprehensive logging

---

## 🎓 Learning Points

1. **Multi-Level Propagation**: Understanding recursive status flow through complex hierarchies
2. **Service Independence**: Services can exist as both child components and independent nodes
3. **Cross-Service Communication**: Service items can connect across service boundaries
4. **Priority-Based Resolution**: Handling conflicting status updates intelligently
5. **Cycle Prevention**: Using visited Sets dan depth limits untuk prevent infinite loops
6. **Real-Time Synchronization**: Socket.io events untuk consistent state across clients

---

## 📚 Key Files Reference

### **Frontend**:
- `msystem/src/utils/cmdb-utils/statusPropagation.js` - Propagation logic
- `msystem/src/components/cmdb-components/ServiceAsNode.jsx` - Service node component
- `msystem/src/pages/cmdb-pages/CMDBDashboard.jsx` - Dashboard visualization
- `msystem/src/services/api.js` - API endpoints

### **Backend**:
- `cmdbapp-be/models/serviceModel.js` - Service CRUD & propagation
- `cmdbapp-be/models/crossServiceConnectionModel.js` - Cross-service connections
- `cmdbapp-be/debug-propagation.js` - Debugging tool

### **Database**:
- `cmdbapp-be/migrations/SQL BACKUP/01-05-2026 latest.sql` - Latest schema

---

## 🐛 Known Issues & Fixes

### **Issue #1: Highlight Mode - Connected Nodes Not Visible**
**Date Found**: 2026-05-07
**Severity**: High
**Status**: ✅ Fixed (Updated)

**Description**:
Saat mengaktifkan Highlight Mode melalui VisualizationNavbar:
1. ✅ **CMDB item → CMDB item**: Berhasil, semua nodes muncul
2. ❌ **CMDB item → ServiceAsNode**: Hanya edge yang muncul, service node dan parent CMDB items tidak muncul
3. ❌ **ServiceAsNode → ServiceAsNode**: Hanya edge yang muncul

**Root Cause**:
File: `msystem/src/hooks/cmdb-hooks/useNodeRelationship.js`
Function: `getRelatedNodes()`

**Problems**:
1. **Single-pass iteration**: Logic hanya melakukan satu iterasi, sehingga hierarchical relationships yang kompleks tidak tercapture sepenuhnya
2. **Parent logic terbalik**: Baris 101-103 hanya menambahkan parent jika node SUDAH ada di related set, tapi tidak menangani cascade parent → child → grandparent
3. **ServiceAsNodes dengan parent**: ServiceAsNodes punya parentNode (CMDB items), tapi parent-nya tidak ditambahkan ke related set
4. **Incomplete edge checking**: Saat mengecek edge connections, tidak mengecek nodes yang baru ditambahkan dalam additionalNodes

**Solution**:
Implemented **multi-pass iteration** untuk capture semua hierarchical relationships:

```javascript
// ✅ MULTIPLE PASS FIX: Keep adding parents/children until no more changes
let changed = true;
let iterations = 0;
const maxIterations = 10; // Safety limit

while (changed && iterations < maxIterations) {
  changed = false;
  iterations++;

  // ✅ PASS 1: Include ALL connected nodes via edges
  if (!related.has(node.id) && !additionalNodes.has(node.id)) {
    const hasConnectionToRelated = edges.some(edge =>
      (related.has(edge.source) && edge.target === node.id) ||
      (related.has(edge.target) && edge.source === node.id) ||
      // ✅ Also check against additionalNodes (newly added nodes)
      (additionalNodes.has(edge.source) && edge.target === node.id) ||
      (additionalNodes.has(edge.target) && edge.source === node.id)
    );

    if (hasConnectionToRelated) {
      additionalNodes.add(node.id);
      changed = true;
    }
  }

  // ✅ PASS 2: If ANY node (in related or additional) has parent, include parent
  if ((related.has(node.id) || additionalNodes.has(node.id)) && node.parentNode) {
    if (!additionalNodes.has(node.parentNode) && !related.has(node.parentNode)) {
      additionalNodes.add(node.parentNode);
      changed = true;
    }
  }

  // ✅ PASS 3: If parent is in related or additional, include all children
  if ((related.has(node.id) || additionalNodes.has(node.id)) &&
      (node.type === 'group' || node.type === 'custom' || node.type === 'serviceAsNode')) {
    nodes.forEach(child => {
      if (child.parentNode === node.id) {
        if (!additionalNodes.has(child.id) && !related.has(child.id)) {
          additionalNodes.add(child.id);
          changed = true;
        }
      }
    });
  }
}
```

**How It Works**:
1. **Pass 1**: Tambahkan semua nodes yang terhubung melalui edges (termasuk edge ke nodes yang baru ditambahkan)
2. **Pass 2**: Tambahkan parent nodes dari semua nodes di related/additional sets
3. **Pass 3**: Tambahkan semua children dari parent nodes di related/additional sets
4. **Repeat** sampai tidak ada node baru yang ditambahkan (maksimal 10 iterasi)

**Result**:
Saat highlight mode aktif:
- ✅ Klik CMDB item: Semua connected CMDB items, ServiceAsNodes, dan parent/child nodes muncul
- ✅ Klik ServiceAsNode: ServiceAsNode, parent CMDB item, dan connected nodes muncul
- ✅ Full dependency graph terlihat dengan semua hierarchical relationships

**Example Scenario**:
```
Klik: ServiceAsNode "Web Server" (di dalam CMDB item "Application Server")
↓
Pass 1: Tambahkan nodes yang connect ke "Web Server" via edges
  → Database ServiceAsNode (connected via edge)
↓
Pass 2: Tambahkan parent dari nodes di atas
  → "Application Server" CMDB item (parent dari "Web Server")
  → "Database Server" CMDB item (parent dari "Database ServiceAsNode")
↓
Pass 3: Tambahkan children dari parent nodes di atas
  → Semua ServiceAsNodes dalam "Application Server"
  → Semua ServiceAsNodes dalam "Database Server"
↓
Result: Semua nodes terlihat!
```

**Files Modified**:
- `msystem/src/hooks/cmdb-hooks/useNodeRelationship.js` (lines 80-138)

**Testing Steps**:
1. Buka CMDB Visualization page
2. Klik tombol "Highlight" di navbar
3. **Test 1**: Klik pada CMDB item
   - Expected: Semua connected CMDB items + ServiceAsNodes + parent/child nodes muncul
4. **Test 2**: Klik pada ServiceAsNode
   - Expected: ServiceAsNode + parent CMDB item + connected nodes + sibling ServiceAsNodes muncul
5. **Test 3**: Klik pada ServiceAsNode yang connect ke ServiceAsNode lain
   - Expected: Kedua ServiceAsNodes + kedua parent CMDB items + semua siblings muncul

---

### **Issue #2: Save/Auto-save - Node Positions Not Updated After Save**
**Date Found**: 2026-05-07
**Severity**: High
**Status**: ✅ Fixed

**Description**:
Ketika user menyimpan posisi node baru (save/autosave) dan kemudian klik tombol highlight:
1. ✅ Posisi baru berhasil disimpan ke database
2. ❌ Node kembali ke posisi lama di frontend (stale state)
3. ✅ Setelah refresh/pindah halaman, posisi baru muncul (terbukti data di database benar)

**Root Cause**:
File: `msystem/src/pages/cmdb-pages/CMDBVisualization.jsx`
Functions: `autoSavePositions()`, `handleSavePositions()`, `handleCmdbUpdate()`

**Race Condition Flow**:
```
1. User drag node → nodes state updated (new position)
2. Auto-save/manual save triggered
3. isSavingRef.current = true (line 4022, 4083)
4. Save to database → SUCCESS ✅
5. api.post('/cmdb/trigger-update') → Fire socket event
6. handleCmdbUpdate() called via socket
7. ❌ SKIPPED because isSavingRef.current = true (line 1332)
8. Save completes → isSavingRef.current = false (line 4064, 4128)
9. Socket event already passed → fetchAll() NEVER called
10. Result: nodes state still has old positions ❌
```

**Problem Code** (line 1330-1341):
```javascript
const handleCmdbUpdate = async () => {
  // Skip fetch if currently saving connection to avoid race condition
  if (!isSavingRef.current && !isSavingConnection) {  // ← PROBLEM!
    await Promise.all([
      fetchAll(),
      fetchServices(),
      fetchServiceToServiceConnections(),
      fetchCrossServiceConnections()
    ]);
  }
};
```

**Solution**:
Manually trigger data refresh after save completes in finally block:

```javascript
} finally {
  setIsAutoSaving(false);
  isSavingRef.current = false;

  // ✅ FIX: Manually trigger data refresh after save completes
  // This ensures nodes state is updated with latest positions from database
  try {
    await Promise.all([
      fetchAll(),
      fetchServices(),
      fetchServiceToServiceConnections(),
      fetchCrossServiceConnections()
    ]);
  } catch (fetchErr) {
    console.error('Error fetching after auto-save:', fetchErr);
  }
}
```

**How It Works**:
1. Save to database (with `skipEmit: true` untuk avoid individual emits)
2. Single socket trigger update via `/cmdb/trigger-update`
3. Socket event mungkin terlewat karena `isSavingRef.current = true`
4. **FIX**: Setelah save selesai, manually call `fetchAll()` dll
5. Nodes state di-refresh dengan posisi terbaru dari database
6. Highlight mode dan visualization menampilkan posisi yang benar

**Result**:
Sesudah save/autosave:
- ✅ Posisi baru tersimpan di database
- ✅ Frontend nodes state di-refresh
- ✅ Highlight mode menampilkan posisi yang benar
- ✅ Tidak perlu refresh halaman untuk melihat posisi baru

**Files Modified**:
- `msystem/src/pages/cmdb-pages/CMDBVisualization.jsx`
  - `autoSavePositions()` finally block (line 4063-4075)
  - `handleSavePositions()` after toast success (line 4121-4134)

**Testing Steps**:
1. Buka CMDB Visualization page
2. Drag node ke posisi baru
3. Tunggu autosave (2 detik) atau klik tombol Save
4. **Expected**: Toast "Posisi berhasil disimpan!"
5. Klik tombol "Highlight"
6. Klik node yang baru saja dipindahkan
7. **Expected**: Node muncul di posisi BARU (bukan posisi lama)
8. Klik node lain untuk clear highlight
9. Klik node yang dipindahkan lagi
10. **Expected**: Masih di posisi BARU (consistent)

---

### **Issue #3: Preset Icon Not Displaying in ServiceDetailDialog**
**Date Found**: 2026-05-07
**Severity**: Medium
**Status**: ✅ Fixed

**Description**:
Di ServiceDetailDialog.jsx, icon preset (hardcoded) tidak muncul. Icon upload muncul dengan benar, tapi icon preset selalu menampilkan default icon (Server) alih-alih icon yang dipilih.

**Database Schema**:
- `icon_path`: Untuk upload icon (file path)
- `icon_name`: Untuk preset icon (nama icon seperti 'citrix', 'oracle', dll)
- `icon_type`: 'preset' atau 'upload'

**Root Cause**:
File: `msystem/src/components/cmdb-components/ServiceIcon.jsx`

Masalah di line 25:
```javascript
// ❌ BUG: Langsung lookup ke ICON_MAP tanpa validasi
const Icon = ICON_MAP[name?.toLowerCase()] || Server;
```

**Problem**:
- Tidak ada validasi apakah `name` adalah preset icon yang valid
- Jika `name` tidak ada di ICON_MAP (atau null/undefined), langsung default ke Server
- Tidak ada import PRESET_ICONS dari constants untuk cross-check

**Solution**:
Add validation dan import PRESET_ICONS:

```javascript
import { PRESET_ICONS } from '../../utils/cmdb-utils/constants';

// ICON_MAP untuk preset icons - mapping dari icon name ke Lucide component
const ICON_MAP = {
  citrix: Server,
  oracle: Database,
  apache: Server,
  nginx: Server,
  mongodb: Database,
  redis: Database,
  postgresql: Database,
  mysql: Database,
  mssql: Database,
  cloud: Cloud,
  internet: Globe,
  security: Shield,
  firewall: Shield,
  vpn: Lock,
  cpu: Cpu,
  storage: HardDrive,
  network: Network,
};

export default function ServiceIcon({ name, size = 24, className = '' }) {
  // ✅ FIX: Check if name exists in PRESET_ICONS first
  const isValidPreset = PRESET_ICONS.some(icon => icon.value === name);

  // Get icon component - use ICON_MAP if valid preset, otherwise default to Server
  const Icon = (isValidPreset && ICON_MAP[name?.toLowerCase()]) || Server;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Icon size={size} />
    </div>
  );
}
```

**How It Works**:
1. ServiceIcon menerima `name` prop (icon_name dari database)
2. Validasi: Cek apakah `name` ada di PRESET_ICONS list
3. Lookup: Jika valid preset, cari di ICON_MAP
4. Fallback: Jika tidak valid atau tidak ada di ICON_MAP, default ke Server
5. Result: Icon preset yang benar muncul, atau default Server jika invalid

**Result**:
- ✅ Icon preset ('citrix', 'oracle', dll) muncul dengan benar
- ✅ Icon upload tetap muncul normal
- ✅ Jika icon_name invalid/null, default ke Server icon
- ✅ Konsisten dengan PRESET_ICONS di constants.jsx

**Files Modified**:
- `msystem/src/components/cmdb-components/ServiceIcon.jsx`
  - Added import PRESET_ICONS from constants
  - Added isValidPreset validation
  - Improved fallback logic

**Testing Steps**:
1. Buka ItemFormModal, tambah service baru
2. Pilih icon_type = "Preset"
3. Pilih icon dari dropdown (misal: "Oracle", "Nginx", "MongoDB")
4. Save CMDB item
5. Buka ServiceDetailDialog untuk service tersebut
6. **Expected**: Icon yang dipilih muncul di header dialog (bukan default Server icon)
7. Test semua preset icons untuk memastikan semua muncul

**Additional Notes**:
- ICON_MAP dan PRESET_ICONS sudah sync (kedua-duanya 18 icon)
- Pastikan backend mengisi `icon_name` dengan benar saat create service
- Untuk icon upload, `icon_path` digunakan (seperti sebelumnya)

---

## 🔮 Future Enhancements

1. **Propagation Preview**: Impact analysis sebelum status change
2. **Custom Propagation Rules**: User-defined propagation logic
3. **Historical Tracking**: Status change history & audit trail
4. **Advanced Filtering**: Multi-dimensional filtering & search
5. **Performance Optimization**: Caching, lazy loading, virtualization
6. **Mobile Support**: Responsive design & touch interactions
7. **Export/Import**: Configuration backup & restore
8. **Advanced Analytics**: Usage patterns, failure prediction

---

**Document Status**: ✅ Complete
**Last Updated**: 2026-05-07
**Next Review**: After major architecture changes
