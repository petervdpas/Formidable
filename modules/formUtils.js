// modules/formUtils.js

export function extractFieldDefinition({
  keyId = "edit-key",
  labelId = "edit-label",
  defaultId = "edit-default",
  typeDropdown,
  markdownDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
  const label = document.getElementById(labelId)?.value.trim();
  const def = document.getElementById(defaultId)?.value.trim();
  const type = typeDropdown?.getSelected() || "text";
  const markdown = markdownDropdown?.getSelected() || "";

  const options = document
    .getElementById(optionsId)
    ?.value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const field = { key, label, type };
  if (def) field.default = def;
  if (markdown) field.markdown = markdown;
  if (["dropdown", "radio"].includes(type) && options?.length) {
    field.options = options;
  }

  return field;
}

export function stripMarkdownExtension(filename = "") {
  return filename.replace(/\.md$/, "");
}

export function validateFilenameInput(inputEl) {
  const name = inputEl?.value.trim();
  return name || null;
}
