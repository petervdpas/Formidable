# Modal System

## Overview

The **Modal System** provides a flexible, feature-rich framework for creating dialogs, popups, and split-view interfaces in Formidable. All modals support resizing, keyboard shortcuts, backdrop click dismissal, and can be disabled during async operations.

## Core Features

- ✅ **Resizable** - Drag corners/edges to resize
- ✅ **ESC to Close** - Press ESC key to dismiss
- ✅ **Backdrop Click** - Click outside to close
- ✅ **Split-View Support** - Dual-pane layouts with closable panes
- ✅ **Inert Background** - Disable page interaction when modal is open
- ✅ **Disable State** - Lock modal during operations
- ✅ **Stacking** - Multiple modals with proper z-index management

## Modal Types

### 1. Standard Modal

Basic modal with header, body, and close button.

```javascript
import { setupModal } from "../utils/modalUtils.js";

const modal = setupModal("my-modal", {
  openBtn: "open-button-id",
  closeBtn: "close-button-id",
  escToClose: true,
  backdropClick: true,
  resizable: true,
  width: "60%",
  height: "70%",
  maxHeight: "90vh",
  onOpen: (modalEl, api) => {
    console.log("Modal opened");
  },
  onClose: (modalEl, api) => {
    console.log("Modal closed");
  }
});

// Show/hide programmatically
modal.show();
modal.hide();
```

### 2. Plugin Modal

Specialized modal for plugins with dynamic body injection.

```javascript
import { setupPluginModal } from "../utils/modalUtils.js";

const modal = setupPluginModal({
  pluginName: "MyPlugin",
  id: "my-plugin-modal",
  title: "My Plugin",
  body: "<p>Initial content</p>",
  width: "50%",
  height: "auto",
  resizable: true,
  onOpen: (modalEl, api) => {
    // Change body dynamically
    api.changeBody("<div>New content</div>");
  }
});
```

### 3. Split-View Modal

Modal with left and right panes that can be hidden independently.

```javascript
import { createSplitModalLayout } from "../utils/modalUtils.js";

const modal = setupModal("split-modal", {
  width: "80%",
  height: "70%",
  onOpen: () => {
    const modalEl = document.getElementById("split-modal");
    
    const leftPane = document.createElement("div");
    leftPane.innerHTML = "<h3>Left Content</h3>";
    
    const rightPane = document.createElement("div");
    rightPane.innerHTML = "<h3>Right Content</h3>";
    
    const split = createSplitModalLayout({
      modalEl,
      leftContent: leftPane,
      rightContent: rightPane,
      leftWidth: "40%",
      rightWidth: "60%",
      gap: "12px",
      showContent: "both" // "left" | "right" | "both"
    });
    
    // Access panes and controls
    split.leftPane;   // Left pane element
    split.rightPane;  // Right pane element
    split.showLeft(); // Show left pane
    split.hideLeft(); // Hide left pane
    split.showRight();
    split.hideRight();
  }
});
```

### 4. Confirm Modal

Simple confirmation dialog with OK/Cancel buttons.

```javascript
import { showConfirmModal } from "../utils/modalUtils.js";

const confirmed = await showConfirmModal(
  "modal.confirm.delete", // i18n key
  "<p>Extra HTML content</p>",
  {
    okText: "Delete",
    cancelText: "Cancel",
    okKey: "standard.delete",
    cancelKey: "standard.cancel",
    variant: "danger", // "okay" | "danger"
    width: "30em",
    height: "auto"
  }
);

if (confirmed) {
  // User clicked OK
} else {
  // User clicked Cancel or dismissed
}
```

### 5. Popup Panel

Lightweight positioned popup (non-modal).

```javascript
import { setupPopup } from "../utils/modalUtils.js";

const popup = setupPopup("my-popup", {
  triggerBtn: "trigger-button-id",
  position: "auto", // "auto" | "above" | { top: 100, left: 200 }
  escToClose: true,
  width: "auto",
  height: "auto",
  gutter: 8, // Viewport gutter
  rightPadding: 12, // Keep away from right edge
  onOpen: () => console.log("Popup opened"),
  onClose: () => console.log("Popup closed")
});

popup.show();
popup.hide();
```

## Modal Options

### Configuration Object

