import test from "node:test";
import assert from "node:assert/strict";
import { flattenBookmarkTree } from "../extension/src/shared/bookmarks.js";
import {
  DEFAULT_RULES,
  classifyBookmarks,
  matchesKeywordPattern,
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

  assert.equal(openai.suggestedFolder, "開発/AI・自動化");
  assert.deepEqual(openai.targetPathSegments, ["開発", "AI・自動化"]);
  assert.ok(openai.reasons.some((reason) => reason.includes("AI")));
  assert.equal(github.suggestedFolder, "開発/コード管理");
});

test("classification falls back to domain when no purpose rule matches", () => {
  const [result] = classifyBookmarks([
    { id: "20", title: "Example", url: "https://example.com/page", path: [] }
  ]);

  assert.equal(result.selectedAxis, "domain");
  assert.equal(result.suggestedFolder, "未分類/example.com");
  assert.ok(result.confidence < 0.5);
});

test("classification uses another matched axis before domain fallback", () => {
  const [result] = classifyBookmarks([
    { id: "20b", title: "Price cart comparison", url: "https://shop.example.net/item", path: [] }
  ]);

  assert.equal(result.selectedAxis, "usage");
  assert.equal(result.suggestedFolder, "生活/購入・価格比較");
  assert.ok(result.reasons.some((reason) => reason.includes("購入")));
});

test("default rules classify X media CDN under SNS media", () => {
  const [result] = classifyBookmarks([
    { id: "21", title: "Media", url: "https://video.twimg.com/example.mp4", path: ["ブックマーク バー", "X"] }
  ]);

  assert.equal(result.suggestedFolder, "メディア/SNS・投稿");
});

test("default rules classify adult, game, and deletion-planned bookmarks", () => {
  const [adult, game, deletion] = classifyBookmarks([
    { id: "22", title: "R18 reference", url: "https://example.com/adult", path: [] },
    { id: "23", title: "Steam game page", url: "https://store.steampowered.com/app/1", path: [] },
    { id: "24", title: "Old link", url: "https://example.net/old", path: ["Bookmarks bar", "削除予定"] }
  ]);

  assert.equal(adult.suggestedFolder, "制限付き/成人向け");
  assert.equal(game.suggestedFolder, "娯楽/ゲーム");
  assert.equal(deletion.suggestedFolder, "整理/削除予定");
  assert.equal(deletion.deleteOnApply, true);
});

test("default rules do not classify incidental ai substrings as AI automation", () => {
  const aiRule = DEFAULT_RULES.find((rule) => rule.id === "keyword-ai");
  assert.equal(
    matchesRule(aiRule, { id: "30", title: "Gmail", url: "https://mail.google.com/mail/u/0/" }),
    false
  );
  assert.equal(
    matchesRule(aiRule, { id: "31", title: "AirStation Settings", url: "http://192.168.2.1/" }),
    false
  );
  assert.equal(
    matchesRule(aiRule, { id: "32", title: "OpenAI Docs", url: "https://platform.openai.com/docs" }),
    true
  );
});

test("saved legacy rules are enriched with current defaults before classification", () => {
  const legacyRules = [
    {
      id: "keyword-ai",
      name: "AI ツール",
      type: "keyword",
      axis: "purpose",
      priority: 75,
      pattern: "openai, chatgpt, claude, huggingface, llm, ai",
      parentFolder: "開発",
      targetFolder: "AI・自動化",
      targetIcon: "ai",
      reason: "AI 関連キーワード"
    }
  ];

  const rules = sanitizeRules(legacyRules);
  assert.ok(rules.some((rule) => rule.id === "domain-gmail"));

  const [gmail, router] = classifyBookmarks(
    [
      { id: "33", title: "Gmail", url: "https://mail.google.com/mail/u/0/", path: [] },
      { id: "34", title: "AirStation Settings", url: "http://192.168.2.1/", path: [] }
    ],
    legacyRules
  );

  assert.equal(gmail.suggestedFolder, "業務/連絡・Office");
  assert.equal(router.suggestedFolder, "開発/ネットワーク");
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

test("category rules define folders without matching bookmarks", () => {
  const rules = sanitizeRules([
    {
      id: "category-dev-ai",
      name: "AI tools",
      type: "category",
      axis: "purpose",
      priority: 80,
      pattern: "category:開発/AI・自動化",
      parentFolder: "開発",
      targetFolder: "AI・自動化",
      targetIcon: "ai",
      reason: "分類先"
    }
  ], { mergeDefaults: false });

  assert.equal(rules.length, 1);
  assert.equal(rules[0].type, "category");
  assert.equal(matchesRule(rules[0], { id: "1", title: "AI", url: "https://example.com" }), false);
});

test("sanitizeRules falls back to defaults when all rules are invalid", () => {
  const rules = sanitizeRules([{ id: "invalid" }]);
  assert.ok(rules.length > 0);
});

test("sanitizeRules can preserve an explicitly edited rule list without default merge", () => {
  const customRules = [
    {
      id: "domain-example",
      name: "Example",
      type: "domain",
      axis: "purpose",
      priority: 80,
      pattern: "example.com",
      parentFolder: "未分類",
      targetFolder: "example.com",
      targetIcon: "globe",
      reason: "custom"
    }
  ];

  const rules = sanitizeRules(customRules, { mergeDefaults: false });
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, "domain-example");
  assert.equal(rules.some((rule) => rule.id === "domain-gmail"), false);
});

test("matchesRule supports comma-separated keyword patterns", () => {
  const rule = {
    id: "learning",
    name: "Learning",
    type: "keyword",
    axis: "theme",
    priority: 1,
    pattern: "guide, tutorial",
    parentFolder: "知識",
    targetFolder: "Learning"
  };

  assert.deepEqual(splitPattern(rule.pattern), ["guide", "tutorial"]);
  assert.equal(matchesRule(rule, { id: "1", title: "API Guide", url: "https://example.com" }), true);
});

test("keyword matching uses token boundaries for ASCII patterns", () => {
  assert.equal(matchesKeywordPattern("gmail mail.google.com", "ai"), false);
  assert.equal(matchesKeywordPattern("airstation settings 192.168.2.1", "ai"), false);
  assert.equal(matchesKeywordPattern("using ai tool for bookmarks", "ai"), true);
  assert.equal(matchesKeywordPattern("https://platform.openai.com/docs", "openai"), true);
});

test("matchesRule includes bookmark path in keyword search", () => {
  const rule = {
    id: "path-blender",
    name: "Blender Path",
    type: "keyword",
    axis: "purpose",
    priority: 1,
    pattern: "blender",
    parentFolder: "制作",
    targetFolder: "3D・制作"
  };

  assert.equal(
    matchesRule(rule, { id: "1", title: "Asset Store", url: "https://example.com", path: ["Bookmarks bar", "Blender"] }),
    true
  );
});
