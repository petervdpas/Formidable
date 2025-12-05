---
id: "expressions"
title: "Expressions"
order: 6
---

## What can you do with Expressions?

Expressions are used in Formidable to control how **sidebar entries** (and other dynamic fields) are displayed.  
They allow you to show values, apply styles, and conditionally format content.

An expression is written in square brackets:

```text
[ expression | style ]
```

* **expression** – the main content to display.
* **style** *(optional)* – extra styling or object values to merge.

---

### Examples

#### 1. Show a simple field value

```text
[ title ]
```

Displays the value of the field `title`.

#### 2. Conditional text with ternary

```text
[ check ? "Approved" : "Declined" ]
```

Shows *Approved* if `check` is true, otherwise *Declined*.

#### 3. Conditional object with text + CSS classes

```text
[ check
  ? { text: "You approved this!", classes: ["expr-text-green", "expr-bold"] }
  : { text: "You declined this!", classes: ["expr-text-red", "expr-bold"] }
]
```

#### 4. Combine text and style with pipe

```text
[ status | "blue" ]
```

Displays the `status` field in blue.

#### 5. Use helper functions

```text
[ today() ]
```

Shows today’s date using the built-in `today()` helper.

---

### Supported Features

* **Plain text or field names** (e.g. `title`, `author`).
* **Ternary expressions** `cond ? value1 : value2`.
* **Objects** `{ text: "...", classes: [...], color: "..." }`.
* **Pipe syntax** to separate text and style: `[ expr | style ]`.
* **Helpers** from `expressionHelpers.js` such as `today()`.
* **Context access**: fields are available as variables; also via `F` or `meta`.

---

### Error Handling

* Invalid expressions return `[Invalid expression]` in the sidebar.
* If a style is a string, it’s used as `color`.
* Objects are merged into the sidebar entry output.

---

### Related Topics

- [Templates](#templates)
- [Field Types](#field-types)