```javascript
{
  // Trigger buttons
  openBtn: "button-id" | HTMLElement,
  closeBtn: "button-id" | HTMLElement,
  
  // Behavior
  escToClose: false,        // Close on ESC key
  backdropClick: false,     // Close on backdrop click
  resizable: true,          // Enable resize handles
  inertBackground: false,   // Make background inert
  disableCloseWhenDisabled: true, // Disable close button when modal is disabled
  
  // Dimensions
  width: "60%",
  height: "70%",
  maxHeight: null,
  
  // Callbacks
  onOpen: (modalEl, api) => {},
  onClose: (modalEl, api) => {}
}
```

### Modal API

Every modal returns an API object:

```javascript
const api = {
  show: () => {},          // Show modal
  hide: () => {},          // Hide modal
  setDisabled: () => {},   // Disable modal (lock)
  setEnabled: () => {},    // Enable modal (unlock)
  isDisabled: () => false  // Check disabled state
};
```

## Resizable Modals

### Enable Resizing

```javascript
setupModal("my-modal", {
  resizable: true,
  width: "60%",
  height: "70%"
});
```

### Resize Handle

A resize handle (⌟) appears in the bottom-right corner of resizable modals. Users can:
- Drag the handle to resize
- Double-click to reset to default size
- Resize maintains minimum dimensions (300px × 200px by default)

### Custom Min Dimensions

```javascript
import { enableElementResizing } from "../utils/resizing.js";

enableElementResizing(modalElement, resizerElement, {
  minWidth: 400,
  minHeight: 300
});
```

## ESC to Close

### Enable ESC Key

```javascript
setupModal("my-modal", {
  escToClose: true
});
```

### How It Works

- ESC listener is added when modal opens
- Automatically removed when modal closes
- Disabled when modal is in disabled state
- Re-enabled when modal is re-enabled

### Manual ESC Setup

```javascript
import { enableEscToClose } from "../utils/modalUtils.js";

const removeListener = enableEscToClose(() => {
  modal.hide();
});

// Later: remove listener
removeListener();
```

## Backdrop Click Dismiss

### Enable Backdrop Click

```javascript
setupModal("my-modal", {
  backdropClick: true
});
```

### How It Works

- Click events on modal element itself trigger close
- Clicks on modal content are ignored
- Only works when modal is not disabled

## Disabled State

### Disable During Operations

```javascript
const modal = setupModal("my-modal", {
  disableCloseWhenDisabled: true,
  onOpen: async (modalEl, api) => {
    // Disable modal during async operation
    api.setDisabled();
    
    try {
      await longRunningOperation();
    } finally {
      api.setEnabled();
    }
  }
});
```

### Effects of Disabled State

When disabled:
- Modal gets `modal-disabled` class
- Close button is disabled (if `disableCloseWhenDisabled: true`)
- ESC key is disabled
- Resize handle is hidden
- Backdrop click is disabled
- `aria-busy="true"` is set

### Manual Control

```javascript
// Disable
modal.setDisabled();

// Enable
modal.setEnabled();

// Check state
if (modal.isDisabled()) {
  console.log("Modal is disabled");
}
```

## Inert Background

### Enable Inert Mode

```javascript
setupModal("my-modal", {
  inertBackground: true
});
```

### How It Works

When modal opens:
- All sibling elements get `inert` attribute
- All sibling elements get `aria-hidden="true"`
- Screen readers and keyboard focus are limited to modal
- When modal closes, attributes are removed

### Benefits

- Better accessibility
- Prevents tabbing to background elements
- Prevents screen reader navigation to background

## Split-View System

### Creating Split Views

```javascript
const split = createSplitModalLayout({
  modalEl: document.getElementById("my-modal"),
  leftContent: leftElement,
  rightContent: rightElement,
  leftWidth: "40%",    // CSS width
  rightWidth: "60%",   // CSS width
  gap: "12px",         // Gap between panes
  className: "custom-split",
  showContent: "both"  // "left" | "right" | "both"
});
```

### Split API

```javascript
split.leftPane;        // HTMLElement
split.rightPane;       // HTMLElement
split.wrap;            // Container element
split.showLeft();      // Show left pane
split.hideLeft();      // Hide left pane
split.showRight();     // Show right pane
split.hideRight();     // Hide right pane
split.showBoth();      // Show both panes
```

### Closable Panes

Add close buttons to pane headers:

```javascript
const leftHeader = document.createElement("div");
leftHeader.className = "pane-header";

const closeBtn = document.createElement("button");
closeBtn.textContent = "✕";
closeBtn.className = "btn-close-pane";
closeBtn.addEventListener("click", () => {
  split.hideLeft();
});

leftHeader.appendChild(closeBtn);
leftPane.appendChild(leftHeader);
```

### Example: Markdown & Preview Modal

