# Virtual File System (VFS)

## Overview

The **Virtual File System (VFS)** is Formidable's intelligent storage organization layer that automatically manages templates, forms, and their associated files. It provides a unified view of the file structure, maintains consistency between disk and memory, and enables efficient navigation through the sidebar.

## Architecture

### Directory Structure

```text
context_folder/
├── templates/
│   ├── template1.yaml
│   ├── template2.yaml
│   └── template3.yaml
└── storage/
    ├── template1/
    │   ├── form1.meta.json
    │   ├── form2.meta.json
    │   └── images/
    │       ├── image1.png
    │       └── image2.jpg
    ├── template2/
    │   ├── form1.meta.json
    │   └── images/
    └── template3/
        └── images/
```

### VFS Structure

The VFS builds a virtual representation of the filesystem:

```javascript
{
  context: "/absolute/path/to/context",
  templates: "/absolute/path/to/context/templates",
  storage: "/absolute/path/to/context/storage",
  templateStorageFolders: {
    "template-name": {
      name: "template-name",
      filename: "template-name.yaml",
      path: "/absolute/path/to/storage/template-name",
      metaFiles: ["form1.meta.json", "form2.meta.json"],
      imageFiles: ["image1.png", "image2.jpg"]
    }
  }
}
```

## Core Concepts

### 1. Auto-Sync

The VFS automatically synchronizes when:
- Templates are created, saved, or deleted
- Forms are created, saved, or deleted
- Images are uploaded
- Configuration changes occur
- Profile switches happen

### 2. Context Folder

The context folder is the root of all Formidable data:

```javascript
// Get context path
const contextPath = await window.api.config.getContextPath();

// Set context folder in config
await EventBus.emit("config:update", { 
  context_folder: "./my-workspace" 
});
```

**Relative paths** are resolved relative to the application directory, making Formidable portable on USB drives.

### 3. Storage Organization

Each template has its own storage folder:

```javascript
// Get storage folder for a template
const storagePath = await window.api.config.getTemplateStoragePath(
  "my-template.yaml"
);

// Get meta files for a template
const metaFiles = await window.api.config.getTemplateMetaFiles(
  "my-template.yaml"
);

// Get image files for a template
const imageFiles = await window.api.config.getTemplateImageFiles(
  "my-template.yaml"
);
```

## VFS Operations

### Initialization

The VFS is initialized on application boot:

```javascript
// Initialize VFS
await EventBus.emit("vfs:init");

// Reload VFS structure
await EventBus.emit("vfs:reload");

// Clear VFS cache
await EventBus.emit("vfs:clear");
```

### Querying VFS

```javascript
// Get complete VFS structure
const vfs = await window.api.config.getVirtualStructure();

// Access template storage folders
const templateFolders = vfs.templateStorageFolders;

// Get specific template info
const templateInfo = templateFolders["my-template"];
console.log(templateInfo.metaFiles); // Array of .meta.json files
console.log(templateInfo.imageFiles); // Array of image files
```

### Updating VFS

The VFS automatically updates, but you can trigger manual updates:

```javascript
// Update specific key in VFS cache
await EventBus.emit("vfs:update", {
  key: "templates",
  value: updatedTemplatesList
});

// Refresh specific template entry
await EventBus.emit("vfs:refreshTemplate", {
  templateName: "my-template"
});

// Delete entry from VFS
await EventBus.emit("vfs:delete", {
  key: "someKey"
});
```

### Listing Operations

```javascript
// List all templates
await EventBus.emit("vfs:listTemplates", {
  callback: (templates) => {
    console.log("Templates:", templates);
  }
});

// Get meta files for a template
await EventBus.emit("vfs:getTemplateMetaFiles", {
  templateName: "my-template",
  callback: (files) => {
    console.log("Meta files:", files);
  }
});
```

## VFS Cache System

### Cache Storage

The VFS uses the cache system to store paths and structures:

```javascript
// Cached items
{
  contextPath: "/absolute/path",
  templatesPath: "/absolute/path/templates",
  storagePath: "/absolute/path/storage",
  templates: ["template1.yaml", "template2.yaml"],
  templateStorageFolders: { /* structure */ }
}
```

### Cache Management

```javascript
// Put value in VFS cache
await EventBus.emit("cache:put", {
  storeName: "vfs",
  item: { id: "contextPath", value: "/new/path" }
});

// Get value from VFS cache
await EventBus.emit("cache:get", {
  storeName: "vfs",
  key: "contextPath",
  callback: (value) => {
    console.log("Context path:", value);
  }
});

// Clear VFS cache
await EventBus.emit("cache:clear", {
  storeName: "vfs"
});
```

## Sidebar Integration

### Auto-Synced View

