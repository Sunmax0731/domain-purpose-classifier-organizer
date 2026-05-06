import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("side panel updates top status after long-running actions finish", async () => {
  const source = await readFile(new URL("../extension/sidepanel/sidepanel.js", import.meta.url), "utf8");

  assert.match(source, /バックアップ作成完了/);
  assert.match(source, /バックアップ復元完了/);
  assert.match(source, /整理適用完了/);
  assert.match(source, /直前復元完了/);
});
