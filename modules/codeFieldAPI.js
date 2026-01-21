// modules/codeFieldAPI.js

import { EventBus } from "./eventBus.js";

export function exposeCodeFieldAPI() {
  if (!window.FGA) {
    console.warn("[CodeFieldAPI] FGA not yet exposed, CFA will be empty.");
    window.CFA = {};
    return;
  }

  const getSnap = () => EventBus.emitWithResponse("form:context:get");

  /**
   * Get field element by GUID
   */
  const getFieldByGuid = async (guid) => {
    return await EventBus.emitWithResponse("field:get-by-guid", { guid });
  };

  /**
   * Get field element by key (first match)
   */
  const getFieldByKey = async (key) => {
    return await EventBus.emitWithResponse("field:get-by-key", { key });
  };

  /**
   * Get all field elements by key (useful for loop fields)
   */
  const getAllFieldsByKey = async (key) => {
    return await EventBus.emitWithResponse("field:get-all-by-key", { key });
  };

  /**
   * Get all field elements in the form
   */
  const getAllFields = async () => {
    return await EventBus.emitWithResponse("field:get-all");
  };

  /**
   * Get field value by GUID
   */
  const getValue = async (guid) => {
    return await EventBus.emitWithResponse("field:get-value", { guid });
  };

  /**
   * Get field value by key (first match)
   */
  const getValueByKey = async (key) => {
    return await EventBus.emitWithResponse("field:get-value-by-key", { key });
  };

  /**
   * Set field value by GUID
   */
  const setValue = async (guid, value) => {
    const result = await EventBus.emitWithResponse("field:set-value", {
      guid,
      value,
    });
    return result?.success || false;
  };

  /**
   * Set field value by key (first match)
   */
  const setValueByKey = async (key, value) => {
    const result = await EventBus.emitWithResponse("field:set-value-by-key", {
      key,
      value,
    });
    return result?.success || false;
  };

  const api = {
    path: window.FGA.path,
    string: window.FGA.string,
    transform: window.FGA.transform,
    form: {
      snapshot: async () => await getSnap(),
    },
    field: {
      // Element retrieval
      getByGuid: getFieldByGuid,
      getByKey: getFieldByKey,
      getAllByKey: getAllFieldsByKey,
      getAll: getAllFields,

      // Value getters
      getValue: getValue,
      getValueByKey: getValueByKey,

      // Value setters
      setValue: setValue,
      setValueByKey: setValueByKey,
    },
  };

  window.CFA = api;
  console.log("[CodeFieldAPI] CFA exposed:", Object.keys(api));
}
