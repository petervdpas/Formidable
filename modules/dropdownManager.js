// dropdownManager.js

export function createDropdown({ containerId, labelText, options = [], onChange, selectedValue = "" }) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }
  
    container.innerHTML = ""; // Clear old content
  
    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.display = "block";
    label.style.marginBottom = "6px";
  
    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "6px";
    select.style.marginBottom = "10px";
  
    // Populate options
    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === selectedValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  
    select.addEventListener("change", (e) => {
      const selected = e.target.value;
      if (onChange) {
        onChange(selected);
      }
    });
  
    container.appendChild(label);
    container.appendChild(select);
  
    return {
      selectElement: select,
      getSelected: () => select.value,
      setSelected: (value) => {
        select.value = value;
        if (onChange) {
          onChange(value);
        }
      },
      updateOptions: (newOptions) => {
        select.innerHTML = ""; // clear old
        newOptions.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });
      }
    };
  }