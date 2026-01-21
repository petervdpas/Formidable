# Form System

## Overview

The **Form System** is the core of Formidable, responsible for rendering forms based on templates, managing form data, and handling user interactions. Forms are defined by templates (schema-based) and rendered dynamically in the UI.

## Architecture

```text
┌─────────────────────────────────────────────┐
│            Template Schema                   │
│  (Defines structure: fields, types, rules)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           Form Renderer                      │
│  - Reads template                            │
│  - Generates HTML                            │
│  - Attaches event handlers                   │
│  - Manages field state                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│              DOM                             │
│  - Rendered form fields                      │
│  - Input elements                            │
│  - Field GUIDs (data-field-guid)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         User Interactions                    │
│  - Input changes                             │
│  - Button clicks                             │
│  - Code field execution                      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          Form Manager                        │
│  - Collects form data                        │
│  - Saves to storage                          │
│  - Loads from storage                        │
│  - Validates data                            │
└─────────────────────────────────────────────┘
```

## Core Modules

### 1. formRenderer.js

**Location**: `modules/formRenderer.js`

**Purpose**: Renders forms from templates

**Key Functions**:
```javascript
// Render entire form
renderForm(template, data);

// Render field group
renderFieldGroup(fields, data);

// Render single field
renderField(field, value);
```

### 2. formManager.js

**Location**: `controls/formManager.js`

**Purpose**: Manages form CRUD operations

**Key Functions**:
```javascript
// Load form data
loadForm(template, filename);

// Save form data
saveForm(template, filename, data);

// Delete form
deleteForm(template, filename);

// List forms for template
listForms(template);
```

### 3. formUtils.js

**Location**: `utils/formUtils.js`

**Purpose**: Form data utilities

**Key Functions**:
```javascript
// Get all form data
getFormData(selector);

// Set form data
setFormData(selector, data);

// Resolve field by GUID
resolveFieldByGuid(guid);

// Resolve field element
resolveFieldElement(identifier);
```

### 4. formActions.js

**Location**: `modules/formActions.js`

**Purpose**: Form action handlers

**Key Functions**:
```javascript
// Save form
saveFormAction();

// Load form
loadFormAction(filename);

// New form
newFormAction(template);

// Delete form
deleteFormAction(filename);
```

## Form Lifecycle

### 1. Template Selection

User selects a template:

```javascript
await EventBus.emit("form:selected", templateName);
```

**Handler**: `handleFormSelected` in `formHandlers.js`

**Actions**:
- Load template definition
- Clear current form
- Prepare form container

### 2. Form Loading

Form data is loaded:

```javascript
const formData = await EventBus.emitWithResponse("form:load", {
  template: "my-template",
  filename: "form-001.yaml"
});
```

**Handler**: `handleLoadForm` in `formHandlers.js`

**Actions**:
- Read form file from storage
- Parse YAML/JSON
- Validate against schema
- Emit `form:context:update`

### 3. Form Rendering

Form is rendered in DOM:

```javascript
// In formRenderer.js
const html = renderForm(template, formData);
document.querySelector("#form-container").innerHTML = html;
```

**Process**:
1. Generate HTML for each field
2. Apply field GUIDs (`data-field-guid`)
3. Attach event listeners
4. Initialize field widgets (date pickers, code editors, etc.)
5. Populate field values

### 4. User Interaction

User modifies fields:

```javascript
// Input change
inputElement.addEventListener("change", (e) => {
  // Field value changed
  const guid = e.target.dataset.fieldGuid;
  const value = e.target.value;
  
  // Emit change event
  EventBus.emit("field:changed", { guid, value });
});
```

### 5. Form Saving

Form is saved:

```javascript
await EventBus.emit("form:save", {
  template: "my-template",
  filename: "form-001.yaml",
  data: formData
});
```

**Handler**: `handleSaveForm` in `formHandlers.js`

**Actions**:
- Collect form data via `getFormData()`
- Validate data
- Convert to YAML/JSON
- Write to storage file
- Update metadata (modified timestamp)
- Emit `form:context:update`

## Form Data Collection

### Getting Form Data

```javascript
import { getFormData } from "./utils/formUtils.js";

// Get all form data
const data = getFormData("#form-container");

// Returns:
{
  field1: "value1",
  field2: "value2",
  loop_field: [
    { item1: "a", item2: "b" },
    { item1: "c", item2: "d" }
  ]
}
```

### Setting Form Data

```javascript
import { setFormData } from "./utils/formUtils.js";

setFormData("#form-container", {
  field1: "new value",
  field2: "another value"
});
```

