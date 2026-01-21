# Handler Pattern

## Overview

Formidable organizes event handling logic using a **Handler Pattern**, where each domain has dedicated handler modules containing related event handlers. This promotes code organization, separation of concerns, and maintainability.

## Structure

### Location
All handlers are in: `modules/handlers/`

### Current Handler Modules (30 files)

```text
modules/handlers/
├── cacheHandlers.js           # Cache operations
├── codeFieldHandlers.js       # Code field execution
├── collectionHandlers.js      # API collection management
├── configHandlers.js          # Configuration management
├── contextHandlers.js         # Form context management
├── fieldHandlers.js           # Field operations (GUID-based)
├── fileHandlers.js            # File system operations
├── formHandlers.js            # Form CRUD operations
├── gitHandlers.js             # Git integration
├── helpHandlers.js            # Help system
├── historyHandlers.js         # Navigation history
├── internalServerHandlers.js  # Internal HTTP server
├── loggingHandlers.js         # Logging operations
├── markdownHandlers.js        # Markdown processing
├── modalHandlers.js           # Modal dialogs
├── optionHandlers.js          # Option management
├── pluginHandlers.js          # Plugin system
├── profileHandlers.js         # Profile management
├── renderHandlers.js          # HTML rendering
├── screenHandlers.js          # Screen/window management
├── settingsHandlers.js        # Settings management
├── sidebarHandlers.js         # Sidebar UI
├── systemHandlers.js          # System utilities
├── templateHandlers.js        # Template management
├── themeHandlers.js           # Theme switching
├── toastHandlers.js           # Toast notifications
└── uiHandlers.js              # General UI operations
```

## Handler Module Pattern

### Basic Structure

```javascript
// modules/handlers/formHandlers.js

/**
 * Event: form:load
 * Payload: { filename: string }
 * Returns: Form data object
 */
export async function handleLoadForm(payload) {
  try {
    // Load form data
    const data = await loadFormFile(payload.filename);
    
    // Emit related events
    EventBus.emit("form:context:update", data);
    
    return data;
  } catch (error) {
    EventBus.emit("logging:error", [
      "Failed to load form:",
      error.message
    ]);
    throw error;
  }
}

/**
 * Event: form:save
 * Payload: { filename: string, data: object }
 * Returns: { success: boolean, path: string }
 */
export async function handleSaveForm(payload) {
  // Implementation
}

/**
 * Event: form:delete
 * Payload: { filename: string }
 * Returns: { success: boolean }
 */
export async function handleDeleteForm(payload) {
  // Implementation
}
```

### Registration Pattern

Handlers are registered in `modules/eventRouter.js`:

```javascript
// modules/eventRouter.js
import * as formHandlers from "./handlers/formHandlers.js";
import * as fieldHandlers from "./handlers/fieldHandlers.js";
import * as pluginHandlers from "./handlers/pluginHandlers.js";
// ... 30+ imports

export function initEventRouter() {
  // Form handlers
  EventBus.on("form:load", formHandlers.handleLoadForm);
  EventBus.on("form:save", formHandlers.handleSaveForm);
  EventBus.on("form:delete", formHandlers.handleDeleteForm);
  
  // Field handlers
  EventBus.on("field:get-by-guid", fieldHandlers.handleGetFieldByGuid);
  EventBus.on("field:set-value", fieldHandlers.handleSetFieldValue);
  
  // Plugin handlers
  EventBus.on("plugin:run", pluginHandlers.handleRunPlugin);
  EventBus.on("plugin:list", pluginHandlers.handleListPlugins);
  
  // ... 100+ event registrations
}
```

## Handler Responsibilities

### Domain Separation

Each handler module owns a specific domain:

| Module | Domain | Events |
|--------|--------|--------|
| `formHandlers` | Form operations | form:load, form:save, form:delete, form:list |
| `fieldHandlers` | Field operations | field:get-by-guid, field:set-value, field:update-attributes |
| `templateHandlers` | Template management | template:load, template:save, template:list |
| `pluginHandlers` | Plugin system | plugin:run, plugin:reload, plugin:list |
| `configHandlers` | Configuration | config:get, config:update, config:invalidate |
| `gitHandlers` | Git operations | git:status, git:commit, git:push |
| `cacheHandlers` | Cache management | cache:invalidate, cache:load, cache:update |

