import test from "node:test";
import assert from "node:assert/strict";
import { buildReorganizationPlan, describePlan, normalizeFolderSegment } from "../extension/src/shared/reorgPlan.js";

test("buildReorganizationPlan creates move actions and folder paths", () => {
  const now = new Date("2026-05-06T00:00:00.000Z");
  const plan = buildReorganizationPlan(
    [
      {
        bookmarkId: "10",
        title: "OpenAI Docs",
        url: "https://platform.openai.com/docs",
        path: ["Bookmarks bar"],
        selectedAxis: "purpose",
        suggestedCategory: "AI・自動化",
        reasons: ["AI 関連キーワード"],
        confidence: 0.8
      }
    ],
    {
      now,
      rootTitle: "分類済みブックマーク",
      sourceBookmarks: [
        { id: "10", title: "OpenAI Docs", url: "https://platform.openai.com/docs", parentId: "1", index: 0, path: ["Bookmarks bar"] }
      ]
    }
  );

  assert.equal(plan.id, "plan-20260506000000000");
  assert.equal(plan.actions.length, 1);
  assert.deepEqual(plan.actions[0].targetPath, ["分類済みブックマーク", "目的", "AI・自動化"]);
  assert.deepEqual(plan.foldersToCreate, ["分類済みブックマーク/目的/AI・自動化"]);
  assert.equal(plan.rollbackSnapshot.length, 1);
});

test("describePlan summarizes action, folder, and rollback counts", () => {
  const plan = {
    actions: [{ bookmarkId: "1" }, { bookmarkId: "2" }],
    foldersToCreate: ["A", "B"],
    rollbackSnapshot: [{ id: "1" }]
  };

  assert.deepEqual(describePlan(plan), {
    actionCount: 2,
    folderCount: 2,
    rollbackCount: 1
  });
});

test("normalizeFolderSegment removes path-sensitive characters", () => {
  assert.equal(normalizeFolderSegment("A/B:C*D?"), "A B C D");
  assert.equal(normalizeFolderSegment("   "), "未分類");
});
