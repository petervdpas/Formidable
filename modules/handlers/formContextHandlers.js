// modules/handlers/formContextHandlers.js

import { FormContext } from "../../utils/formContextUtils.js";

export async function handleFormContextGet() {
  return FormContext.snapshot();
}

export async function handleFormContextUpdate(snap) {
  if (!snap) FormContext.clear();
  else FormContext.setCurrent(snap);
  return { ok: true };
}
