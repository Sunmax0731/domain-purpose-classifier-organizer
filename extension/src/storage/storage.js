export const STORAGE_KEYS = {
  rules: "classificationRules",
  lastJob: "lastReorganizationJob",
  bookmarkBackup: "bookmarkBackup",
  bookmarkRestoreJob: "bookmarkRestoreJob"
};

export async function readStorage(key, fallbackValue = null) {
  const result = await chrome.storage.local.get(key);
  return Object.prototype.hasOwnProperty.call(result, key) ? result[key] : fallbackValue;
}

export async function writeStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
  return value;
}
