# Template & Schema System

## Overview

Formidable uses a **schema-based template system** to define form structures. Templates describe the fields, validation rules, and behavior of forms. All templates and data are validated using schema modules.

## Schema Modules

### Location
Schemas are in: `schemas/`

### Available Schemas

```text
schemas/
├── template.schema.js     # Template structure
├── field.schema.js        # Field definitions
├── meta.schema.js         # Metadata structure
├── config.schema.js       # Configuration
├── boot.schema.js         # Boot configuration
└── plugin.schema.js       # Plugin manifest
```

## Template Schema

### Structure

Templates define the overall form structure:

```javascript
{
  name: "My Template",                    // Display name
  filename: "my-template.yaml",           // Storage filename
  item_field: "",                         // Key field for collections
  markdown_template: "",                  // Template for markdown export
  sidebar_expression: "",                 // Expression for sidebar display
  enable_collection: false,               // Enable as collection
  fields: []                              // Array of field definitions
}
```

### Defaults

```javascript
// schemas/template.schema.js
defaults: {
  name: "",
  filename: "",
  item_field: "",
  markdown_template: "",
  sidebar_expression: "",
  enable_collection: false,
  fields: [],
}
```

### Validation

```javascript
const templateSchema = require("./schemas/template.schema.js");

// Sanitize and validate
const template = templateSchema.sanitize(rawTemplate, filename);
```

**Sanitization Process**:
1. Applies default values
2. Type checks each field
3. Validates nested field schemas
4. Preserves unknown keys for extensibility

### Template Properties

#### `name` (string)

Display name shown in UI.

```javascript
{ name: "Project Planning Template" }
```

#### `filename` (string)
Filename used for storage (typically `.yaml`).

```javascript
{ filename: "project-planning.yaml" }
```

#### `item_field` (string)
For collections, the field key used as the primary identifier.

```javascript
{ 
  enable_collection: true,
  item_field: "project_name"
}
```

#### `markdown_template` (string)
Template string for markdown export. Uses `{{field_key}}` placeholders.

```javascript
{
  markdown_template: `# {{title}}

**Author**: {{author}}
**Date**: {{date}}

## Description
{{description}}
`
}
```

#### `sidebar_expression` (string)
Expression evaluated for sidebar display text.

```javascript
{ sidebar_expression: "title + ' - ' + status" }
```

#### `enable_collection` (boolean)
Whether this template can have multiple instances (collection mode).

```javascript
{ enable_collection: true }
```

#### `fields` (array)
Array of field definitions (see Field Schema below).

```javascript
{
  fields: [
    { key: "title", type: "text", label: "Title" },
    { key: "description", type: "textarea", label: "Description" }
  ]
}
```

## Field Schema

### Structure

Fields define individual form inputs:

```javascript
{
  key: "my_field",              // Unique identifier
  type: "text",                 // Field type
  label: "My Field",            // Display label
  description: "",              // Help text
  summary_field: "",            // For loops: summary display
  expression_item: false,       // Enable in expressions
  two_column: false,            // Use two columns
  default: "",                  // Default value
  options: []                   // For dropdown/radio/multi
}
```

### Field Types

Formidable supports 20 field types:

| Type | Purpose | Example |
|------|---------|---------|
| `guid` | Auto-generated GUID | Internal identifier |
| `text` | Single-line text input | Name, title |
| `textarea` | Multi-line text | Description, notes |
| `number` | Numeric input | Age, quantity |
| `boolean` | Checkbox | Enabled/disabled flag |
| `dropdown` | Single-select dropdown | Status selection |
| `radio` | Radio button group | Priority level |
| `multioption` | Multi-select checkboxes | Tags, categories |
| `date` | Date picker | Due date |
| `range` | Slider input | Rating, percentage |
| `list` | Dynamic list of items | Bullet points |
| `table` | Tabular data | Data grid |
| `tags` | Tag input | Keywords |
| `latex` | LaTeX editor | Math formulas |
| `code` | Code editor | Scripts, formulas |
| `api` | API-linked field | External data |
| `link` | URL input | Website, document link |
| `image` | Image uploader | Photo, diagram |
| `loopstart` | Begin loop section | Repeating group start |
| `loopstop` | End loop section | Repeating group end |

### Field Defaults

```javascript
// schemas/field.schema.js
defaults: {
  key: "",
  type: "text",
  label: "",
  description: "",
  summary_field: "",
  expression_item: false,
  two_column: false,
  default: "",
  options: [],
}
```

### Type-Specific Properties

#### Text Area (`type: "textarea"`)

```javascript
{
  type: "textarea",
  format: "markdown"    // "markdown" | "plain"
}
```

#### LaTeX (`type: "latex"`)

```javascript
{
  type: "latex",
  rows: 12,              // Editor height
  use_fenced: true,      // Use fenced code blocks
  placeholder: ""        // Placeholder text
}
```

**Defaults**:
```javascript
latexDefaults: {
  rows: 12,
  use_fenced: true,
  placeholder: "",
}
```

#### Code Field (`type: "code"`)

