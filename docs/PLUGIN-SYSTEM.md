# Plugin System

## Overview

Formidable features an **extensible plugin system** that allows developers to extend functionality without modifying core code. Plugins can run on the backend (main process), frontend (renderer), or both.

## Plugin Architecture

### Location
Plugins reside in: `plugins/`

### Active Plugins
```
plugins/
├── BackTest/         # Backtesting functionality
├── PandocPrint/      # Document export via Pandoc
└── WikiWonder/       # Wiki integration
```

### Plugin Structure

Each plugin is a folder containing:

```text
plugins/MyPlugin/
├── plugin.json       # Metadata and configuration (required)
├── plugin.js         # Backend logic (optional for backend plugins)
└── [assets/]         # Additional resources
```

## Plugin Manifest (plugin.json)

### Required Structure

```json
{
  "name": "MyPlugin",
  "version": "1.0.0",
  "description": "Description of what the plugin does",
  "author": "Author Name",
  "tags": ["tag1", "tag2"],
  "enabled": true,
  "target": "backend",
  "ipc": {
    "doSomething": "handleDoSomething",
    "fetchData": "handleFetchData"
  }
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No* | folder name | Plugin name identifier |
| `version` | string | No | "1.0.0" | Semantic version |
| `description` | string | No | "" | Brief description |
| `author` | string | No | "Unknown" | Author name |
| `tags` | array | No | [] | Categorization tags |
| `enabled` | boolean | No | true | Whether plugin is active |
| `target` | string | No | "backend" | "backend", "frontend", or "both" |
| `ipc` | object | No | {} | Declarative IPC handler map |

*Name defaults to folder name if not specified.

### Target Types

#### Backend Plugins (`"target": "backend"`)
- Run in main process (Node.js environment)
- Have access to file system, native modules
- Must export a `run()` function
- Can register IPC handlers

#### Frontend Plugins (`"target": "frontend"`)
- Run in renderer process (browser environment)
- Access to DOM, window APIs
- No `run()` function required
- Cannot use Node.js modules directly

#### Hybrid Plugins (`"target": "both"`)
- Have both backend and frontend components
- Backend logic in plugin.js
- Frontend logic loaded separately

## Plugin Code (plugin.js)

### Backend Plugin Pattern

```javascript
// plugins/MyPlugin/plugin.js

/**
 * Main plugin entry point
 * @param {Object} context - Execution context
 * @param {Object} context.formData - Current form data
 * @param {string} context.template - Template name
 * @param {Object} context.meta - Form metadata
 * @returns {Object} Result object
 */
