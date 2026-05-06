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
    moveCount: 2,
    deleteCount: 0,
    folderCount: 2,
    rollbackCount: 1
  });
});

test("buildReorganizationPlan creates delete actions for deletion category", () => {
  const plan = buildReorganizationPlan(
    [
      {
        bookmarkId: "40",
        title: "Old bookmark",
        url: "https://example.com/old",
        path: ["Bookmarks bar", "削除予定"],
        deleteOnApply: true,
        targetPathSegments: ["整理", "削除予定"],
        reasons: ["削除予定として明示されたブックマーク"],
        confidence: 0.95
      }
    ],
    {
      now: new Date("2026-05-06T00:00:00.000Z"),
      sourceBookmarks: [
        { id: "40", title: "Old bookmark", url: "https://example.com/old", parentId: "1", index: 0, path: ["Bookmarks bar", "削除予定"] }
      ]
    }
  );

  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].type, "delete");
  assert.deepEqual(plan.actions[0].targetPath, []);
  assert.deepEqual(plan.foldersToCreate, []);
  assert.deepEqual(describePlan(plan), {
    actionCount: 1,
    moveCount: 0,
    deleteCount: 1,
    folderCount: 0,
    rollbackCount: 1
  });
});

test("normalizeFolderSegment removes path-sensitive characters", () => {
  assert.equal(normalizeFolderSegment("A/B:C*D?"), "A B C D");
  assert.equal(normalizeFolderSegment("   "), "未分類");
});
