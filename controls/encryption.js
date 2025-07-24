// controls/encryption.js

const crypto = require("crypto");
const configManager = require("./configManager");

const IV = Buffer.alloc(16, 0);

function getEncryptionKey() {
  const config = configManager.loadUserConfig();
  const keySource = config.encryption_key?.trim();

  if (!keySource) return null;

  return crypto.createHash("sha256").update(keySource).digest(); // 32-byte key
}

function encrypt(text) {
  const key = getEncryptionKey();
  if (!key) {
    console.error("[Encryption] No encryption_key configured in profile.");
    return null;
  }

  try {
    const cipher = crypto.createCipheriv("aes-256-cbc", key, IV);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (err) {
    console.error("[Encryption] Encrypt failed:", err.message);
    return null;
  }
}

function decrypt(encrypted) {
  const key = getEncryptionKey();
  if (!key) {
    console.error("[Encryption] No encryption_key configured in profile.");
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, IV);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[Encryption] Decrypt failed:", err.message);
    return null;
  }
}

function encryptionAvailable() {
  const key = getEncryptionKey();
  return !!key;
}

module.exports = {
  encrypt,
  decrypt,
  encryptionAvailable
};
