# ServiceAsNode Highlight Feature Fix

## 🐛 Problem

**User Report**: *"ada beberapa fitur yang belum disesuaikan ketika kala itu saya merubah service ini menjadi node (ServiceAsNode) di CMDBVisualization, saya ingin memperbaiki fitur highlight terlebih dahulu, cek tombolnya di VisualizationNavbar.jsx, seperti logic dari edge service ke service, service item ke service item kemudian ketika CMDB item node ini di klik ServiceAsNode seperti tertumpuk jadi menghilang karena belum ada logic ServiceAsNodenya yang mengatur"*

**Issue**: ServiceAsNode nodes didn't highlight when clicked in highlight mode, and the highlight logic wasn't working for service-to-service connections.

---

## ✅ Root Cause

**Problem 1: `e.stopPropagation()` Preventing ReactFlow Events**

In [ServiceAsNode.jsx:200](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\components\cmdb-components\ServiceAsNode.jsx#L200), the `handleClick` function called `e.stopPropagation()` which prevented ReactFlow's `onNodeClick` handler from executing.

```javascript
// ❌ BEFORE
const handleClick = (e) => {
  e.stopPropagation(); // ← Prevents ReactFlow's onNodeClick!
  onServiceClick?.(service);
};
```

**Why This Matters**: ReactFlow's `onNodeClick` handler (in [CMDBVisualization.jsx:4567-4573](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBVisualization.jsx#L4567-L4573)) contains the highlight logic that needs to execute when a ServiceAsNode is clicked.

**Problem 2: Missing `highlightMode` Prop**

ServiceAsNode didn't receive the `highlightMode` prop, so it couldn't conditionally prevent the service dialog from opening during highlight mode.

---

## 📝 Implementation

### Fix 1: Add `highlightMode` Prop to ServiceAsNode

**File**: [ServiceAsNode.jsx:62](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\components\cmdb-components\ServiceAsNode.jsx#L62)

```javascript
// ✅ AFTER: Add highlightMode to destructured data
export default function ServiceAsNode({ data, selected }) {
  const { service, onServiceClick, onServiceItemsClick, cmdbItemName, isInsideItem, isSharedView, highlightMode } = data;
```

---

### Fix 2: Update handleClick to Check highlightMode

**File**: [ServiceAsNode.jsx:199-210](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\components\cmdb-components\ServiceAsNode.jsx#L199-L210)

```javascript
// ✅ AFTER: Check highlightMode before calling onServiceClick
const handleClick = (e) => {
  // ✅ FIX: Don't stop propagation! Allow ReactFlow's onNodeClick to execute for highlighting
  // e.stopPropagation(); // ← REMOVED: This was preventing highlight mode

  // Only call service click handler if NOT in highlight mode
  // This prevents dialog from opening when user wants to highlight the node
  if (!highlightMode) {
    onServiceClick?.(service);
  }
  // In highlight mode, let the event bubble to ReactFlow's onNodeClick handler
  // which will trigger the highlight logic
};
```

**Benefits**:
- ✅ In highlight mode: Click event bubbles to ReactFlow's `onNodeClick` → highlight logic executes
- ✅ In normal mode: Service dialog opens as expected
- ✅ No more dialog interference when trying to highlight

---

### Fix 3: Add highlightMode to transformServicesToNodes Options

**File**: [flowHelpers.js:1300-1307](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\utils\cmdb-utils\flowHelpers.js#L1300-L1307)

```javascript
// ✅ AFTER: Add highlightMode to options
export const transformServicesToNodes = (services, items, options = {}) => {
  const {
    onServiceClick = null,
    onServiceItemsClick = null,
    defaultWidth = 120,
    defaultHeight = 80,
    isSharedView = false,
    highlightMode = false // ✅ ADD: Highlight mode flag
  } = options;
```

---

### Fix 4: Pass highlightMode to ServiceAsNode Node Data

**File**: [flowHelpers.js:1366-1382](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\utils\cmdb-utils\flowHelpers.js#L1366-L1382)

```javascript
data: {
  service: {
    ...service,
    service_items_count: service.service_items_count || 0,
    service_items: service.service_items || []
  },
  cmdbItemName: parentItem?.name || null,
  cmdbItemId: service.cmdb_item_id,
  workspaceId: parentItem?.workspace_id || service.workspace_id,
  width: serviceNodeWidth,
  height: serviceNodeHeight,
  onServiceClick: onServiceClick,
  onServiceItemsClick: onServiceItemsClick,
  isInsideItem: true,
  isSharedView: isSharedView,
  highlightMode: highlightMode // ✅ ADD: Pass highlight mode flag
},
```

---

### Fix 5: Add highlightMode to useFlowData Hook

**File**: [useFlowData.js:15](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\hooks\cmdb-hooks\useFlowData.js#L15)

```javascript
// ✅ AFTER: Add highlightMode parameter
export const useFlowData = (items, connections, groups, groupConnections, edgeHandles, hiddenNodes, servicesMap = {}, showConnectionLabels = true, onServiceClick = null, onServiceItemsClick = null, services = [], serviceItems = {}, highlightMode = false) => {
```

---

### Fix 6: Pass highlightMode to ServiceAsNode Nodes (Location 1)

**File**: [useFlowData.js:208-221](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\hooks\cmdb-hooks\useFlowData.js#L208-L221)

```javascript
data: {
  service: {
    ...service,
    service_items_count: service.service_items_count || 0
  },
  cmdbItemName: item.name,
  cmdbItemId: item.id,
  workspaceId: items.find(i => i.id === item.id)?.workspace_id,
  width: serviceNodeWidth,
  height: serviceNodeHeight,
  onServiceClick: onServiceClick,
  onServiceItemsClick: onServiceItemsClick,
  isInsideItem: true,
  highlightMode: highlightMode // ✅ ADD: Pass highlight mode flag
},
```

---

### Fix 7: Pass highlightMode to ServiceAsNode Nodes (Location 2)

**File**: [useFlowData.js:356-369](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\hooks\cmdb-hooks\useFlowData.js#L356-L369)

```javascript
data: {
  service: {
    ...service,
    service_items_count: service.service_items_count || 0
  },
  cmdbItemName: item.name,
  cmdbItemId: item.id,
  workspaceId: item.workspaceId,
  width: serviceNodeWidth,
  height: serviceNodeHeight,
  onServiceClick: onServiceClick,
  onServiceItemsClick: onServiceItemsClick,
  isInsideItem: true,
  highlightMode: highlightMode // ✅ ADD: Pass highlight mode flag
},
```

---

### Fix 8: Pass highlightMode to useFlowData Hook

**File**: [CMDBVisualization.jsx:643-656](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBVisualization.jsx#L643-L656)

```javascript
// ✅ AFTER: Pass highlightMode as parameter
const { transformToFlowData } = useFlowData(
  items,
  connections,
  groups,
  groupConnections,
  edgeHandles,
  hiddenNodes,
  servicesMap,
  showConnectionLabels,
  handleServiceClick,
  handleServiceItemsClick,
  services,
  serviceItems,
  highlightMode // ✅ ADD: Pass highlight mode state
);
```

---

### Fix 9: Update useEffect Dependency Array

**File**: [CMDBVisualization.jsx:1241](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBVisualization.jsx#L1241)

```javascript
// ✅ AFTER: Add highlightMode to dependency array
}, [items, connections, groups, groupConnections, transformToFlowData, setNodes, setEdges, showConnectionLabels, edgeHandles, serviceToServiceConnections, crossServiceConnections, services, serviceItems, highlightMode]);
```

---

### Fix 10: Update CMDBSharedView to Pass highlightMode

**File**: [CMDBSharedView.jsx:129-136](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBSharedView.jsx#L129-L136)

```javascript
// ✅ AFTER: Pass highlightMode: false for shared view
const serviceNodes = transformServicesToNodes(
  data.services || [],
  data.items,
  {
    isSharedView: true,
    highlightMode: false, // ✅ ADD: Shared view doesn't have highlight mode
    onServiceClick: handleServiceClick
  }
);
```

---

## 🧪 Testing

### Test Case 1: Click ServiceAsNode in Highlight Mode

**Steps**:
1. Open CMDB Visualization
2. Enable highlight mode (click highlight button in VisualizationNavbar)
3. Click on a ServiceAsNode

**Expected**:
- ✅ ServiceAsNode highlights
- ✅ Related service-to-service connections highlight
- ✅ Service dialog does NOT open
- ✅ Other nodes dim (opacity 0.08)

---

### Test Case 2: Click ServiceAsNode in Normal Mode

**Steps**:
1. Open CMDB Visualization
2. Make sure highlight mode is OFF
3. Click on a ServiceAsNode

**Expected**:
- ✅ Service dialog opens
- ✅ Service details display correctly
- ✅ No highlighting occurs

---

### Test Case 3: Service-to-Service Connections Highlight

**Steps**:
1. Open CMDB Visualization with services that have connections
2. Enable highlight mode
3. Click on ServiceAsNode that has service-to-service connections

**Expected**:
- ✅ ServiceAsNode highlights (opacity 1, z-index 100)
- ✅ Connected ServiceAsNode nodes highlight (opacity 1, z-index 50)
- ✅ Service-to-service edges highlight (strokeWidth 3)
- ✅ Unrelated nodes/edges dim (opacity 0.08)

---

## 📊 Comparison: Before vs After

| Aspect | Before Fix | After Fix |
|--------|-----------|-----------|
| **ServiceAsNode Click (Highlight Mode)** | ❌ Dialog opens, no highlight | ✅ Highlights, no dialog |
| **ServiceAsNode Click (Normal Mode)** | ✅ Dialog opens | ✅ Dialog opens |
| **Event Propagation** | ❌ Stopped by stopPropagation | ✅ Bubbles to ReactFlow |
| **highlightMode Prop** | ❌ Not passed | ✅ Passed through entire chain |
| **Service-to-Service Highlight** | ❌ Not working | ✅ Works correctly |

---

## 🔗 Related Files Modified

### Frontend Files:

1. **[ServiceAsNode.jsx](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\components\cmdb-components\ServiceAsNode.jsx)**
   - Line 62: Receive `highlightMode` prop
   - Lines 199-210: Check `highlightMode` before opening dialog

2. **[flowHelpers.js](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\utils\cmdb-utils\flowHelpers.js)**
   - Lines 1300-1307: Add `highlightMode` to options
   - Lines 1366-1382: Pass `highlightMode` to node data

3. **[useFlowData.js](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\hooks\cmdb-hooks\useFlowData.js)**
   - Line 15: Add `highlightMode` parameter
   - Lines 208-221: Pass `highlightMode` to node data (location 1)
   - Lines 356-369: Pass `highlightMode` to node data (location 2)

4. **[CMDBVisualization.jsx](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBVisualization.jsx)**
   - Lines 643-656: Pass `highlightMode` to useFlowData
   - Line 1241: Add `highlightMode` to dependency array

5. **[CMDBSharedView.jsx](d:\RAFLY\TPS\tpsgit\cmdbmsys\msystem\src\pages\cmdb-pages\CMDBSharedView.jsx)**
   - Lines 129-136: Pass `highlightMode: false` for consistency

---

## ✨ Summary

**Root Cause**: `e.stopPropagation()` in ServiceAsNode prevented ReactFlow's `onNodeClick` from executing, and `highlightMode` prop wasn't passed through the component chain.

**Solution**: 
1. Removed `e.stopPropagation()` to allow event bubbling
2. Added `highlightMode` check to conditionally prevent dialog opening
3. Passed `highlightMode` prop through entire chain: CMDBVisualization → useFlowData → ServiceAsNode data

**Result**: ServiceAsNode nodes now properly highlight when clicked in highlight mode, and service-to-service connections are highlighted correctly!

---

**Fixed by**: Claude AI (Systematic Debugging)
**Date**: 2026-05-05
**Issue**: ServiceAsNode highlight feature not working
**Solution**: Conditional dialog opening + prop passing chain
