# Field GUID System Documentation

## Overview

The Field GUID (Globally Unique Identifier) system enables precise targeting and manipulation of individual field instances in the DOM, especially within loop structures where multiple fields share the same key.

## Problem Solved

Previously, when rendering fields in loops, all instances of a field with key `"name"` would have the same `data-field-key="name"` attribute. This made it impossible to target a specific instance when, for example, a codefield needed to copy values between specific loop items.

## Solution

Every field rendered in the DOM now receives a unique GUID via the `data-field-guid` attribute. This allows precise field targeting regardless of loop nesting or field duplication.

## Field Attributes

Each field element now has the following data attributes:

- `data-field-guid`: Unique identifier (generated automatically)
- `data-field-key`: Field key from template definition
- `data-field-type`: Field type (text, boolean, dropdown, etc.)
- `data-field-loop`: Loop chain (if field is inside loop(s))

### Example DOM Structure

```html
<!-- Regular field -->
<input 
  type="text" 
  name="title"
  data-field-guid="550e8400-e29b-41d4-a716-446655440000"
  data-field-key="title"
  data-field-type="text"
  value="Example Title"
/>

<!-- Field in loop -->
<input 
  type="text" 
  name="item_name"
  data-field-guid="7c9e6679-7425-40de-944b-e07fc1f90ae7"
  data-field-key="item_name"
  data-field-type="text"
  data-field-loop="items"
  value="Item 1"
/>

<!-- Field in nested loop -->
<input 
  type="text" 
  name="detail"
  data-field-guid="3fa85f64-5717-4562-b3fc-2c963f66afa6"
  data-field-key="detail"
  data-field-type="text"
  data-field-loop="items.details"
  value="Detail A"
/>
```

## Usage in Code Fields

### 1. Using CFA (CodeField API)

The CodeField API (`window.CFA`) provides convenient methods for field manipulation:

#### Get Field Information

```javascript
// Get all fields with their GUIDs
const allFields = CFA.field.getAll();
console.log(allFields);
// [
//   { guid: "550e8400-...", key: "title", type: "text", loop: null },
//   { guid: "7c9e6679-...", key: "item_name", type: "text", loop: "items" },
//   ...
// ]

// Get specific field element by GUID
const field = CFA.field.getByGuid("550e8400-e29b-41d4-a716-446655440000");

// Get field element by key (returns first match)
const titleField = CFA.field.getByKey("title");

// Get all fields with same key (useful for loop fields)
const allNameFields = CFA.field.getAllByKey("item_name");
console.log(allNameFields.length); // e.g., 5 items in loop
```

#### Get Field Values

```javascript
// By GUID (most precise)
const value = CFA.field.getValue("550e8400-e29b-41d4-a716-446655440000");

// By key (first match)
const titleValue = CFA.field.getValueByKey("title");
```

#### Set Field Values

```javascript
// By GUID (recommended for loop fields)
CFA.field.setValue("7c9e6679-7425-40de-944b-e07fc1f90ae7", "New Value");

// By key (first match)
CFA.field.setValueByKey("title", "Updated Title");
```

### 2. Example: Copy Values Between Loop Items

```javascript
// In a codefield within a loop

// Get all fields with key "source_field" in the loop
const sourceFields = CFA.field.getAllByKey("source_field");
const targetFields = CFA.field.getAllByKey("target_field");

// Copy first source to all targets
if (sourceFields.length > 0 && targetFields.length > 0) {
  const sourceValue = sourceFields[0].value;
  
  targetFields.forEach((target) => {
    CFA.field.setValue(target.dataset.fieldGuid, sourceValue);
  });
}
```

### 3. Example: Update Specific Loop Instance

```javascript
// Get the current field's GUID (the codefield itself)
const currentField = document.querySelector('[data-code-field]');
const currentGuid = currentField.dataset.fieldGuid;

// Find sibling fields in the same loop item
const loopItem = currentField.closest('.loop-item');
const siblingField = loopItem.querySelector('[data-field-key="target"]');

if (siblingField) {
  const siblingGuid = siblingField.dataset.fieldGuid;
  CFA.field.setValue(siblingGuid, "Computed Value");
}
```

### 4. Example: Complex Field Manipulation

```javascript
// Get form snapshot
const formData = await CFA.form.snapshot();

// Get all loop items
const itemFields = CFA.field.getAllByKey("item_price");

// Calculate total
const total = itemFields.reduce((sum, field) => {
  const value = parseFloat(field.value) || 0;
  return sum + value;
}, 0);

// Update total field
CFA.field.setValueByKey("total_price", total.toFixed(2));
```

## Advanced Usage

### Using FGA (Formidable Global API)