```javascript
setupModal("render-modal", {
  width: "40em",
  height: "40vh",
  resizable: true,
  onOpen: () => {
    const modal = document.getElementById("render-modal");
    
    const rawPane = createPane("raw-pane", markdownContent);
    const htmlPane = createPane("html-pane", htmlContent);
    
    const split = createSplitModalLayout({
      modalEl: modal,
      leftContent: rawPane,
      rightContent: htmlPane,
      leftWidth: "1fr",
      rightWidth: "1fr",
      showContent: "both"
    });
    
    // Add close buttons
    addPaneCloseButton(rawPane, () => split.hideLeft());
    addPaneCloseButton(htmlPane, () => split.hideRight());
  }
});
```

## Modal Stacking

### Z-Index Management

```javascript
// Automatic backdrop stacking
// First modal: z-index 1000
// Second modal: z-index 1001
// Backdrop shows/hides based on modal count
```

### Opening Multiple Modals

```javascript
modal1.show(); // Opens modal 1
modal2.show(); // Opens modal 2 on top
modal2.hide(); // Closes modal 2
// modal 1 is still visible
```

## CSS Classes

### Modal Classes

| Class | Description |
|-------|-------------|
| `.modal` | Base modal container |
| `.modal.show` | Visible modal |
| `.modal.large` | Large modal variant |
| `.modal-disabled` | Disabled state |
| `.modal-header` | Header section |
| `.modal-body` | Body section |
| `.modal-title-row` | Title container |
| `.modal-resizer` | Resize handle |
| `.btn-close` | Close button |

### Split Classes

| Class | Description |
|-------|-------------|
| `.modal-split` | Split container |
| `.pane` | Individual pane |
| `.pane-header` | Pane header |
| `.btn-close-pane` | Pane close button |

### Backdrop

| Class | Description |
|-------|-------------|
| `#modalBackdrop` | Global backdrop |
| `.show` | Visible backdrop |

## Common Patterns

### Loading State

```javascript
const modal = setupModal("my-modal", {
  onOpen: async (modalEl, api) => {
    api.setDisabled();
    
    const bodyEl = modalEl.querySelector(".modal-body");
    bodyEl.innerHTML = "<p>Loading...</p>";
    
    try {
      const data = await fetchData();
      bodyEl.innerHTML = renderData(data);
    } catch (err) {
      bodyEl.innerHTML = `<p>Error: ${err.message}</p>`;
    } finally {
      api.setEnabled();
    }
  }
});
```

### Dynamic Content

```javascript
const modal = setupPluginModal({
  id: "dynamic-modal",
  title: "Dynamic Content",
  onOpen: (modalEl, api) => {
    // Change title
    const title = modalEl.querySelector("h2");
    title.textContent = "New Title";
    
    // Change body
    api.changeBody(`
      <div>
        <h3>New Content</h3>
        <p>Dynamically injected</p>
      </div>
    `);
  }
});
```

### Form Modal

```javascript
setupModal("form-modal", {
  escToClose: true,
  backdropClick: false, // Prevent accidental close
  onOpen: (modalEl, api) => {
    const form = modalEl.querySelector("form");
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      api.setDisabled();
      
      try {
        await saveFormData(new FormData(form));
        api.hide();
      } catch (err) {
        alert("Save failed: " + err.message);
      } finally {
        api.setEnabled();
      }
    });
  }
});
```

### Nested Modals

```javascript
// Parent modal
const parentModal = setupModal("parent-modal", {
  width: "60%",
  onOpen: () => {
    document.getElementById("open-child").addEventListener("click", () => {
      childModal.show();
    });
  }
});

// Child modal (opens on top)
const childModal = setupModal("child-modal", {
  width: "40%",
  onClose: () => {
    // Parent modal is still visible
  }
});
```

## Accessibility

### ARIA Attributes

```html
<div class="modal" 
     role="dialog" 
     aria-modal="true"
     aria-labelledby="modal-title">
  <div class="modal-header">
    <h2 id="modal-title">Modal Title</h2>
  </div>
  <div class="modal-body">
    <!-- Content -->
  </div>
</div>
```

### Keyboard Support

- **ESC** - Close modal (if `escToClose: true`)
- **TAB** - Navigate focusable elements within modal
- **Inert background** - Prevents focus on background elements

### Screen Readers

- Modal role = `dialog`
- `aria-modal="true"` indicates modal state
- `aria-labelledby` references modal title
- `aria-busy` indicates loading/disabled state
- Background elements get `aria-hidden="true"` when `inertBackground: true`

