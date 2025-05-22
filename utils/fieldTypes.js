// modules/fieldTypes.js

import * as parsers from "./fieldParsers.js";

export const fieldTypes = {
  text: {
    label: "Text",
    cssClass: "modal-text",
    defaultValue: () => "",
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = field.default ?? 0;
      input.name = field.key;
      return input;
    },
    parseValue: parsers.parseNumberField,
  },

  date: {
    label: "Date",
    cssClass: "modal-date",
    defaultValue: () => "",
    renderInput(field) {
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
    renderInput(field) {
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
    renderInput(field) {
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
};