### Cross-Domain Communication

Handlers can emit events to trigger other domains:

```javascript
// formHandlers.js
export async function handleSaveForm(payload) {
  // Save form
  const result = await saveFormToFile(payload);
  
  // Notify other domains
  EventBus.emit("cache:invalidate", { type: "form" });
  EventBus.emit("form:context:update", result.data);
  EventBus.emit("ui:toast", {
    variant: "success",
    message: "Form saved successfully"
  });
  
  return result;
}
```

## Handler Patterns

### Pattern 1: Simple Handler

Single operation, no side effects:

```javascript
export async function handleGetFieldByGuid(payload) {
  const { guid } = payload;
  return formUtils.resolveFieldByGuid(guid);
}
```

### Pattern 2: Orchestrating Handler

Coordinates multiple operations:

```javascript
export async function handleLoadForm(payload) {
  // 1. Load data
  const data = await loadFormFile(payload.filename);
  
  // 2. Validate schema
  const validation = await EventBus.emitWithResponse("schema:validate", {
    type: "form",
    data
  });
  
  if (!validation.valid) {
    throw new Error("Invalid form data");
  }
  
  // 3. Update context
  EventBus.emit("form:context:update", data);
  
  // 4. Update UI
  EventBus.emit("ui:form-loaded", data);
  
  return data;
}
```

### Pattern 3: Delegating Handler

Delegates to utility functions:

```javascript
import { getFormData, setFormData } from "../utils/formUtils.js";

export async function handleGetFormData(payload) {
  return getFormData(payload.selector);
}

export async function handleSetFormData(payload) {
  return setFormData(payload.selector, payload.data);
}
```

### Pattern 4: Stateful Handler

Maintains internal state:

```javascript
const cache = new Map();

export async function handleLoadTemplate(payload) {
  // Check cache
  if (cache.has(payload.name)) {
    return cache.get(payload.name);
  }
  
  // Load from disk
  const template = await loadTemplateFile(payload.name);
  
  // Cache it
  cache.set(payload.name, template);
  
  return template;
}

export function handleInvalidateCache() {
  cache.clear();
}
```

## Handler Best Practices

### 1. Single Responsibility

Each handler should do one thing:

```javascript
// ❌ Bad - multiple responsibilities
export async function handleFormOperation(payload) {
  if (payload.action === "load") {
    // Load logic
  } else if (payload.action === "save") {
    // Save logic
  } else if (payload.action === "delete") {
    // Delete logic
  }
}

// ✅ Good - separate handlers
export async function handleLoadForm(payload) { /* ... */ }
export async function handleSaveForm(payload) { /* ... */ }
export async function handleDeleteForm(payload) { /* ... */ }
```

### 2. Error Handling

Always handle errors gracefully:

```javascript
export async function handleSaveForm(payload) {
  try {
    const result = await saveFormToFile(payload);
    return { success: true, data: result };
  } catch (error) {
    // Log error
    EventBus.emit("logging:error", [
      "Failed to save form:",
      error.message
    ]);
    
    // Notify user
    EventBus.emit("ui:toast", {
      variant: "error",
      message: `Save failed: ${error.message}`
    });
    
    return { success: false, error: error.message };
  }
}
```

### 3. Payload Validation

Validate input before processing:

```javascript
export async function handleSetFieldValue(payload) {
  // Validate payload
  if (!payload.guid && !payload.key) {
    throw new Error("Either guid or key must be provided");
  }
  
  if (payload.value === undefined) {
    throw new Error("Value is required");
  }
  
  // Process
  return setFieldValue(payload);
}
```

### 4. Document Handler Contract

Use JSDoc comments:

```javascript
/**
 * Load a form by filename
 * 
 * Event: form:load
 * 
 * @param {Object} payload - Event payload
 * @param {string} payload.filename - Name of form file to load
 * @param {boolean} [payload.skipCache] - Skip cache if true
 * 
 * @returns {Promise<Object>} Form data
 * @returns {string} returns.template - Template name
 * @returns {Object} returns.data - Form field data
 * @returns {Object} returns.meta - Form metadata
 * 
 * @throws {Error} If file not found or invalid format
 * 
 * @emits form:context:update - When form is loaded
 * @emits cache:update - When cache is updated
 */
export async function handleLoadForm(payload) {
  // Implementation
}
```

### 5. Return Consistent Shapes

