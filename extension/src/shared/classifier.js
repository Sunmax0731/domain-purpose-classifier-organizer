import { getDomain, getSearchText } from "./bookmarks.js";

export const AXIS_LABELS = {
  domain: "ドメイン",
  purpose: "目的",
  usage: "用途",
  theme: "テーマ"
};

export const DELETE_CATEGORY = {
  parentFolder: "整理",
  targetFolder: "削除予定",
  targetIcon: "trash"
};

export const CATEGORY_PRESETS = [
  { parentFolder: "インターネット", targetFolder: "検索・ポータル", targetIcon: "globe" },
  { parentFolder: "インターネット", targetFolder: "ニュース・情報", targetIcon: "news" },
  { parentFolder: "インターネット", targetFolder: "地図・交通", targetIcon: "map" },
  { parentFolder: "開発", targetFolder: "コード管理", targetIcon: "code" },
  { parentFolder: "開発", targetFolder: "AI・自動化", targetIcon: "ai" },
  { parentFolder: "開発", targetFolder: "ネットワーク", targetIcon: "network" },
  { parentFolder: "業務", targetFolder: "連絡・Office", targetIcon: "mail" },
  { parentFolder: "業務", targetFolder: "プロジェクト管理", targetIcon: "task" },
  { parentFolder: "メディア", targetFolder: "SNS・投稿", targetIcon: "chat" },
  { parentFolder: "メディア", targetFolder: "動画・視聴", targetIcon: "play" },
  { parentFolder: "生活", targetFolder: "購入・金融", targetIcon: "wallet" },
  { parentFolder: "生活", targetFolder: "購入・価格比較", targetIcon: "cart" },
  { parentFolder: "生活", targetFolder: "予約・手続き", targetIcon: "calendar" },
  { parentFolder: "制作", targetFolder: "画像・素材", targetIcon: "image" },
  { parentFolder: "制作", targetFolder: "UI・デザイン", targetIcon: "palette" },
  { parentFolder: "サイト運営", targetFolder: "分析", targetIcon: "chart" },
  { parentFolder: "サイト運営", targetFolder: "プロフィール", targetIcon: "profile" },
  { parentFolder: "知識", targetFolder: "学習・リファレンス", targetIcon: "book" },
  { parentFolder: "知識", targetFolder: "調査・資料", targetIcon: "search" },
  { parentFolder: "知識", targetFolder: "調査・論文", targetIcon: "paper" },
  { parentFolder: "娯楽", targetFolder: "イベント・ゲーム", targetIcon: "game" },
  { parentFolder: "娯楽", targetFolder: "ゲーム", targetIcon: "game" },
  { parentFolder: "制限付き", targetFolder: "成人向け", targetIcon: "shield" },
  { ...DELETE_CATEGORY },
  { parentFolder: "未分類", targetFolder: "ドメイン別", targetIcon: "globe" }
];

