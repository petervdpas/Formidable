// modules/handlers/cacheHandler.js

import { EventBus } from "../eventBus.js";
import IndexedDBController from "../cacheController.js";

let cache = null;

export async function initCache(dbName, version, stores) {
  // 🔥 Always delete the DB before initializing (DEV MODE)
  const deleteRequest = indexedDB.deleteDatabase(dbName);

  deleteRequest.onsuccess = () => {
    EventBus.emit("logging:default", [
      `[CacheHandler] Deleted existing IndexedDB: "${dbName}"`,
    ]);
  };

  deleteRequest.onerror = (e) => {
    EventBus.emit("logging:error", [
      `[CacheHandler] Failed to delete IndexedDB: "${dbName}"`,
      e,
    ]);
  };

  deleteRequest.onblocked = () => {
    EventBus.emit("logging:warning", [
      `[CacheHandler] Delete blocked for IndexedDB: "${dbName}"`,
    ]);
  };

  // Wait a tiny bit to ensure it's cleared before re-opening
  await new Promise((resolve) => setTimeout(resolve, 100));

  cache = new IndexedDBController(dbName, version);
  await cache.open(stores);

  EventBus.emit("status:update", "Cache initialized.");
  EventBus.emit("logging:default", [
    "[CacheHandler] Cache initialized with DB:",
    dbName,
    "version:",
    version,
  ]);
}

export async function handleCacheLoadFromDisk({ storeName, baseDir }) {
  try {
    const files = await window.api.sfr.listFiles(baseDir);
    EventBus.emit("logging:default", [
      `[CacheHandler] Loading from disk to store "${storeName}", files:`,
      files,
    ]);
    for (const filename of files) {
      const data = await window.api.sfr.loadFromBase(baseDir, filename);
      if (data) {
        await cache.put(storeName, data);
        EventBus.emit("logging:default", [
          `[CacheHandler] Loaded and cached file "${filename}" in store "${storeName}"`,
        ]);
      }
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error loading from disk for store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCacheSaveToDisk({ baseDir, items }) {
  try {
    EventBus.emit("logging:default", [
      `[CacheHandler] Saving to disk in baseDir: "${baseDir}"`,
      items,
    ]);
    for (const item of items) {
      if (item?.filename) {
        await window.api.sfr.saveFromBase(baseDir, item.filename, item);
        EventBus.emit("logging:default", [
          `[CacheHandler] Saved item "${item.filename}" to disk`,
        ]);
      }
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error saving to disk:`,
      err,
    ]);
  }
}

export async function handleCacheDeleteFromDisk({ baseDir, filenames }) {
  try {
    EventBus.emit("logging:default", [
      `[CacheHandler] Deleting files from disk in baseDir: "${baseDir}"`,
      filenames,
    ]);
    for (const filename of filenames) {
      await window.api.sfr.deleteFromBase(baseDir, filename);
      EventBus.emit("logging:default", [
        `[CacheHandler] Deleted file "${filename}" from disk`,
      ]);
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error deleting files from disk:`,
      err,
    ]);
  }
}

export async function handleCacheAdd({ storeName, item }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping ADD operation.",
    ]);
    return;
  }
  try {
    const id = await cache.add(storeName, item);
    EventBus.emit("logging:default", [
      `[CacheHandler] Added item with id ${id} to store "${storeName}"`,
      item,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error adding item to store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCachePut({ storeName, item }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping PUT operation.",
    ]);
    return;
  }
  try {
    const id = await cache.put(storeName, item);
    EventBus.emit("logging:default", [
      `[CacheHandler] Updated (put) item with id ${id} in store "${storeName}"`,
      item,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error updating item in store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCacheGet({ storeName, key }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping GET operation.",
    ]);
    return;
  }
  try {
    const item = await cache.get(storeName, key);
    EventBus.emit("logging:default", [
      `[CacheHandler] Retrieved item with key ${key} from store "${storeName}"`,
      item,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error retrieving item with key ${key} from store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCacheGetAll({ storeName }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping GET-ALL operation.",
    ]);
    return;
  }
  try {
    const items = await cache.getAll(storeName);
    EventBus.emit("logging:default", [
      `[CacheHandler] Retrieved all items from store "${storeName}"`,
      items,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error retrieving all items from store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCacheDelete({ storeName, key }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping DELETE operation.",
    ]);
    return;
  }
  try {
    await cache.delete(storeName, key);
    EventBus.emit("logging:default", [
      `[CacheHandler] Deleted item with key ${key} from store "${storeName}"`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error deleting item with key ${key} from store "${storeName}":`,
      err,
    ]);
  }
}

export async function handleCacheClear({ storeName }) {
  if (!cache) {
    EventBus.emit("logging:warning", [
      "[CacheHandler] Cache not initialized. Skipping CLEAR operation.",
    ]);
    return;
  }
  try {
    await cache.clear(storeName);
    EventBus.emit("logging:default", [
      `[CacheHandler] Cleared all items from store "${storeName}"`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[CacheHandler] Error clearing store "${storeName}":`,
      err,
    ]);
  }
}