### Field Resolution

```javascript
import { resolveFieldByGuid, resolveFieldElement } from "./utils/formUtils.js";

// By GUID
const field = resolveFieldByGuid("123e4567-e89b-12d3-a456-426614174000");

// By key (fallback to GUID)
const field = resolveFieldElement("my_field_key");

// Returns:
{
  element: HTMLElement,
  guid: "123e4567-...",
  key: "my_field_key",
  value: "current value"
}
```

## Field Types & Rendering

### Text Fields

```javascript
{
  key: "title",
  type: "text",
  label: "Title"
}
```

**Renders**:
```html
<div class="field-group" data-field-guid="...">
  <label for="title">Title</label>
  <input type="text" id="title" name="title" data-field-key="title">
</div>
```

### Text Areas

```javascript
{
  key: "description",
  type: "textarea",
  label: "Description",
  format: "markdown"
}
```

**Renders**: Markdown editor with toolbar

### Dropdowns

```javascript
{
  key: "status",
  type: "dropdown",
  label: "Status",
  options: ["Todo", "In Progress", "Done"]
}
```

**Renders**:
```html
<select id="status" name="status">
  <option value="Todo">Todo</option>
  <option value="In Progress">In Progress</option>
  <option value="Done">Done</option>
</select>
```

### Loops

```javascript
{
  fields: [
    { type: "loopstart", key: "tasks", summary_field: "task_name" },
    { key: "task_name", type: "text", label: "Task" },
    { key: "task_status", type: "dropdown", label: "Status" },
    { type: "loopstop" }
  ]
}
```

**Renders**: Repeating section with add/remove buttons

**Data Structure**:
```json
{
  "tasks": [
    { "task_name": "Task 1", "task_status": "Todo" },
    { "task_name": "Task 2", "task_status": "Done" }
  ]
}
```

### Code Fields

```javascript
{
  key: "calculation",
  type: "code",
  label: "Calculation",
  run_mode: "manual",
  allow_run: true
}
```

**Renders**: CodeMirror editor with run button

**Execution**:
```javascript
// When run button clicked
await EventBus.emit("code:execute", {
  guid: fieldGuid,
  code: codeContent,
  context: formData
});
```

## Form Context

### Context Manager

**Location**: `modules/contextManager.js`

**Purpose**: Maintains current form context

**State**:
```javascript
{
  template: "my-template",
  filename: "form-001.yaml",
  data: { /* form data */ },
  meta: { created: "...", modified: "..." }
}
```

### Context Events

```javascript
// Get context
const context = await EventBus.emitWithResponse("form:context:get");

// Update context
await EventBus.emit("form:context:update", newData);

// Clear context
await EventBus.emit("form:context:clear");
```

### Context Handlers

**Location**: `modules/handlers/contextHandlers.js`

```javascript
export async function handleGetContext() {
  return contextManager.getContext();
}

export async function handleUpdateContext(payload) {
  contextManager.updateContext(payload);
  // Trigger UI updates
  EventBus.emit("ui:form-updated");
}
```

## Form Validation

### Schema Validation

Forms are validated against template schema:

```javascript
const templateSchema = require("./schemas/template.schema.js");
const fieldSchema = require("./schemas/field.schema.js");

// Validate template
const template = templateSchema.sanitize(rawTemplate);

// Validate each field
template.fields.forEach(field => {
  fieldSchema.sanitize(field);
});
```

### Custom Validation

Fields can have custom validation:

```javascript
{
  key: "email",
  type: "text",
  label: "Email",
  validation: {
    pattern: "^[^@]+@[^@]+\\.[^@]+$",
    message: "Invalid email address"
  }
}
```

### Validation Events

```javascript
// Validate form
const validation = await EventBus.emitWithResponse("form:validate", formData);

// Returns:
{
  valid: true,
  errors: []
}
```

## Form Storage

### Storage Structure

Forms are stored in YAML format:

```text
storage/
└── my-template/
    ├── form-001.yaml
    ├── form-001.meta.json
    ├── form-002.yaml
    └── form-002.meta.json
```

### Form File Format

```yaml
# storage/my-template/form-001.yaml

template: my-template
filename: form-001.yaml

data:
  title: "My Form"
  description: "Form description"
  status: "Active"
```

### Meta File Format

```json
{
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-20T14:22:00Z",
  "author": "user@example.com",
  "version": 1
}
```

## Form Operations

### Create New Form

```javascript
await EventBus.emit("form:new", {
  template: "my-template"
});
```

