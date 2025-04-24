# 🧾 Formidable

**Formidable** is a dual-context Electron app for editing structured Markdown content using YAML-based form templates.

It supports two main editing modes:

- **Setup Mode**: Design YAML templates that define the structure of Markdown documents (fields, types, labels, etc.)
- **Markdown Mode**: Use these templates to create and edit Markdown files through a guided form-based UI.

## ✨ Features

- 🧩 **Dynamic dual-pane layout** with resizable splitter
- 🎨 **Light/Dark theme toggle** with persisted user settings
- ⚙️ **Settings modal** with context + theme toggles
- 📝 **YAML form editor** for building Markdown templates
- 📂 **Markdown editor** based on active YAML setup
- 💾 Persistent configuration and recent file tracking

## 🛠 Technologies

- Electron
- JavaScript (ES Modules)
- HTML + CSS (with modular layout/theme separation)
- Node.js IPC for config and file access

## 📁 Folder Structure

```sh
├── index.html
├── renderer.js
├── main.js
├── assets/
│   ├── layout.css
│   ├── theme.css
│   ├── dark-theme.css
│   └── forms.css
├── modules/
│   ├── modalManager.js
│   ├── splitter.js
│   └── yaml_editor.js
```
