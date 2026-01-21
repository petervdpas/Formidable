# Template Helpers

## Overview

Formidable uses **Handlebars** as its template engine with custom helpers for rendering form data into Markdown, HTML, and other formats. Template helpers provide powerful data access, transformation, and formatting capabilities.

## Core Field Helpers

### `field` - Formatted Field Value

Renders a field's value with appropriate formatting.

**Syntax**:
```handlebars
{{field "fieldKey"}}
{{field "fieldKey" "mode"}}
```

**Modes**:
- `"label"` (default) - Display human-readable label
- `"value"` - Display raw value
- `"href"` - For link fields, display only href
- `"text"` - For link fields, display only text

**Examples**:

```handlebars
<!-- Text field -->
{{field "title"}}
<!-- Output: My Document Title -->

<!-- Dropdown field -->
{{field "status"}}
<!-- Output: In Progress (label) -->

{{field "status" "value"}}
<!-- Output: in_progress (value) -->

<!-- Link field -->
{{field "homepage"}}
<!-- Output: [My Site](https://example.com) -->

{{field "homepage" "href"}}
<!-- Output: https://example.com -->

{{field "homepage" "text"}}
<!-- Output: My Site -->

<!-- Multioption field -->
{{field "categories"}}
<!-- Output: Science, Technology, Education -->
```

**Special Handling**:

| Field Type | Behavior |
|------------|----------|
| `text` | Plain string |
| `boolean` | "Yes" / "No" |
| `dropdown` | Option label (not value) |
| `radio` | Option label (not value) |
| `multioption` | Comma-separated labels |
| `link` | Markdown link `[text](href)` |
| `image` | Image path with `file://` prefix |
| `textarea` | Raw markdown (SafeString) |
| `date` | ISO date string |
| `number` | Number value |
| `range` | Number value |

### `fieldRaw` - Raw Field Value

Returns the raw JavaScript value without formatting.

**Syntax**:
```handlebars
{{fieldRaw "fieldKey"}}
```

**Examples**:

```handlebars
<!-- Boolean field -->
{{#if (fieldRaw "published")}}
Published: {{field "publishDate"}}
{{else}}
Draft
{{/if}}

<!-- Array field -->
{{#each (fieldRaw "tags")}}
- {{this}}
{{/each}}

<!-- Number field -->
Count: {{fieldRaw "items"}}
<!-- Output: Count: 42 -->

<!-- Dropdown (raw value) -->
Status Code: {{fieldRaw "status"}}
<!-- Output: Status Code: in_progress -->
```

**Use Cases**:
- Conditionals (`#if`, `#each`)
- Math operations
- Comparisons
- Array iteration
- Direct value access

### `fieldMeta` - Field Metadata

Access field definition metadata (label, type, description, options, etc.).

**Syntax**:
```handlebars
{{fieldMeta "fieldKey"}}
{{fieldMeta "fieldKey" "property"}}
```

**Properties**:
- `key` - Field key/name
- `label` - Display label
- `type` - Field type (text, dropdown, etc.)
- `description` - Help text
- `options` - Array of options (dropdown/radio/multioption)
- `default` - Default value
- `required` - Boolean flag
- And all other field schema properties

**Examples**:

```handlebars
<!-- Field label -->
{{fieldMeta "username" "label"}}
<!-- Output: User Name -->

<!-- Field type -->
{{fieldMeta "status" "type"}}
<!-- Output: dropdown -->

<!-- Field description -->
{{fieldMeta "email" "description"}}
<!-- Output: Enter your email address -->

<!-- Field options -->
{{#with (fieldMeta "priority" "options") as |opts|}}
Available priorities:
{{#each opts}}
- {{this.label}} ({{this.value}})
{{/each}}
{{/with}}

<!-- Table column headers -->
{{#with (fieldMeta "dataTable" "options") as |headers|}}
|{{#each headers}}{{label}} |{{/each}}
|{{#each headers}}--|{{/each}}
{{/with}}
```

### `fieldDescription` - Field Description Text

Shortcut for accessing field description.

**Syntax**:
```handlebars
{{fieldDescription "fieldKey"}}
```

**Example**:

```handlebars
**{{fieldMeta "username" "label"}}**
_{{fieldDescription "username"}}_
<!-- Output:
**User Name**
_Enter your username for login_
-->
```

