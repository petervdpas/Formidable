# EventBus System

## Overview

Formidable uses a centralized **EventBus** for inter-component communication. This event-driven architecture provides loose coupling between modules, making the system extensible, testable, and maintainable.

## Core Concept

The EventBus acts as a message broker, allowing components to:
- **Emit events** without knowing who listens
- **Listen to events** without knowing who emits them
- **Request responses** through synchronous-like async operations

## EventBus API

Located in: `modules/eventBus.js`

### Methods

#### `EventBus.on(event, callback)`
Register a listener for an event.

```javascript
EventBus.on("form:save", async (formData) => {
  // Handle form save
  console.log("Form saved:", formData);
});
```

**Features:**
- Prevents duplicate registration automatically
- Supports multiple listeners per event
- Logs registration in debug mode

#### `EventBus.off(event, callback)`
Unregister a specific listener.

```javascript
const handleSave = (data) => { /* ... */ };
EventBus.on("form:save", handleSave);
// Later...
EventBus.off("form:save", handleSave);
```

#### `EventBus.emit(event, payload)`
Emit an event to all registered listeners (fire-and-forget).

```javascript
await EventBus.emit("form:save", { 
  template: "myTemplate", 
  data: {...} 
});
```

**Features:**
- Async - waits for all handlers to complete
- Runs all listeners in parallel (Promise.all)
- Catches and logs errors from individual handlers
- Continues execution even if some handlers fail

#### `EventBus.emitWithResponse(event, payload)`
Emit an event and get a response from the **first** registered handler.

```javascript
const formData = await EventBus.emitWithResponse("form:load", {
  filename: "myform.yaml"
});
```

**Features:**
- Only calls the first registered handler
- Returns the handler's return value
- Supports both callback-style and async handlers
- Returns null if no handler is registered

**Dual Mode:**
```javascript
// Async style (preferred)
EventBus.on("form:load", async (payload) => {
  return await loadFormData(payload);
});

// Callback style (legacy support)
EventBus.on("form:load", (payload, callback) => {
  loadFormData(payload).then(callback);
});
```

#### `EventBus.once(event, callback)`
Register a one-time listener (auto-removes after first call).

```javascript
EventBus.once("app:ready", () => {
  console.log("App initialized!");
});
```

## Event Naming Conventions

Events follow a structured naming pattern:

```
<namespace>:<action>[:<detail>]
```

### Examples

```javascript
// System events
"file:save"
"file:load"
"file:delete"

// Form events
"form:selected"
"form:load"
"form:save"
"form:delete"

// Field events
"field:get-by-guid"
"field:set-value"

// Context events
"form:context:get"
"form:context:update"

// UI events
"ui:toast"
"screen:fullscreen"
"theme:toggle"

// Plugin events
"plugin:run"
"plugin:reload"
"plugin:autobind"
```

## Common Namespaces

| Namespace | Purpose | Examples |
|-----------|---------|----------|
| `file:` | File system operations | save, load, delete |
| `form:` | Form management | selected, load, save, delete |
| `field:` | Field operations | get-by-guid, set-value |
| `template:` | Template operations | load, save, list |
| `plugin:` | Plugin management | run, reload, list |
| `config:` | Configuration | load, update, invalidate |
| `git:` | Git operations | status, commit, push |
| `ui:` | UI operations | toast, modal |
| `screen:` | Screen management | fullscreen, visibility |
| `theme:` | Theme operations | toggle |
| `history:` | Navigation history | push, back, forward |
| `logging:` | Logging | default, warning, error |

## Architecture Pattern

### 1. Handler Registration (Event Router)

All events are registered in `modules/eventRouter.js`:

```javascript
import * as formHandlers from "./handlers/formHandlers.js";

export function initEventRouter() {
  // Register handlers
  EventBus.on("form:selected", formHandlers.handleFormSelected);
  EventBus.on("form:load", formHandlers.handleLoadForm);
  EventBus.on("form:save", formHandlers.handleSaveForm);
  // ... more registrations
}
```

### 2. Handler Implementation

Handlers are organized in `modules/handlers/`:

```javascript
// modules/handlers/formHandlers.js
export async function handleFormSelected(datafile) {
  // Implementation
  const data = await loadData(datafile);
  EventBus.emit("form:context:update", data);
}
```

### 3. Event Emission (From Components)

Components emit events without knowing implementation:

```javascript
// In UI code
async function onSaveClick() {
  const result = await EventBus.emitWithResponse("form:save", {
    template: currentTemplate,
    data: formData
  });
  
  if (result.success) {
    EventBus.emit("ui:toast", {
      variant: "success",
      message: "Form saved!"
    });
  }
}
```

## Event Flow Diagram

```text
User Action (UI)
      │
      ▼
EventBus.emitWithResponse("form:save", payload)
      │
      ▼
Event Router dispatches to handler
      │
      ▼
formHandlers.handleSaveForm(payload)
      │
      ├─▶ Save to disk
      ├─▶ Update cache
      └─▶ Emit "form:context:update"
      │
      ▼
Returns result to UI
```

## Common Patterns

### Pattern 1: Request-Response

Used when you need data back:

