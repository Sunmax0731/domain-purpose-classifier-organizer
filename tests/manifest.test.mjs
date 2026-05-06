import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("manifest uses Manifest V3, bookmark permissions, and link-check host permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["bookmarks", "sidePanel", "storage"]);
  assert.deepEqual(manifest.host_permissions.sort(), ["http://*/*", "https://*/*"]);
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.side_panel.default_path, "sidepanel/sidepanel.html");
  assert.deepEqual(manifest.icons, {
    "16": "icons/icon_16.png",
    "32": "icons/icon_32.png",
    "48": "icons/icon_48.png",
    "128": "icons/icon_128.png"
  });
  assert.deepEqual(manifest.action.default_icon, manifest.icons);
  for (const iconPath of Object.values(manifest.icons)) {
    await access(new URL(`../extension/${iconPath}`, import.meta.url));
  }
});