async function run(context) {
  try {
    // Access context
    const { formData, template, meta } = context;
    
    // Perform operations
    const result = await performOperation(formData);
    
    // Return result
    return {
      success: true,
      data: result,
      message: "Operation completed"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions
function performOperation(data) {
  // Implementation
}

// Export run function
module.exports = { run };
```

### Minimal Plugin

```javascript
// plugins/SimplePlugin/plugin.js

module.exports = {
  async run(context) {
    console.log("Plugin executed with:", context);
    return { success: true };
  }
};
```

## Declarative IPC Registration

Plugins can declare IPC handlers in `plugin.json` without manually registering them.

### Configuration

```json
{
  "name": "MyPlugin",
  "ipc": {
    "doSomething": "handleDoSomething",
    "fetchData": "handleFetchData"
  }
}
```

### Implementation

```javascript
// plugins/MyPlugin/plugin.js

async function handleDoSomething(event, payload) {
  // Handle IPC call
  return { success: true, result: "something done" };
}

async function handleFetchData(event, payload) {
  // Fetch data
  const data = await fetchFromSource(payload.source);
  return { success: true, data };
}

module.exports = {
  handleDoSomething,
  handleFetchData,
  
  // Main run function
  async run(context) {
    // Plugin logic
    return { success: true };
  }
};
```

### IPC Routes

Handlers are automatically registered as:
```
plugin:<pluginName>:<handlerKey>
```

Examples:
```javascript
// From plugin.json: "ipc": { "doSomething": "handleDoSomething" }
// Creates route: "plugin:MyPlugin:doSomething"

// Renderer can call:
const result = await window.api.plugin.invoke("MyPlugin", "doSomething", payload);
```

## Plugin Lifecycle

### 1. Loading

Plugins are loaded at app startup in `controls/pluginManager.js`:

```javascript
function loadPlugins() {
  // 1. Scan plugins/ folder
  // 2. Read plugin.json for each plugin
  // 3. Require plugin.js (if backend plugin)
  // 4. Validate with plugin.schema.js
  // 5. Register IPC handlers (if declared)
  // 6. Store in pluginRepo
}
```

### 2. Execution

Plugins can be executed via:

#### A. Direct Run (Backend)
```javascript
await EventBus.emitWithResponse("plugin:run", {
  name: "MyPlugin",
  context: { formData, template, meta }
});
```

#### B. IPC Call (Declared Handlers)
```javascript
// From renderer
const result = await window.api.plugin.invoke(
  "MyPlugin",
  "doSomething",
  { param1: "value" }
);
```

#### C. Event-Driven
```javascript
// Plugin listens to events
EventBus.on("form:save", async (data) => {
  // React to form saves
});
```

### 3. Reloading

Plugins can be hot-reloaded:

```javascript
await EventBus.emitWithResponse("plugin:reload");
```

This:
- Clears require cache
- Re-reads plugin.json files
- Re-requires plugin.js files
- Re-registers IPC handlers

### 4. Unloading

Plugins can be disabled via `enabled: false` in plugin.json, or deleted entirely.

## Plugin Manager API

### Main Process (controls/pluginManager.js)

```javascript
// Load all plugins
loadPlugins();

// Run a plugin
const result = await runPlugin("MyPlugin", context);

// List all plugins
const plugins = listPlugins();
// Returns: [{ name, version, description, author, tags, enabled, target }]

// Reload plugins
reloadPlugins();

// Delete plugin
deletePlugin("MyPlugin");

// Get plugin code
const { success, code } = getPluginCode("MyPlugin");

// Get IPC map
const ipcMap = getPluginIpcMap();
// Returns: { PluginName: ["handler1", "handler2"] }
```

### Renderer Process (window.api.plugin)

```javascript
// List plugins
const plugins = await window.api.plugin.list();

// Run plugin
const result = await window.api.plugin.run("MyPlugin", context);

// Reload plugins
await window.api.plugin.reload();

// Delete plugin
await window.api.plugin.delete("MyPlugin");

// Get plugin code
const { success, code } = await window.api.plugin.getCode("MyPlugin");

// Invoke declarative IPC handler
const result = await window.api.plugin.invoke("MyPlugin", "handlerKey", payload);
```

## Plugin Schema Validation

Plugins are validated using `schemas/plugin.schema.js`:

### Validation Rules

1. **Name**: Defaults to folder name
2. **Version**: Must be string, defaults to "1.0.0"
3. **Description**: Must be string
4. **Author**: Must be string
5. **Tags**: Must be array
6. **Enabled**: Defaults to true
7. **Target**: Must be "backend", "frontend", or "both"
8. **IPC**: Must be object with string values
9. **Run**: Required function for backend plugins

### Sanitization

```javascript
const plugin = pluginSchema.sanitize(rawPlugin, folderName);
```

This:
- Applies defaults
- Type checks all fields
- Validates IPC handler names
- Ensures backend plugins have run()

## Plugin Context

When plugins are executed via `plugin:run`, they receive a context object:

```javascript
{
  formData: {},      // Current form data
  template: "...",   // Template name
  meta: {},          // Form metadata
  filename: "...",   // Form filename
  // ... additional context
}
```

## Plugin Communication

### Emit Events

Plugins can emit events to communicate with the system:

```javascript
// In plugin.js
const EventBus = require("./path/to/eventBus");

module.exports = {
  async run(context) {
    // Do work
    const result = processData(context.formData);
    
    // Notify system
    EventBus.emit("form:context:update", result);
    EventBus.emit("ui:toast", {
      variant: "success",
      message: "Plugin completed!"
    });
    
    return { success: true, data: result };
  }
};
```

### Listen to Events

```javascript
const EventBus = require("./path/to/eventBus");

// Listen to events
EventBus.on("form:save", async (data) => {
  // React to form saves
  console.log("Form saved:", data);
});

module.exports = {
  async run(context) {
    // Plugin logic
  }
};
```

### IPC Communication

Frontend plugins can communicate via IPC:

```javascript
// Frontend plugin code
async function myFrontendFunction() {
  // Call backend handler
  const result = await window.api.plugin.invoke(
    "MyPlugin",
    "processData",
    { data: formData }
  );
  
  console.log("Backend result:", result);
}
```

## Plugin Examples

### Example 1: Simple Data Transform

```javascript
// plugins/DataTransform/plugin.json
{
  "name": "DataTransform",
  "version": "1.0.0",
  "description": "Transforms form data",
  "author": "Your Name"
}

// plugins/DataTransform/plugin.js
module.exports = {
  async run(context) {
    const transformed = Object.keys(context.formData).reduce((acc, key) => {
      acc[key.toUpperCase()] = context.formData[key];
      return acc;
    }, {});
    
    return { success: true, data: transformed };
  }
};
```

### Example 2: Plugin with IPC Handlers

```json
{
  "name": "DataFetcher",
  "version": "1.0.0",
  "ipc": {
    "fetchUsers": "handleFetchUsers",
    "fetchPosts": "handleFetchPosts"
  }
}
```

```javascript
// plugins/DataFetcher/plugin.js
const https = require("https");

async function handleFetchUsers(event, payload) {
  return new Promise((resolve) => {
    https.get("https://api.example.com/users", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ success: true, data: JSON.parse(data) }));
    });
  });
}

