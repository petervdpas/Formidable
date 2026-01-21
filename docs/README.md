# Formidable System Documentation

## Overview

Welcome to the **Formidable System Documentation**. This collection provides comprehensive guides covering all major aspects of the Formidable application architecture.

Formidable is an **Electron-based form management system** built on an **event-driven architecture** with a powerful plugin system, schema-based templates, and dynamic form rendering capabilities.

## Core Concepts

### Event-Driven Architecture

Formidable uses a centralized EventBus for inter-component communication, enabling loose coupling and extensibility.

**Key Documents**:

- [EventBus System](./EVENTBUS-SYSTEM.md) - Event system core concepts and API
- [Handler Pattern](./HANDLER-PATTERN.md) - Domain-specific event handlers
- [Event Router](./EVENT-ROUTER.md) - Event registration and routing *(coming soon)*

### Plugin System

Extensible plugin architecture supporting backend, frontend, and hybrid plugins with declarative IPC registration.

**Key Documents**:

- [Plugin System](./PLUGIN-SYSTEM.md) - Complete plugin guide
- [Plugin Schema](../schemas/plugin.schema.js) - Plugin manifest schema

### IPC Communication

Secure inter-process communication between Electron's main and renderer processes via contextBridge.

**Key Documents**:

- [IPC Bridge](./IPC-BRIDGE.md) - IPC architecture and API

### Virtual File System

Organized storage system with context folders, auto-sync, and template-based organization.

**Key Documents**:

- [Virtual File System](./VFS-SYSTEM.md) - VFS architecture, operations, and cache management

### Modal System

Flexible modal framework with resizing, split-view support, and keyboard shortcuts.

**Key Documents**:

- [Modal System](./MODAL-SYSTEM.md) - Modal types, options, and patterns

### Template & Schema System

Schema-based template system for defining form structures with 20+ field types.

**Key Documents**:

- [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md) - Templates and field types
- [Template Helpers](./TEMPLATE-HELPERS.md) - Handlebars helpers (field, loop, math, stats)
- [Template Schema](../schemas/template.schema.js) - Template schema
- [Field Schema](../schemas/field.schema.js) - Field schema

### Form System

Dynamic form rendering, data collection, validation, and persistence.

**Key Documents**:

- [Form System](./FORM-SYSTEM.md) - Form lifecycle and operations
- [Field GUID System](./FIELD-GUID-SYSTEM.md) - Field identification and manipulation

### Global APIs

Convenient global API access for form operations, field manipulation, and system integration.

**Key Documents**:

- [Global API System](./GLOBAL-API-SYSTEM.md) - FGA, CFA, and window.api

### Configuration

Configuration management for user preferences, window state, themes, and profiles.

**Key Documents**:

- [Configuration System](./CONFIGURATION-SYSTEM.md) - Config management

## Documentation Index

### Architecture Documents

| Document | Description |
| -------- | ----------- |
| [EventBus System](./EVENTBUS-SYSTEM.md) | Event-driven communication system |
| [Handler Pattern](./HANDLER-PATTERN.md) | Domain-specific handler organization |
| [IPC Bridge](./IPC-BRIDGE.md) | Main ↔ Renderer process communication |
| [Plugin System](./PLUGIN-SYSTEM.md) | Plugin architecture and development |

### System Documents

| Document | Description |
| -------- | ----------- |
| [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md) | Form templates and field definitions |
| [Form System](./FORM-SYSTEM.md) | Form rendering and data management |
| [Field GUID System](./FIELD-GUID-SYSTEM.md) | Field identification and updates |
| [Configuration System](./CONFIGURATION-SYSTEM.md) | Configuration and preferences |
| [Global API System](./GLOBAL-API-SYSTEM.md) | FGA, CFA, and IPC APIs |

### Reference Documents

| Document | Description |
| -------- | ----------- |
| [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) | Field GUID implementation overview |
| [Field GUID Architecture](./FIELD-GUID-ARCHITECTURE.md) | Technical architecture details |
| [Field GUID Quick Reference](./FIELD-GUID-QUICK-REF.md) | Quick reference guide |
| [Event-Driven Architecture](./EVENT-DRIVEN-ARCHITECTURE.md) | Event-driven design patterns |

### Code Examples

| File | Description |
| ---- | ----------- |
| [Field GUID Examples](../examples/field-guid-examples.js) | 10 practical field manipulation examples |

## Quick Start Guide

### Understanding the Architecture

1. **Start with EventBus** - Understand the event-driven foundation
   - Read: [EventBus System](./EVENTBUS-SYSTEM.md)
2. **Learn Handlers** - See how events are processed
   - Read: [Handler Pattern](./HANDLER-PATTERN.md)