Use consistent return structures:

```javascript
// Success/error pattern
export async function handleOperation(payload) {
  try {
    const data = await doOperation(payload);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Or throw on error (cleaner)
export async function handleOperation(payload) {
  const data = await doOperation(payload); // Let errors bubble
  return data;
}
```

## Handler Testing

### Unit Testing Pattern

```javascript
// formHandlers.test.js
import * as formHandlers from "./formHandlers.js";
import EventBus from "../eventBus.js";

describe("formHandlers", () => {
  beforeEach(() => {
    // Clear event listeners
    EventBus.listeners = {};
  });
  
  test("handleLoadForm loads form data", async () => {
    const payload = { filename: "test.yaml" };
    const result = await formHandlers.handleLoadForm(payload);
    
    expect(result).toHaveProperty("template");
    expect(result).toHaveProperty("data");
  });
  
  test("handleLoadForm emits context update", async () => {
    const mockHandler = jest.fn();
    EventBus.on("form:context:update", mockHandler);
    
    await formHandlers.handleLoadForm({ filename: "test.yaml" });
    
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Handler Dependencies

### Import Pattern

Handlers can import utilities and services:

```javascript
// fieldHandlers.js
import * as formUtils from "../../utils/formUtils.js";
import * as domUtils from "../../utils/domUtils.js";
import EventBus from "../eventBus.js";

export async function handleGetFieldByGuid(payload) {
  const field = formUtils.resolveFieldByGuid(payload.guid);
  return field;
}
```

### Dependency Injection Pattern

For testability, consider dependency injection:

```javascript
export function createHandlers(dependencies) {
  const { formUtils, EventBus } = dependencies;
  
  return {
    async handleGetFieldByGuid(payload) {
      return formUtils.resolveFieldByGuid(payload.guid);
    },
    
    async handleSetFieldValue(payload) {
      const result = formUtils.setFieldValue(payload);
      EventBus.emit("field:changed", result);
      return result;
    }
  };
}
```

## Handler Lifecycle

### Initialization

Handlers are registered at app startup:

```javascript
// main.js or renderer.js
import { initEventRouter } from "./modules/eventRouter.js";

// On app ready
initEventRouter();
```

### Runtime

Handlers execute when events are emitted:

```
1. Component emits event
2. EventBus dispatches to handler
3. Handler executes async logic
4. Handler returns result
5. Component receives result
```

### Cleanup

Handlers persist for app lifetime (no cleanup needed unless component-specific).

## Creating New Handlers

### Step-by-Step Guide

1. **Create handler module**:
```javascript
// modules/handlers/myHandlers.js
export async function handleMyOperation(payload) {
  // Implementation
  return result;
}
```

2. **Register in EventRouter**:
```javascript
// modules/eventRouter.js
import * as myHandlers from "./handlers/myHandlers.js";

export function initEventRouter() {
  EventBus.on("my:operation", myHandlers.handleMyOperation);
}
```

3. **Emit from component**:
```javascript
// Any component
const result = await EventBus.emitWithResponse("my:operation", payload);
```

## Common Handler Operations

### File Operations (fileHandlers.js)
```javascript
- file:save
- file:load
- file:delete
- file:list
```

### Form Operations (formHandlers.js)
```javascript
- form:load
- form:save
- form:delete
- form:list
- form:selected
```

### Field Operations (fieldHandlers.js)
```javascript
- field:get-by-guid
- field:set-value
- field:get-all-guids
- field:update-attributes
```

### Plugin Operations (pluginHandlers.js)
```javascript
- plugin:run
- plugin:reload
- plugin:list
- plugin:autobind
```

### UI Operations (uiHandlers.js, toastHandlers.js, modalHandlers.js)
```javascript
- ui:toast
- ui:modal
- ui:confirm
```

## Benefits

1. **Organization**: Related handlers grouped together
2. **Discoverability**: Easy to find event handlers
3. **Testability**: Handlers can be unit tested in isolation
4. **Maintainability**: Changes localized to handler modules
5. **Separation of Concerns**: Clear domain boundaries
6. **Code Reuse**: Handlers can be imported and used directly

## See Also

- [EventBus System](./EVENTBUS-SYSTEM.md)
- [Event Router Documentation](./EVENT-ROUTER.md)
- [Plugin System](./PLUGIN-SYSTEM.md)