The VFS powers the sidebar, which displays:
- All templates in the templates folder
- All forms for the selected template
- Quick navigation to forms

### Storage Mode vs Template Mode

**Template Mode**:
- Shows template files (`.yaml`)
- Edit template structure
- Manage field definitions

**Storage Mode**:
- Shows form files (`.meta.json`)
- Create/edit/delete forms
- View all forms for a template

```javascript
// Switch context mode
await EventBus.emit("context:toggle", true); // Storage mode
await EventBus.emit("context:toggle", false); // Template mode

// Get current mode
const config = await window.api.config.loadUserConfig();
console.log(config.context_mode); // "storage" or "template"
```

## VFS Handlers

### Event Handlers

The VFS system registers these event handlers:

| Event | Handler | Description |
|-------|---------|-------------|
| `vfs:init` | `initVFS` | Initialize VFS structure |
| `vfs:clear` | `clearVFS` | Clear VFS cache |
| `vfs:reload` | `reloadVFS` | Reload VFS from disk |
| `vfs:update` | `updateVFSKey` | Update specific key |
| `vfs:delete` | `deleteVFSKey` | Delete entry |
| `vfs:refreshTemplate` | `refreshTemplateEntry` | Refresh template info |
| `vfs:listTemplates` | `handleListTemplates` | List all templates |
| `vfs:getTemplateMetaFiles` | `handleGetTemplateMetaFiles` | Get meta files |

### Handler Implementation

Located in: `modules/handlers/vfsHandler.js`

```javascript
// Initialize VFS
export async function initVFS() {
  await loadContextPaths();
  await loadTemplateEntries();
  EventBus.emit("logging:default", ["[VFS] Initialized"]);
}

// Reload VFS
export async function reloadVFS() {
  await window.api.config.invalidateConfigCache();
  await initVFS();
  EventBus.emit("logging:default", ["[VFS] Reloaded"]);
}

// Clear VFS
export async function clearVFS() {
  await EventBus.emit("cache:clear", { storeName: "vfs" });
  EventBus.emit("logging:default", ["[VFS] Cleared"]);
}
```

## Context Path Management

### Getting Paths

```javascript
// Get context root
const context = await window.api.config.getContextPath();

// Get templates folder
const templatesFolder = await window.api.config.getTemplatesFolder();

// Get storage folder
const storageFolder = await window.api.config.getStorageFolder();
```

### Resolving Paths

```javascript
// Resolve relative to context
const fullPath = await window.api.system.resolvePath(
  context,
  "storage",
  "my-template",
  "form.meta.json"
);
```

## Template Storage Info

### Getting Storage Info

```javascript
// Get complete storage info for a template
const info = await window.api.config.getTemplateStorageInfo(
  "my-template.yaml"
);

console.log(info);
// {
//   name: "my-template",
//   filename: "my-template.yaml",
//   path: "/absolute/path/to/storage/my-template",
//   metaFiles: ["form1.meta.json", "form2.meta.json"],
//   imageFiles: ["image1.png"]
// }
```

### Single Template Entry

```javascript
// Get entry for a specific template
const entry = await window.api.config.getSingleTemplateEntry(
  "my-template"
);

// Auto-creates storage and images folders if missing
```

## VFS Best Practices

### 1. Always Use VFS APIs

```javascript
// ✅ Good - uses VFS
const vfs = await window.api.config.getVirtualStructure();
const metaFiles = vfs.templateStorageFolders["my-template"].metaFiles;

// ❌ Bad - hardcoded paths
const metaFiles = fs.readdirSync("./storage/my-template");
```

### 2. Invalidate Cache When Needed

```javascript
// After file operations
await window.api.config.invalidateConfigCache();
await EventBus.emit("vfs:reload");
```

### 3. Listen to VFS Events

```javascript
// React to VFS changes
EventBus.on("vfs:updated", (data) => {
  console.log("VFS updated:", data);
  // Update UI accordingly
});
```

### 4. Use Relative Paths for Portability

```javascript
// ✅ Good - portable
{
  context_folder: "./"
}

// ❌ Bad - hardcoded absolute path
{
  context_folder: "C:/Users/John/workspace"
}
```

## Common Workflows

### Creating a New Template

```javascript
// 1. Create template file
await window.api.templates.saveTemplate("new-template.yaml", templateData);

// 2. VFS auto-creates storage folder
// storage/new-template/ is created automatically

// 3. Reload VFS
await EventBus.emit("vfs:reload");
```

### Uploading an Image

```javascript
// 1. Save image to template storage
const result = await window.api.system.saveImageFile(
  storagePath,
  "image.png",
  imageBuffer
);

// 2. VFS auto-detects the new image
await EventBus.emit("vfs:refreshTemplate", {
  templateName: "my-template"
});
```

### Deleting a Form

