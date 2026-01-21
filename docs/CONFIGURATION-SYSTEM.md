# Configuration Management

## Overview

Formidable uses a **configuration management system** to persist user preferences, application state, and environment settings. Configuration is managed by `controls/configManager.js` and uses a schema-based approach for validation.

## Configuration Structure

### Configuration Files

```text
config/
├── boot.json       # Boot configuration (app-level settings)
└── user.json       # User configuration (user preferences)
```

### Boot Configuration

**Purpose**: Application-level settings that affect startup behavior.

**Location**: `config/boot.json`

**Structure**:
```json
{
  "theme": "system",
  "language": "en",
  "windowBounds": {
    "width": 1200,
    "height": 800,
    "x": 100,
    "y": 100
  },
  "dataPath": "./user-data"
}
```

### User Configuration

**Purpose**: User-specific preferences and application state.

**Location**: `config/user.json`

**Structure**:
```json
{
  "currentProfile": "default",
  "recentFiles": [],
  "preferences": {
    "autosave": true,
    "theme": "dark",
    "language": "en"
  }
}
```

## ConfigManager API

### Main Process (controls/configManager.js)

#### Load Configuration

```javascript
const config = configManager.loadConfig();
```

Returns merged configuration object.

#### Update Configuration

```javascript
configManager.updateConfig({
  theme: "dark",
  language: "nl"
});
```

Updates and persists configuration.

#### Get Virtual Structure

```javascript
const structure = configManager.getVirtualStructure();
```

Returns virtual file system structure for storage and templates.

#### Get Context Path

```javascript
const path = configManager.getContextPath(type);
// type: "storage" | "templates" | "plugins"
```

Returns absolute path for specified context.

#### Invalidate Cache

```javascript
configManager.invalidateCache();
```

Clears cached configuration, forces reload on next access.

## Configuration Access

### Via EventBus

```javascript
// Load configuration
const config = await EventBus.emitWithResponse("config:get");

// Update configuration
await EventBus.emit("config:update", {
  theme: "dark"
});

// Invalidate cache
await EventBus.emit("config:invalidate");

// Get virtual structure
const structure = await EventBus.emitWithResponse("form:context:get-virtual-structure");
```

### Via IPC

```javascript
// Load configuration
const config = await window.api.config.loadUserConfig();

// Update configuration
await window.api.config.updateUserConfig({
  theme: "dark",
  language: "nl"
});

// Invalidate cache
await window.api.config.invalidateConfigCache();

// Get virtual structure
const structure = await window.api.config.getVirtualStructure();

// Get storage folder
const storageFolder = await window.api.config.getStorageFolder();

// Get templates folder
const templatesFolder = await window.api.config.getTemplatesFolder();
```

## Configuration Schema

### Boot Schema

**Location**: `schemas/boot.schema.js`

**Validation**:
```javascript
const bootSchema = require("./schemas/boot.schema.js");

const config = bootSchema.sanitize(rawConfig);
```

**Defaults**:
```javascript
{
  theme: "system",        // "light" | "dark" | "system"
  language: "en",
  windowBounds: {
    width: 1200,
    height: 800,
    x: null,
    y: null
  },
  dataPath: "./user-data"
}
```

### Config Schema

**Location**: `schemas/config.schema.js`

**Validation**:
```javascript
const configSchema = require("./schemas/config.schema.js");

const userConfig = configSchema.sanitize(rawConfig);
```

## Theme Management

### Theme System

Formidable supports three theme modes:

1. **Light**: Light theme
2. **Dark**: Dark theme
3. **System**: Follows OS preference

### Theme Application

Theme is applied early in `preload.js`:

```javascript
(function applyEarlyTheme() {
  const stored = localStorage.getItem("theme");
  const resolved = stored === "dark" ? "dark" : "light";
  
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.add(`theme-${resolved}`);
})();
```

### Toggle Theme

```javascript
// Via EventBus
await EventBus.emit("theme:toggle");

// Via UI
// Theme toggle button automatically emits theme:toggle event
```

### Theme Persistence

Theme preference is stored in:
1. `localStorage` (for early application)
2. `config/user.json` (for persistence)

## Window Bounds Management

### Bounds Persistence

Window size and position are automatically saved on close:

```javascript
// In main.js
mainWindow.on("close", () => {
  const bounds = mainWindow.getBounds();
  configManager.updateConfig({
    windowBounds: bounds
  });
});
```

### Bounds Restoration

Window bounds are restored on startup:

```javascript
// In main.js
const config = configManager.loadConfig();
const mainWindow = new BrowserWindow({
  width: config.windowBounds?.width || 1200,
  height: config.windowBounds?.height || 800,
  x: config.windowBounds?.x,
  y: config.windowBounds?.y
});
```

### Window Module

**Location**: `controls/windowBounds.js`

Provides utility functions for window management:

```javascript
const windowBounds = require("./controls/windowBounds");

// Get current bounds
const bounds = windowBounds.getCurrentBounds(window);

// Apply bounds
windowBounds.applyBounds(window, savedBounds);

// Center window
windowBounds.centerWindow(window);
```

## User Profiles

### Profile System

Formidable supports multiple user profiles for different configurations.

### Profile Management

```javascript
// List profiles
const profiles = await window.api.config.listUserProfiles();

// Switch profile
await window.api.config.switchUserProfile("profile-name");

// Get current profile
const currentProfile = await window.api.config.currentProfileFilename();

// Export profile
await window.api.config.exportUserProfile("profile-name", "/path/to/export");

// Import profile
await window.api.config.importUserProfile("/path/to/profile.json");
```

### Profile Structure

Each profile has its own:
- Configuration settings
- Storage folder
- Templates folder
- Recent files list