## Loop Helper

### `loop` - Iterate Loop Groups

Renders loop group items (loopstart/loopstop blocks).

**Syntax**:
```handlebars
{{#loop "loopKey"}}
  <!-- Template for each item -->
  {{field "fieldKey"}}
{{/loop}}
```

**Features**:
- Access nested fields within loop items
- Auto-generated `{loopKey}_index` field (1-based)
- Supports nested loops
- Access loop group fields via `_fields`

**Examples**:

```handlebars
<!-- Simple loop -->
{{#loop "tasks"}}
## Task {{tasks_index}}
- **Title**: {{field "taskTitle"}}
- **Status**: {{field "taskStatus"}}
- **Due**: {{field "taskDue"}}
{{/loop}}

<!-- Conditional in loop -->
{{#loop "items"}}
{{#if (fieldRaw "itemEnabled")}}
- {{field "itemName"}}: {{field "itemValue"}}
{{/if}}
{{/loop}}

<!-- Nested loops -->
{{#loop "projects"}}
### {{field "projectName"}}
{{#loop "milestones"}}
- Milestone {{milestones_index}}: {{field "milestoneName"}}
{{/loop}}
{{/loop}}

<!-- Using loop index -->
{{#loop "entries"}}
Entry #{{entries_index}}/{{length (fieldRaw "entries")}}: {{field "title"}}
{{/loop}}
```

**Auto-Generated Index Field**:
- Field key: `{loopKey}_index`
- Type: `number`
- Value: 1-based index (1, 2, 3, ...)
- Accessible via `{{field}}` or `{{fieldRaw}}`

## Math Helpers

### `math` - Math Operations

Perform mathematical operations.

**Syntax**:
```handlebars
{{math a "operator" b}}
```

**Operators**:
- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `%` - Modulo
- `pad` - Zero-pad number (b = width)
- `abs` - Absolute value (ignores b)
- `round` - Round to integer
- `ceil` - Round up
- `floor` - Round down

**Examples**:

```handlebars
<!-- Addition -->
{{math 5 "+" 3}}
<!-- Output: 8 -->

<!-- Subtraction -->
Total: {{math (fieldRaw "price") "-" (fieldRaw "discount")}}
<!-- Output: Total: 95 -->

<!-- Multiplication -->
{{math (fieldRaw "quantity") "*" (fieldRaw "unitPrice")}}

<!-- Division (with formatting) -->
Average: {{math (fieldRaw "total") "/" (fieldRaw "count")}}

<!-- Modulo -->
{{#if (math (fieldRaw "index") "%" 2)}}Odd{{else}}Even{{/if}}

<!-- Padding -->
ID-{{math (fieldRaw "id") "pad" 4}}
<!-- Output: ID-0042 -->

<!-- Absolute value -->
Distance: {{math (fieldRaw "difference") "abs"}} km

<!-- Rounding -->
Price: ${{math (fieldRaw "amount") "round"}}
```

### Named Math Helpers

Convenience helpers for common operations:

```handlebars
<!-- Addition -->
{{add 5 3}}

<!-- Subtraction -->
{{subtract 10 4}}

<!-- Multiplication -->
{{multiply 6 7}}

<!-- Divide -->
{{divide 100 4}}

<!-- Modulo -->
{{mod 10 3}}

<!-- Padding -->
{{pad 42 4}}
<!-- Output: 0042 -->

<!-- Absolute -->
{{abs -15}}
<!-- Output: 15 -->

<!-- Rounding -->
{{round 3.7}}
<!-- Output: 4 -->

{{ceil 3.2}}
<!-- Output: 4 -->

{{floor 3.8}}
<!-- Output: 3 -->
```

## Comparison Helpers

### `compare` - Generic Comparison

Compare two values with an operator.

**Syntax**:
```handlebars
{{compare a "operator" b}}
```

**Operators**:
- `===` - Strict equality
- `!==` - Not equal
- `<` - Less than
- `<=` - Less than or equal
- `>` - Greater than
- `>=` - Greater than or equal

**Examples**:

