// modules/handlers/formHandlers.js

import { log } from "../../utils/logger.js";

export async function handleFormSelected(datafile) {
  log("[Handler] form:selected received:", datafile);
  await window.api.config.updateUserConfig({ selected_data_file: datafile });
}
