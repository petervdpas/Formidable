# IPC Bridge System

## Overview

Formidable uses Electron's **IPC (Inter-Process Communication)** to enable secure communication between the **main process** (Node.js backend) and **renderer process** (browser frontend). The `preload.js` script acts as a bridge, exposing a curated API via `contextBridge`.

## Architecture

```text
┌─────────────────────────────────────────────┐
│          Renderer Process (Browser)          │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Frontend Code (renderer.js, etc.)     │ │
│  │                                         │ │
│  │  window.api.plugin.listPlugins()       │ │
│  │  window.api.config.loadUserConfig()    │ │
│  │  window.api.git.status()               │ │
│  └──────────────▲──────────────────────────┘ │
│                 │                            │
│                 │ contextBridge              │
│                 │                            │
│  ┌──────────────▼──────────────────────────┐ │
│  │         preload.js (Bridge)             │ │
│  │                                         │ │
│  │  - Builds window.api groups            │ │
│  │  - Wraps ipcRenderer.invoke()          │ │
│  │  - Applies early theme                 │ │
│  └──────────────▲──────────────────────────┘ │
└─────────────────┼───────────────────────────┘
                  │
                  │ IPC Communication
                  │
┌─────────────────▼───────────────────────────┐
│           Main Process (Node.js)            │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │      ipcMain.handle(route, handler)   │ │
│  │                                        │ │
│  │  - File system operations             │ │
│  │  - Plugin management                  │ │
│  │  - Git operations                     │ │
│  │  - Configuration                      │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## preload.js Structure

### Core Responsibilities

1. **Theme Application**: Apply theme early to prevent flash
2. **API Group Building**: Create organized `window.api` namespaces
3. **Plugin IPC Binding**: Dynamically bind plugin IPC handlers
4. **Security**: Expose only safe APIs via contextBridge

### Key Components

```javascript
// preload.js

// 1. Early theme application (before page load)
(function applyEarlyTheme() {
  const stored = localStorage.getItem("theme");
  const resolved = stored === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
})();

// 2. Helper to build API groups
function buildGroup(methods) {
  const group = {};
  for (const method of methods) {
    const camel = camelCase(method);
    group[camel] = (...args) => ipcRenderer.invoke(method, ...args);
  }
  return group;
}

// 3. API namespace definitions
const api = {
  encrypt: buildGroup(["encrypt", "decrypt", "encryption-available"]),
  plugin: buildGroup(["list-plugins", "run-plugin", "reload-plugins"]),
  git: buildGroup(["git-status", "git-commit", "git-push"]),
  config: buildGroup(["load-user-config", "update-user-config"]),
  // ... more groups
};

// 4. Expose via contextBridge
contextBridge.exposeInMainWorld("api", api);
```

## API Namespaces

Formidable organizes IPC methods into logical namespaces:

### 1. `window.api.encrypt`

**Purpose**: Encryption/decryption operations

```javascript
await window.api.encrypt.encrypt(plaintext);
await window.api.encrypt.decrypt(ciphertext);
await window.api.encrypt.encryptionAvailable();
```

**Routes**:
- `encrypt`
- `decrypt`
- `encryption-available`

### 2. `window.api.plugin`

**Purpose**: Plugin management

```javascript
await window.api.plugin.listPlugins();
await window.api.plugin.runPlugin(name, context);
await window.api.plugin.reloadPlugins();
await window.api.plugin.getPluginCode(name);
await window.api.plugin.deletePlugin(name);
```

**Routes**:
- `list-plugins`
- `run-plugin`
- `reload-plugins`
- `get-plugin-code`
- `delete-plugin`
- `create-plugin`
- `update-plugin`
- `get-plugin-settings`
- `save-plugin-settings`
- `get-plugin-ipc-map`
- `get-plugins-path`

**Dynamic Plugin IPC**:
Plugins with declarative IPC get auto-bound:

```javascript
// Plugin defines: "ipc": { "echo": "echoHandler" }
// Preload creates:
await window.api.plugin.PluginName.echo(payload);
```

### 3. `window.api.git`

**Purpose**: Git operations

```javascript
await window.api.git.status();
await window.api.git.commit(message);
await window.api.git.push();
await window.api.git.pull();
await window.api.git.branches();
await window.api.git.checkout(branch);
```

**Routes**: 40+ git operations including:
- `git-status`, `git-status-fresh`
- `git-commit`, `git-push`, `git-pull`
- `git-add-all`, `git-add-paths`
- `git-branches`, `git-checkout`
- `git-merge`, `git-rebase-start`
- `git-conflicts`, `git-mark-resolved`
- `git-diff-file`, `git-log`

### 4. `window.api.config`

**Purpose**: Configuration management

```javascript
await window.api.config.loadUserConfig();
await window.api.config.updateUserConfig(updates);
await window.api.config.invalidateConfigCache();
await window.api.config.getVirtualStructure();
await window.api.config.getStorageFolder();
```

**Routes**:
- `load-user-config`
- `update-user-config`
- `invalidate-config-cache`
- `switch-user-profile`
- `list-user-profiles`
- `get-virtual-structure`
- `get-context-path`
- `get-templates-folder`
- `get-storage-folder`
- `export-user-profile`
- `import-user-profile`

### 5. `window.api.templates`

**Purpose**: Template management

```javascript
await window.api.templates.listTemplates();
await window.api.templates.loadTemplate(name);
await window.api.templates.saveTemplate(name, data);
await window.api.templates.deleteTemplate(name);
await window.api.templates.validateTemplate(data);
```

**Routes**:
- `list-templates`
- `load-template`
- `save-template`
- `delete-template`
- `validate-template`

### 6. `window.api.help`

**Purpose**: Help system

```javascript
await window.api.help.listHelpTopics();
await window.api.help.getHelpTopic(topic);
```

**Routes**:
- `list-help-topics`
- `get-help-topic`

### 7. `window.api.internalServer`

**Purpose**: Internal HTTP server control

```javascript
await window.api.internalServer.startInternalServer();
await window.api.internalServer.stopInternalServer();
await window.api.internalServer.getInternalServerStatus();
```

**Routes**:
- `start-internal-server`
- `stop-internal-server`
- `get-internal-server-status`

## Method Naming Convention

### Route Format

IPC routes use **kebab-case**:
```
kebab-case-route-name
```

Examples:
- `list-plugins`
- `load-user-config`
- `git-status-fresh`

### API Method Format

JavaScript methods use **camelCase** (auto-converted by `buildGroup`):
```
camelCaseMethodName
```

Examples:
- `listPlugins` (from `list-plugins`)
- `loadUserConfig` (from `load-user-config`)
- `gitStatusFresh` (from `git-status-fresh`)

### Conversion Logic

```javascript
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Usage:
camelCase("list-plugins")     // → "listPlugins"
camelCase("git-status-fresh") // → "gitStatusFresh"
```

## IPC Registration (Main Process)

### Pattern 1: Direct Registration

```javascript
// main.js or controls module
const { ipcMain } = require("electron");

