// modules/handlers/formHandlers.js

export async function handleFormSelected(datafile) {
  console.log("[Handler] form:selected received:", datafile);
  await window.api.config.updateUserConfig({ selected_data_file: datafile });
}
