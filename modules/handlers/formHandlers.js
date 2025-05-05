// modules/handlers/formHandlers.js

export async function handleFormSelected(filename) {
  console.log("[Handler] form:selected received:", filename);
  await window.api.config.updateUserConfig({ selected_data_file: filename });
}