export const DEFAULT_RULES = [
  {
    id: "domain-github",
    name: "GitHub",
    type: "domain",
    axis: "purpose",
    priority: 100,
    pattern: "github.com",
    parentFolder: "開発",
    targetFolder: "コード管理",
    targetIcon: "code",
    reason: "GitHub ドメイン"
  },
  {
    id: "domain-twimg",
    name: "X / Twitter メディア",
    type: "domain",
    axis: "purpose",
    priority: 99,
    pattern: "twimg.com",
    parentFolder: "メディア",
    targetFolder: "SNS・投稿",
    targetIcon: "chat",
    reason: "X / Twitter のメディア CDN"
  },
  {
    id: "domain-x",
    name: "X",
    type: "domain",
    axis: "purpose",
    priority: 98,
    pattern: "x.com",
    parentFolder: "メディア",
    targetFolder: "SNS・投稿",
    targetIcon: "chat",
    reason: "X ドメイン"
  },
  {
    id: "domain-twitter",
    name: "Twitter",
    type: "domain",
    axis: "purpose",
    priority: 98,
    pattern: "twitter.com",
    parentFolder: "メディア",
    targetFolder: "SNS・投稿",
    targetIcon: "chat",
    reason: "Twitter ドメイン"
  },
  {
    id: "domain-youtube",
    name: "YouTube",
    type: "domain",
    axis: "purpose",
    priority: 90,
    pattern: "youtube.com",
    parentFolder: "メディア",
    targetFolder: "動画・視聴",
    targetIcon: "play",
    reason: "YouTube ドメイン"
  },
  {
    id: "domain-steam",
    name: "Steam",
    type: "domain",
    axis: "purpose",
    priority: 90,
    pattern: "store.steampowered.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "Steam ストア"
  },
  {
    id: "domain-steamcommunity",
    name: "Steam Community",
    type: "domain",
    axis: "purpose",
    priority: 89,
    pattern: "steamcommunity.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "Steam Community ドメイン"
  },
  {
    id: "domain-nintendo",
    name: "Nintendo",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "nintendo.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "Nintendo ドメイン"
  },
  {
    id: "domain-playstation",
    name: "PlayStation",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "playstation.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "PlayStation ドメイン"
  },
  {
    id: "domain-epicgames",
    name: "Epic Games",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "epicgames.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "Epic Games ドメイン"
  },
  {
    id: "domain-amazon",
    name: "Amazon",
    type: "domain",
    axis: "purpose",
    priority: 90,
    pattern: "amazon.co.jp",
    parentFolder: "生活",
    targetFolder: "購入・金融",
    targetIcon: "wallet",
    reason: "Amazon ドメイン"
  },
  {
    id: "domain-gmail",
    name: "Gmail",
    type: "domain",
    axis: "purpose",
    priority: 90,
    pattern: "mail.google.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "Gmail ドメイン"
  },
  {
    id: "domain-office",
    name: "Microsoft Office",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "office.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "Office ドメイン"
  },
  {
    id: "domain-outlook",
    name: "Outlook",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "outlook.office.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "Outlook ドメイン"
  },
  {
    id: "domain-cloudflare",
    name: "Cloudflare",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "cloudflare.com",
    parentFolder: "開発",
    targetFolder: "ネットワーク",
    targetIcon: "network",
    reason: "Cloudflare ドメイン"
  },
  {
    id: "domain-tailscale",
    name: "Tailscale",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "tailscale.com",
    parentFolder: "開発",
    targetFolder: "ネットワーク",
    targetIcon: "network",
    reason: "Tailscale ドメイン"
  },
  {
    id: "domain-netbird",
    name: "NetBird",
    type: "domain",
    axis: "purpose",
    priority: 88,
    pattern: "netbird.io",
    parentFolder: "開発",
    targetFolder: "ネットワーク",
    targetIcon: "network",
    reason: "NetBird ドメイン"
  },
  {
    id: "domain-material",
    name: "Material Design",
    type: "domain",
    axis: "purpose",
    priority: 86,
    pattern: "m3.material.io",
    parentFolder: "制作",
    targetFolder: "UI・デザイン",
    targetIcon: "palette",
    reason: "Material Design ドメイン"
  },
  {
    id: "domain-google-analytics",
    name: "Google Analytics",
    type: "domain",
    axis: "purpose",
    priority: 86,
    pattern: "analytics.google.com",
    parentFolder: "サイト運営",
    targetFolder: "分析",
    targetIcon: "chart",
    reason: "Google Analytics ドメイン"
  },
  {
    id: "domain-wix",
    name: "Wix",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "wix.com",
    parentFolder: "サイト運営",
    targetFolder: "プロフィール",
    targetIcon: "profile",
    reason: "Wix ドメイン"
  },
  {
    id: "domain-pixta",
    name: "PIXTA",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "pixta.jp",
    parentFolder: "制作",
    targetFolder: "画像・素材",
    targetIcon: "image",
    reason: "PIXTA ドメイン"
  },
  {
    id: "domain-jstage",
    name: "J-STAGE",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "jstage.jst.go.jp",
    parentFolder: "知識",
    targetFolder: "調査・論文",
    targetIcon: "paper",
    reason: "J-STAGE ドメイン"
  },
  {
    id: "keyword-delete-planned",
    name: "削除予定",
    type: "keyword",
    axis: "purpose",
    priority: 200,
    pattern: "削除予定, 削除候補, 不要ブックマーク, リンク切れ, broken bookmark, dead bookmark",
    parentFolder: DELETE_CATEGORY.parentFolder,
    targetFolder: DELETE_CATEGORY.targetFolder,
    targetIcon: DELETE_CATEGORY.targetIcon,
    reason: "削除予定として明示されたブックマーク"
  },
  {
    id: "keyword-adult",
    name: "成人向け",
    type: "keyword",
    axis: "purpose",
    priority: 93,
    pattern: "adult, r18, 18禁, 成人向け, アダルト, fc2-ppv, missav, xxx, porn, hentai",
    parentFolder: "制限付き",
    targetFolder: "成人向け",
    targetIcon: "shield",
    reason: "成人向け関連キーワード"
  },
  {
    id: "keyword-game",
    name: "ゲーム",
    type: "keyword",
    axis: "purpose",
    priority: 72,
    pattern: "game, gaming, steam, nintendo, playstation, xbox, epic games, itch.io, ゲーム",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "ゲーム関連キーワード"
  },
  {
    id: "keyword-learning",
    name: "学習資料",
    type: "keyword",
    axis: "theme",
    priority: 80,
    pattern: "tutorial, course, guide, docs, learn, reference, 入門, 講座, 使い方",
    parentFolder: "知識",
    targetFolder: "学習・リファレンス",
    targetIcon: "book",
    reason: "学習関連キーワード"
  },
  {
    id: "keyword-ai",
    name: "AI ツール",
    type: "keyword",
    axis: "purpose",
    priority: 75,
    pattern: "openai, chatgpt, claude, huggingface, hugging face, llm, 生成ai, ai tool, aiツール",
    parentFolder: "開発",
    targetFolder: "AI・自動化",
    targetIcon: "ai",
    reason: "AI 関連キーワード"
  },
  {
    id: "keyword-network",
    name: "ネットワーク・接続",
    type: "keyword",
    axis: "purpose",
    priority: 74,
    pattern: "airstation, router, vpn, 192.168, localhost, network, speed.cloudflare, tailscale, netbird, ルーター, ネットワーク, 接続",
    parentFolder: "開発",
    targetFolder: "ネットワーク",
    targetIcon: "network",
    reason: "ネットワーク関連キーワード"
  },
  {
    id: "keyword-shopping",
    name: "購入・比較",
    type: "keyword",
    axis: "usage",
    priority: 70,
    pattern: "shop, store, price, cart, buy, booth, amazon, 購入, 価格",
    parentFolder: "生活",
    targetFolder: "購入・価格比較",
    targetIcon: "cart",
    reason: "購入関連キーワード"
  },
  {
    id: "keyword-project",
    name: "プロジェクト管理",
    type: "keyword",
    axis: "purpose",
    priority: 65,
    pattern: "jira, notion, trello, issue, backlog, project, task",
    parentFolder: "業務",
    targetFolder: "プロジェクト管理",
    targetIcon: "task",
    reason: "プロジェクト管理関連キーワード"
  },
  {
    id: "keyword-research",
    name: "調査資料",
    type: "keyword",
    axis: "theme",
    priority: 60,
    pattern: "arxiv, paper, research, wiki, specification, standard, 論文, 調査",
    parentFolder: "知識",
    targetFolder: "調査・資料",
    targetIcon: "search",
    reason: "調査関連キーワード"
  },
  {
    id: "keyword-media",
    name: "動画・メディア",
    type: "keyword",
    axis: "purpose",
    priority: 55,
    pattern: "video, movie, mp4, m3u8, cdn, stream, media, anime, 動画, 配信, 視聴",
    parentFolder: "メディア",
    targetFolder: "動画・視聴",
    targetIcon: "play",
    reason: "動画・メディア関連キーワード"
  },
  {
    id: "keyword-design-assets",
    name: "画像・デザイン素材",
    type: "keyword",
    axis: "purpose",
    priority: 54,
    pattern: "photo, image, ui, design, material, asset, 素材, 写真, 画像, デザイン",
    parentFolder: "制作",
    targetFolder: "画像・素材",
    targetIcon: "image",
    reason: "画像・デザイン素材関連キーワード"
  },
  {
    id: "keyword-procedure",
    name: "予約・手続き",
    type: "keyword",
    axis: "purpose",
    priority: 53,
    pattern: "reserve, booking, ticket, payment, form, yoyaku, 予約, 申請, 手続き, 支払い",
    parentFolder: "生活",
    targetFolder: "予約・手続き",
    targetIcon: "calendar",
    reason: "予約・手続き関連キーワード"
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
  if (!["domain", "keyword", "category"].includes(rule.type)) {
    errors.push("type は domain、keyword、category のいずれかを指定してください。");
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
  if (rule.parentFolder != null && typeof rule.parentFolder !== "string") {
    errors.push("parentFolder は文字列で指定してください。");
  }
  if (rule.targetIcon != null && typeof rule.targetIcon !== "string") {
    errors.push("targetIcon は文字列で指定してください。");
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeRules(rules, options = {}) {
  const sanitized = [];
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (validateRule(rule).valid) {
        sanitized.push(normalizeRule(rule));
      }
    }
  }

  return options.mergeDefaults === false ? sanitized : mergeDefaultRules(sanitized);
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
  const axisTargets = {};
  const matchedRules = findMatchedRules(bookmark, rules);
  const reasons = [];
  const matchedRuleIds = [];
  const matchedAxisOrder = [];

  for (const rule of matchedRules) {
    if (axes[rule.axis] === "未分類") {
      axes[rule.axis] = rule.targetFolder;
      axisTargets[rule.axis] = getRuleTarget(rule);
      reasons.push(rule.reason || rule.name);
      matchedRuleIds.push(rule.id);
      matchedAxisOrder.push(rule.axis);
    }
  }

  let suggestedCategory = axes[selectedAxis];
  let suggestedTarget = axisTargets[selectedAxis];
  let suggestedAxis = selectedAxis;
  if ((!suggestedCategory || suggestedCategory === "未分類") && matchedAxisOrder.length > 0) {
    suggestedAxis = matchedAxisOrder[0];
    suggestedCategory = axes[suggestedAxis];
    suggestedTarget = axisTargets[suggestedAxis];
  }
  if (!suggestedCategory || suggestedCategory === "未分類") {
    suggestedCategory = domain || "未分類";
    suggestedTarget = {
      parentFolder: "未分類",
      targetFolder: suggestedCategory,
      targetIcon: "globe"
    };
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
    axisTargets,
    selectedAxis: suggestedAxis,
    suggestedCategory,
    suggestedTarget,
    targetPathSegments: [suggestedTarget.parentFolder, suggestedTarget.targetFolder],
    suggestedFolder: `${suggestedTarget.parentFolder}/${suggestedTarget.targetFolder}`,
    targetIcon: suggestedTarget.targetIcon,
    deleteOnApply: isDeletionTarget(suggestedTarget),
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

  if (rule.type === "category") {
    return false;
  }

  if (rule.type === "domain") {
    const domain = bookmark.domain || getDomain(bookmark.url);
    const pattern = rule.pattern.toLowerCase().replace(/^\*\./, "");
    return domain === pattern || domain.endsWith(`.${pattern}`);
  }

  if (rule.type === "keyword") {
    const searchText = getSearchText(bookmark);
    return splitPattern(rule.pattern).some((pattern) => matchesKeywordPattern(searchText, pattern));
  }

  return false;
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

export function normalizeRule(rule) {
  return {
    ...rule,
    priority: Number(rule.priority),
    parentFolder: normalizeFolderName(rule.parentFolder || inferParentFolder(rule.targetFolder)),
    targetFolder: normalizeFolderName(rule.targetFolder),
    targetIcon: normalizeIconName(rule.targetIcon || inferTargetIcon(rule.targetFolder))
  };
}

export function matchesKeywordPattern(searchText, pattern) {
  const normalizedText = String(searchText || "").toLowerCase();
  const normalizedPattern = String(pattern || "").trim().toLowerCase();
  if (!normalizedPattern) {
    return false;
  }

  if (shouldUseTokenMatch(normalizedPattern)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedPattern)}([^a-z0-9]|$)`, "i").test(normalizedText);
  }

  return normalizedText.includes(normalizedPattern);
}

export function getRuleTarget(rule) {
  const normalized = normalizeRule(rule);
  return {
    parentFolder: normalized.parentFolder,
    targetFolder: normalized.targetFolder,
    targetIcon: normalized.targetIcon
  };
}

export function getCategoryOptions(rules = DEFAULT_RULES) {
  const options = new Map();
  for (const rule of sanitizeRules(rules)) {
    const target = getRuleTarget(rule);
    const key = `${target.parentFolder}::${target.targetFolder}`;
    if (!options.has(key)) {
      options.set(key, target);
    }
  }

  for (const preset of CATEGORY_PRESETS) {
    const key = `${preset.parentFolder}::${preset.targetFolder}`;
    if (!options.has(key)) {
      options.set(key, { ...preset });
    }
  }

  return [...options.values()].sort(
    (a, b) => a.parentFolder.localeCompare(b.parentFolder) || a.targetFolder.localeCompare(b.targetFolder)
  );
}

export function inferParentFolder(targetFolder) {
  const preset = CATEGORY_PRESETS.find((category) => category.targetFolder === targetFolder);
  if (preset) {
    return preset.parentFolder;
  }

  const target = String(targetFolder || "");
  if (/github|コード|開発|ネットワーク|ai|自動化/i.test(target)) {
    return "開発";
  }
  if (/業務|連絡|office|プロジェクト|勤怠/i.test(target)) {
    return "業務";
  }
  if (/sns|動画|視聴|メディア|投稿/i.test(target)) {
    return "メディア";
  }
  if (/購入|価格|金融|予約|手続き/i.test(target)) {
    return "生活";
  }
  if (/画像|素材|ui|デザイン/i.test(target)) {
    return "制作";
  }
  if (/学習|調査|資料|論文|リファレンス/i.test(target)) {
    return "知識";
  }
  if (/サイト|分析|プロフィール/i.test(target)) {
    return "サイト運営";
  }
  if (/成人|アダルト|18禁|制限/i.test(target)) {
    return "制限付き";
  }
  if (/削除予定|削除候補|不要/i.test(target)) {
    return DELETE_CATEGORY.parentFolder;
  }
  if (/ゲーム|game|steam|nintendo|playstation|xbox/i.test(target)) {
    return "娯楽";
  }
  if (/検索|ポータル|ニュース|情報|地図|交通|インターネット/i.test(target)) {
    return "インターネット";
  }
  return "未分類";
}

export function inferTargetIcon(targetFolder) {
  const preset = CATEGORY_PRESETS.find((category) => category.targetFolder === targetFolder);
  if (preset) {
    return preset.targetIcon;
  }

  const parent = inferParentFolder(targetFolder);
  return {
    開発: "code",
    業務: "task",
    メディア: "play",
    生活: "wallet",
    制作: "image",
    知識: "book",
    サイト運営: "chart",
    娯楽: "game",
    制限付き: "shield",
    整理: "trash",
    インターネット: "globe",
    未分類: "globe"
  }[parent] || "folder";
}

export function isDeletionTarget(target) {
  return String(target?.parentFolder || "").trim() === DELETE_CATEGORY.parentFolder &&
    String(target?.targetFolder || "").trim() === DELETE_CATEGORY.targetFolder;
}

function normalizeFolderName(value) {
  return String(value || "未分類").trim() || "未分類";
}

function normalizeIconName(value) {
  return String(value || "folder").trim() || "folder";
}

function mergeDefaultRules(rules) {
  const merged = [...rules];
  const ids = new Set(merged.map((rule) => rule.id));
  const matchKeys = new Set(merged.map(createRuleMatchKey));

  for (const defaultRule of DEFAULT_RULES.map((rule) => normalizeRule(rule))) {
    const key = createRuleMatchKey(defaultRule);
    if (!ids.has(defaultRule.id) && !matchKeys.has(key)) {
      merged.push(defaultRule);
      ids.add(defaultRule.id);
      matchKeys.add(key);
    }
  }

  return merged;
}

function createRuleMatchKey(rule) {
  return `${rule.type}::${rule.axis}::${String(rule.pattern || "").trim().toLowerCase()}`;
}

function shouldUseTokenMatch(pattern) {
  return /^[a-z0-9][a-z0-9.+#-]*$/i.test(pattern);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
