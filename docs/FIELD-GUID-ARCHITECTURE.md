# Field GUID System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FORMIDABLE FORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ FIELD RENDERER (utils/fieldRenderers.js)             │    │
│  │                                                       │    │
│  │  Calls: applyFieldContextAttributes(element, {       │    │
│  │           key, type, loopKey, guid                    │    │
│  │         })                                            │    │
│  └──────────────────┬────────────────────────────────────┘    │
│                     │                                          │
│                     ▼                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ APPLY FIELD CONTEXT (utils/domUtils.js)              │    │
│  │                                                       │    │
│  │  • Adds data-field-key                               │    │
│  │  • Adds data-field-type                              │    │
│  │  • Adds data-field-guid (generates if not provided)  │    │
│  │  • Adds data-field-loop (if in loop)                 │    │
│  └──────────────────┬────────────────────────────────────┘    │
│                     │                                          │
│                     ▼                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │              RENDERED FIELD IN DOM                    │    │
│  │                                                       │    │
│  │  <input type="text" name="fieldName"                 │    │
│  │    data-field-guid="550e8400-e29b-..."               │    │
│  │    data-field-key="fieldName"                        │    │
│  │    data-field-type="text"                            │    │
│  │    data-field-loop="loopName"                        │    │
│  │    value="...">                                      │    │
│  └──────────────────┬────────────────────────────────────┘    │
│                     │                                          │
│                     ▼                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │           ACCESSIBLE VIA THREE APIS                   │    │
│  └───────────────────────────────────────────────────────┘    │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐              │
│   │   CFA   │      │   FGA   │      │   DOM   │              │
│   │ .field  │      │  .form  │      │ Queries │              │
│   └─────────┘      └─────────┘      └─────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Field Creation Flow

```
Template Definition
       │
       ▼
┌──────────────────┐
│ Field Renderer   │
│ (renderTextField,│
│  renderLoopField,│
│  etc.)           │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ applyFieldContextAttributes()        │
│                                      │
│ Parameters:                          │
│ • key:     field.key                 │
│ • type:    field.type                │
│ • loopKey: field.loopKey || null     │
│ • guid:    providedGuid || generate  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Generated GUID:                      │
│ crypto.randomUUID()                  │
│ → "550e8400-e29b-41d4-a716-..."     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ DOM Element Attributes:              │
│                                      │
│ dataset.fieldGuid = guid             │
│ dataset.fieldKey  = key              │
│ dataset.fieldType = type             │
│ dataset.fieldLoop = loopKey (if any) │
└────────┬─────────────────────────────┘
         │
         ▼
    Field in DOM
```

### Field Access Flow

```
CodeField Execution
       │
       ▼
┌──────────────────────────────────────┐
│ User Code in CodeField               │
│                                      │
│ Example:                             │
│ const value = CFA.field              │
│   .getValueByKey("fieldName");       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ CFA.field.getValueByKey()            │
│ (modules/codeFieldAPI.js)            │
│                                      │
│ 1. getFieldByKey(key)                │
│ 2. Extract value from element        │
│ 3. Return value                      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ DOM Query:                           │
│ querySelector('[data-field-key=      │
│   "fieldName"]')                     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Returns: HTMLElement                 │
│                                      │
│ Can access:                          │
│ • element.value                      │
│ • element.dataset.fieldGuid          │
│ • element.dataset.fieldKey           │
│ • element.dataset.fieldType          │
└──────────────────────────────────────┘
```

## Loop Handling

### Fields in Loop Structure

```
┌─────────────────────────────────────────────────────────┐
│ Loop Container (data-loop-key="items")                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Loop Item #1 (class="loop-item")               │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-001"             │    │
│  │         data-field-key="name"                  │    │
│  │         data-field-type="text"                 │    │
│  │         data-field-loop="items"                │    │
│  │         value="Item 1">                        │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-002"             │    │
│  │         data-field-key="price"                 │    │
│  │         data-field-type="number"               │    │
│  │         data-field-loop="items"                │    │
│  │         value="10.00">                         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Loop Item #2 (class="loop-item")               │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-003"             │    │
│  │         data-field-key="name"                  │    │
│  │         data-field-type="text"                 │    │
│  │         data-field-loop="items"                │    │
│  │         value="Item 2">                        │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-004"             │    │
│  │         data-field-key="price"                 │    │
│  │         data-field-type="number"               │    │
│  │         data-field-loop="items"                │    │
│  │         value="20.00">                         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Loop Item #3 (class="loop-item")               │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-005"             │    │
│  │         data-field-key="name"                  │    │
│  │         data-field-type="text"                 │    │
│  │         data-field-loop="items"                │    │
│  │         value="Item 3">                        │    │
│  │                                                │    │
│  │  <input data-field-guid="guid-006"             │    │
│  │         data-field-key="price"                 │    │
│  │         data-field-type="number"               │    │
│  │         data-field-loop="items"                │    │
│  │         value="30.00">                         │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

Access Patterns:

1. By Key (returns first match):
   CFA.field.getByKey("name") → guid-001

2. All By Key (returns array):
   CFA.field.getAllByKey("name") → [guid-001, guid-003, guid-005]

3. By GUID (precise targeting):
   CFA.field.getByGuid("guid-003") → Item #2's name field

4. Context-aware:
   loopItem = document.querySelectorAll('.loop-item')[1]
   field = loopItem.querySelector('[data-field-key="name"]')
   → guid-003
```