3. **Explore IPC** - Understand main/renderer communication
   - Read: [IPC Bridge](./IPC-BRIDGE.md)

### Working with Forms

1. **Templates** - Define form structures
   - Read: [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md)
2. **Form Operations** - Load, save, render forms
   - Read: [Form System](./FORM-SYSTEM.md)
3. **Field Manipulation** - Update fields dynamically
   - Read: [Field GUID System](./FIELD-GUID-SYSTEM.md)

### Extending Formidable

1. **Create Plugins** - Add custom functionality
   - Read: [Plugin System](./PLUGIN-SYSTEM.md)
2. **Use APIs** - Leverage global APIs
   - Read: [Global API System](./GLOBAL-API-SYSTEM.md)
3. **Custom Handlers** - Add new event handlers
   - Read: [Handler Pattern](./HANDLER-PATTERN.md)

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    Electron App                          │
│                                                          │
│  ┌────────────────────┐    ┌────────────────────────┐  │
│  │   Main Process     │    │   Renderer Process      │  │
│  │   (Node.js)        │    │   (Browser)             │  │
│  │                    │    │                         │  │
│  │  • File System     │◄──►│  • DOM Rendering       │  │
│  │  • Plugin Manager  │ IPC│  • User Interaction    │  │
│  │  • Config Manager  │    │  • EventBus            │  │
│  │  • Git Manager     │    │  • Global APIs         │  │
│  │  • IPC Handlers    │    │    - FGA (Forms)       │  │
│  │                    │    │    - CFA (CodeFields)  │  │
│  └────────────────────┘    │    - window.api (IPC)  │  │
│                             └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│                                                          │
│  Templates (YAML)  →  Forms (YAML)  →  Storage          │
│  Schemas (JS)      →  Validation    →  Persistence      │
│  Plugins (JS)      →  Extensions    →  Features         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Event Flow                              │
│                                                          │
│  UI Action → EventBus → Handler → Operation → Event     │
│  ↑                                                  ↓    │
│  └──────────────── UI Update ←──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Key Technologies

### Core

- **Electron** - Cross-platform desktop framework
- **Node.js** - Backend runtime
- **JavaScript** - Primary language

### UI

- **HTML5** - Markup
- **CSS3** - Styling (with theme support)
- **CodeMirror** - Code editor
- **EasyMDE** - Markdown editor

### Data

- **YAML** - Form and template storage
- **JSON** - Configuration and metadata
- **Schema Validation** - Type safety and defaults

### Integration

- **Git** - Version control integration
- **HTTP/HTTPS** - External API communication
- **IPC** - Inter-process communication

## Common Workflows

### Creating a New Form

```javascript
// 1. Select template
await EventBus.emit("form:selected", "my-template");

// 2. Create new form
await EventBus.emit("form:new", { template: "my-template" });

// 3. Fill form fields
await CFA.field.setValue({ key: "title", value: "My Form" });
await CFA.field.setValue({ key: "description", value: "Description" });

// 4. Save form
await EventBus.emit("form:save", {
  template: "my-template",
  filename: "form-001.yaml",
  data: FGA.form.getFormData()
});
```

### Developing a Plugin

```javascript
// 1. Create plugin folder
// plugins/MyPlugin/

// 2. Create plugin.json
{
  "name": "MyPlugin",
  "version": "1.0.0",
  "description": "My plugin",
  "ipc": {
    "process": "handleProcess"
  }
}

// 3. Create plugin.js
module.exports = {
  async run(context) {
    // Main plugin logic
    return { success: true, data: processedData };
  },
  
  async handleProcess(event, payload) {
    // IPC handler
    return { result: "processed" };
  }
};

// 4. Reload plugins
await window.api.plugin.reloadPlugins();

// 5. Test plugin
const result = await window.api.plugin.runPlugin("MyPlugin", context);
```

### Manipulating Fields from Code

```javascript
// In a code field
async function calculateTotal() {
  // Get field values
  const price = await CFA.field.getValue({ key: "price" });
  const quantity = await CFA.field.getValue({ key: "quantity" });
  
  // Calculate
  const total = Number(price) * Number(quantity);
  
  // Update total field
  await CFA.field.setValue({ key: "total", value: total });
  
  // Update status
  await CFA.field.setValue({ 
    key: "status", 
    value: total > 1000 ? "High Value" : "Standard" 
  });
}
```

### Adding Event Handlers

```javascript
// 1. Create handler module
// modules/handlers/myHandlers.js
export async function handleMyOperation(payload) {
  // Implementation
  return result;
}

// 2. Register in eventRouter.js
import * as myHandlers from "./handlers/myHandlers.js";

export function initEventRouter() {
  EventBus.on("my:operation", myHandlers.handleMyOperation);
}

// 3. Emit event
const result = await EventBus.emitWithResponse("my:operation", payload);
```

