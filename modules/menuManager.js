export function buildMenu(containerId = "app-menu") {
    const container = document.getElementById(containerId);
    if (!container) return;
  
    container.innerHTML = `
      <ul class="menu-bar">
        <li class="menu-item">File
          <ul class="submenu">
            <li data-action="open-template-folder">Open Template Folder</li>
            <li data-action="open-markdown-folder">Open Markdown Folder</li>
            <li class="separator"></li>
            <li data-action="quit">Quit</li>
          </ul>
        </li>
        <li class="menu-item">Config
          <ul class="submenu">
            <li data-action="open-settings">Settings...</li>
          </ul>
        </li>
        <li class="menu-item">View
          <ul class="submenu">
            <li data-action="reload">Reload</li>
            <li data-action="devtools">Toggle DevTools</li>
          </ul>
        </li>
        <li class="menu-item">Help
          <ul class="submenu">
            <li data-action="about">About</li>
          </ul>
        </li>
      </ul>
    `;
  
    container.querySelectorAll("[data-action]").forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = e.currentTarget.getAttribute("data-action");
        handleMenuAction(action);
      });
    });
  }
  
  async function handleMenuAction(action) {
    switch (action) {
      case "open-template-folder":
        window.electron.shell.openPath(await window.api.resolvePath("templates"));
        break;
  
      case "open-markdown-folder": {
        const config = await window.configAPI.loadUserConfig();
        const templateName = config.recent_templates?.[0];
        if (!templateName) return;
  
        const templatePath = await window.api.resolvePath("templates", templateName);
        const exists = await window.api.fileExists?.(templatePath);
        if (!exists) {
          console.error("[Menu] Template not found:", templatePath);
          return;
        }
  
        try {
          const yaml = await window.api.loadTemplateFile(templateName);
          const targetPath = await window.api.resolvePath(yaml.markdown_dir);
          window.electron.shell.openPath(targetPath);
        } catch (err) {
          console.error("[Menu] Failed to open markdown folder:", err);
        }
        break;
      }
  
      case "quit":
        window.electron.app.quit();
        break;
  
      case "open-settings":
        window.openSettingsModal?.();
        break;
  
      case "reload":
        location.reload();
        break;
  
      case "devtools":
        window.electron.devtools.toggle();
        break;
  
      case "about":
        alert("Formidable v1.0\nMarkdown Form Editor\nBuilt with Electron");
        break;
    }
  }
  