**Actions**:
- Load template
- Create empty form data
- Render form
- Update context

### Load Existing Form

```javascript
await EventBus.emit("form:load", {
  template: "my-template",
  filename: "form-001.yaml"
});
```

**Actions**:
- Read form file
- Parse data
- Render form with data
- Update context

### Save Form

```javascript
await EventBus.emit("form:save", {
  template: "my-template",
  filename: "form-001.yaml",
  data: formData
});
```

**Actions**:
- Collect form data
- Validate data
- Write to file
- Update meta file
- Emit success toast

### Delete Form

```javascript
await EventBus.emit("form:delete", {
  template: "my-template",
  filename: "form-001.yaml"
});
```

**Actions**:
- Confirm deletion
- Delete form file
- Delete meta file
- Clear context
- Update UI

### List Forms

```javascript
const forms = await EventBus.emitWithResponse("form:list", {
  template: "my-template"
});

// Returns: ["form-001.yaml", "form-002.yaml", ...]
```

## Form UI Components

### Form Container

```html
<div id="form-container">
  <!-- Rendered form fields -->
</div>
```

### Field Groups

Each field is wrapped in a group:

```html
<div class="field-group" data-field-guid="..." data-field-key="...">
  <label>Field Label</label>
  <input type="text" ...>
  <span class="field-description">Help text</span>
</div>
```

### Loop Blocks

```html
<div class="loop-block" data-loop-key="tasks">
  <div class="loop-header">
    <h3>Tasks</h3>
    <button class="add-loop-item">Add</button>
  </div>
  
  <div class="loop-items">
    <!-- Loop items -->
  </div>
</div>
```

### Form Actions

```html
<div class="form-actions">
  <button id="save-form">Save</button>
  <button id="load-form">Load</button>
  <button id="delete-form">Delete</button>
</div>
```

## Form Events

### Events Emitted

```javascript
// Form selected
EventBus.emit("form:selected", templateName);

// Form loaded
EventBus.emit("form:loaded", { template, filename, data });

// Form saved
EventBus.emit("form:saved", { template, filename });

// Form deleted
EventBus.emit("form:deleted", { template, filename });

// Field changed
EventBus.emit("field:changed", { guid, key, value });

// Form validated
EventBus.emit("form:validated", { valid, errors });
```

### Events Handled

```javascript
// Load form
EventBus.on("form:load", handleLoadForm);

// Save form
EventBus.on("form:save", handleSaveForm);

// Delete form
EventBus.on("form:delete", handleDeleteForm);

// New form
EventBus.on("form:new", handleNewForm);

// List forms
EventBus.on("form:list", handleListForms);
```

## Best Practices

### 1. Use Field GUIDs

```javascript
// ✅ Good - use GUID
const field = await CFA.field.getByGuid(guid);

// ❌ Bad - use selector
const field = document.querySelector("#field_key");
```

### 2. Validate Before Save

```javascript
async function saveForm() {
  const data = getFormData();
  
  // Validate
  const validation = await EventBus.emitWithResponse("form:validate", data);
  
  if (!validation.valid) {
    showErrors(validation.errors);
    return;
  }
  
  // Save
  await EventBus.emit("form:save", { data });
}
```

### 3. Handle Loops Properly

```javascript
// Loops return array of objects
const loopData = formData.tasks;
// [{ task_name: "...", task_status: "..." }, ...]
```

### 4. Use Context

```javascript
// Get current form context
const context = await EventBus.emitWithResponse("form:context:get");
const currentTemplate = context.template;
```

### 5. Clear Context on New Form

```javascript
await EventBus.emit("form:context:clear");
await EventBus.emit("form:new", { template: "new-template" });
```

## Troubleshooting

### Form Not Rendering

**Check**:
1. Template exists and is valid
2. Form container element exists
3. No JavaScript errors in console

### Field Values Not Saving

**Check**:
1. Field has `name` attribute
2. Field is inside form container
3. `getFormData()` includes the field

### Loop Not Working

**Check**:
1. `loopstart` and `loopstop` are paired
2. `summary_field` matches a child field key
3. Loop data is an array

### Form Data Not Loading

**Check**:
1. Form file exists in storage
2. File format is valid YAML/JSON
3. Template name matches

## See Also

- [Field GUID System](./FIELD-GUID-SYSTEM.md)
- [Template & Schema System](./TEMPLATE-SCHEMA-SYSTEM.md)
- [EventBus System](./EVENTBUS-SYSTEM.md)
- [Handler Pattern](./HANDLER-PATTERN.md)
