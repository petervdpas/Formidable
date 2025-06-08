# 🧾 Formidable - a template designer

**Formidable** is a dual-context desktop application for managing structured Markdown content through YAML-based templates. Built with Electron, it combines a full YAML editor with a form-based Markdown generator, offering a flexible and powerful editing experience.

---

## ⚠️ Pre-release

> Deze versie van Formidable is een **pre-release** bedoeld voor testen en feedback.
> Mogelijk ontbreken er nog functies of treden bugs op. Gebruik op eigen risico.
> Zie de [release notes](https://github.com/petervdpas/Formidable/releases/tag/v1.4.0-pre) voor details.

**Latest Windows Installer**:  
👉 [Formidable Setup.exe (Pre-release)](https://github.com/petervdpas/Formidable/releases/download/v1.4.0-pre/Formidable.Setup.exe)

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
  "theme": "light",
  "font_size": 14,
  "logging_enabled": true,
  "context_mode": "storage",
  "context_folder": "./",
  "selected_template": "basic.yaml",
  "selected_data_file": "sane-20250530.meta.json",
  "author_name": "Regular user",
  "author_email": "regular@example.com",
  "window_bounds": {
    "width": 1130,
    "height": 903,
    "x": 108,
    "y": 93
  }
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
