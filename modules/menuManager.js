// modules/menuManager.js

import { log, warn, error } from "./logger.js";

export function buildMenu(containerId = "app-menu", commandHandler) {
  const container = document.getElementById(containerId);

  if (!container) {
    warn(`[Menu] No element found with ID: "${containerId}"`);
    return;
  }

  if (typeof commandHandler !== "function") {
    error("[Menu] Invalid or missing command handler.");
    return;
  }

  log(`[Menu] Building menu in container: #${containerId}`);

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
    const action = item.getAttribute("data-action");
    log(`[Menu] Binding handler for: ${action}`);
    item.addEventListener("click", () => {
      log(`[Menu] Triggered action: ${action}`);
      commandHandler(action);
    });
  });

  log("[Menu] Menu setup complete.");
}

export async function handleMenuAction(action) {
  switch (action) {
    case "open-template-folder": {
      const resolved = await window.api.system.resolvePath("templates");
      await window.api.markdown.ensureMarkdownDir?.(resolved);
      const result = await window.electron.shell.openPath(resolved);
      if (result) {
        console.error("[Shell] Failed to open template folder:", result);
      } else {
        console.log("[Shell] Opened template folder:", resolved);
      }
      break;
    }

    case "open-markdown-folder": {
      try {
        const config = await window.api.config.loadUserConfig();
        const templateName = config.recent_templates?.[0];
        if (!templateName) {
          console.warn("[Menu] No recent_templates entry found.");
          return;
        }

        const templatePath = await window.api.system.resolvePath(
          "templates",
          templateName
        );
        const exists = await window.api.system.fileExists(templatePath);
        if (!exists) {
          console.error("[Menu] Template not found:", templatePath);
          return;
        }

        const yaml = await window.api.templates.loadTemplate(templateName);
        const targetPath = await window.api.system.resolvePath(yaml.markdown_dir);
        await window.api.forms.ensureFormDir?.(targetPath);

        const result = await window.electron.shell.openPath(targetPath);
        if (result) {
          console.error("[Shell] Failed to open markdown folder:", result);
        } else {
          console.log("[Shell] Opened markdown folder:", targetPath);
        }
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
