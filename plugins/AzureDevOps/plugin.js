// plugins/AzureDevOps/plugin.js

async function fetchWikiDropdown({
  organization,
  project,
  pat,
  settings,
  plugin,
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-form-row";

  const label = document.createElement("label");
  label.textContent = "Wiki ID";
  wrapper.appendChild(label);

  const select = document.createElement("select");
  select.name = "WikiId";
  select.className = "input";
  wrapper.appendChild(select);

  const loadingOpt = document.createElement("option");
  loadingOpt.textContent = "Loading wikis...";
  loadingOpt.disabled = true;
  loadingOpt.selected = true;
  select.appendChild(loadingOpt);

  try {
    const orgSlug = encodeURIComponent(organization.trim());
    const projectSlug = encodeURIComponent(project.trim());
    const url = `https://dev.azure.com/${orgSlug}/${projectSlug}/_apis/wiki/wikis?api-version=7.0`;

    const auth = `Basic ${btoa(":" + pat.trim())}`;
    const result = await plugin.proxyFetch(url, {
      method: "GET",
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "User-Agent": "FormidableAzureDevOpsPlugin",
      },
    });

    if (!result || !result.ok) {
      throw new Error(result?.error || "Proxy fetch failed");
    }

    const json =
      typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    const wikis = json.value || [];

    select.innerHTML = "";

    if (wikis.length === 0) {
      const none = document.createElement("option");
      none.textContent = "(No wikis found)";
      none.disabled = true;
      select.appendChild(none);
    } else {
      for (const wiki of wikis) {
        const opt = document.createElement("option");
        opt.value = wiki.id;
        opt.textContent = `${wiki.name} (${wiki.id})`;
        select.appendChild(opt);
      }

      const saved = settings.variables.WikiId?.value;
      if (saved) select.value = saved;
    }

    select.addEventListener("change", () => {
      settings.variables.WikiId = { value: select.value };
    });
  } catch (err) {
    select.innerHTML = "";
    const errorOpt = document.createElement("option");
    errorOpt.textContent = "Error fetching wikis";
    errorOpt.disabled = true;
    select.appendChild(errorOpt);

    const errText = document.createElement("div");
    errText.className = "form-error-text";
    errText.textContent = err.message;
    errText.style.marginTop = "0.5em";
    wrapper.appendChild(errText);
  }

  return wrapper;
}

export async function run() {
  const { plugin, modal, dom, button, encryption } = window.FGA;
  const pluginName = "AzureDevOps";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-azuredevops",
    title: "Azure DevOps – Configuration",
    escToClose: true,
    backdropClick: true,
    width: "36em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.variables ??= {};

      const decryptedPAT = settings.variables.PAT?.value
        ? await encryption.decrypt(settings.variables.PAT.value)
        : "";

      const fields = [
        {
          key: "Organization",
          type: "text",
          label: "Organization",
          wrapper: "modal-form-row",
          fieldRenderer: "renderTextField",
          value: "",
        },
        {
          key: "Project",
          type: "text",
          label: "Project",
          wrapper: "modal-form-row",
          fieldRenderer: "renderTextField",
          value: "",
        },
        {
          key: "PAT",
          type: "text",
          label: "Personal Access Token (PAT)",
          wrapper: "modal-form-row",
          fieldRenderer: "renderPasswordField",
          value: decryptedPAT || "",
        },
      ];

      const initialData = Object.fromEntries(
        fields.map((f) => {
          const raw = settings.variables?.[f.key]?.value;
          const val = f.key === "PAT" ? decryptedPAT : raw || "";
          return [f.key, val];
        })
      );

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: initialData,
        injectBefore: () => {
          const p = document.createElement("p");
          p.className = "form-info-text";
          p.innerText =
            "Configure your Azure DevOps credentials. These settings will be used to push Markdown output to your wiki.";
          return p;
        },
      });

      await fieldManager.renderFields();

      // Inject wiki dropdown after fields are rendered
      const wikiDropdown = await fetchWikiDropdown({
        organization: initialData.Organization,
        project: initialData.Project,
        pat: initialData.PAT,
        settings,
        plugin,
      });
      bodyEl.appendChild(wikiDropdown);

      // Save button
      const saveBtn = button.createButton({
        text: "Save Settings",
        className: "btn-warn",
        onClick: async () => {
          const values = fieldManager.getValues();

          if (!values.Organization || !values.Project || !values.PAT?.trim()) {
            emit("ui:toast", {
              message: "All fields are required.",
              variant: "error",
            });
            return;
          }

          const encrypted = await encryption.encrypt(values.PAT.trim());
          if (!encrypted) {
            emit("ui:toast", {
              message: "Encryption failed. PAT not stored.",
              variant: "error",
            });
            return;
          }

          for (const [key, val] of Object.entries(values)) {
            const isSecure = key === "PAT";
            settings.variables[key] = {
              value: isSecure ? encrypted : val,
            };
          }

          settings.updated = new Date().toISOString();
          const result = await plugin.saveSettings(pluginName, settings);

          emit("ui:toast", {
            message: result?.success
              ? "Azure DevOps settings saved"
              : "Failed to save Azure DevOps settings",
            variant: result?.success ? "success" : "error",
          });
        },
      });

      bodyEl.appendChild(saveBtn);
    },
  });

  show();
}