## Troubleshooting

### Modal Not Closing

**Check**:
1. Is modal disabled? (`modal.isDisabled()`)
2. Is `disableCloseWhenDisabled: true` set?
3. Are there JavaScript errors preventing close?

**Solution**:
```javascript
// Force enable
modal.setEnabled();

// Then close
modal.hide();
```

### Backdrop Not Showing

**Check**:
1. Is `#modalBackdrop` element present in HTML?
2. Are there CSS conflicts?

**Solution**:
```html
<!-- Ensure backdrop exists -->
<div id="modalBackdrop" class="modal-backdrop"></div>
```

### Resize Not Working

**Check**:
1. Is `resizable: true` set?
2. Is `.modal-resizer` element present?
3. Are there CSS conflicts preventing pointer events?

**Solution**:
```javascript
// Verify resizer exists
const resizer = modal.querySelector(".modal-resizer");
console.log("Resizer exists:", !!resizer);
```

### ESC Key Not Working

**Check**:
1. Is `escToClose: true` set?
2. Is modal disabled?
3. Are there other keydown listeners preventing propagation?

**Solution**:
```javascript
// Manually test ESC listener
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    console.log("ESC pressed");
    modal.hide();
  }
});
```

### Split Panes Not Aligned

**Check**:
1. Are pane widths valid CSS values?
2. Is gap value valid?
3. Are there CSS conflicts?

**Solution**:
```javascript
// Reset split layout
split.wrap.style.display = "grid";
split.wrap.style.gridTemplateColumns = "1fr 1fr";
split.wrap.style.gap = "12px";
```

## Implementation Details

### Modal HTML Structure

```html
<div id="my-modal" class="modal">
  <div class="modal-header">
    <div class="modal-title-row">
      <h2>Modal Title</h2>
    </div>
    <button class="btn-close">✕</button>
  </div>
  <div class="modal-body">
    <!-- Content -->
  </div>
  <div class="modal-resizer"></div>
</div>
```

### Backdrop Management

```javascript
let openModalCount = 0;

function show() {
  modal.classList.add("show");
  
  if (backdrop) {
    openModalCount++;
    backdrop.classList.add("show");
  }
}

function hide() {
  modal.classList.remove("show");
  
  if (backdrop && openModalCount > 0) {
    openModalCount--;
    if (openModalCount === 0) {
      backdrop.classList.remove("show");
    }
  }
}
```

### Resize Implementation

Uses `enableElementResizing` from `utils/resizing.js`:

```javascript
function enableElementResizing(target, grip, { minWidth = 300, minHeight = 200 } = {}) {
  let startX, startY, startWidth, startHeight;
  
  grip.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = target.offsetWidth;
    startHeight = target.offsetHeight;
    
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  });
  
  function resize(e) {
    const width = Math.max(minWidth, startWidth + (e.clientX - startX));
    const height = Math.max(minHeight, startHeight + (e.clientY - startY));
    
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
  }
  
  function stopResize() {
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
  }
}
```

## Related Documentation

- [Plugin System](./PLUGIN-SYSTEM.md) - Plugin modal integration
- [Form System](./FORM-SYSTEM.md) - Form modal patterns
- [Global API System](./GLOBAL-API-SYSTEM.md) - Modal API access

## API Reference

### setupModal(modalId, options)

Creates a standard modal.

**Parameters**:
- `modalId`: String - Modal element ID
- `options`: Object - Configuration options

**Returns**: Modal API object

### setupPluginModal(options)

Creates a plugin modal with dynamic body.

**Parameters**:
- `options`: Object - Configuration options including `pluginName`, `id`, `title`, `body`

**Returns**: Extended modal API with `changeBody` method

### createSplitModalLayout(options)

Creates a split-view layout inside a modal.

**Parameters**:
- `options`: Object - Configuration including `modalEl`, `leftContent`, `rightContent`, widths, gap

**Returns**: Split API object

### showConfirmModal(i18nKey, extraHtml, options)

Shows a confirmation dialog.

**Parameters**:
- `i18nKey`: String - Translation key for message
- `extraHtml`: String - Optional extra HTML
- `options`: Object - Configuration including button text, variant

**Returns**: Promise<boolean> - true if confirmed, false if canceled

### setupPopup(popupId, options)

Creates a positioned popup panel.

**Parameters**:
- `popupId`: String - Popup element ID
- `options`: Object - Configuration options

**Returns**: Popup API object

---

**Modal System Version**: 1.0  
**Last Updated**: 2024