```handlebars
{{#if (compare (fieldRaw "age") ">=" 18)}}
Adult
{{else}}
Minor
{{/if}}

{{#if (compare (fieldRaw "status") "===" "active")}}
Status: Active ✓
{{/if}}
```

### Named Comparison Helpers

```handlebars
<!-- Equality -->
{{#if (eq (fieldRaw "type") "urgent")}}
🚨 URGENT
{{/if}}

<!-- Not equal -->
{{#if (ne (fieldRaw "status") "completed")}}
Still in progress...
{{/if}}

<!-- Less than -->
{{#if (lt (fieldRaw "stock") 10)}}
⚠️ Low stock
{{/if}}

<!-- Less than or equal -->
{{#if (lte (fieldRaw "score") 50)}}
Failed
{{/if}}

<!-- Greater than -->
{{#if (gt (fieldRaw "rating") 4)}}
⭐ Excellent
{{/if}}

<!-- Greater than or equal -->
{{#if (gte (fieldRaw "views") 1000)}}
Popular post!
{{/if}}
```

## Stats Helper

### `stats` - Table Column Statistics

Calculate statistics for a table column.

**Syntax**:
```handlebars
{{stats table columnIndex}}
{{stats table columnIndex percentile=N}}
```

**Returns**:
- `min` - Minimum value
- `max` - Maximum value
- `avg` - Average (mean)
- `median` - Median value
- `stddev` - Standard deviation
- `pN` - Nth percentile (if specified)

**Examples**:

```handlebars
<!-- Basic stats -->
{{stats (fieldRaw "salesData") 1}}
<!-- Output: min=10, max=500, avg=125.50, median=100, stddev=45.23 -->

<!-- With percentile -->
{{stats (fieldRaw "scores") 0 percentile=95}}
<!-- Output: min=50, max=100, avg=78.50, median=80, stddev=12.34, p95=95.00 -->

<!-- In table -->
| Metric | Value |
|--------|-------|
| Min | {{#with (stats (fieldRaw "data") 1)}}{{min}}{{/with}} |
| Max | {{#with (stats (fieldRaw "data") 1)}}{{max}}{{/with}} |
| Avg | {{#with (stats (fieldRaw "data") 1)}}{{avg}}{{/with}} |
```

**Column Index**:
- `0` - First column
- `1` - Second column
- `2` - Third column, etc.

## Tags Helper

### `tags` - Format Tag Array

Format array as tag string with optional hash symbol.

**Syntax**:
```handlebars
{{tags array}}
{{tags array withHash=true}}
{{tags array withHash=false}}
```

**Examples**:

```handlebars
<!-- With hash (default) -->
{{tags (fieldRaw "topics")}}
<!-- Output: #machine-learning, #ai, #deep-learning -->

<!-- Without hash -->
{{tags (fieldRaw "topics") withHash=false}}
<!-- Output: machine-learning, ai, deep-learning -->

<!-- In list -->
Topics:
{{#each (fieldRaw "topics")}}
- {{this}}
{{/each}}

Formatted: {{tags (fieldRaw "topics")}}
```

**Tag Transformation**:
- Converts to lowercase
- Replaces spaces with hyphens
- Example: "Machine Learning" → "machine-learning"

## Utility Helpers

### `length` - Array Length

Get the length of an array.

**Syntax**:
```handlebars
{{length array}}
```

**Examples**:

```handlebars
Total tags: {{length (fieldRaw "tags")}}

{{#if (gt (length (fieldRaw "items")) 0)}}
You have {{length (fieldRaw "items")}} items.
{{else}}
No items found.
{{/if}}
```

### `includes` - Array Contains

Check if array contains a value.

**Syntax**:
```handlebars
{{includes array value}}
```

**Examples**:

```handlebars
{{#if (includes (fieldRaw "categories") "urgent")}}
⚠️ This is urgent!
{{/if}}

{{#each (fieldMeta "status" "options") as |opt|}}
[{{#if (includes (fieldRaw "selectedStatuses") opt.value)}}x{{else}} {{/if}}] {{opt.label}}
{{/each}}
```

### `lookupOption` - Find Option by Value

Find an option object by its value.

**Syntax**:
```handlebars
{{#with (lookupOption options value) as |opt|}}
  {{opt.label}}
  {{opt.value}}
{{/with}}
```

**Examples**:

```handlebars
{{#each (fieldRaw "selectedItems") as |val|}}
  {{#with (lookupOption (fieldMeta "items" "options") val) as |opt|}}
    - {{opt.label}} ({{opt.value}})
  {{/with}}
{{/each}}

<!-- Multioption display -->
Selected options:
{{#with (fieldRaw "choices") as |selected|}}
  {{#each (fieldMeta "choices" "options") as |opt|}}
  [{{#if (includes selected opt.value)}}x{{else}} {{/if}}] {{opt.label}}
  {{/each}}
{{/with}}
```

### `json` - JSON Stringify

Convert value to formatted JSON.

**Syntax**:
```handlebars
{{json value}}
```

**Example**:

```handlebars
```json
{{json (fieldRaw "config")}}
```
<!-- Outputs formatted JSON with 2-space indentation -->
```

### `log` - Debug Logging

Output debug information (for development).

**Syntax**:
```handlebars
{{log value}}
```

**Example**:

```handlebars
{{log (fieldRaw "debugData")}}
<!-- Output: [LOG] {"key": "value", "count": 42} -->
```

### Variables

Store and retrieve values during rendering.

**Syntax**:
```handlebars
{{setVar "name" value}}
{{getVar "name"}}
```

**Examples**:

```handlebars
<!-- Set variable -->
{{setVar "total" 0}}

<!-- Use in loop -->
{{#each (fieldRaw "items")}}
  {{setVar "total" (add (getVar "total") this.price)}}
{{/each}}

Total: ${{getVar "total"}}
```

## Link Helper

The `field` helper provides special handling for link fields.

**Link Field Structure**:
```javascript
{
  href: "https://example.com",
  text: "Example Site"
}
```

**Examples**:

```handlebars
<!-- Default (markdown link) -->
{{field "website"}}
<!-- Output: [Example Site](https://example.com) -->

<!-- Href only -->
URL: {{field "website" "href"}}
<!-- Output: URL: https://example.com -->

<!-- Text only -->
Link Text: {{field "website" "text"}}
<!-- Output: Link Text: Example Site -->

<!-- Formidable link -->
{{field "relatedForm"}}
<!-- Output: [Form Name](formidable://template:entry.meta.json) -->
```

**Formidable Links**:
- Format: `formidable://<template>:<entry>`
- Example: `formidable://contacts:john-doe.meta.json`
- Automatically resolved to entry display name

## Common Patterns

### Conditional Rendering

```handlebars
{{#if (fieldRaw "published")}}
# {{field "title"}}
**Published**: {{field "publishDate"}}
{{else}}
# [DRAFT] {{field "title"}}
{{/if}}
```

### List Rendering

```handlebars
## Tags
{{#each (fieldRaw "tags")}}
- {{this}}
{{/each}}

## Formatted Tags
{{tags (fieldRaw "tags")}}
```

### Table Rendering

```handlebars
## Data Table

{{#if (fieldRaw "dataTable")}}
<!-- Column Headers -->
{{#with (fieldMeta "dataTable" "options") as |headers|}}
|{{#each headers}}{{label}} |{{/each}}
|{{#each headers}}--|{{/each}}
{{/with}}

<!-- Data Rows -->
{{#each (fieldRaw "dataTable")}}
|{{#each this}}{{this}} |{{/each}}
{{/each}}

<!-- Statistics -->
**Stats**: {{stats (fieldRaw "dataTable") 1}}
{{else}}
_No data available_
{{/if}}
```

### Loop with Index

```handlebars
{{#loop "items"}}
## Item {{items_index}}

- **Name**: {{field "itemName"}}
- **Price**: ${{field "itemPrice"}}
- **Total**: ${{math (fieldRaw "itemPrice") "*" (fieldRaw "itemQty")}}

{{#if (eq (mod items_index 5) 0)}}
---
{{/if}}
{{/loop}}
```

### Complex Conditionals

```handlebars
{{#if (and (gte (fieldRaw "score") 80) (eq (fieldRaw "status") "active"))}}
⭐ Excellent and Active
{{else if (gte (fieldRaw "score") 60)}}
✓ Good
{{else}}
⚠️ Needs Improvement
{{/if}}
```

### Option Selection Checklist

