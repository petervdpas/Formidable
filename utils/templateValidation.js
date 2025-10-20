// utils/templateValidation.js

// -------- Template-level error formatting (array of errors from validateTemplate) --------
export function formatError(error) {
  switch (error.type) {
    case "duplicate-keys":
      return { key: "error.template.duplicate_keys", args: [error.keys.join(", ")] };

    case "unmatched-loopstart":
      return { key: "error.template.unmatched_loopstart", args: [error.field?.key || "?"] };

    case "unmatched-loopstop":
      return { key: "error.template.unmatched_loopstop", args: [error.field?.key || "?"] };

    case "nested-loop-not-allowed":
      return { key: "error.template.nested_loop_not_allowed", args: [error.field?.key || "?"] };

    case "excessive-loop-nesting":
      return {
        key: "error.template.excessive_loop_nesting",
        args: [error.path || error.key || "unknown", error.maxDepth || 2],
      };

    case "loop-key-mismatch":
      return {
        key: "error.template.loop_key_mismatch",
        args: [error.field?.key || "?", error.expectedKey || "?"],
      };

    case "multiple-primary-keys":
      return { key: "error.template.multiple_primary_keys", args: [error.keys.join(", ")] };

    case "missing-guid-for-collection":
      // Prefer backend-provided message if you ever need fallback, but for i18n we use our key.
      return { key: "error.template.missing_guid_for_collection", args: [] };

    case "multiple-tags-fields":
      return { key: "error.template.multiple_tags_fields", args: [error.keys.join(", ")] };

    case "invalid-template":
      return { key: "error.template.invalid", args: [error.message || ""] };

          // ── API field cases ───────────────────────────────
    case "api-collection-required":
      return { key: "error.api.collection_required", args: [] };

    case "api-map-invalid":
      return { key: "error.api.map_invalid", args: [] };

    case "api-map-key-required":
      return { key: "error.api.map_key_required", args: [] };

    case "api-map-duplicate-keys":
      return { key: "error.api.map_duplicate_keys", args: [error.dup || ""] };
      
    default:
      // Safe fallback
      return { key: "error.template.unknown", args: [JSON.stringify(error)] };
  }
}

// -------- Field-level (UI) validation while editing a single field --------
export function validateField(field, allFields = []) {
  const rawKey = (field.key || "").trim();
  const currentType = field.type || "text";
  const isEditingExisting = !!field._originalKey;
  const originalKey = field._originalKey || "";

  // Rule: Key is required
  if (rawKey.length === 0) {
    return { valid: false, reason: "missing-key" };
  }

  // Rule: GUID key must be 'id'
  if (currentType === "guid" && rawKey !== "id") {
    return { valid: false, reason: "guid-key-must-be-id", key: rawKey };
  }

  // Rule: Only one 'tags' field allowed
  if (currentType === "tags") {
    const existingTags = allFields.some(
      (f) =>
        f.type === "tags" &&
        (!isEditingExisting || f.key !== originalKey)
    );
    if (existingTags) {
      return { valid: false, reason: "only-one-tags-field" };
    }
  }

  // Rule: Duplicate key (excluding the one being edited)
  const isDuplicate = allFields.some(
    (f) => f.key === rawKey && (!isEditingExisting || f.key !== originalKey)
  );
  if (isDuplicate) {
    return { valid: false, reason: "duplicate-key", key: rawKey };
  }

  // Rule: Loop start/stop pairs (sanity)
  if (["loopstart", "loopstop"].includes(currentType)) {
    const expectedPartnerType = currentType === "loopstart" ? "loopstop" : "loopstart";

    const hasAnyLoopForKey = allFields.some(
      (f) => f.key === rawKey && ["loopstart", "loopstop"].includes(f.type)
    );

    const hasPartner = allFields.some(
      (f) =>
        f.key === rawKey &&
        f.type === expectedPartnerType &&
        (!isEditingExisting || f.key !== originalKey || f.type !== currentType)
    );

    if (hasAnyLoopForKey && !hasPartner) {
      return {
        valid: false,
        reason: "unmatched-loop",
        key: rawKey,
        type: currentType,
      };
    }
  }

  // Rule: API-specific validations
  if (currentType === "api") {
    const collection = String(field.collection || "").trim();
    if (!collection) {
      return { valid: false, reason: "api-collection-required" };
    }

    if (field.map != null) {
      if (!Array.isArray(field.map)) {
        return { valid: false, reason: "api-map-invalid" };
      }
      const seen = new Set();
      for (const m of field.map) {
        // must be an object with non-empty key
        if (!m || typeof m !== "object" || !String(m.key || "").trim()) {
          return { valid: false, reason: "api-map-key-required" };
        }
        const k = String(m.key).trim().toLowerCase();
        if (seen.has(k)) {
          return { valid: false, reason: "api-map-duplicate-keys", key: m.key };
        }
        seen.add(k);
      }
    }
  }

  return { valid: true };
}