```javascript
{
  type: "code",
  run_mode: "manual",      // "manual" | "load" | "save"
  allow_run: false,        // Enable run button
  input_mode: "safe",      // "safe" | "raw"
  api_mode: "frozen",      // "frozen" | "raw"
  api_pick: []             // Array of exposed APIs
}
```

**Defaults**:
```javascript
codeDefaults: {
  run_mode: "manual",
  allow_run: false,
  input_mode: "safe",
  api_mode: "frozen",
  api_pick: [],
}
```

**Run Modes**:
- `manual`: User clicks run button
- `load`: Auto-runs when form loads
- `save`: Auto-runs before form saves

**Input Modes**:
- `safe`: Sandboxed execution
- `raw`: Direct access to form data

**API Modes**:
- `frozen`: Limited API access (security)
- `raw`: Full API access

#### API Field (`type: "api"`)

```javascript
{
  type: "api",
  collection: "users",     // API collection name
  id: "",                  // Selected item ID
  map: [                   // Field mapping
    { key: "name", path: "name", mode: "static" },
    { key: "email", path: "contact.email", mode: "editable" }
  ],
  use_picker: false,       // Enable picker UI
  allowed_ids: []          // Restrict to specific IDs
}
```

**Defaults**:
```javascript
apiDefaults: {
  collection: "",
  id: "",
  map: [],
  use_picker: false,
  allowed_ids: [],
}
```

**Map Modes**:
- `static`: Display only, not editable
- `editable`: Can be modified in form

#### Dropdown/Radio/Multioption

```javascript
{
  type: "dropdown",
  options: [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" }
  ]
}
```

Or simple string array:
```javascript
{
  type: "dropdown",
  options: ["Option 1", "Option 2", "Option 3"]
}
```

### Loop Fields

Loops create repeating sections:

```javascript
{
  fields: [
    {
      key: "tasks_loop",
      type: "loopstart",
      label: "Tasks",
      summary_field: "task_name"
    },
    {
      key: "task_name",
      type: "text",
      label: "Task Name"
    },
    {
      key: "task_status",
      type: "dropdown",
      label: "Status",
      options: ["Todo", "In Progress", "Done"]
    },
    {
      type: "loopstop"
    }
  ]
}
```

**`summary_field`**: Field key to display in loop summary.

## Schema Validation

### Template Validation

```javascript
const templateSchema = require("./schemas/template.schema.js");

const rawTemplate = {
  name: "My Template",
  fields: [
    { key: "title", type: "text" }
  ]
};

// Sanitize (applies defaults, validates types)
const template = templateSchema.sanitize(rawTemplate, "my-template.yaml");

// Now safe to use
console.log(template.name);           // "My Template"
console.log(template.enable_collection); // false (default)
console.log(template.fields[0].label);   // "" (default)
```

### Field Validation

```javascript
const fieldSchema = require("./schemas/field.schema.js");

const rawField = {
  key: "my_field",
  type: "unknown_type",  // Invalid
  label: "My Field"
};

// Sanitize
const field = fieldSchema.sanitize(rawField);

// Type corrected to default
console.log(field.type); // "text" (fallback)
```

### Validation Errors

Schemas throw errors for critical issues:

```javascript
try {
  const field = fieldSchema.sanitize({
    key: "",  // Empty key
    type: "loopstart"
  });
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

## Template Storage

### File Format

Templates are stored as YAML files:

```yaml
# templates/project-planning.yaml

name: Project Planning
filename: project-planning.yaml
enable_collection: true
item_field: project_name

fields:
  - key: project_name
    type: text
    label: Project Name
    description: Enter the project name
    
  - key: description
    type: textarea
    label: Description
    format: markdown
    
  - key: status
    type: dropdown
    label: Status
    options:
      - Planning
      - In Progress
      - Completed
```

### Loading Templates

```javascript
// Via EventBus
const template = await EventBus.emitWithResponse("template:load", {
  name: "project-planning"
});

// Via IPC
const template = await window.api.templates.loadTemplate("project-planning");
```

### Saving Templates

```javascript
// Via EventBus
await EventBus.emit("template:save", {
  name: "project-planning",
  data: templateData
});

// Via IPC
await window.api.templates.saveTemplate("project-planning", templateData);
```

## Form Data Structure

### Data Storage

Form data is stored separately from templates:

```yaml
# storage/project-planning/project-001.yaml

template: project-planning
filename: project-001.yaml

data:
  project_name: "Website Redesign"
  description: "Redesign company website with modern UI"
  status: "In Progress"
  
meta:
  created: 2024-01-15T10:30:00Z
  modified: 2024-01-20T14:22:00Z
```

### Meta Schema

Metadata tracks form history:

```javascript
{
  created: "2024-01-15T10:30:00Z",
  modified: "2024-01-20T14:22:00Z",
  author: "user@example.com",
  version: 1
}
```

## Template Editor

### Creating Templates

Templates can be created via:

1. **UI Editor**: Visual template designer
2. **YAML Files**: Direct file editing
3. **API**: Programmatic creation

### Template Operations

```javascript
// List all templates
const templates = await EventBus.emitWithResponse("template:list");