```handlebars
## Selected Options

{{#with (fieldRaw "choices") as |selected|}}
  {{#each (fieldMeta "choices" "options") as |opt|}}
- [{{#if (includes selected opt.value)}}x{{else}} {{/if}}] {{opt.label}}
  {{/each}}
{{/with}}
```

## Helper Registration

### Custom Helpers

You can register custom helpers via plugins:

```javascript
// In plugin
Handlebars.registerHelper("myHelper", function(value) {
  return value.toUpperCase();
});
```

**Usage**:
```handlebars
{{myHelper (field "title")}}
```

### Built-in Renderer Extension

Extend field renderers:

```javascript
// Custom field renderer
field.render = function(value, field, template) {
  return `Custom: ${value}`;
};
```

## Troubleshooting

### Helper Not Found

**Error**: `Missing helper: "helperName"`

**Solution**:
1. Check spelling
2. Verify helper is registered
3. Ensure helper is called correctly

### Wrong Output

**Issue**: Helper returns unexpected value

**Debug**:
```handlebars
{{log (fieldRaw "fieldKey")}}
{{log (fieldMeta "fieldKey")}}
```

### Array Not Iterating

**Issue**: `{{#each}}` not working

**Solution**:
```handlebars
<!-- Check if array exists -->
{{log (fieldRaw "arrayField")}}

<!-- Verify it's an array -->
{{#if (gt (length (fieldRaw "arrayField")) 0)}}
  {{#each (fieldRaw "arrayField")}}
    - {{this}}
  {{/each}}
{{else}}
  No items
{{/if}}
```

### Field Not Rendering

**Issue**: Field shows as `(unknown field: key)`

**Solution**:
1. Check field key spelling
2. Verify field exists in template
3. Use `{{log _fields}}` to see all available fields

## Related Documentation

- [Template Schema System](./TEMPLATE-SCHEMA-SYSTEM.md) - Template structure
- [Form System](./FORM-SYSTEM.md) - Field types and rendering
- [Field-GUID System](./FIELD-GUID-SYSTEM.md) - Field identification

## API Reference

### Field Helpers

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `field` | `key`, `mode?` | String | Formatted field value |
| `fieldRaw` | `key` | Any | Raw field value |
| `fieldMeta` | `key`, `prop?` | Any | Field metadata |
| `fieldDescription` | `key` | String | Field description text |

### Loop Helper

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `loop` | `key` | String | Rendered loop items |

### Math Helpers

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `math` | `a`, `op`, `b` | Number | Math operation |
| `add` | `a`, `b` | Number | Addition |
| `subtract` | `a`, `b` | Number | Subtraction |
| `multiply` | `a`, `b` | Number | Multiplication |
| `divide` | `a`, `b` | Number | Division |
| `mod` | `a`, `b` | Number | Modulo |
| `pad` | `num`, `width` | String | Zero-padded number |
| `abs` | `num` | Number | Absolute value |
| `round` | `num` | Number | Round to integer |
| `ceil` | `num` | Number | Round up |
| `floor` | `num` | Number | Round down |

### Comparison Helpers

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `compare` | `a`, `op`, `b` | Boolean | Generic comparison |
| `eq` | `a`, `b` | Boolean | Equality (===) |
| `ne` | `a`, `b` | Boolean | Not equal (!==) |
| `lt` | `a`, `b` | Boolean | Less than (<) |
| `lte` | `a`, `b` | Boolean | Less or equal (<=) |
| `gt` | `a`, `b` | Boolean | Greater than (>) |
| `gte` | `a`, `b` | Boolean | Greater or equal (>=) |

### Stats Helper

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `stats` | `table`, `colIndex`, `options?` | String | Column statistics |

### Utility Helpers

| Helper | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `length` | `array` | Number | Array length |
| `includes` | `array`, `value` | Boolean | Array contains value |
| `lookupOption` | `options`, `value` | Object | Find option by value |
| `tags` | `array`, `options?` | String | Format tags |
| `json` | `value` | String | JSON stringify |
| `log` | `value` | String | Debug output |
| `setVar` | `name`, `value` | String | Set variable |
| `getVar` | `name` | Any | Get variable |

---

**Template Helpers Version**: 1.0  
**Last Updated**: 2024
