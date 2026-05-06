import test from "node:test";
import assert from "node:assert/strict";
import { validateRule } from "../extension/src/shared/classifier.js";
import {
  buildSiteRuleSources,
  createRuleFromUrl,
  inferTarget,
  suggestClassificationRules
} from "../extension/src/shared/ruleSuggestions.js";

test("createRuleFromUrl builds a valid domain rule from URL and folder", () => {
  const rule = createRuleFromUrl({
    url: "https://www.example.com/docs/page",
    parentFolder: "知識",
    targetFolder: "調査・学習",
    targetIcon: "search",
    axis: "purpose",
    priority: 87
  });

  assert.equal(rule.pattern, "example.com");
  assert.equal(rule.parentFolder, "知識");
  assert.equal(rule.targetFolder, "調査・学習");
  assert.equal(rule.targetIcon, "search");
  assert.equal(rule.type, "domain");
  assert.equal(validateRule(rule).valid, true);
});

test("createRuleFromUrl rejects duplicate domain rule on same axis", () => {
  const existing = [
    {
      id: "domain-example",
      name: "Example",
      type: "domain",
      axis: "purpose",
      priority: 80,
      pattern: "example.com",
      targetFolder: "既存",
      reason: "既存ルール"
    }
  ];

  assert.throws(
    () => createRuleFromUrl({ url: "https://example.com", targetFolder: "新規" }, existing),
    /既に存在/
  );
});

test("inferTarget recognizes social media CDN bookmarks", () => {
  const target = inferTarget([
    {
      title: "video.twimg.com sample",
      url: "https://video.twimg.com/example.mp4",
      domain: "video.twimg.com",
      path: ["ブックマーク バー", "X"]
    }
  ]);

  assert.equal(target.parentFolder, "メディア");
  assert.equal(target.targetFolder, "SNS・投稿");
  assert.ok(target.confidence > 0.8);
});

test("inferTarget recognizes deletion-planned and adult bookmarks", () => {
  const deletion = inferTarget([
    {
      title: "Old link",
      url: "https://example.com/old",
      domain: "example.com",
      path: ["ブックマーク バー", "削除予定"]
    }
  ]);
  const adult = inferTarget([
    {
      title: "R18 reference",
      url: "https://example.net/r18",
      domain: "example.net",
      path: []
    }
  ]);

  assert.equal(deletion.parentFolder, "整理");
  assert.equal(deletion.targetFolder, "削除予定");
  assert.equal(adult.parentFolder, "制限付き");
  assert.equal(adult.targetFolder, "成人向け");
});

test("suggestClassificationRules groups twimg subdomains and skips existing rules", () => {
  const bookmarks = [
    { id: "1", title: "A", url: "https://video.twimg.com/a.mp4", domain: "video.twimg.com", path: ["X"] },
    { id: "2", title: "B", url: "https://pbs-h2.twimg.com/b.jpg", domain: "pbs-h2.twimg.com", path: ["X"] },
    { id: "3", title: "C", url: "https://example.com/c", domain: "example.com", path: [] }
  ];

  const suggestions = suggestClassificationRules(bookmarks, [], { minCount: 2 });
  assert.equal(suggestions.bookmarkCount, 3);
  assert.ok(suggestions.rules.some((rule) => rule.pattern === "twimg.com"));
  assert.equal(suggestions.rules.find((rule) => rule.pattern === "twimg.com").parentFolder, "メディア");
  assert.equal(suggestions.rules.find((rule) => rule.pattern === "twimg.com").targetFolder, "SNS・投稿");

  const skipped = suggestClassificationRules(bookmarks, [suggestions.rules[0]], { minCount: 2 });
  assert.equal(skipped.rules.some((rule) => rule.pattern === "twimg.com"), false);
});

test("suggestClassificationRules can generate major internet candidates by selected axes", () => {
  const purposeSuggestions = suggestClassificationRules([], [], {
    source: "common",
    axes: ["purpose"],
    maxRules: 40
  });
  assert.equal(purposeSuggestions.source, "common");
  assert.ok(purposeSuggestions.rules.some((rule) => rule.pattern === "wikipedia.org"));
  assert.equal(purposeSuggestions.rules.every((rule) => rule.axis === "purpose"), true);

  const usageSuggestions = suggestClassificationRules([], [], {
    source: "common",
    axes: ["usage"],
    maxRules: 40
  });
  assert.ok(usageSuggestions.rules.some((rule) => rule.pattern === "rakuten.co.jp"));
  assert.equal(usageSuggestions.rules.every((rule) => rule.axis === "usage"), true);

  const deleteSuggestions = suggestClassificationRules([], [], {
    source: "common",
    axes: ["purpose"],
    maxRules: 80
  });
  assert.ok(deleteSuggestions.rules.some((rule) => rule.targetFolder === "削除予定"));
});

test("buildSiteRuleSources groups current bookmarks into draggable site sources", () => {
  const bookmarks = [
    { id: "1", title: "Docs A", url: "https://docs.example.com/a", domain: "docs.example.com", path: [] },
    { id: "2", title: "Docs B", url: "https://www.example.com/b", domain: "www.example.com", path: [] },
    { id: "3", title: "X CDN", url: "https://video.twimg.com/c.mp4", domain: "video.twimg.com", path: ["X"] }
  ];
  const existingRules = [
    {
      id: "domain-example",
      name: "Example",
      type: "domain",
      axis: "purpose",
      priority: 90,
      pattern: "example.com",
      parentFolder: "Development",
      targetFolder: "Docs",
      targetIcon: "book",
      reason: "existing"
    }
  ];

  const sources = buildSiteRuleSources(bookmarks, existingRules, { maxSites: 10 });
  assert.equal(sources.bookmarkCount, 3);
  assert.equal(sources.siteCount, 3);

  const example = sources.sites.find((site) => site.rulePattern === "example.com");
  assert.equal(example.host, "www.example.com");
  assert.equal(example.existingRuleId, "domain-example");
  assert.equal(example.existingParentFolder, "Development");
  assert.equal(example.existingTargetFolder, "Docs");
  assert.equal(example.bookmarkCount, 1);

  const twimg = sources.sites.find((site) => site.rulePattern === "twimg.com");
  assert.equal(twimg.host, "video.twimg.com");
  assert.equal(twimg.inferredTargetFolder, "SNS・投稿");
  assert.deepEqual(twimg.sampleTitles, ["X CDN"]);
});