async function handleFetchPosts(event, payload) {
  // Similar implementation
}

module.exports = {
  handleFetchUsers,
  handleFetchPosts,
  
  async run(context) {
    // Main plugin logic
    return { success: true };
  }
};
```

### Example 3: Frontend Plugin

```json
{
  "name": "UIEnhancer",
  "version": "1.0.0",
  "target": "frontend",
  "description": "Adds UI enhancements"
}
```

```javascript
// plugins/UIEnhancer/plugin.js
// Frontend-only plugin (no run function needed)

// This code is loaded in renderer
(function() {
  // Add custom UI elements
  const button = document.createElement("button");
  button.textContent = "Custom Action";
  button.onclick = () => {
    console.log("Custom action executed");
  };
  
  // Append to page
  document.body.appendChild(button);
})();
```

## Plugin Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
module.exports = {
  async run(context) {
    try {
      const result = await riskyOperation(context);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
};
```

### 2. Validation

Validate inputs:

```javascript
module.exports = {
  async run(context) {
    if (!context.formData) {
      return { success: false, error: "No form data provided" };
    }
    
    // Continue with valid data
  }
};
```

### 3. Logging

Use consistent logging:

```javascript
const { log, error } = require("../../controls/nodeLogger");

module.exports = {
  async run(context) {
    log(`[MyPlugin] Starting execution`);
    
    try {
      // Plugin logic
      log(`[MyPlugin] Completed successfully`);
      return { success: true };
    } catch (err) {
      error(`[MyPlugin] Failed:`, err.message);
      return { success: false, error: err.message };
    }
  }
};
```

### 4. Async Operations

Use async/await for cleaner code:

```javascript
module.exports = {
  async run(context) {
    const data1 = await fetchData();
    const data2 = await processData(data1);
    const data3 = await saveData(data2);
    
    return { success: true, data: data3 };
  }
};
```

### 5. Resource Cleanup

Clean up resources:

```javascript
module.exports = {
  async run(context) {
    const connection = await openConnection();
    
    try {
      const result = await useConnection(connection);
      return { success: true, data: result };
    } finally {
      await closeConnection(connection);
    }
  }
};
```

## Plugin Security

### Sandboxing

Plugins run in the main process with full Node.js access. **Be cautious** when installing third-party plugins.

### Trust Model

- Only install plugins from trusted sources
- Review plugin code before installation
- Use `enabled: false` to disable untrusted plugins

### Future Enhancements

Potential security improvements:
- Plugin permission system
- Sandboxed execution environment
- Code signing verification

## Troubleshooting

### Plugin Not Loading

**Check:**
1. `plugin.json` exists and is valid JSON
2. `plugin.js` exists (for backend plugins)
3. Plugin folder name matches expected pattern
4. No syntax errors in plugin.js

**Debug:**
```javascript
// Check plugin manager logs
// Look for: "[PluginManager] Failed to load plugin..."
```

### IPC Handler Not Registering

**Check:**
1. `ipc` object in plugin.json is correct
2. Handler function exists in plugin.js
3. Handler function name matches ipc mapping

**Debug:**
```javascript
// Check logs for:
// "[PluginManager] Registered IPC: plugin:PluginName:handlerKey"
```

### Plugin Crashes

**Check:**
1. Error handling in run()
2. Async operations awaited properly
3. Dependencies installed
4. File paths are correct

## Plugin Development Workflow

### 1. Create Plugin Folder

```bash
mkdir plugins/MyPlugin
```

### 2. Create plugin.json
```json
{
  "name": "MyPlugin",
  "version": "1.0.0",
  "description": "My awesome plugin"
}
```

### 3. Create plugin.js
```javascript
module.exports = {
  async run(context) {
    return { success: true };
  }
};
```

### 4. Reload Plugins
```javascript
await window.api.plugin.reload();
```

### 5. Test Plugin
```javascript
const result = await window.api.plugin.run("MyPlugin", {
  formData: {},
  template: "test"
});
console.log(result);
```

### 6. Iterate
Make changes, reload, test again.

## See Also

- [EventBus System](./EVENTBUS-SYSTEM.md)
- [Handler Pattern](./HANDLER-PATTERN.md)
- [IPC Bridge](./IPC-BRIDGE.md)
- [Plugin Schema](../schemas/plugin.schema.js)
- [Plugin Manager](../controls/pluginManager.js)
