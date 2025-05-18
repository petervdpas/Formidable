# 🧾 Formidable

**Formidable** is a dual-context desktop application for managing structured Markdown content through YAML-based templates. Built with Electron, it combines a full YAML editor with a form-based Markdown generator, offering a flexible and powerful editing experience.

---

## 📦 Download

**Latest Windows Installer**:  
👉 [Formidable Setup 1.0.0.exe](https://github.com/petervdpas/Formidable/raw/master/installer/Formidable%20Setup%201.0.0.exe)

---

## ✨ Key Features

- **🔧 Dual Editing Modes**
  - **Template Mode**: Define YAML-based form structures with fields, types, and layout.
  - **Markdown Mode**: Fill out metadata forms to render templated Markdown documents.

- **📄 YAML Template Editor**
  - Rich UI for adding, editing, reordering, and deleting form fields.
  - Field types include: text, checkbox, dropdown, radio, textarea, number, date, list, and table.
  - Live Handlebars-style preview rendering.

- **🧩 Dynamic Form Renderer**
  - Forms are generated from YAML templates and populate data into a structured interface.
  - Automatically injects defaults from the template if no metadata exists.

- **🖱️ Full GUI**
  - Modal-based dialogs for field editing, entry creation, and template management.
  - Split-view resizable layout for both template and form (storage) modes.
  - CodeMirror-based template editor with fullscreen support.

- **🎨 Theming + Persistence**
  - Light/Dark mode toggle with persisted config.
  - Settings stored in `user.json` with fallback validation and repair.

- **🧠 Event-Driven Architecture**
  - Built on a custom global EventBus (`modules/eventBus.js`) to decouple logic.
  - Dynamic context switching, menu events, and form/template syncing.

---

## 🧱 Folder Structure

```bash
Formidable/
├── index.html                  # Main HTML
├── renderer.js                 # App entrypoint (wires UI + EventBus)
├── main.js                     # Electron main process (IPC + shell)
│
├── assets/                     # All styles, icons, and CodeMirror themes
│   ├── layout.css              # Layout grid and panels
│   ├── theme.css               # Light theme
│   ├── dark-theme.css          # Dark mode overrides
│   ├── buttons.css             # Button appearance
│   ├── forms.css               # Field layout rules
│   ├── modal.css               # Modal positioning + resizing
│   ├── codemirror/             # Editor themes + YAML mode
│   └── sortable/               # SortableJS for drag-and-drop fields
│
├── modules/                    # Core UI + behavior modules
│   ├── yaml_editor.js          # Template editor UI (CodeMirror + fields)
│   ├── formUI.js               # Form loader + handler
│   ├── formRenderer.js         # Converts templates to field DOM
│   ├── contextManager.js       # View switching: template vs from(storage)
│   ├── templateSelector.js     # Dropdown sync for selected template
│   ├── sidebarManager.js       # Lists for templates and entries
│   ├── modalManager.js         # Modal control (ESC, sizing, etc)
│   ├── menuManager.js          # In-app HTML menu bar logic
│   ├── eventBus.js             # Global publish/subscribe hub
│   └── handlers/               # Event handlers for template, form, context, etc.
│
├── controls/                   # App-level config and file logic
│   ├── configManager.js        # Persistent user settings (theme, context, etc)
│   ├── fileManager.js          # YAML, JSON, text I/O (safe + relative)
│   └── nodeLogger.js           # Safe logging with silent toggle
│
├── schemas/                    # Structural validation/sanitization
│   ├── config.schema.js        # `user.json` structure and defaults
│   ├── template.schema.js      # Safe YAML template sanitizer
│   └── meta.schema.js          # Markdown metadata fallback/defaults
│
├── utils/                      # Shared rendering and parsing logic
│   ├── fieldRenderers.js       # Render DOM inputs by type
│   ├── fieldParsers.js         # Parse DOM inputs to JS values
│   ├── formUtils.js            # Template → form → data mapping
│   ├── configUtils.js          # Config fallback selector
│   ├── pathUtils.js            # Filename helpers and normalization
│   ├── modalUtils.js           # ESC close and type highlighting
│   ├── resizing.js             # Splitter + modal resizer logic
│   ├── elementBuilders.js      # Labeled input/textarea/select generators
│   └── uiBehaviors.js          # Field highlighting, focus, and event bindings
│
├── scripts/
│   └── patch-icon.js           # Windows icon patch using `rcedit`
````

---

## 🧠 Template Syntax

Templates use a Handlebars-inspired syntax to insert and conditionally render fields:

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

Field references:

- `{{field "key"}}` — formatted value
- `{{fieldRaw "key"}}` — raw JS value (array, boolean, etc.)
- `{{fieldMeta "key" "property"}}` — access to template metadata (e.g., column headers)

---

## 🧪 Field Types Supported

| Type       | Description          | Supported Features                |
| ---------- | -------------------- | --------------------------------- |
| `text`     | Single-line input    | Defaults                          |
| `textarea` | Multi-line input     | Scrollable text block             |
| `boolean`  | Checkbox toggle      | Checkbox or conditional logic     |
| `dropdown` | Select from list     | Static options                    |
| `radio`    | Choose one option    | Field-level layout                |
| `number`   | Numeric input        | Step input, default, numeric cast |
| `date`     | Date picker          | ISO-style formatting              |
| `list`     | Dynamic input list   | Add/remove items                  |
| `table`    | Dynamic table editor | Multi-column row editing          |

---

## ⚙️ Configuration (user.json)

Saved to `./config/user.json`:

```json
{
  "selected_template": "basic.yaml",
  "selected_data_file": "",
  "theme": "dark",
  "font_size": 14,
  "context_mode": "template",
  "storage_location": "./storage",
  "window_bounds": { "width": 1024, "height": 800 }
}
```

All config values are validated and auto-repaired on load. Partial writes (e.g. via UI) merge with existing config safely.

---

## 🚀 Getting Started

```bash
git clone https://github.com/petervdpas/formidable.git
cd formidable
npm install
npm start
```

To build the Windows executable (and optionally patch the icon):

```bash
npm run build
```

> **Note**: This assumes you're running on Windows. The icon will be patched into `dist/win-unpacked/Formidable.exe` before packaging using `rcedit`, which is bundled with `electron-builder`. No global install is required.
> Linux and Mac builds need to be added. The current build process is pretty much Windows-specific.

---

## 🧪 Development Notes

- Use `CTRL+ENTER` to toggle fullscreen on the template editor.
- All data is stored locally using `yaml` (templates), `meta.json` (data files), and relative paths.
- Template fields support drag-and-drop reordering via Sortable.js.
- Modals are resizable and ESC-closable with backdrop click.

---

## 📜 License

MIT © 2025 Peter van de Pas

