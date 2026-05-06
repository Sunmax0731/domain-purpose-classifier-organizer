import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("service worker preserves edited rules and prunes empty folders after apply", async () => {
  const source = await readFile(new URL("../extension/background/service-worker.js", import.meta.url), "utf8");

  assert.match(source, /rulesUserManaged/);
  assert.match(source, /sanitizeRules\(rules, \{ mergeDefaults: false \}\)/);
  assert.match(source, /pruneEmptyFoldersAfterApply/);
  assert.match(source, /action\.type === "delete"/);
  assert.match(source, /deletedChanges/);
  assert.match(source, /deletedCount/);
  assert.match(source, /deletedEmptyFolderCount/);
  assert.match(source, /chrome\.bookmarks\.remove\(String\(folderId\)\)/);
});