```javascript
// 1. Delete meta file
await window.api.system.deleteFile(metaFilePath);

// 2. Refresh VFS
await EventBus.emit("vfs:refreshTemplate", {
  templateName: "my-template"
});
```

### Switching Context Folder

```javascript
// 1. Update config
await EventBus.emit("config:update", {
  context_folder: "./new-workspace"
});

// 2. VFS rebuilds automatically
// All paths are recalculated
// Sidebar updates to show new location
```

## Troubleshooting

### VFS Out of Sync

**Symptoms**: Sidebar doesn't show recent files

**Solution**:
```javascript
await window.api.config.invalidateConfigCache();
await EventBus.emit("vfs:reload");
```

### Storage Folder Missing

**Symptoms**: Template has no storage folder

**Solution**:
```javascript
// VFS auto-creates storage folders
await EventBus.emit("vfs:refreshTemplate", {
  templateName: "my-template"
});
```

### Images Not Showing

**Symptoms**: Uploaded images don't appear in VFS

**Solution**:
```javascript
// Refresh template entry to scan images folder
await EventBus.emit("vfs:refreshTemplate", {
  templateName: "my-template"
});
```

### Context Path Not Resolved

**Symptoms**: Relative paths not working

**Solution**:
```javascript
// Check context_folder in config
const config = await window.api.config.loadUserConfig();
console.log("Context folder:", config.context_folder);

// Ensure it's a valid path
await window.api.system.ensureDirectory(config.context_folder);
```

## VFS Implementation Details

### File Manager Integration

The VFS relies on `fileManager` for all disk operations:

```javascript
// List files by extension
fileManager.listFilesByExtension(templatesPath, ".yaml");

// List all files in directory
fileManager.listFiles(imagesPath);

// Ensure directory exists
fileManager.ensureDirectory(storagePath);
```

### Config Manager Integration

The VFS is built by `configManager`:

```javascript
function buildVirtualStructure(config) {
  const base = fileManager.resolvePath(config.context_folder || "./");
  const templatesPath = path.join(base, "templates");
  const storagePath = path.join(base, "storage");
  
  // Scan templates
  const templateFiles = fileManager.listFilesByExtension(
    templatesPath, 
    ".yaml"
  );
  
  // Build storage folders map
  const templateStorageFolders = {};
  for (const file of templateFiles) {
    const name = file.replace(/\.yaml$/, "");
    const templateStoragePath = path.join(storagePath, name);
    
    // Auto-create if missing
    fileManager.ensureDirectory(templateStoragePath);
    
    // Scan meta files
    const metaFiles = fileManager.listFilesByExtension(
      templateStoragePath,
      ".meta.json"
    );
    
    // Scan images
    const imagesPath = path.join(templateStoragePath, "images");
    fileManager.ensureDirectory(imagesPath);
    const imageFiles = fileManager.listFiles(imagesPath);
    
    templateStorageFolders[name] = {
      name,
      filename: file,
      path: templateStoragePath,
      metaFiles,
      imageFiles
    };
  }
  
  return {
    context: base,
    templates: templatesPath,
    storage: storagePath,
    templateStorageFolders
  };
}
```

## Related Documentation

- [Configuration System](./CONFIGURATION-SYSTEM.md) - Config management
- [Form System](./FORM-SYSTEM.md) - Form storage and retrieval
- [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md) - Template structure

## API Reference

### window.api.config

| Method | Description |
|--------|-------------|
| `getVirtualStructure()` | Get complete VFS structure |
| `getContextPath()` | Get context root path |
| `getTemplatesFolder()` | Get templates folder path |
| `getStorageFolder()` | Get storage folder path |
| `getTemplateStorageInfo(filename)` | Get storage info for template |
| `getTemplateStoragePath(filename)` | Get storage path for template |
| `getTemplateMetaFiles(filename)` | Get meta files for template |
| `getTemplateImageFiles(filename)` | Get image files for template |
| `getSingleTemplateEntry(name)` | Get single template entry |
| `invalidateConfigCache()` | Clear config and VFS cache |

### EventBus Events

| Event | Payload | Description |
|-------|---------|-------------|
| `vfs:init` | - | Initialize VFS |
| `vfs:clear` | - | Clear VFS cache |
| `vfs:reload` | - | Reload VFS from disk |
| `vfs:update` | `{ key, value }` | Update VFS key |
| `vfs:delete` | `{ key }` | Delete VFS key |
| `vfs:refreshTemplate` | `{ templateName }` | Refresh template entry |
| `vfs:listTemplates` | `{ callback }` | List all templates |
| `vfs:getTemplateMetaFiles` | `{ templateName, callback }` | Get meta files |

---

**VFS Version**: 1.0  
**Last Updated**: 2024
