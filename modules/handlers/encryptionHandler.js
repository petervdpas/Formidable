// modules/handlers/encryptionHandler.js

import { EventBus } from "../eventBus.js";

export async function handleEncrypt({ text }) {
  try {
    const result = await window.api.encrypt.encrypt(text);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[EncryptionHandler] encrypt failed:", err]);
    return null;
  }
}

export async function handleDecrypt({ encrypted }) {
  try {
    const result = await window.api.encrypt.decrypt(encrypted);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", ["[EncryptionHandler] decrypt failed:", err]);
    return null;
  }
}

export async function handleEncryptionAvailable() {
  try {
    const available = await window.api.encrypt.encryptionAvailable();
    return available;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[EncryptionHandler] encryptionAvailable check failed:",
      err,
    ]);
    return false;
  }
}

