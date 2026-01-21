# 🧾 Formidable — The Dynamic Form & Template Designer

**Formidable** is a modular Electron desktop application for creating, managing, and rendering dynamic forms and Markdown documents from YAML-based templates. It combines a visual form editor with a powerful Handlebars-style rendering engine, a built-in virtual file system (VFS), profile switching, and optional Git integration — designed for professionals who need structured content management, versioning, and auditability.

![Formidable](assets/formidable.png)

> 💠 Dedicated to **Elly** — who lived with strength, humor and clarity.  
> _"Sleep, don't weep - My sweet love"_ — Damien Rice  
>
> 🌌 And to **Aaron Swartz** — who refused to back down when it mattered.  
> _"We are all made of stardust, and we are all made of stories."_ — Aaron Swartz

---

## ⚠️ Pre-release

> This version of Formidable is a pre-release for testing and feedback.
> Expect missing features or bugs. Use at your own risk.
> See the [release notes](https://github.com/petervdpas/Formidable/releases/tag/v1.8.34-pre) for details.

**Latest Windows Installer**:
👉 [Formidable Setup.exe (Pre-release)](https://github.com/petervdpas/Formidable/releases/download/v1.8.34-pre/Formidable.Setup.exe)

---

## 📚 Documentation

Comprehensive documentation covering all aspects of Formidable's architecture:

### Architecture & Core Systems

- **[EventBus System](docs/EVENTBUS-SYSTEM.md)** - Event-driven architecture and communication
- **[Handler Pattern](docs/HANDLER-PATTERN.md)** - Domain-specific event handler organization
- **[IPC Bridge](docs/IPC-BRIDGE.md)** - Main ↔ Renderer process communication
- **[Plugin System](docs/PLUGIN-SYSTEM.md)** - Extensible plugin architecture
- **[Virtual File System](docs/VFS-SYSTEM.md)** - Storage organization, auto-sync, and context folders
- **[Modal System](docs/MODAL-SYSTEM.md)** - Resizable modals, split-view, and popup management

### Form & Template Systems

- **[Template & Schema System](docs/TEMPLATE-SCHEMA-SYSTEM.md)** - Form templates and 20+ field types
- **[Form System](docs/FORM-SYSTEM.md)** - Form rendering, validation, and operations
- **[Field GUID System](docs/FIELD-GUID-SYSTEM.md)** - Dynamic field identification and manipulation
- **[Template Helpers](docs/TEMPLATE-HELPERS.md)** - Handlebars helpers for rendering (field, loop, math, stats)
- **[Configuration System](docs/CONFIGURATION-SYSTEM.md)** - Settings, themes, and profiles

### API Reference

- **[Global API System](docs/GLOBAL-API-SYSTEM.md)** - FGA, CFA, and window.api reference
- **[Documentation Index](docs/README.md)** - Complete documentation hub with quick start guide

> 📖 **50,000+ words** of documentation with **200+ code examples**

---

## ✨ Key Features

- **⚙️ Dynamic Template & Form System**

  - YAML-based templates with 20+ field types
  - Schema validation and sanitization
  - Visual form editor with live preview
  - Full Markdown renderer using Handlebars-style syntax
  - Field GUID system for dynamic updates

- **🧩 Event-Driven Architecture**

  - Centralized EventBus for decoupled communication
  - 30+ domain-specific handler modules
  - Event-driven field operations (CFA.field API)
  - Async request-response patterns

- **🔌 Extensible Plugin System**

  - Backend, frontend, and hybrid plugins
  - Declarative IPC registration
  - Hot-reloadable plugin architecture
  - Plugin SDK with full API access

- **🎯 Global APIs**

  - **FGA** (Formidable Global API) - Form and field operations
  - **CFA** (CodeField API) - Dynamic field manipulation from code
  - **window.api** - Secure IPC bridge (100+ methods)
  - **EventBus** - Direct event system access

- **👥 Profile Switching**

  - Easily switch between multiple user profiles
  - Profiles store their own author name, email, context folder, preferences
  - Supports collaborative and multi-project use

- **📁 Virtual File System (VFS)** → [Docs](docs/VFS-SYSTEM.md)

  - Organized storage by context and template
  - Full control over storage folders, paths, and metadata
  - Auto-synced view of the VFS in the sidebar
  - Cache management and event-driven updates

- **🔀 Git Integration (Optional)**

  - Commit, push, pull from the UI
  - Git remote info and branch listing
  - Supports Azure DevOps workflows (credential.helper + useHttpPath)

- **🖥️ Clean, Modern UI** → [Modal Docs](docs/MODAL-SYSTEM.md)

  - Resizable, ESC-closable modals with backdrop click dismiss
  - **Markdown & Preview modal** — live output with split/closable panes
  - Full light/dark theming, configurable icon or label buttons
  - Split-view for template editing and form data
  - Inert background and disabled state support

- **🔗 Internal Linking & Wiki Support**

  - Support for internal form links (`formIdLink` fields)
  - Future-proof architecture for internal wiki server (localhost)

- **🔎 Designed for Auditability**

  - "Auditability by Design" approach: trackable metadata, version control, profile isolation
  - Suitable for regulated environments, audit preparation, compliance

---

## 🧠 Template Syntax

Formidable uses a Handlebars-inspired syntax for rendering:

```handlebars
# {{field "title"}}

{{#if (fieldRaw "check")}}
✅ Enabled
{{else}}
❌ Disabled
{{/if}}

## List
{{#each (fieldRaw "tags")}}
- {{this}}
{{/each}}

## Table
{{#if (fieldRaw "rows")}}
| Col1 | Col2 |
|------|------|
{{#each (fieldRaw "rows")}}
|{{this.0}}|{{this.1}}|
{{/each}}
{{/if}}
```

Reference helpers:

- `{{field "key"}}` → formatted value
- `{{fieldRaw "key"}}` → raw JS value
- `{{fieldMeta "key" "property"}}` → field metadata access

---

## 📋 Supported Field Types

Formidable supports 20+ field types with full schema validation:

| Type | Description | Documentation |
| -- | -- | -- |
| `text` | Single-line input | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `textarea` | Multi-line text block (Markdown/Plain) | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#text-area-type-textarea) |
| `boolean` | Checkbox toggle | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `dropdown` | Select from list | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#dropdownradiomultioption) |
| `multioption` | Multiple choice (checkbox group) | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#dropdownradiomultioption) |
| `radio` | Radio button group | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#dropdownradiomultioption) |
| `number` | Numeric input | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `range` | Range slider | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `date` | ISO-style date picker | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `list` | Dynamic list input | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `table` | Editable table grid (JSON) | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `image` | Upload & preview image | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `link` | Text input for URL or link | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `tags` | Tag input field | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#field-types) |
| `latex` | LaTeX editor with preview | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#latex-type-latex) |
| `code` | Code editor with execution | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#code-field-type-code) |
| `api` | API-linked field with mapping | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#api-field-type-api) |
| `loopstart` / `loopstop` | Define repeating sections | [Docs](docs/TEMPLATE-SCHEMA-SYSTEM.md#loop-fields) |

See [Template & Schema System](docs/TEMPLATE-SCHEMA-SYSTEM.md) for complete field documentation.

---

## ⚙️ Configuration (user.json)

Saved to: `./config/user.json`

```json
{
  "theme": "dark",
  "font_size": 14,
  "logging_enabled": true,
  "context_mode": "storage",
  "context_folder": "./",
  "selected_template": "my-template.yaml",
  "selected_data_file": "example.meta.json",
  "author_name": "Regular User",
  "author_email": "regular@example.com",
  "use_git": true,
  "git_root": "./",
  "show_icon_buttons": true,
  "window_bounds": {
    "width": 1280,
    "height": 900,
    "x": 100,
    "y": 80
  }
}
```

- Values are validated and auto-repaired on load.
- UI updates are event-driven (`config:update`).

---

## 🚀 Getting Started

### Quick Start

```bash
git clone https://github.com/petervdpas/formidable.git
cd formidable
npm install
npm start
```

### Building

To build the Windows executable:

```bash
npm run build
```

> **Note:** Current packaging targets Windows.
> Linux and Mac packaging will be added in future.

### Learn More

- **New to Formidable?** Start with the [Documentation Index](docs/README.md)
- **Building plugins?** Check out the [Plugin System Guide](docs/PLUGIN-SYSTEM.md)
- **Working with forms?** See the [Form System](docs/FORM-SYSTEM.md) and [Field GUID System](docs/FIELD-GUID-SYSTEM.md)
- **Understanding architecture?** Read about [EventBus](docs/EVENTBUS-SYSTEM.md) and [Handler Pattern](docs/HANDLER-PATTERN.md)

---

## 🧑‍💻 Development Notes

### Quick Tips

- **CTRL+ENTER** → toggle fullscreen on template editor
- Templates = `.yaml`, Data = `.meta.json`, Images = `.jpg`/`.png`
- VFS auto-updates on create/save/delete
- Profile switching triggers full config refresh and context rehydration
- Markdown & Preview modal: supports split view and pane closing
- Modals: resizable, ESC-closable, backdrop click dismiss
- Git config per repo is cached

### Architecture Highlights

- **Event-Driven**: All operations flow through EventBus
- **Handler Pattern**: 30+ domain-specific handler modules
- **IPC Bridge**: Secure main ↔ renderer communication via contextBridge
- **Plugin System**: Hot-reloadable with declarative IPC
- **Field GUIDs**: Every field has a unique identifier for dynamic updates
- **Schema Validation**: All data validated and sanitized on load

### API Examples

**Field Manipulation (from code fields)**:

```javascript
// Get field value
const price = await CFA.field.getValue({ key: "price" });

// Set field value
await CFA.field.setValue({ key: "total", value: price * 1.2 });

// Update field options
await CFA.field.updateOptions({ 
  key: "status", 
  options: ["New", "Active", "Completed"] 
});
```

**Event-Driven Operations**:

```javascript
// Save form
await EventBus.emit("form:save", { 
  template: "my-template", 
  data: formData 
});

// Listen to events
EventBus.on("form:saved", (data) => {
  console.log("Form saved:", data);
});
```

**Plugin Development**:

```javascript
// plugin.json
{
  "name": "MyPlugin",
  "ipc": { "process": "handleProcess" }
}

// plugin.js
module.exports = {
  async run(context) {
    // Plugin logic
    return { success: true };
  },
  async handleProcess(event, payload) {
    // IPC handler
    return { result: "done" };
  }
};
```

See [Documentation](docs/README.md) for complete guides and examples.

---

## 📜 License

MIT © 2025 Peter van de Pas

---

## 🙏 Acknowledgments

Built with:

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [CodeMirror](https://codemirror.net/) - Code editor component
- [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) - Markdown editor
- [Handlebars](https://handlebarsjs.com/) - Template rendering

Special thanks to the open-source community.

---

## 🔗 Links

- **[GitHub Repository](https://github.com/petervdpas/Formidable)**
- **[Documentation Hub](docs/README.md)**
- **[Latest Release](https://github.com/petervdpas/Formidable/releases)**
- **[Issue Tracker](https://github.com/petervdpas/Formidable/issues)**