```javascript
// Request
const templates = await EventBus.emitWithResponse("template:list");

// Handler
EventBus.on("template:list", async () => {
  return await getTemplateList();
});
```

### Pattern 2: Fire-and-Forget

Used for notifications:

```javascript
// Emit
await EventBus.emit("form:context:update", newData);

// Multiple listeners can react
EventBus.on("form:context:update", updateUI);
EventBus.on("form:context:update", updateCache);
EventBus.on("form:context:update", notifyPlugins);
```

### Pattern 3: Event Chaining

Events can trigger other events:

```javascript
EventBus.on("form:save", async (data) => {
  const result = await saveFormData(data);
  
  // Trigger other events
  EventBus.emit("form:context:update", result);
  EventBus.emit("ui:toast", { 
    variant: "success", 
    message: "Saved!" 
  });
  EventBus.emit("history:push", { 
    type: "form", 
    name: data.filename 
  });
  
  return result;
});
```

### Pattern 4: Conditional Handlers

```javascript
EventBus.on("form:load", async (payload) => {
  // Check preconditions
  if (!payload.filename) {
    EventBus.emit("logging:warning", ["No filename provided"]);
    return null;
  }
  
  // Load data
  const data = await loadForm(payload.filename);
  
  // Emit success event
  EventBus.emit("form:loaded", data);
  
  return data;
});
```

## Benefits

### 1. Loose Coupling

Components don't need direct references to each other:

```javascript
// ❌ Tight coupling
import formManager from "./formManager";
formManager.saveForm(data);

// ✅ Loose coupling
EventBus.emit("form:save", data);
```

### 2. Extensibility
New features can listen without modifying existing code:

```javascript
// Add plugin listener without changing core
EventBus.on("form:save", async (data) => {
  await sendToAnalytics(data);
});
```

### 3. Testability
Easy to mock and test:

```javascript
// In tests
const mockHandler = jest.fn();
EventBus.on("form:save", mockHandler);
await EventBus.emit("form:save", testData);
expect(mockHandler).toHaveBeenCalledWith(testData);
```

### 4. Debugging
Centralized logging of all events:

```javascript
// EventBus logs all events in debug mode
[EventBus] Registered listener for "form:save". Total: 1
[EventBus] Emitted "form:save" but no listeners were registered.
```

## Best Practices

### 1. Use Descriptive Event Names
```javascript
// ❌ Bad
EventBus.emit("update");

// ✅ Good
EventBus.emit("form:context:update");
```

### 2. Always Handle Errors
```javascript
EventBus.on("form:save", async (data) => {
  try {
    return await saveForm(data);
  } catch (err) {
    EventBus.emit("logging:error", [
      "Failed to save form:",
      err.message
    ]);
    throw err;
  }
});
```

### 3. Document Payload Structure
```javascript
/**
 * Event: form:save
 * Payload: {
 *   template: string,
 *   filename: string,
 *   data: object
 * }
 * Returns: { success: boolean, path: string }
 */
EventBus.on("form:save", async (payload) => {
  // Implementation
});
```

### 4. Use emitWithResponse for Single Handler
```javascript
// ✅ Good - expects single response
const data = await EventBus.emitWithResponse("form:load", {filename});

// ❌ Wrong - use emit for notifications
const data = await EventBus.emitWithResponse("form:context:update", data);
```

### 5. Clean Up Listeners
```javascript
class MyComponent {
  constructor() {
    this.handler = this.onFormSave.bind(this);
    EventBus.on("form:save", this.handler);
  }
  
  destroy() {
    EventBus.off("form:save", this.handler);
  }
  
  onFormSave(data) {
    // Handle event
  }
}
```

## Debugging Tips

### Enable Debug Mode
Debug mode is enabled by default in `eventBus.js`:

```javascript
const debug = true; // Set to false to disable logs
```

### Trace Event Flow
```javascript
// Add logging to track event flow
EventBus.on("form:save", async (data) => {
  console.log("[TRACE] form:save received:", data);
  const result = await saveForm(data);
  console.log("[TRACE] form:save completed:", result);
  return result;
});
```

### List All Listeners
```javascript
// Access internal listeners (for debugging only)
console.log("Registered events:", Object.keys(EventBus.listeners));
```

## Performance Considerations

- **Parallel Execution**: `emit()` runs all handlers in parallel
- **First Handler Wins**: `emitWithResponse()` only calls first handler
- **Async Nature**: All operations are async, avoid blocking
- **Error Isolation**: One handler error doesn't affect others

## Migration Guide

### From Direct Calls to EventBus

```javascript
// Before: Direct function call
import { saveForm } from "./formManager";
const result = await saveForm(data);

// After: EventBus
const result = await EventBus.emitWithResponse("form:save", data);
```

### From Callbacks to Async

```javascript
// Before: Callback style
EventBus.on("form:load", (payload, callback) => {
  loadForm(payload).then(callback);
});

// After: Async style (preferred)
EventBus.on("form:load", async (payload) => {
  return await loadForm(payload);
});
```

## See Also

- [Event Router Documentation](./EVENT-ROUTER.md)
- [Handler Pattern](./HANDLER-PATTERN.md)
- [Plugin System](./PLUGIN-SYSTEM.md)