// Load template
const template = await EventBus.emitWithResponse("template:load", {
  name: "project-planning"
});

// Save template
await EventBus.emit("template:save", {
  name: "project-planning",
  data: templateData
});

// Delete template
await EventBus.emit("template:delete", {
  name: "project-planning"
});

// Validate template
const validation = await EventBus.emitWithResponse("template:validate", {
  data: templateData
});
```

## Collections

### Collection Mode

When `enable_collection: true`, templates support multiple instances:

```javascript
{
  name: "Project Template",
  enable_collection: true,
  item_field: "project_name",
  fields: [
    { key: "project_name", type: "text", label: "Project Name" },
    { key: "status", type: "dropdown", label: "Status" }
  ]
}
```

### Collection Storage

Each instance is a separate file:

```text
storage/project-template/
├── project-001.yaml
├── project-002.yaml
└── project-003.yaml
```

### Loading Collection Items

```javascript
// List all items in collection
const items = await EventBus.emitWithResponse("form:list", {
  template: "project-template"
});

// Load specific item
const item = await EventBus.emitWithResponse("form:load", {
  template: "project-template",
  filename: "project-001.yaml"
});
```

## Schema Extensibility

Schemas preserve unknown keys for extensibility:

```javascript
const rawTemplate = {
  name: "My Template",
  custom_property: "custom_value",  // Not in schema
  fields: []
};

const template = templateSchema.sanitize(rawTemplate);

console.log(template.custom_property); // "custom_value" (preserved)
```

This allows:
- Plugin-specific properties
- Future schema additions
- Custom metadata

## Best Practices

### 1. Always Sanitize

```javascript
// ❌ Bad - use raw data
const field = rawData.fields[0];

// ✅ Good - sanitize first
const template = templateSchema.sanitize(rawData);
const field = template.fields[0];
```

### 2. Validate Before Save

```javascript
async function saveTemplate(data) {
  // Validate
  const template = templateSchema.sanitize(data);
  
  // Then save
  await saveToFile(template);
}
```

### 3. Use Defaults

```javascript
// Let schema apply defaults
const field = fieldSchema.sanitize({
  key: "my_field",
  type: "text"
  // label, description, etc. will be defaulted
});
```

### 4. Type Check

```javascript
// Schemas ensure types
const template = templateSchema.sanitize(raw);
console.log(typeof template.enable_collection); // Always "boolean"
console.log(Array.isArray(template.fields));    // Always true
```

### 5. Handle Loops Properly

```javascript
// Always pair loopstart/loopstop
fields: [
  { type: "loopstart", key: "items", summary_field: "name" },
  { type: "text", key: "name" },
  { type: "loopstop" }
]
```

## Common Patterns

### Pattern 1: Simple Form

```javascript
{
  name: "Contact Form",
  fields: [
    { key: "name", type: "text", label: "Name" },
    { key: "email", type: "text", label: "Email" },
    { key: "message", type: "textarea", label: "Message" }
  ]
}
```

### Pattern 2: Dropdown Options

```javascript
{
  key: "priority",
  type: "dropdown",
  label: "Priority",
  options: [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" }
  ]
}
```

### Pattern 3: Repeating Sections

```javascript
{
  fields: [
    { type: "loopstart", key: "team_members", summary_field: "name" },
    { key: "name", type: "text", label: "Name" },
    { key: "role", type: "text", label: "Role" },
    { key: "email", type: "text", label: "Email" },
    { type: "loopstop" }
  ]
}
```

### Pattern 4: Code Fields

```javascript
{
  key: "calculation",
  type: "code",
  label: "Calculation",
  run_mode: "manual",
  allow_run: true,
  api_mode: "frozen",
  api_pick: ["field", "form"]
}
```

### Pattern 5: API Fields

```javascript
{
  key: "user_data",
  type: "api",
  label: "User",
  collection: "users",
  use_picker: true,
  map: [
    { key: "display_name", path: "name", mode: "static" },
    { key: "email", path: "email", mode: "editable" }
  ]
}
```

## Troubleshooting

### Field Not Rendering

**Check**:
1. Field has `key` property
2. Field `type` is valid
3. Field is not inside incomplete loop

### Options Not Showing

**Check**:
1. `options` is an array
2. Options have `label` and `value` (or are strings)
3. Field type supports options (dropdown, radio, multioption)

### Loop Not Working

**Check**:
1. `loopstart` has `key` property
2. `loopstart` has `summary_field` matching a child field
3. `loopstop` exists after fields

### Default Not Applied

**Check**:
1. Field has `default` property set
2. Default value matches field type
3. Form data doesn't override default

## See Also

- [Field GUID System](./FIELD-GUID-SYSTEM.md)
- [Form Rendering](./FORM-SYSTEM.md)
- [EventBus System](./EVENTBUS-SYSTEM.md)
- [Plugin System](./PLUGIN-SYSTEM.md)
