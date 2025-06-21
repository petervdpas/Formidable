// modules/fieldTypes.js

import * as parsers from "./fieldParsers.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { applyDatasetMapping, generateGuid } from "./domUtils.js";

export const fieldTypes = {
  guid: {
    type: "guid",
    label: "Guid",
    cssClass: "modal-guid",
    disabledAttributes: [
      "listDisplay",
      "twoColumnRow",
      "primaryKeyRow",
      "label",
      "description",
      "default",
      "options",
    ],
    defaultValue: () => generateGuid(),

    renderInput: async function (field, template, value = "") {
      const guidValue =
        value?.trim?.() || field.default?.trim?.() || generateGuid();

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = field.key;
      input.value = guidValue;
      input.dataset.guidField = field.key;

      return input;
    },

    parseValue: (input) => input?.value?.trim() || generateGuid(),
  },

  looper: {
    label: "Looper",
    metaOnly: true,
    cssClass: "modal-looper",
    disabledAttributes: [
      "listDisplay",
      "description",
      "default",
      "options",
      "twoColumnRow",
    ],
  },

  loopstart: {
    label: "Loop Start",
    metaOnly: true,
    cssClass: "modal-loopstart",
    disabledAttributes: [
      "listDisplay",
      "description",
      "default",
      "options",
      "twoColumnRow",
    ],
    defaultValue: () => "",
    renderInput: async function (field) {
      const wrapper = document.createElement("div");
      wrapper.className = "loop-control-block";
      wrapper.textContent = `Loop Start → ${field.for || "(not set)"}`;
      return wrapper;
    },
    parseValue: () => null, // Not a real input
  },

  loopstop: {
    label: "Loop Stop",
    metaOnly: true,
    cssClass: "modal-loopstop",
    disabledAttributes: [
      "listDisplay",
      "description",
      "default",
      "options",
      "twoColumnRow",
    ],
    defaultValue: () => "",
    renderInput: async function () {
      const wrapper = document.createElement("div");
      wrapper.className = "loop-control-block";
      wrapper.textContent = "Loop End";
      return wrapper;
    },
    parseValue: () => null,
  },

  text: {
    label: "Text",
    cssClass: "modal-text",
    defaultValue: () => "",
    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = field.default || "";
      input.name = field.key;
      return input;
    },
    parseValue: parsers.parseTextField,
  },

  boolean: {
    label: "Checkbox",
    cssClass: "modal-boolean",
    defaultValue: () => false,
    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = field.default === true;
      input.name = field.key;
      return input;
    },
    parseValue: parsers.parseBooleanField,
  },

  dropdown: {
    label: "Dropdown",
    cssClass: "modal-dropdown",
    defaultValue: () => "",
    renderInput: async function (field) {
      const select = document.createElement("select");
      (field.options || []).forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      select.value = field.default || "";
      select.name = field.key;
      return select;
    },
    parseValue: parsers.parseDropdownField,
  },

  multioption: {
    label: "Multiple Choice",
    cssClass: "modal-multioption",
    defaultValue: () => [],
    renderInput: async function (field) {
      const wrapper = document.createElement("div");
      (field.options || []).forEach((opt) => {
        const label = document.createElement("label");
        label.style.display = "block";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = field.key;
        input.value = opt;
        if ((field.default || []).includes(opt)) input.checked = true;

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${opt}`));
        wrapper.appendChild(label);
      });
      wrapper.dataset.multioptionField = field.key;
      return wrapper;
    },
    parseValue(wrapper) {
      return Array.from(
        wrapper.querySelectorAll(`input[type="checkbox"]:checked`)
      ).map((el) => el.value);
    },
  },

  radio: {
    label: "Radio Buttons",
    cssClass: "modal-radio",
    defaultValue: () => "",
    renderInput: async function (field) {
      const wrapper = document.createElement("div");

      (field.options || []).forEach((opt) => {
        const { value, label } =
          typeof opt === "string"
            ? { value: opt, label: opt }
            : {
                value: opt.value,
                label: opt.label ?? opt.value,
              };

        const labelEl = document.createElement("label");
        labelEl.style.display = "block";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = field.key;
        input.value = value;
        if (value === field.default) {
          input.checked = true;
        }

        labelEl.appendChild(input);
        labelEl.appendChild(document.createTextNode(` ${label}`));
        wrapper.appendChild(labelEl);
      });

      wrapper.dataset.radioGroup = field.key;
      return wrapper;
    },
    parseValue: parsers.parseRadioField,
  },

  textarea: {
    label: "Multiline Text",
    cssClass: "modal-textarea",
    defaultValue: () => "",
    renderInput: async function (field) {
      const textarea = document.createElement("textarea");
      textarea.value = field.default || "";
      textarea.name = field.key;
      return textarea;
    },
    parseValue: parsers.parseTextareaField,
  },

  number: {
    label: "Number",
    cssClass: "modal-number",
    defaultValue: () => 0,
    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = field.default ?? 0;
      input.name = field.key;
      return input;
    },
    parseValue: parsers.parseNumberField,
  },

  range: {
    label: "Range Slider",
    cssClass: "modal-range",
    defaultValue: () => 50,

    renderInput: async function (field) {
      const wrapper = document.createElement("div");
      wrapper.dataset.rangeField = field.key;

      const optMap = Object.fromEntries(
        (field.options || []).map((pair) =>
          Array.isArray(pair)
            ? [pair[0], pair[1]]
            : [pair.value ?? pair, pair.label ?? pair]
        )
      );

      const min = parseFloat(optMap.min ?? field.min ?? 0);
      const max = parseFloat(optMap.max ?? field.max ?? 100);
      const step = parseFloat(optMap.step ?? field.step ?? 1);
      const value = field.default ?? (min + max) / 2;

      const input = document.createElement("input");
      input.type = "range";
      input.name = field.key;
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = value;

      const display = document.createElement("span");
      display.className = "range-display";
      display.textContent = input.value;
      display.style.marginLeft = "10px";

      input.addEventListener("input", () => {
        display.textContent = input.value;
      });

      wrapper.appendChild(input);
      wrapper.appendChild(display);

      return wrapper;
    },

    parseValue: parsers.parseRangeField,
  },

  date: {
    label: "Date",
    cssClass: "modal-date",
    defaultValue: () => "",
    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "date";
      input.value = field.default || "";
      input.name = field.key;
      return input;
    },
    parseValue: parsers.parseDateField,
  },

  list: {
    label: "List",
    cssClass: "modal-list",
    defaultValue: () => [],
    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = (field.default || []).join(", ");
      input.name = field.key;
      input.placeholder = "e.g., item1, item2, item3";
      return input;
    },
    parseValue: parsers.parseListField,
  },

  table: {
    label: "Table",
    cssClass: "modal-table",
    defaultValue: () => [],
    renderInput: async function (field) {
      const textarea = document.createElement("textarea");
      textarea.name = field.key;
      textarea.rows = 5;
      try {
        textarea.value = JSON.stringify(field.default || [], null, 2);
      } catch {
        textarea.value = "[]";
      }
      return textarea;
    },
    parseValue: parsers.parseTableField,
  },

  image: {
    label: "Image Upload",
    cssClass: "modal-image",
    defaultValue: () => "",
    renderInput: async function (field, template) {
      template = await ensureVirtualLocation(template);

      const wrapper = document.createElement("div");

      applyDatasetMapping(
        wrapper,
        [field, template],
        [
          { from: "key", to: "imageField" },
          { from: "virtualLocation", to: "virtualLocation" },
        ]
      );

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png, image/jpeg";
      input.name = field.key;

      const preview = document.createElement("img");
      preview.style.maxWidth = "200px";
      preview.style.maxHeight = "150px";
      preview.style.display = "block";
      preview.style.marginTop = "6px";

      // Show preview if default filename is known
      if (typeof field.default === "string" && field.default) {
        const filename = field.default;
        if (template?.virtualLocation) {
          window.api.system
            .resolvePath(template.virtualLocation, "images", filename)
            .then((fullPath) => {
              preview.src = `file://${fullPath}`;
            })
            .catch(() => {
              preview.alt = "Image not found";
            });
        }
      }

      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });

      wrapper.appendChild(input);
      wrapper.appendChild(preview);

      return wrapper;
    },
    parseValue: parsers.parseImageField,
  },

  link: {
    label: "Link",
    cssClass: "modal-link",
    defaultValue: () => "",

    renderInput: async function (field) {
      const input = document.createElement("input");
      input.type = "text";
      input.name = field.key;
      input.value = field.default || "";
      input.placeholder = "Enter link or URL";

      return input;
    },

    parseValue: parsers.parseLinkField,
  },
};
