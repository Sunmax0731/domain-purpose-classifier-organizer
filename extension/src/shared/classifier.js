import { getDomain, getSearchText } from "./bookmarks.js";

export const AXIS_LABELS = {
  domain: "ドメイン",
  purpose: "目的",
  usage: "用途",
  theme: "テーマ"
};

export const DEFAULT_RULES = [
  {
    id: "domain-github",
    name: "GitHub",
    type: "domain",
    axis: "purpose",
    priority: 100,
    pattern: "github.com",
    targetFolder: "開発・コード",
    reason: "GitHub ドメイン"
  },
  {
    id: "domain-youtube",
    name: "YouTube",
    type: "domain",
    axis: "usage",
    priority: 90,
    pattern: "youtube.com",
    targetFolder: "動画・視聴",
    reason: "YouTube ドメイン"
  },
  {
    id: "keyword-learning",
    name: "学習資料",
    type: "keyword",
    axis: "theme",
    priority: 80,
    pattern: "tutorial, course, guide, docs, learn, reference, 入門, 講座, 使い方",
    targetFolder: "学習・リファレンス",
    reason: "学習関連キーワード"
  },
  {
    id: "keyword-ai",
    name: "AI ツール",
    type: "keyword",
    axis: "purpose",
    priority: 75,
    pattern: "openai, chatgpt, claude, huggingface, llm, ai",
    targetFolder: "AI・自動化",
    reason: "AI 関連キーワード"
  },
  {
    id: "keyword-shopping",
    name: "購入・比較",
    type: "keyword",
    axis: "usage",
    priority: 70,
    pattern: "shop, store, price, cart, buy, booth, amazon, 購入, 価格",
    targetFolder: "購入・価格比較",
    reason: "購入関連キーワード"
  },
  {
    id: "keyword-project",
    name: "プロジェクト管理",
    type: "keyword",
    axis: "purpose",
    priority: 65,
    pattern: "jira, notion, trello, issue, backlog, project, task",
    targetFolder: "プロジェクト管理",
    reason: "プロジェクト管理関連キーワード"
  },
  {
    id: "keyword-research",
    name: "調査資料",
    type: "keyword",
    axis: "theme",
    priority: 60,
    pattern: "arxiv, paper, research, wiki, specification, standard, 論文, 調査",
    targetFolder: "調査・資料",
    reason: "調査関連キーワード"
  }
];

export function validateRule(rule) {
  const errors = [];
  if (!rule || typeof rule !== "object") {
    return { valid: false, errors: ["ルールがオブジェクトではありません。"] };
  }

  if (!rule.id || typeof rule.id !== "string") {
    errors.push("id は必須です。");
  }
  if (!rule.name || typeof rule.name !== "string") {
    errors.push("name は必須です。");
  }
  if (!["domain", "keyword"].includes(rule.type)) {
    errors.push("type は domain または keyword を指定してください。");
  }
  if (!["purpose", "usage", "theme"].includes(rule.axis)) {
    errors.push("axis は purpose、usage、theme のいずれかを指定してください。");
  }
  if (!Number.isFinite(Number(rule.priority))) {
    errors.push("priority は数値で指定してください。");
  }
  if (!rule.pattern || typeof rule.pattern !== "string") {
    errors.push("pattern は必須です。");
  }
  if (!rule.targetFolder || typeof rule.targetFolder !== "string") {
    errors.push("targetFolder は必須です。");
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeRules(rules) {
  if (!Array.isArray(rules)) {
    return [...DEFAULT_RULES];
  }

  const sanitized = [];
  for (const rule of rules) {
    if (validateRule(rule).valid) {
      sanitized.push({
        ...rule,
        priority: Number(rule.priority)
      });
    }
  }

  return sanitized.length > 0 ? sanitized : [...DEFAULT_RULES];
}

export function classifyBookmarks(bookmarks, rules = DEFAULT_RULES, options = {}) {
  const normalizedRules = sanitizeRules(rules);
  return bookmarks
    .filter((bookmark) => bookmark && bookmark.url)
    .map((bookmark) => classifyBookmark(bookmark, normalizedRules, options));
}

export function classifyBookmark(bookmark, rules = DEFAULT_RULES, options = {}) {
  const domain = bookmark.domain || getDomain(bookmark.url);
  const selectedAxis = options.axis || "purpose";
  const axes = {
    domain: domain || "URL なし",
    purpose: "未分類",
    usage: "未分類",
    theme: "未分類"
  };
  const matchedRules = findMatchedRules(bookmark, rules);
  const reasons = [];
  const matchedRuleIds = [];

  for (const rule of matchedRules) {
    if (axes[rule.axis] === "未分類") {
      axes[rule.axis] = rule.targetFolder;
      reasons.push(rule.reason || rule.name);
      matchedRuleIds.push(rule.id);
    }
  }

  let suggestedCategory = axes[selectedAxis];
  let suggestedAxis = selectedAxis;
  if (!suggestedCategory || suggestedCategory === "未分類") {
    suggestedCategory = domain || "未分類";
    suggestedAxis = "domain";
    reasons.push("一致するルールがないため、ドメインで暫定分類しました。");
  }

  const confidence = matchedRuleIds.length > 0
    ? Math.min(0.95, 0.55 + matchedRuleIds.length * 0.12)
    : 0.35;

  return {
    bookmarkId: String(bookmark.id),
    title: bookmark.title || bookmark.url,
    url: bookmark.url,
    domain,
    path: Array.isArray(bookmark.path) ? [...bookmark.path] : [],
    axes,
    selectedAxis: suggestedAxis,
    suggestedCategory,
    suggestedFolder: `${AXIS_LABELS[suggestedAxis]}/${suggestedCategory}`,
    confidence,
    reasons,
    matchedRuleIds
  };
}

export function findMatchedRules(bookmark, rules = DEFAULT_RULES) {
  return sanitizeRules(rules)
    .filter((rule) => matchesRule(rule, bookmark))
    .sort((a, b) => b.priority - a.priority);
}

export function matchesRule(rule, bookmark) {
  const validation = validateRule(rule);
  if (!validation.valid || !bookmark || !bookmark.url) {
    return false;
  }

  if (rule.type === "domain") {
    const domain = bookmark.domain || getDomain(bookmark.url);
    const pattern = rule.pattern.toLowerCase().replace(/^\*\./, "");
    return domain === pattern || domain.endsWith(`.${pattern}`);
  }

  const searchText = getSearchText(bookmark);
  return splitPattern(rule.pattern).some((pattern) => searchText.includes(pattern));
}

export function splitPattern(pattern) {
  return String(pattern)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function summarizeResults(results) {
  const summary = new Map();
  for (const result of results) {
    const key = result.suggestedFolder || "未分類";
    summary.set(key, (summary.get(key) || 0) + 1);
  }

  return [...summary.entries()]
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder));
}
