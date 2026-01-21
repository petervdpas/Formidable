// Example: Using Field GUID System in CodeFields
// This file demonstrates various use cases for the field GUID system

// IMPORTANT: All CFA.field methods are ASYNC and event-driven.
// Always use 'await' when calling them, and wrap code in async functions.

// ============================================
// Example 1: Copy value from one field to another
// ============================================
// Scenario: You have 3 fields - sourceField, targetField, and this codefield
// Goal: Copy sourceField value to targetField

(async function copyFieldValue() {
  // Method 1: Using field keys (works for non-loop fields)
  const sourceValue = await CFA.field.getValueByKey("sourceField");
  await CFA.field.setValueByKey("targetField", sourceValue);
  
  // Method 2: Using GUIDs (recommended for loop fields)
  const sourceGuid = "your-source-field-guid-here";
  const targetGuid = "your-target-field-guid-here";
  const value = await CFA.field.getValue(sourceGuid);
  await CFA.field.setValue(targetGuid, value);
})();


// ============================================
// Example 2: Update fields in the same loop item
// ============================================
// Scenario: Codefield inside a loop needs to update sibling fields
// Goal: Calculate and set a computed value for a sibling field

(async function updateLoopSibling() {
  // Find the current codefield's loop item container
  const currentCodeField = document.querySelector('[data-code-field]');
  const loopItem = currentCodeField.closest('.loop-item');
  
  if (loopItem) {
    // Get sibling fields within the same loop item
    const quantityField = loopItem.querySelector('[data-field-key="quantity"]');
    const priceField = loopItem.querySelector('[data-field-key="price"]');
    const totalField = loopItem.querySelector('[data-field-key="total"]');
    
    if (quantityField && priceField && totalField) {
      const quantity = parseFloat(quantityField.value) || 0;
      const price = parseFloat(priceField.value) || 0;
      const total = quantity * price;
      
      // Use GUID for precise targeting
      await CFA.field.setValue(totalField.dataset.fieldGuid, total.toFixed(2));
    }
  }
})();


// ============================================
// Example 3: Process all loop items
// ============================================
// Scenario: Calculate sum of all items in a loop
// Goal: Update a total field with sum of all item values

(async function calculateLoopTotal() {
  // Get all fields with key "itemPrice" (returns array)
  const priceFields = await CFA.field.getAllByKey("itemPrice");
  
  // Calculate total
  const total = priceFields.reduce((sum, field) => {
    const value = parseFloat(field.value) || 0;
    return sum + value;
  }, 0);
  
  // Update the total field (outside the loop)
  await CFA.field.setValueByKey("grandTotal", total.toFixed(2));
  
  // Also show count
  await CFA.field.setValueByKey("itemCount", priceFields.length);
})();


// ============================================
// Example 4: Conditional field updates based on another field
// ============================================
// Scenario: Show/hide or enable/disable fields based on checkbox
// Goal: Toggle field states programmatically

(async function toggleFieldState() {
  // Get checkbox value
  const enableEditing = await CFA.field.getValueByKey("enableEditing");
  
  // Get fields to toggle
  const nameField = await CFA.field.getByKey("itemName");
  const descField = await CFA.field.getByKey("itemDescription");
  
  if (nameField && descField) {
    // Enable or disable based on checkbox
    nameField.readOnly = !enableEditing;
    descField.readOnly = !enableEditing;
    
    // Optional: Add visual indicator
    const className = enableEditing ? "" : "field-disabled";
    nameField.className = nameField.className.replace(/field-disabled/g, "") + " " + className;
    descField.className = descField.className.replace(/field-disabled/g, "") + " " + className;
  }
})();


// ============================================
// Example 5: Complex loop manipulation
// ============================================
// Scenario: Nested loops with field dependencies
// Goal: Update child loop items based on parent loop values

(async function updateNestedLoops() {
  // Get all parent loop items
  const parentLoopItems = document.querySelectorAll('[data-loop-key="orders"] > .loop-list > .loop-item');
  
  for (const parentItem of parentLoopItems) {
    // Get parent discount field
    const discountField = parentItem.querySelector('[data-field-key="discount"]');
    const discountPercent = parseFloat(discountField?.value || "0") / 100;
    
    // Get all child items in this parent
    const childItems = parentItem.querySelectorAll('[data-loop-key="orderItems"] .loop-item');
    
    for (const childItem of childItems) {
      // Get child price field
      const priceField = childItem.querySelector('[data-field-key="price"]');
      const discountedPriceField = childItem.querySelector('[data-field-key="discountedPrice"]');
      
      if (priceField && discountedPriceField) {
        const price = parseFloat(priceField.value) || 0;
        const discountedPrice = price * (1 - discountPercent);
        
        // Use GUID to update
        await CFA.field.setValue(
          discountedPriceField.dataset.fieldGuid,
          discountedPrice.toFixed(2)
        );
      }
    }
  }
})();


