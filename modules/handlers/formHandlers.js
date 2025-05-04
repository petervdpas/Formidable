// modules/handlers/formHandlers.js

export async function handleFormSelected(filename) {
  await window.api.config.updateUserConfig({ selected_data_file: filename });
}
