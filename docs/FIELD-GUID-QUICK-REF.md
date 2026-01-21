# Field GUID Quick Reference

> **Note**: All CFA.field methods are **async** and use event-driven architecture. Always use `await` when calling them.

## Quick Start

### Get Field by Key (First Match)
```javascript
const field = await CFA.field.getByKey("fieldName");
```

### Get All Fields by Key (Loop Fields)
```javascript
const fields = await CFA.field.getAllByKey("fieldName");
// Returns array of all elements with key "fieldName"
```

### Get Field by GUID (Most Precise)
```javascript
const field = await CFA.field.getByGuid("550e8400-e29b-41d4-a716-446655440000");
```

### Get Field Value
```javascript
// By GUID
const value = await CFA.field.getValue(guid);

// By Key (first match)
const value = await CFA.field.getValueByKey("fieldName");
```

### Set Field Value
```javascript
// By GUID (recommended for loops)
await CFA.field.setValue(guid, "New Value");

// By Key (first match)
await CFA.field.setValueByKey("fieldName", "New Value");
```

### List All Fields
```javascript
const allFields = await CFA.field.getAll();
console.table(allFields);
// Shows: guid, key, type, loop for each field
```

## Common Patterns

### Copy Value
```javascript
// Simple (note: all async)
const sourceValue = await CFA.field.getValueByKey("source");
await CFA.field.setValueByKey("target", sourceValue);

// In loops
const sourceVal = await CFA.field.getValue(sourceGuid);
await CFA.field.setValue(targetGuid, sourceVal);
```

### Sum Loop Values
```javascript
const fields = await CFA.field.getAllByKey("itemPrice");
const total = fields.reduce((sum, f) => sum + (parseFloat(f.value) || 0), 0);
await CFA.field.setValueByKey("total", total.toFixed(2));
```

### Update Sibling in Loop
```javascript
const loopItem = document.querySelector('.loop-item');
const siblingField = loopItem.querySelector('[data-field-key="target"]');
await CFA.field.setValue(siblingField.dataset.fieldGuid, "Value");
```

### Conditional Update
```javascript
if (await CFA.field.getValueByKey("checkbox")) {
  await CFA.field.setValueByKey("dependentField", "Enabled");
}
```

## Data Attributes

Every field has:

- `data-field-guid` → Unique ID (UUID v4)
- `data-field-key` → Field key from template
- `data-field-type` → Field type (text, boolean, etc.)
- `data-field-loop` → Loop context (if in loop)

## CSS Selectors

```javascript
// By GUID
document.querySelector('[data-field-guid="550e8400-..."]')

// By Key
document.querySelector('[data-field-key="fieldName"]')

// All with Key
document.querySelectorAll('[data-field-key="fieldName"]')

// In specific loop
document.querySelectorAll('[data-field-loop="items"]')

// By type
document.querySelectorAll('[data-field-type="text"]')
```

## Debugging

### Show all fields
```javascript
CFA.field.getAll().forEach(f => 
  console.log(`${f.key} (${f.type}): ${f.guid}`)
);
```

### Show loop instances
```javascript
const key = "fieldName";
const fields = CFA.field.getAllByKey(key);
console.log(`${key}: ${fields.length} instances`);
```

### Inspect field
```javascript
const field = CFA.field.getByKey("fieldName");
console.log({
  guid: field.dataset.fieldGuid,
  key: field.dataset.fieldKey,
  type: field.dataset.fieldType,
  loop: field.dataset.fieldLoop,
  value: field.value
});
```

## API Reference Card

| Method | Use When |
|--------|----------|
| `getByKey()` | Single field or first match needed |
| `getAllByKey()` | Loop fields or multiple instances |
| `getByGuid()` | Precise targeting required |
| `getAll()` | Need overview of all fields |
| `getValue()` | Get value by GUID |
| `getValueByKey()` | Get value by key (first) |
| `setValue()` | Set value by GUID |
| `setValueByKey()` | Set value by key (first) |

## Common Mistakes

❌ **Don't**: Use key-based targeting in loops without checking
```javascript
// Might update wrong field in loop
CFA.field.setValueByKey("name", "Value");
```

✅ **Do**: Use GUID or get all instances
```javascript
// Option 1: Get specific instance
const fields = CFA.field.getAllByKey("name");
CFA.field.setValue(fields[2].dataset.fieldGuid, "Value");

// Option 2: Context-aware
const loopItem = getMyLoopItem();
const field = loopItem.querySelector('[data-field-key="name"]');
CFA.field.setValue(field.dataset.fieldGuid, "Value");
```

❌ **Don't**: Forget to dispatch events
```javascript
field.value = "New Value"; // UI might not update
```

✅ **Do**: Use CFA.field.setValue() (handles events)
```javascript
CFA.field.setValue(guid, "New Value"); // Dispatches events
```

## When to Use What

| Scenario | Method |
|----------|--------|
| Single field in form | `getByKey()` / `getValueByKey()` |
| Field in loop | `getAllByKey()` then use GUID |
| Known GUID | `getByGuid()` / `getValue()` |
| Debugging | `getAll()` |
| Sibling in loop | Find parent `.loop-item`, query, use GUID |
| All loop instances | `getAllByKey()` |

## Examples

See [field-guid-examples.js](./examples/field-guid-examples.js) for 10 detailed examples.

## Full Documentation

See [FIELD-GUID-SYSTEM.md](./FIELD-GUID-SYSTEM.md) for complete documentation.
