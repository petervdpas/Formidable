// utils/encryptionUtils.js

export async function encrypt(text) {
  return EventBus.emitWithResponse("encryption:encrypt", { text });
}

export async function decrypt(encrypted) {
  return EventBus.emitWithResponse("encryption:decrypt", { encrypted });
}

export async function encryptionAvailable() {
  return EventBus.emitWithResponse("encryption:available");
}
