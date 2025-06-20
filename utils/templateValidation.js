// utils/templateValidation.js

export function formatError(error) {
  if (error.type === "duplicate-keys") {
    return `Duplicate keys: ${error.keys.join(", ")}`;
  }
  if (error.type === "unmatched-loopstart") {
    return `Unmatched loop start at: ${error.field?.key || "?"}`;
  }
  if (error.type === "unmatched-loopstop") {
    return `Unmatched loop stop at: ${error.field?.key || "?"}`;
  }
  if (error.type === "multiple-primary-keys") {
    return `Multiple primary keys: ${error.keys.join(", ")}`;
  }
  if (error.type === "invalid-template") {
    return `Invalid template: ${error.message}`;
  }
  return `Unknown error: ${JSON.stringify(error)}`;
}

export function validateField(field, allFields = []) {
  const rawKey = (field.key || "").trim();
  const currentType = field.type || "text";
  const isEditingExisting = !!field._originalKey;
  const originalKey = field._originalKey || "";

  // Rule: Key is required
  if (rawKey.length === 0) {
    return { valid: false, reason: "missing-key" };
  }

  // Rule: Duplicate key
  const isDuplicate = allFields.some(
    (f) => f.key === rawKey && (!isEditingExisting || f.key !== originalKey)
  );
  if (isDuplicate) {
    return { valid: false, reason: "duplicate-key", key: rawKey };
  }

  // Rule: Loop start/stop pairs
  if (["loopstart", "loopstop"].includes(currentType)) {
    const expectedPartnerType =
      currentType === "loopstart" ? "loopstop" : "loopstart";

    const hasAnyLoop = allFields.some(
      (f) => f.key === rawKey && ["loopstart", "loopstop"].includes(f.type)
    );

    const hasPartner = allFields.some(
      (f) =>
        f.key === rawKey &&
        f.type === expectedPartnerType &&
        (!isEditingExisting || f.key !== originalKey || f.type !== currentType)
    );

    if (hasAnyLoop && !hasPartner) {
      return {
        valid: false,
        reason: "unmatched-loop",
        key: rawKey,
        type: currentType,
      };
    }
  }

  // If passed all checks:
  return { valid: true };
}