ipcMain.handle("list-plugins", async () => {
  return pluginManager.listPlugins();
});

ipcMain.handle("load-user-config", async () => {
  return configManager.loadConfig();
});
```

### Pattern 2: Using registerIpc Helper

```javascript
// controls/ipcRoutes.js
const { ipcMain } = require("electron");

function registerIpc(name, handler) {
  ipcMain.handle(name, async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(`[IPC] ${name} failed:`, err);
      return null;
    }
  });
}

// Usage:
registerIpc("list-plugins", async () => {
  return pluginManager.listPlugins();
});
```

### Pattern 3: Declarative Plugin IPC

Plugins declare handlers in `plugin.json`, auto-registered by `pluginManager`:

```json
{
  "ipc": {
    "echo": "echoHandler"
  }
}
```

```javascript
// In plugin.js
function echoHandler(event, payload) {
  return { echo: payload };
}

module.exports = { echoHandler };
```

## Usage Patterns

### Pattern 1: Simple Invocation

```javascript
// Renderer
const plugins = await window.api.plugin.listPlugins();
console.log(plugins);
```

### Pattern 2: With Arguments

```javascript
// Renderer
const result = await window.api.plugin.runPlugin("MyPlugin", {
  formData: { field1: "value" },
  template: "myTemplate"
});
```

### Pattern 3: Error Handling

```javascript
// Renderer
try {
  const data = await window.api.config.loadUserConfig();
  console.log("Config loaded:", data);
} catch (error) {
  console.error("Failed to load config:", error);
}
```

### Pattern 4: Chained Operations

```javascript
// Renderer
async function saveAndReload() {
  // Save config
  await window.api.config.updateUserConfig({ theme: "dark" });
  
  // Invalidate cache
  await window.api.config.invalidateConfigCache();
  
  // Reload
  const config = await window.api.config.loadUserConfig();
  
  return config;
}
```

### Pattern 5: Plugin-Specific IPC

```javascript
// After plugins are loaded and bound
const result = await window.api.plugin.BackTest.echo({ message: "Hello" });
console.log(result); // { echo: { message: "Hello" } }
```

## Dynamic Plugin IPC Binding

### Process

1. **Plugins declare handlers** in `plugin.json`
2. **PluginManager registers** handlers on load
3. **Preload fetches map** via `get-plugin-ipc-map`
4. **Preload binds methods** to `window.api.plugin[pluginName]`

### Implementation

```javascript
// preload.js
async function bindPluginIpcMethods() {
  const pluginIpcMap = await ipcRenderer.invoke("get-plugin-ipc-map");
  // Returns: { BackTest: ["echo"], WikiWonder: ["search"] }
  
  for (const [pluginName, methods] of Object.entries(pluginIpcMap)) {
    api.plugin[pluginName] = {};
    
    for (const method of methods) {
      const route = `plugin:${pluginName}:${method}`;
      api.plugin[pluginName][method] = (...args) =>
        ipcRenderer.invoke(route, ...args);
    }
  }
  
  console.log("[Plugin] IPC methods bound:", Object.keys(pluginIpcMap));
}