For more advanced scenarios, use the global API:

```javascript
// Resolve field by GUID
const container = document.querySelector("#form-container");
const field = FGA.form.resolveFieldByGuid(container, guid);

// Resolve field by key, type, and loop context
const field = FGA.form.resolveFieldElement(container, {
  key: "item_name",
  type: "text",
  loopKey: ["items", "subitems"]
});
```

### Querying with CSS Selectors

```javascript
// Get all fields in a specific loop
const loopFields = document.querySelectorAll('[data-field-loop="items"]');

// Get all text fields
const textFields = document.querySelectorAll('[data-field-type="text"]');

// Get specific field by GUID
const field = document.querySelector('[data-field-guid="550e8400-..."]');
```

## Implementation Details

### 1. GUID Generation

GUIDs are automatically generated using `crypto.randomUUID()` when `applyFieldContextAttributes()` is called during field rendering.

### 2. Field Context Attributes

All fields receive context attributes via:

```javascript
applyFieldContextAttributes(element, {
  key: field.key,
  type: field.type,
  loopKey: field.loopKey || null,
  guid: optionalGuid // If not provided, one is generated
});
```

### 3. Field Resolution

Fields can be resolved using multiple methods:

1. **By GUID** (most specific): `resolveFieldByGuid(container, guid)`
2. **By Key+Type+Loop**: `resolveFieldElement(container, field)`
3. **CSS Selector**: Direct DOM query

## Best Practices

1. **Use GUIDs for Loop Fields**: When working with fields in loops, always prefer GUID-based access for precision.

2. **Cache Field References**: If accessing the same field multiple times, store its GUID or element reference.

3. **Event Dispatching**: When programmatically setting values, dispatch `input` and `change` events to ensure UI updates:

   ```javascript
   field.value = newValue;
   field.dispatchEvent(new Event('input', { bubbles: true }));
   field.dispatchEvent(new Event('change', { bubbles: true }));
   ```

4. **Error Handling**: Always check if a field exists before manipulating:

   ```javascript
   const field = CFA.field.getByGuid(guid);
   if (!field) {
     console.warn("Field not found:", guid);
     return;
   }
   ```

5. **Debugging**: Use `CFA.field.getAll()` to inspect all available fields and their GUIDs.

## Troubleshooting

### Field Not Found

If `getByGuid()` returns `null`:
- Verify the GUID is correct
- Check if the field has been rendered in the DOM
- Ensure you're searching in the correct container

### Value Not Updating

If `setValue()` doesn't update the UI:
- Verify events are being dispatched
- Check if the field type requires special handling (checkboxes, selects)
- Look for validation that might prevent updates

### Multiple Fields Found

If `getByKey()` returns unexpected results:
- Use `getAllByKey()` to see all matches
- Switch to GUID-based access for precision
- Check loop context with `data-field-loop`

## Migration Guide

### Before (Key-based access)

```javascript
// Could target wrong field in loops
const field = document.querySelector('[data-field-key="name"]');
field.value = "New Value";
```

### After (GUID-based access)

```javascript
// Precise targeting
CFA.field.setValue(specificGuid, "New Value");

// Or get from context
const fields = CFA.field.getAllByKey("name");
// ... identify the specific field you want
CFA.field.setValue(fields[2].dataset.fieldGuid, "New Value");
```

## API Reference

### CFA.field

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getByGuid(guid)` | `guid: string` | `HTMLElement \| null` | Get field element by GUID |
| `getByKey(key)` | `key: string` | `HTMLElement \| null` | Get first field with key |
| `getAllByKey(key)` | `key: string` | `HTMLElement[]` | Get all fields with key |
| `getAll()` | none | `Array<{guid, key, type, loop}>` | Get all field metadata |
| `getValue(guid)` | `guid: string` | `any` | Get field value by GUID |
| `getValueByKey(key)` | `key: string` | `any` | Get first field value by key |
| `setValue(guid, value)` | `guid: string, value: any` | `boolean` | Set field value by GUID |
| `setValueByKey(key, value)` | `key: string, value: any` | `boolean` | Set first field value by key |

### FGA.form

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `resolveFieldByGuid(container, guid)` | `container: HTMLElement, guid: string` | `HTMLElement \| null` | Resolve field by GUID in container |
| `resolveFieldElement(container, field)` | `container: HTMLElement, field: {key, type, loopKey?, guid?}` | `HTMLElement \| null` | Resolve field with context |

## Conclusion

The Field GUID system provides a robust solution for field manipulation in complex forms with nested loops. By using unique identifiers, you can precisely target and update any field instance, making it possible to build sophisticated field interactions and calculations.