// ============================================
// Example 6: Debugging - Inspect all fields
// ============================================
// Scenario: You need to see what fields are available
// Goal: List all fields with their properties

(async function debugFields() {
  const allFields = await CFA.field.getAll();
  
  console.log("=== All Fields in Form ===");
  console.table(allFields);
  
  // Group by key
  const fieldsByKey = allFields.reduce((acc, field) => {
    if (!acc[field.key]) acc[field.key] = [];
    acc[field.key].push(field);
    return acc;
  }, {});
  
  console.log("=== Fields Grouped by Key ===");
  Object.entries(fieldsByKey).forEach(([key, fields]) => {
    console.log(`${key}: ${fields.length} instance(s)`);
    if (fields.length > 1) {
      console.log("  (Multiple instances - likely in loop)");
      fields.forEach((f, idx) => {
        console.log(`  [${idx}] GUID: ${f.guid}, Loop: ${f.loop || 'none'}`);
      });
    }
  });
})();


// ============================================
// Example 7: Field validation and error display
// ============================================
// Scenario: Validate fields and show errors
// Goal: Check field values and display validation messages

(async function validateFields() {
  const errors = [];
  
  // Validate required fields
  const requiredFields = [
    { key: "email", label: "Email", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { key: "phone", label: "Phone", pattern: /^\d{10}$/ },
  ];
  
  for (const { key, label, pattern } of requiredFields) {
    const value = await CFA.field.getValueByKey(key);
    
    if (!value || value.trim() === "") {
      errors.push(`${label} is required`);
    } else if (pattern && !pattern.test(value)) {
      errors.push(`${label} format is invalid`);
    }
  }
  
  // Display errors
  if (errors.length > 0) {
    await CFA.field.setValueByKey("validationErrors", errors.join("\n"));
    console.error("Validation errors:", errors);
  } else {
    await CFA.field.setValueByKey("validationErrors", "All fields valid ✓");
    console.log("Validation passed!");
  }
})();


// ============================================
// Example 8: Real-time calculations with event listeners
// ============================================
// Scenario: Auto-calculate as user types
// Goal: Set up live calculations without page refresh

(async function setupLiveCalculation() {
  // Get fields
  const field1 = await CFA.field.getByKey("value1");
  const field2 = await CFA.field.getByKey("value2");
  const resultField = await CFA.field.getByKey("result");
  
  if (!field1 || !field2 || !resultField) return;
  
  // Define calculation
  const calculate = async () => {
    const v1 = parseFloat(field1.value) || 0;
    const v2 = parseFloat(field2.value) || 0;
    const result = v1 + v2;
    
    await CFA.field.setValue(resultField.dataset.fieldGuid, result.toFixed(2));
  };
  
  // Attach listeners
  field1.addEventListener("input", calculate);
  field2.addEventListener("input", calculate);
  
  // Initial calculation
  await calculate();
})();


// ============================================
// Example 9: Batch update multiple fields
// ============================================
// Scenario: Update multiple fields at once
// Goal: Set default values or copy data efficiently

(async function batchUpdate() {
  const updates = [
    { key: "firstName", value: "John" },
    { key: "lastName", value: "Doe" },
    { key: "email", value: "john.doe@example.com" },
    { key: "country", value: "USA" },
  ];
  
  for (const { key, value } of updates) {
    const success = await CFA.field.setValueByKey(key, value);
    if (!success) {
      console.warn(`Failed to update field: ${key}`);
    }
  }
  
  console.log("Batch update completed");
})();


// ============================================
// Example 10: Export field data for debugging
// ============================================
// Scenario: Need to export form data for support/debugging
// Goal: Generate JSON snapshot of all field values

(async function exportFieldData() {
  // Get form snapshot (structured data)
  const formData = await CFA.form.snapshot();
  console.log("Form Data:", formData);
  
  // Get all field details with GUIDs
  const allFields = await CFA.field.getAll();
  const fieldValues = [];
  
  for (const field of allFields) {
    const value = await CFA.field.getValue(field.guid);
    fieldValues.push({
      guid: field.guid,
      key: field.key,
      type: field.type,
      loop: field.loop,
      value: value
    });
  }
  
  console.log("Field Values with GUIDs:", fieldValues);
  
  // Copy to clipboard as JSON
  const exportData = {
    timestamp: new Date().toISOString(),
    formData,
    fieldDetails: fieldValues
  };
  
  // Note: In browser context, you might use:
  // await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
  console.log("Export Data:", JSON.stringify(exportData, null, 2));
})();
