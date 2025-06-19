# 🧾 Formidable — The Dynamic Form & Template Designer

**Formidable** is a modular Electron desktop application for creating, managing, and rendering dynamic forms and Markdown documents from YAML-based templates. It combines a visual form editor with a powerful Handlebars-style rendering engine, a built-in virtual file system (VFS), and optional Git integration — designed for professionals who need structured content management, versioning, and auditability.

---

## ⚠️ Pre-release

> This version of Formidable is a pre-release for testing and feedback.
> Expect missing features or bugs. Use at your own risk.
> See the [release notes](https://github.com/petervdpas/Formidable/releases/tag/v1.6.0-pre) for details.

**Latest Windows Installer**:
👉 [Formidable Setup.exe (Pre-release)](https://github.com/petervdpas/Formidable/releases/download/v1.6.0-pre/Formidable.Setup.exe)

---

## ✨ Key Features

* **⚙️ Dynamic Template & Form System**

  * YAML-based templates with async field renderers
  * Visual form editor with live preview
  * Full Markdown renderer using Handlebars-style syntax

* **🧩 Modular Event Architecture**

  * Custom global EventBus for decoupled module interaction
  * Dynamic context switching (template + storage)
  * Profile-based configuration

* **📁 Virtual File System (VFS)**

  * Organized storage by context and template
  * Full control over storage folders, paths, and metadata
  * Auto-synced view of the VFS in the sidebar

* **🔀 Git Integration (Optional)**

  * Commit, push, pull from the UI
  * Git remote info and branch listing
  * Supports Azure DevOps workflows (credential.helper + useHttpPath)

* **🖥️ Clean, Modern UI**

  * Modal-based dialogs (template edit, form edit, Git actions)
  * Independently closable and resizable Markdown/Preview panes
  * Full light/dark theming, configurable icon or label buttons

* **🔗 Internal Linking & Wiki Support**

  * Support for internal form links (`formIdLink` fields)
  * Future-proof architecture for internal wiki server (localhost)

* **🔎 Designed for Auditability**

  * "Auditability by Design" approach: trackable metadata, version control, profiles
  * Suitable for regulated environments

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

* `{{field "key"}}` → formatted value
* `{{fieldRaw "key"}}` → raw JS value
* `{{fieldMeta "key" "property"}}` → field metadata access

---

## 📋 Supported Field Types

| Type                     | Description            |
| ------------------------ | ---------------------- |
| `text`                   | Single-line input      |
| `textarea`               | Multi-line text block  |
| `boolean`                | Checkbox toggle        |
| `dropdown`               | Select from list       |
| `radio`                  | Radio button group     |
| `number`                 | Numeric input          |
| `date`                   | ISO-style date picker  |
| `list`                   | Dynamic list input     |
| `table`                  | Editable table grid    |
| `image`                  | Upload & preview image |
| `link`                   | Link to external or another form   |
| `loopstart` / `loopstop` | Define loop sections   |

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

* Values are validated and auto-repaired on load.
* UI updates are event-driven (`config:update`).

---

## 🚀 Getting Started

```bash
git clone https://github.com/petervdpas/formidable.git
cd formidable
npm install
npm start
```

To build the Windows executable:

```bash
npm run build
```

> **Note:** Current packaging targets Windows.
> Linux and Mac packaging will be added in future.

---

## 🧑‍💻 Development Notes

* **CTRL+ENTER** → toggle fullscreen on template editor
* Templates = `.yaml`, Data = `.meta.json`, Images = `.jpg`/`.png`
* VFS auto-updates on create/save/delete
* Modals: resizable, ESC-closable, backdrop click dismiss
* Git config per repo is cached

---

## 📜 License

MIT © 2025 Peter van de Pas
