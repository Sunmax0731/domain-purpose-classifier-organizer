import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("side panel updates top status after long-running actions finish", async () => {
  const source = await readFile(new URL("../extension/sidepanel/sidepanel.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../extension/sidepanel/sidepanel.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../extension/sidepanel/sidepanel.css", import.meta.url), "utf8");

  assert.match(source, /バックアップ作成完了/);
  assert.match(source, /バックアップ復元完了/);
  assert.match(source, /リンク切れ確認完了/);
  assert.match(source, /リンク切れ削除完了/);
  assert.match(source, /整理適用完了/);
  assert.match(source, /削除予定/);
  assert.match(source, /countPlanActions/);
  assert.match(source, /直前復元完了/);
  assert.match(source, /showInlineOptions/);
  assert.match(source, /chrome\.runtime\.openOptionsPage/);
  assert.match(html, /id="optionsPanel"/);
  assert.match(html, /id="optionsFrame"/);
  assert.match(html, /data-src="\.\.\/options\/options\.html"/);
  assert.match(css, /\.options-frame/);
});