## Virtual File System

### Structure

Formidable uses a virtual file system to organize storage:

```javascript
{
  storage: {
    templates: {
      "template-name": {
        files: ["file1.yaml", "file2.yaml"],
        meta: ["file1.meta.json", "file2.meta.json"]
      }
    }
  },
  templates: ["template1.yaml", "template2.yaml"]
}
```

### Getting Virtual Structure

```javascript
const structure = await window.api.config.getVirtualStructure();

// Access template files
const templateFiles = structure.storage.templates["my-template"].files;

// Access meta files
const metaFiles = structure.storage.templates["my-template"].meta;
```

### Template Storage

Templates have dedicated storage folders:

```javascript
// Get template storage folder
const folder = await window.api.config.getTemplateStorageFolder("my-template");

// Get template meta files
const metaFiles = await window.api.config.getTemplateMetaFiles("my-template");

// Get template image files
const imageFiles = await window.api.config.getTemplateImageFiles("my-template");
```

## Data Path

### Portable Data Path

Formidable supports portable data paths for USB stick installations:

```json
{
  "dataPath": "./user-data"
}
```

**Relative paths** are resolved relative to the application directory.

**Absolute paths** are used as-is:

```json
{
  "dataPath": "C:/Users/John/FormidableData"
}
```

### Getting Data Path

```javascript
const dataPath = configManager.getDataPath();
```

## Configuration Caching

### Cache Behavior

Configuration is cached in memory for performance:

```javascript
let configCache = null;

function loadConfig() {
  if (!configCache) {
    configCache = loadFromDisk();
  }
  return configCache;
}
```

### Cache Invalidation

Invalidate cache when configuration changes externally:

```javascript
// Invalidate cache
await EventBus.emit("config:invalidate");

// Next load will read from disk
const config = await EventBus.emitWithResponse("config:get");
```

### Auto-Invalidation

Cache is automatically invalidated on:
- Configuration updates via `updateConfig()`
- Profile switches
- Manual invalidation requests

## Configuration Events

### Events Emitted

```javascript
// Configuration loaded
EventBus.emit("config:loaded", config);

// Configuration updated
EventBus.emit("config:updated", { 
  changes: { theme: "dark" }
});

// Theme changed
EventBus.emit("theme:changed", { theme: "dark" });

// Profile switched
EventBus.emit("profile:switched", { profile: "work" });
```

### Events Handled

```javascript
// Update configuration
EventBus.on("config:update", async (updates) => {
  configManager.updateConfig(updates);
});

// Invalidate cache
EventBus.on("config:invalidate", () => {
  configManager.invalidateCache();
});

// Toggle theme
EventBus.on("theme:toggle", () => {
  const current = getTheme();
  const next = current === "light" ? "dark" : "light";
  updateTheme(next);
});
```

## Best Practices

### 1. Always Invalidate After External Changes

```javascript
// After manual file edit
await window.api.config.invalidateConfigCache();
const config = await window.api.config.loadUserConfig();
```

### 2. Use EventBus for Config Updates

```javascript
// ✅ Good - uses event system
await EventBus.emit("config:update", { theme: "dark" });

// ❌ Bad - bypasses event system
configManager.updateConfig({ theme: "dark" });
```

### 3. Validate Configuration

```javascript
const configSchema = require("./schemas/config.schema.js");
const config = configSchema.sanitize(rawConfig);
```

### 4. Handle Missing Paths

```javascript
const path = configManager.getContextPath("storage");
if (!path) {
  console.error("Storage path not configured");
  return;
}
```

### 5. Use Virtual Structure

```javascript
// ✅ Good - uses virtual structure
const structure = await window.api.config.getVirtualStructure();
const files = structure.storage.templates["my-template"].files;

// ❌ Bad - hardcoded paths
const files = fs.readdirSync("./storage/my-template");
```

## Common Operations

### Change Theme

```javascript
await EventBus.emit("theme:toggle");

// Or set specific theme
await EventBus.emit("config:update", { theme: "dark" });
```

### Change Language

```javascript
await EventBus.emit("config:update", { language: "nl" });
```

### Enable Autosave

```javascript
await EventBus.emit("config:update", { 
  preferences: { autosave: true }
});
```

### Switch Profile

```javascript
await window.api.config.switchUserProfile("work");
```

### Get Storage Folder

```javascript
const storageFolder = await window.api.config.getStorageFolder();
```

### Get Templates Folder

```javascript
const templatesFolder = await window.api.config.getTemplatesFolder();
```

## Troubleshooting

### Configuration Not Persisting

**Check**:
1. File system permissions
2. Data path is writable
3. Configuration schema validation passes

**Debug**:
```javascript
// Check if config saves
const result = configManager.updateConfig({ test: true });
console.log("Save result:", result);
```

### Theme Not Applied

**Check**:
1. Theme is set in configuration
2. `localStorage` has theme value
3. CSS theme files are loaded

**Debug**:
```javascript
console.log("localStorage theme:", localStorage.getItem("theme"));
console.log("Config theme:", config.theme);
console.log("Document theme:", document.documentElement.dataset.theme);
```

### Window Bounds Not Restored

**Check**:
1. Bounds saved in configuration
2. Bounds values are valid
3. Window creation uses saved bounds

**Debug**:
```javascript
const config = configManager.loadConfig();
console.log("Saved bounds:", config.windowBounds);
```

## See Also

- [EventBus System](./EVENTBUS-SYSTEM.md)
- [IPC Bridge](./IPC-BRIDGE.md)
- [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md)
- [Boot Schema](../schemas/boot.schema.js)
- [Config Schema](../schemas/config.schema.js)