// Call after DOMContentLoaded
bindPluginIpcMethods();
```

### Result

```javascript
// Accessible in renderer:
window.api.plugin.BackTest.echo(payload);
window.api.plugin.WikiWonder.search(query);
```

## Security Considerations

### contextBridge Isolation

**Why**: Prevents renderer from accessing Node.js APIs directly

**How**: Only exposes curated `window.api` methods

```javascript
// ✅ Safe - exposed via contextBridge
await window.api.plugin.listPlugins();

// ❌ Blocked - no direct access
const fs = require("fs"); // Error: require is not defined
```

### Limited API Surface

Only specific IPC routes are exposed:

```javascript
// ✅ Exposed routes work
await window.api.git.status();

// ❌ Arbitrary routes don't work
await ipcRenderer.invoke("rm-rf-root"); // ipcRenderer not available
```

### Argument Sanitization

Main process should validate inputs:

```javascript
ipcMain.handle("delete-plugin", async (event, name) => {
  // Validate input
  if (!name || typeof name !== "string") {
    throw new Error("Invalid plugin name");
  }
  
  // Sanitize
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  
  // Execute
  return pluginManager.deletePlugin(safeName);
});
```

## IPC Response Patterns

### Pattern 1: Success/Error Object

```javascript
// Main process
ipcMain.handle("save-data", async (event, data) => {
  try {
    await saveToFile(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Renderer
const result = await window.api.data.saveData(myData);
if (result.success) {
  console.log("Saved!");
} else {
  console.error("Error:", result.error);
}
```

### Pattern 2: Direct Return

```javascript
// Main process
ipcMain.handle("list-files", async () => {
  return fs.readdirSync(directory);
});

// Renderer
const files = await window.api.files.listFiles();
```

### Pattern 3: Throw on Error

```javascript
// Main process
ipcMain.handle("critical-operation", async () => {
  if (preconditionFailed) {
    throw new Error("Precondition not met");
  }
  return await performOperation();
});

// Renderer
try {
  const result = await window.api.operations.criticalOperation();
} catch (error) {
  console.error("Operation failed:", error);
}
```

## Debugging IPC

### Enable IPC Logging

```javascript
// In main process
const { ipcMain } = require("electron");

ipcMain.on("*", (event, ...args) => {
  console.log("[IPC]", event.channel, args);
});
```

### Trace Calls

```javascript
// preload.js - wrap buildGroup
function buildGroup(methods) {
  const group = {};
  for (const method of methods) {
    const camel = camelCase(method);
    group[camel] = (...args) => {
      console.log(`[IPC] Calling ${method}`, args);
      return ipcRenderer.invoke(method, ...args);
    };
  }
  return group;
}
```

### Check Handler Registration

```javascript
// Main process - list all registered handlers
console.log("Registered IPC handlers:", ipcMain.eventNames());
```

## Performance Tips

### 1. Batch Operations

Instead of multiple IPC calls:
```javascript
// ❌ Multiple calls
for (const file of files) {
  await window.api.files.loadFile(file);
}

// ✅ Batch call
await window.api.files.loadFiles(files);
```

### 2. Cache Results

```javascript
// Cache config to avoid repeated IPC calls
let configCache = null;

async function getConfig() {
  if (!configCache) {
    configCache = await window.api.config.loadUserConfig();
  }
  return configCache;
}
```

### 3. Use Event Emitters for Updates

For real-time updates, use `ipcRenderer.on()`:

```javascript
// Main process
mainWindow.webContents.send("config-updated", newConfig);

// Preload
ipcRenderer.on("config-updated", (event, config) => {
  // Handle update
});
```

## Adding New IPC Routes

### Step-by-Step

1. **Add handler in main process**:
```javascript
// In main.js or control module
ipcMain.handle("my-new-route", async (event, payload) => {
  return await doSomething(payload);
});
```

2. **Add to preload.js API group**:
```javascript
// preload.js
const api = {
  myNamespace: buildGroup([
    "my-new-route",
    // other routes
  ]),
};
```

3. **Use in renderer**:
```javascript
const result = await window.api.myNamespace.myNewRoute(payload);
```

## Best Practices

1. **Group related methods** into namespaces
2. **Use consistent naming** (kebab-case routes, camelCase methods)
3. **Validate inputs** in main process
4. **Handle errors gracefully** with try/catch
5. **Document payload shapes** with JSDoc
6. **Cache when possible** to reduce IPC overhead
7. **Batch operations** to minimize round-trips
8. **Use contextBridge** for security
9. **Log errors** for debugging
10. **Keep preload minimal** - logic belongs in main/renderer

## See Also

- [EventBus System](./EVENTBUS-SYSTEM.md)
- [Plugin System](./PLUGIN-SYSTEM.md)
- [Handler Pattern](./HANDLER-PATTERN.md)
- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/api/ipc-main)
- [contextBridge Documentation](https://www.electronjs.org/docs/latest/api/context-bridge)
