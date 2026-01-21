# Global API System

## Overview

Formidable exposes **global APIs** in both the main process and renderer process, providing convenient access to core functionality. These APIs are organized into namespaces and accessible via global objects.

## Global API Objects

### Renderer Process

#### 1. `window.api` (IPC Bridge)

**Purpose**: Secure IPC communication to main process

**Exposed via**: `preload.js` using `contextBridge`

**Namespaces**:
- `window.api.plugin` - Plugin operations
- `window.api.git` - Git operations
- `window.api.config` - Configuration management
- `window.api.templates` - Template operations
- `window.api.help` - Help system
- `window.api.encrypt` - Encryption
- `window.api.internalServer` - Internal server control

**Usage**:
```javascript
const plugins = await window.api.plugin.listPlugins();
const config = await window.api.config.loadUserConfig();
const status = await window.api.git.status();
```

**Documentation**: See [IPC Bridge](./IPC-BRIDGE.md)

---

#### 2. `window.FGA` (Formidable Global API)

**Purpose**: High-level form and field operations

**Location**: `modules/globalAPI.js`

**Namespaces**:

##### `FGA.form`

Form data operations:

```javascript
// Get all form data
const data = FGA.form.getFormData("#form-container");

// Set form data
FGA.form.setFormData("#form-container", {
  field1: "value1",
  field2: "value2"
});

// Resolve field by GUID
const field = FGA.form.resolveFieldByGuid("123e4567-e89b-12d3-a456-426614174000");

// Resolve field element
const field = FGA.form.resolveFieldElement("my_field_key");
```

##### `FGA.context`

Form context operations:

```javascript
// Get current context
const context = await FGA.context.get();

// Update context
await FGA.context.update({ template: "new-template" });

// Clear context
await FGA.context.clear();
```

##### `FGA.util`

Utility functions:

```javascript
// Generate GUID
const guid = FGA.util.generateGuid();

// Sanitize filename
const safe = FGA.util.sanitizeFilename("My File!.txt");
// → "My_File.txt"

// Deep clone object
const clone = FGA.util.deepClone(originalObject);
```

**Implementation**:
```javascript
// modules/globalAPI.js
import * as formUtils from "../utils/formUtils.js";
import EventBus from "./eventBus.js";

window.FGA = {
  form: {
    getFormData: formUtils.getFormData,
    setFormData: formUtils.setFormData,
    resolveFieldByGuid: formUtils.resolveFieldByGuid,
    resolveFieldElement: formUtils.resolveFieldElement
  },
  
  context: {
    async get() {
      return await EventBus.emitWithResponse("form:context:get");
    },
    async update(data) {
      await EventBus.emit("form:context:update", data);
    },
    async clear() {
      await EventBus.emit("form:context:clear");
    }
  },
  
  util: {
    generateGuid: () => crypto.randomUUID(),
    sanitizeFilename: (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_"),
    deepClone: (obj) => JSON.parse(JSON.stringify(obj))
  }
};
```

---

#### 3. `window.CFA` (CodeField API)

**Purpose**: Field manipulation from code fields

**Location**: `modules/codeFieldAPI.js`

**Namespace**: `CFA.field`

**Methods**:

##### Get Field Value

```javascript
// By GUID
const value = await CFA.field.getValue({ guid: "123e4567-..." });

// By key
const value = await CFA.field.getValue({ key: "my_field" });
```

##### Set Field Value

```javascript
// By GUID
await CFA.field.setValue({ 
  guid: "123e4567-...", 
  value: "new value" 
});

// By key
await CFA.field.setValue({ 
  key: "my_field", 
  value: "new value" 
});
```

##### Get All Field GUIDs

```javascript
const guids = await CFA.field.getAllGuids();
// Returns: { field_key1: "guid1", field_key2: "guid2", ... }
```

##### Get Field by GUID

```javascript
const field = await CFA.field.getByGuid("123e4567-...");
// Returns: { element, guid, key, value }
```

##### Set Field Attributes

```javascript
await CFA.field.setAttributes({
  guid: "123e4567-...",
  attributes: {
    disabled: true,
    readonly: true,
    class: "highlighted"
  }
});
```

##### Update Field Options

```javascript
await CFA.field.updateOptions({
  key: "status_field",
  options: ["New", "Active", "Completed"]
});
```

##### Add Loop Item

```javascript
await CFA.field.addLoopItem({
  loopKey: "tasks",
  data: { task_name: "New Task", task_status: "Todo" }
});
```

##### Remove Loop Item

```javascript
await CFA.field.removeLoopItem({
  loopKey: "tasks",
  index: 2
});
```

**Event-Driven Architecture**:

All `CFA.field` methods use EventBus internally:

```javascript
// CFA.field.getValue implementation
async getValue({ guid, key }) {
  return await EventBus.emitWithResponse("field:get-value", { guid, key });
}
```

**Documentation**: See [Field GUID System](./FIELD-GUID-SYSTEM.md)

---

#### 4. `window.EventBus`

**Purpose**: Direct EventBus access

**Location**: `modules/eventBus.js`

**Methods**:
```javascript
// Register listener
EventBus.on("form:save", async (data) => {
  console.log("Form saved:", data);
});

// Emit event
await EventBus.emit("form:save", formData);

// Request response
const result = await EventBus.emitWithResponse("form:load", { filename });

// One-time listener
EventBus.once("app:ready", () => {
  console.log("App initialized");
});

// Unregister listener
EventBus.off("form:save", handler);
```

**Documentation**: See [EventBus System](./EVENTBUS-SYSTEM.md)

---

## Main Process Global APIs

### Node.js Modules

Main process has access to all Node.js modules:

```javascript
const fs = require("fs");
const path = require("path");
const { ipcMain } = require("electron");
```

### Control Modules

```javascript
const configManager = require("./controls/configManager");
const pluginManager = require("./controls/pluginManager");
const fileManager = require("./controls/fileManager");
const gitManager = require("./controls/gitManager");
```

## API Organization

### Separation of Concerns

| API | Purpose | Process | Access |
|-----|---------|---------|--------|
| `window.api` | IPC Bridge | Renderer | Via contextBridge |
| `window.FGA` | Form/Field Ops | Renderer | Direct |
| `window.CFA` | CodeField API | Renderer | Direct |
| `window.EventBus` | Event System | Renderer | Direct |
| Node modules | File/System Ops | Main | `require()` |

### Cross-Process Communication

```text
┌─────────────────────────────────────┐
│      Renderer Process                │
│                                      │
│  CFA.field.getValue()                │
│         │                            │
│         ▼                            │
│  EventBus.emitWithResponse()         │
│         │                            │
│         ▼                            │
│  fieldHandlers.handleGetFieldValue() │
│         │                            │
│         ▼                            │
│  formUtils.resolveFieldByGuid()      │
│                                      │
└─────────────────────────────────────┘

For operations requiring main process:

┌─────────────────────────────────────┐
│      Renderer Process                │
│                                      │
│  window.api.plugin.runPlugin()       │
│         │                            │
│         ▼                            │
│  ipcRenderer.invoke()                │
└──────────────┬──────────────────────┘
               │
               │ IPC
               │
┌──────────────▼──────────────────────┐
│       Main Process                   │
│                                      │
│  ipcMain.handle()                    │
│         │                            │
│         ▼                            │
│  pluginManager.runPlugin()           │
│                                      │
└─────────────────────────────────────┘
```

## API Usage Patterns

### Pattern 1: Form Operations

```javascript
// Get form data
const data = FGA.form.getFormData("#form-container");

// Validate
const validation = await EventBus.emitWithResponse("form:validate", data);

if (validation.valid) {
  // Save
  await EventBus.emit("form:save", {
    template: "my-template",
    filename: "form-001.yaml",
    data
  });
}
```

### Pattern 2: Field Manipulation

```javascript
// From code field
async function updateRelatedFields() {
  // Get current field value
  const value1 = await CFA.field.getValue({ key: "field1" });
  
  // Calculate new value
  const value2 = Number(value1) * 2;
  
  // Update related field
  await CFA.field.setValue({ key: "field2", value: value2 });
}
```

### Pattern 3: Plugin Execution

```javascript
// Run plugin from UI
async function runMyPlugin() {
  // Get form context
  const context = await FGA.context.get();
  
  // Run plugin
  const result = await window.api.plugin.runPlugin("MyPlugin", context);
  
  if (result.success) {
    // Update UI
    EventBus.emit("ui:toast", {
      variant: "success",
      message: "Plugin completed!"
    });
  }
}
```

### Pattern 4: Configuration Management

```javascript
// Update theme
async function toggleTheme() {
  const config = await window.api.config.loadUserConfig();
  const newTheme = config.theme === "light" ? "dark" : "light";
  
  await window.api.config.updateUserConfig({ theme: newTheme });
  
  // Invalidate cache
  await window.api.config.invalidateConfigCache();
  
  // Apply theme
  document.documentElement.dataset.theme = newTheme;
}
```

## API Security

### Context Isolation

Renderer APIs are sandboxed via context isolation:

```javascript
// preload.js
contextBridge.exposeInMainWorld("api", {
  // Only these methods are exposed
  plugin: buildGroup(["list-plugins", "run-plugin"]),
  // ... other groups
});
```

### Input Validation

Main process validates all inputs:

```javascript
ipcMain.handle("delete-plugin", async (event, name) => {
  // Validate
  if (!name || typeof name !== "string") {
    throw new Error("Invalid plugin name");
  }
  
  // Sanitize
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  
  // Execute
  return pluginManager.deletePlugin(safeName);
});
```

### Limited API Surface

Code fields have restricted API access:

```javascript
// In code field execution
const safeAPI = {
  field: CFA.field,
  // No file system access
  // No electron APIs
  // No dangerous globals
};
```

## API Extension

### Adding New FGA Methods

```javascript
// modules/globalAPI.js

window.FGA = {
  // ... existing namespaces
  
  // New namespace
  custom: {
    async myOperation(param) {
      return await EventBus.emitWithResponse("custom:operation", { param });
    }
  }
};
```

### Adding New CFA Methods

```javascript
// modules/codeFieldAPI.js

window.CFA = {
  field: {
    // ... existing methods
    
    // New method
    async customFieldOp(payload) {
      return await EventBus.emitWithResponse("field:custom-op", payload);
    }
  }
};
```

### Adding New IPC Methods

1. Register handler in main process:
```javascript
ipcMain.handle("my-new-operation", async (event, payload) => {
  return await doOperation(payload);
});
```

2. Add to preload.js:
```javascript
const api = {
  myNamespace: buildGroup(["my-new-operation"])
};
```

3. Use in renderer:
```javascript
const result = await window.api.myNamespace.myNewOperation(payload);
```

## Best Practices

### 1. Use Appropriate API

```javascript
// ✅ Form operations - use FGA
const data = FGA.form.getFormData();

// ✅ Field operations - use CFA
await CFA.field.setValue({ key: "field1", value: "new" });

// ✅ File operations - use IPC
const files = await window.api.config.getStorageFolder();

// ✅ Event-driven - use EventBus
await EventBus.emit("form:save", data);
```

### 2. Handle Errors

```javascript
try {
  await CFA.field.setValue({ key: "field1", value: "new" });
} catch (error) {
  console.error("Failed to set field value:", error);
  EventBus.emit("ui:toast", {
    variant: "error",
    message: error.message
  });
}
```

### 3. Validate Inputs

```javascript
async function updateField(key, value) {
  if (!key) {
    throw new Error("Field key is required");
  }
  
  if (value === undefined) {
    throw new Error("Value is required");
  }
  
  await CFA.field.setValue({ key, value });
}
```

### 4. Use Async/Await

```javascript
// ✅ Good
const value = await CFA.field.getValue({ key: "field1" });

// ❌ Bad
CFA.field.getValue({ key: "field1" }).then(value => {
  // ...
});
```

### 5. Document API Usage

```javascript
/**
 * Update related fields based on calculation
 * @param {string} sourceKey - Source field key
 * @param {number} multiplier - Multiplication factor
 */
async function updateRelatedFields(sourceKey, multiplier) {
  const value = await CFA.field.getValue({ key: sourceKey });
  const result = Number(value) * multiplier;
  await CFA.field.setValue({ key: "result_field", value: result });
}
```

## API Reference Summary

### FGA (Formidable Global API)

```javascript
FGA.form.getFormData(selector)
FGA.form.setFormData(selector, data)
FGA.form.resolveFieldByGuid(guid)
FGA.form.resolveFieldElement(identifier)

FGA.context.get()
FGA.context.update(data)
FGA.context.clear()

FGA.util.generateGuid()
FGA.util.sanitizeFilename(name)
FGA.util.deepClone(obj)
```

### CFA (CodeField API)

```javascript
CFA.field.getValue({ guid, key })
CFA.field.setValue({ guid, key, value })
CFA.field.getAllGuids()
CFA.field.getByGuid(guid)
CFA.field.setAttributes({ guid, key, attributes })
CFA.field.updateOptions({ guid, key, options })
CFA.field.addLoopItem({ loopKey, data })
CFA.field.removeLoopItem({ loopKey, index })
```

### window.api (IPC Bridge)

```javascript
window.api.plugin.*
window.api.git.*
window.api.config.*
window.api.templates.*
window.api.help.*
window.api.encrypt.*
window.api.internalServer.*
```

### EventBus

```javascript
EventBus.on(event, callback)
EventBus.off(event, callback)
EventBus.emit(event, payload)
EventBus.emitWithResponse(event, payload)
EventBus.once(event, callback)
```

## See Also

- [EventBus System](./EVENTBUS-SYSTEM.md)
- [IPC Bridge](./IPC-BRIDGE.md)
- [Field GUID System](./FIELD-GUID-SYSTEM.md)
- [Handler Pattern](./HANDLER-PATTERN.md)
- [Code Field API](./modules/codeFieldAPI.js)
- [Global API](./modules/globalAPI.js)
