import test from "node:test";
import assert from "node:assert/strict";
import { flattenBookmarkTree } from "../extension/src/shared/bookmarks.js";
import {
  classifyBookmarks,
  matchesRule,
  sanitizeRules,
  splitPattern,
  validateRule
} from "../extension/src/shared/classifier.js";

const bookmarkTree = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        title: "Bookmarks bar",
        children: [
          { id: "10", parentId: "1", index: 0, title: "OpenAI Docs", url: "https://platform.openai.com/docs" },
          { id: "11", parentId: "1", index: 1, title: "GitHub Issue", url: "https://github.com/example/repo/issues/1" }
        ]
      }
    ]
  }
];

test("flattenBookmarkTree extracts URL bookmarks with paths and domains", () => {
  const bookmarks = flattenBookmarkTree(bookmarkTree);
  assert.equal(bookmarks.length, 2);
  assert.deepEqual(bookmarks[0].path, ["Bookmarks bar"]);
  assert.equal(bookmarks[0].domain, "platform.openai.com");
});

test("classifyBookmarks returns rule reasons and suggested folders", () => {
  const bookmarks = flattenBookmarkTree(bookmarkTree);
  const results = classifyBookmarks(bookmarks);
  const openai = results.find((result) => result.title === "OpenAI Docs");
  const github = results.find((result) => result.title === "GitHub Issue");

  assert.equal(openai.suggestedFolder, "目的/AI・自動化");
  assert.ok(openai.reasons.some((reason) => reason.includes("AI")));
  assert.equal(github.suggestedFolder, "目的/開発・コード");
});

test("classification falls back to domain when no purpose rule matches", () => {
  const [result] = classifyBookmarks([
    { id: "20", title: "Example", url: "https://example.com/page", path: [] }
  ]);

  assert.equal(result.selectedAxis, "domain");
  assert.equal(result.suggestedFolder, "ドメイン/example.com");
  assert.ok(result.confidence < 0.5);
});

test("rule validation rejects missing targetFolder", () => {
  const validation = validateRule({
    id: "bad",
    name: "Bad",
    type: "keyword",
    axis: "purpose",
    priority: 1,
    pattern: "bad"
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("targetFolder")));
});

test("sanitizeRules falls back to defaults when all rules are invalid", () => {
  const rules = sanitizeRules([{ id: "invalid" }]);
  assert.ok(rules.length > 0);
});

test("matchesRule supports comma-separated keyword patterns", () => {
  const rule = {
    id: "learning",
    name: "Learning",
    type: "keyword",
    axis: "theme",
    priority: 1,
    pattern: "guide, tutorial",
    targetFolder: "Learning"
  };

  assert.deepEqual(splitPattern(rule.pattern), ["guide", "tutorial"]);
  assert.equal(matchesRule(rule, { id: "1", title: "API Guide", url: "https://example.com" }), true);
});