## Development Guidelines

### Code Organization

```text
formidable/
├── main.js                 # Main process entry
├── renderer.js             # Renderer process entry
├── preload.js             # IPC bridge
├── controls/              # Main process controllers
├── modules/               # Renderer modules
│   ├── handlers/         # Event handlers
│   └── ...               # UI modules
├── utils/                 # Shared utilities
├── schemas/              # Validation schemas
├── plugins/              # Plugin folder
├── templates/            # Form templates
├── storage/              # Form storage
└── config/               # Configuration
```

### Naming Conventions

- **Events**: `namespace:action` (e.g., `form:save`)
- **Handlers**: `handle[Action]` (e.g., `handleSaveForm`)
- **IPC Routes**: `kebab-case` (e.g., `load-user-config`)
- **API Methods**: `camelCase` (e.g., `loadUserConfig`)
- **Files**: `camelCase.js` or `kebab-case.js`

### Best Practices

1. **Use EventBus** for inter-component communication
2. **Validate inputs** in handlers and IPC routes
3. **Handle errors** gracefully with try/catch
4. **Document APIs** with JSDoc comments
5. **Follow schema patterns** for data structures
6. **Test handlers** in isolation
7. **Use async/await** for cleaner async code
8. **Cache appropriately** but invalidate when needed
9. **Log operations** for debugging
10. **Keep handlers focused** on single responsibilities

## Troubleshooting

### Common Issues

| Issue | Check | Document |
| ----- | ----- | -------- |
| Events not firing | EventBus registration | [EventBus System](./EVENTBUS-SYSTEM.md) |
| Fields not updating | GUID assignment | [Field GUID System](./FIELD-GUID-SYSTEM.md) |
| Plugin not loading | plugin.json validity | [Plugin System](./PLUGIN-SYSTEM.md) |
| IPC not working | Handler registration | [IPC Bridge](./IPC-BRIDGE.md) |
| Form not rendering | Template schema | [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md) |
| Config not persisting | File permissions | [Configuration System](./CONFIGURATION-SYSTEM.md) |

### Debug Mode

Enable debug logging in EventBus:

```javascript
// modules/eventBus.js
const debug = true; // Enable debug logs
```

### Console Inspection

```javascript
// Check EventBus listeners
console.log("Event listeners:", Object.keys(EventBus.listeners));

// Check loaded plugins
const plugins = await window.api.plugin.listPlugins();
console.log("Plugins:", plugins);

// Check current context
const context = await FGA.context.get();
console.log("Context:", context);

// Check configuration
const config = await window.api.config.loadUserConfig();
console.log("Config:", config);
```

## Contributing

### Adding Documentation

When adding new features, update relevant documentation:

1. Add/update system document in `docs/`
2. Update this index with links
3. Add code examples if applicable
4. Update related documents with cross-references

### Documentation Standards

- **Clear headings** with hierarchy
- **Code examples** for all concepts
- **Use cases** and patterns
- **Troubleshooting** sections
- **Cross-references** to related docs
- **Tables** for reference data
- **Diagrams** for architecture

## Resources

### Internal Resources

- **Schemas**: `schemas/` directory
- **Examples**: `examples/` directory
- **Source Code**: `modules/`, `controls/`, `utils/`
- **Configuration**: `config/` directory

### External Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [CodeMirror Documentation](https://codemirror.net/docs/)
- [YAML Specification](https://yaml.org/spec/)

## Glossary

| Term | Definition |
| ---- | ---------- |
| **EventBus** | Centralized event communication system |
| **Handler** | Function that processes an event |
| **IPC** | Inter-Process Communication |
| **Template** | Schema defining form structure |
| **Field GUID** | Unique identifier for form fields |
| **Plugin** | Extension module for adding features |
| **Context** | Current form state and metadata |
| **Schema** | Validation and default rules for data |
| **Loop** | Repeating section of fields |
| **CodeField** | Field type that executes JavaScript |

## Version History

- **v1.0** - Initial documentation release
  - EventBus System
  - Handler Pattern
  - Plugin System
  - IPC Bridge
  - Template & Schema System
  - Form System
  - Field GUID System
  - Configuration System
  - Global API System

## Support

For questions or issues:

1. Check relevant documentation above
2. Review code examples in `examples/`
3. Inspect console for error messages
4. Check EventBus debug logs
5. Validate schemas and data structures

---

**Last Updated**: 2024
**Formidable Version**: Current
**Documentation Version**: 1.0
