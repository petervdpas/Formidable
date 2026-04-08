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

#### 6. Access fields via F["key"] with helpers and conditional classes

```text
[ F["date_modified"]
  | { text: notEmpty(F["date_modified"])
        ? F["author"] + " / " + F["date_modified"]
        : F["author"],
      classes: (F["status"] == "concept"
        ? ["expr-text-orange"]
        : F["status"] == "active"
        ? ["expr-text-green", "expr-bold"]
        : ["expr-text-red", "expr-bold"])
    }
]
```

Uses `F["key"]` to access field values by name, `notEmpty()` to check for empty values, and nested ternaries for conditional CSS classes.

---

### Supported Features

* **Plain text or field names** (e.g. `title`, `author`).
* **F["key"] syntax** for accessing fields by name (required for keys with special characters).
* **Ternary expressions** `cond ? value1 : value2`.
* **String comparison** `F["status"] == "active"`.
* **String concatenation** `F["name"] + " / " + F["date"]`.
* **Objects** `{ text: "...", classes: [...], color: "..." }`.
* **Pipe syntax** to separate text and style: `[ expr | style ]`.
* **Context access**: fields marked as `expression_item` are available as variables and via `F` or `meta`.

---

### Available Helper Functions

All helpers can be used directly by name (e.g. `notEmpty(...)`) or via `h.notEmpty(...)`.

| Helper | Description | Example |
|--------|-------------|---------|
| `notEmpty(val)` | Returns true if value is not null or empty | `notEmpty(F["name"])` |
| `today()` | Returns today’s date (YYYY-MM-DD) | `today()` |
| `isOverdue(date)` | True if date is before today | `isOverdue(F["deadline"])` |
| `isFuture(date)` | True if date is after today | `isFuture(F["start"])` |
| `isToday(date)` | True if date is today | `isToday(F["event"])` |
| `isDueSoon(date, days)` | True if date is within N days from now | `isDueSoon(F["due"], 7)` |
| `isOverdueInDays(date, days)` | True if date is within N days before today | `isOverdueInDays(F["review"], 3)` |
| `isExpiredAfter(date, days)` | True if date + days is before today | `isExpiredAfter(F["start"], 30)` |
| `isUpcomingBefore(date, days)` | True if today is before date - days | `isUpcomingBefore(F["event"], 5)` |
| `daysBetween(date1, date2)` | Number of days between two dates | `daysBetween(F["start"], F["end"])` |
| `ageInDays(date)` | Days since the given date | `ageInDays(F["created"])` |
| `defaultText(val, fallback)` | Returns fallback if value is empty | `defaultText(F["note"], "N/A")` |
| `isSimilar(a, b, threshold)` | True if string similarity >= threshold | `isSimilar(F["name"], "test", 0.8)` |
| `typeOf(val)` | Returns the type of a value | `typeOf(F["amount"])` |

---

### Available CSS Classes

| Class | Effect |
|-------|--------|
| `expr-text-green` | Green text |
| `expr-text-red` | Red text |
| `expr-text-orange` | Orange text |
| `expr-text-yellow` | Yellow text |
| `expr-text-purple` | Purple text |
| `expr-bold` | Bold text |
| `expr-ticker` | Ticker/scrolling animation |
| `expr-blinking` | Blinking animation |

---

### Error Handling

* Invalid expressions return `[Invalid expression]` in the sidebar.
* If a style is a string, it’s used as `color`.
* Objects are merged into the sidebar entry output.

---

### Related Topics

- [Templates](#templates)
- [Field Types](#field-types)