## API Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     USER CODE (CodeField)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│     CFA     │  │     FGA     │  │     DOM     │
│   .field    │  │    .form    │  │   Queries   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │ High-level     │ Mid-level      │ Low-level
       │ API            │ utilities      │ direct access
       │                │                │
       ▼                ▼                ▼
┌──────────────────────────────────────────────────┐
│           DOM Elements with Attributes           │
│                                                  │
│  data-field-guid, data-field-key, etc.           │
└──────────────────────────────────────────────────┘
```

## Resolution Strategies

```
┌─────────────────────────────────────────────────────────────┐
│           Field Resolution Decision Tree                    │
└─────────────────────────────────────────────────────────────┘

Question: What do I know about the field?
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
  Have GUID?        Only have Key?
    │                   │
    │ YES               │ 
    ▼                   ▼
Use CFA.field      Is field in loop?
.getByGuid(guid)        │
                    ┌───┴───┐
                    │       │
                  YES      NO
                    │       │
                    ▼       ▼
           Use getAllByKey() Use getByKey()
           Then select       (first match)
           specific instance
                    │       │
                    │       │
                    └───┬───┘
                        │
                        ▼
              Use field's GUID for
              precise operations
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    Template Definition                      │
│  {                                                          │
│    fields: [                                                │
│      { key: "name", type: "text" },                         │
│      { key: "items", type: "loopstart" },                   │
│      { key: "item_name", type: "text" },                    │
│      { key: "items", type: "loopstop" }                     │
│    ]                                                        │
│  }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               fieldGroupRenderer                            │
│            (utils/fieldGroupRenderer.js)                    │
│                                                             │
│  • Iterates through fields                                  │
│  • Detects loops                                            │
│  • Creates loop containers                                  │
│  • Calls renderFieldElement for each field                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               renderFieldElement                            │
│            (utils/fieldGroupRenderer.js)                    │
│                                                             │
│  • Looks up field type definition                           │
│  • Calls type-specific renderer                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Type-Specific Renderer                             │
│          (utils/fieldRenderers.js)                          │
│                                                             │
│  • Creates DOM element                                      │
│  • Calls applyFieldContextAttributes()                      │
│  • Returns wrapped element                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        applyFieldContextAttributes                          │
│              (utils/domUtils.js)                            │
│                                                             │
│  • Generates GUID if not provided                           │
│  • Adds all data attributes                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Field in DOM                                  │
│  <input data-field-guid="..."                               │
│         data-field-key="..."                                │
│         data-field-type="..."                               │
│         data-field-loop="...">                              │
└─────────────────────────────────────────────────────────────┘
```

## Use Case: Update Loop Field from CodeField

```
┌─────────────────────────────────────────────────────────────┐
│  User writes code in CodeField:                            │
│                                                             │
│  const items = CFA.field.getAllByKey("item_price");        │
│  items.forEach(field => {                                  │
│    const guid = field.dataset.fieldGuid;                   │
│    const price = parseFloat(field.value);                  │
│    const tax = price * 0.1;                                │
│    const totalField = field.closest('.loop-item')          │
│      .querySelector('[data-field-key="total"]');           │
│    CFA.field.setValue(                                     │
│      totalField.dataset.fieldGuid,                         │
│      (price + tax).toFixed(2)                              │
│    );                                                      │
│  });                                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Find all       Get each       Find sibling
    price fields   field's GUID   total field
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
              Calculate and set values
              using precise GUID targeting
```

This architecture ensures every field has a unique identifier while maintaining backward compatibility with existing key-based access patterns.
