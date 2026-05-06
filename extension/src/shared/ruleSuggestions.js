import { getDomain } from "./bookmarks.js";
import { DELETE_CATEGORY, inferParentFolder, inferTargetIcon, validateRule } from "./classifier.js";

const TARGET_INFERENCE_RULES = [
  {
    parentFolder: DELETE_CATEGORY.parentFolder,
    targetFolder: DELETE_CATEGORY.targetFolder,
    targetIcon: DELETE_CATEGORY.targetIcon,
    reason: "削除予定として明示されたブックマーク",
    patterns: ["削除予定", "削除候補", "不要ブックマーク", "リンク切れ", "broken bookmark", "dead bookmark"]
  },
  {
    parentFolder: "制限付き",
    targetFolder: "成人向け",
    targetIcon: "shield",
    reason: "成人向け関連",
    patterns: ["adult", "r18", "18禁", "成人向け", "アダルト", "fc2-ppv", "missav", "xxx", "porn", "hentai"]
  },
  {
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "ゲーム関連",
    patterns: ["steam", "nintendo", "playstation", "xbox", "epic games", "itch.io", "gaming", "ゲーム"]
  },
  {
    parentFolder: "メディア",
    targetFolder: "SNS・投稿",
    targetIcon: "chat",
    reason: "SNS・投稿メディア関連",
    patterns: ["x.com", "twitter.com", "twimg.com", "facebook", "tweet", "social", "sns", "タイムライン"]
  },
  {
    parentFolder: "制作",
    targetFolder: "画像・素材",
    targetIcon: "image",
    reason: "画像・素材関連",
    patterns: ["photo", "image", "pixta", "danbooru", "素材", "写真", "画像", "ui-assets", "design"]
  },
  {
    parentFolder: "メディア",
    targetFolder: "動画・視聴",
    targetIcon: "play",
    reason: "動画・配信関連",
    patterns: ["youtube", "youtu.be", "abema", "anime", "video", "movie", "mp4", "m3u8", "stream", "配信", "動画", "視聴"]
  },
  {
    parentFolder: "開発",
    targetFolder: "ネットワーク",
    targetIcon: "network",
    reason: "開発・ネットワーク関連",
    patterns: [
      "github",
      "gitlab",
      "api",
      "docs",
      "developer",
      "cloudflare",
      "tailscale",
      "netbird",
      "localhost",
      "192.168",
      "material.io",
      "blender",
      "webapp",
      "pages.dev"
    ]
  },
  {
    parentFolder: "生活",
    targetFolder: "購入・金融",
    targetIcon: "wallet",
    reason: "購入・金融関連",
    patterns: ["amazon", "rakuten", "bank", "card", "payment", "docomo", "price", "shop", "store", "toto", "購入", "価格", "銀行"]
  },
  {
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "業務・連絡関連",
    patterns: ["gmail", "mail", "outlook", "office", "microsoft", "teams", "salesforce", "teamspirit", "smarthr", "勤怠", "年調"]
  },
  {
    parentFolder: "サイト運営",
    targetFolder: "プロフィール",
    targetIcon: "profile",
    reason: "サイト運営・プロフィール関連",
    patterns: ["analytics", "wix", "wordpress", "portfolio", "wantedly", "lit.link", "profile", "アクセス解析", "プロフィール"]
  },
  {
    parentFolder: "知識",
    targetFolder: "調査・資料",
    targetIcon: "search",
    reason: "調査・学習関連",
    patterns: ["jstage", "arxiv", "paper", "research", "university", "univ", "tutorial", "learn", "lecture", "論文", "研究", "講座"]
  },
  {
    parentFolder: "生活",
    targetFolder: "予約・手続き",
    targetIcon: "calendar",
    reason: "予約・手続き関連",
    patterns: ["reserve", "booking", "ticket", "yoyaku", "naltec", "kisen", "予約", "申請", "手続き"]
  },
  {
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "娯楽・ゲーム関連",
    patterns: ["game", "music", "radwimps", "sport", "kuji", "comic", "novel", "ゲーム", "イベント", "音楽"]
  }
];

const GENERIC_PATH_SEGMENTS = new Set([
  "bookmark bar",
  "bookmarks bar",
  "mobile bookmarks",
  "other bookmarks",
  "ブックマーク バー",
  "モバイルのブックマーク",
  "その他のブックマーク",
  "新しいフォルダ",
  "よく見るサイト",
  "すべてのブックマーク"
]);

const COMMON_RULE_TEMPLATES = [
  {
    id: "common-domain-google-search",
    name: "Google 検索",
    type: "domain",
    axis: "purpose",
    priority: 78,
    pattern: "google.co.jp",
    parentFolder: "インターネット",
    targetFolder: "検索・ポータル",
    targetIcon: "globe",
    reason: "主要検索サービス"
  },
  {
    id: "common-domain-google-www",
    name: "Google",
    type: "domain",
    axis: "purpose",
    priority: 50,
    pattern: "www.google.com",
    parentFolder: "インターネット",
    targetFolder: "検索・ポータル",
    targetIcon: "globe",
    reason: "主要検索サービス"
  },
  {
    id: "common-domain-bing",
    name: "Bing",
    type: "domain",
    axis: "purpose",
    priority: 78,
    pattern: "bing.com",
    parentFolder: "インターネット",
    targetFolder: "検索・ポータル",
    targetIcon: "globe",
    reason: "主要検索サービス"
  },
  {
    id: "common-domain-yahoo",
    name: "Yahoo! JAPAN",
    type: "domain",
    axis: "purpose",
    priority: 78,
    pattern: "yahoo.co.jp",
    parentFolder: "インターネット",
    targetFolder: "検索・ポータル",
    targetIcon: "globe",
    reason: "主要ポータルサイト"
  },
  {
    id: "common-domain-wikipedia",
    name: "Wikipedia",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "wikipedia.org",
    parentFolder: "知識",
    targetFolder: "調査・資料",
    targetIcon: "search",
    reason: "主要百科事典サイト"
  },
  {
    id: "common-domain-google-maps",
    name: "Google Maps",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "maps.google.com",
    parentFolder: "インターネット",
    targetFolder: "地図・交通",
    targetIcon: "map",
    reason: "主要地図サービス"
  },
  {
    id: "common-domain-google-translate",
    name: "Google 翻訳",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "translate.google.com",
    parentFolder: "知識",
    targetFolder: "学習・リファレンス",
    targetIcon: "book",
    reason: "主要翻訳サービス"
  },
  {
    id: "common-domain-google-drive",
    name: "Google Drive",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "drive.google.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "主要クラウドストレージ"
  },
  {
    id: "common-domain-google-docs",
    name: "Google Docs",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "docs.google.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "主要ドキュメントサービス"
  },
  {
    id: "common-domain-slack",
    name: "Slack",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "slack.com",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "主要業務コミュニケーション"
  },
  {
    id: "common-domain-zoom",
    name: "Zoom",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "zoom.us",
    parentFolder: "業務",
    targetFolder: "連絡・Office",
    targetIcon: "mail",
    reason: "主要オンライン会議サービス"
  },
  {
    id: "common-domain-notion",
    name: "Notion",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "notion.so",
    parentFolder: "業務",
    targetFolder: "プロジェクト管理",
    targetIcon: "task",
    reason: "主要情報管理サービス"
  },
  {
    id: "common-domain-stackoverflow",
    name: "Stack Overflow",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "stackoverflow.com",
    parentFolder: "開発",
    targetFolder: "コード管理",
    targetIcon: "code",
    reason: "主要開発 Q&A サイト"
  },
  {
    id: "common-domain-mdn",
    name: "MDN Web Docs",
    type: "domain",
    axis: "purpose",
    priority: 84,
    pattern: "developer.mozilla.org",
    parentFolder: "知識",
    targetFolder: "学習・リファレンス",
    targetIcon: "book",
    reason: "主要 Web 開発資料"
  },
  {
    id: "common-domain-npm",
    name: "npm",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "npmjs.com",
    parentFolder: "開発",
    targetFolder: "コード管理",
    targetIcon: "code",
    reason: "主要パッケージレジストリ"
  },
  {
    id: "common-domain-qiita",
    name: "Qiita",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "qiita.com",
    parentFolder: "知識",
    targetFolder: "学習・リファレンス",
    targetIcon: "book",
    reason: "主要技術情報サイト"
  },
  {
    id: "common-domain-zenn",
    name: "Zenn",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "zenn.dev",
    parentFolder: "知識",
    targetFolder: "学習・リファレンス",
    targetIcon: "book",
    reason: "主要技術情報サイト"
  },
  {
    id: "common-domain-rakuten",
    name: "楽天市場",
    type: "domain",
    axis: "usage",
    priority: 80,
    pattern: "rakuten.co.jp",
    parentFolder: "生活",
    targetFolder: "購入・価格比較",
    targetIcon: "cart",
    reason: "主要ショッピングサイト"
  },
  {
    id: "common-domain-kakaku",
    name: "価格.com",
    type: "domain",
    axis: "usage",
    priority: 80,
    pattern: "kakaku.com",
    parentFolder: "生活",
    targetFolder: "購入・価格比較",
    targetIcon: "cart",
    reason: "主要価格比較サイト"
  },
  {
    id: "common-domain-mercari",
    name: "メルカリ",
    type: "domain",
    axis: "usage",
    priority: 78,
    pattern: "mercari.com",
    parentFolder: "生活",
    targetFolder: "購入・価格比較",
    targetIcon: "cart",
    reason: "主要マーケットプレイス"
  },
  {
    id: "common-domain-linkedin",
    name: "LinkedIn",
    type: "domain",
    axis: "theme",
    priority: 78,
    pattern: "linkedin.com",
    parentFolder: "サイト運営",
    targetFolder: "プロフィール",
    targetIcon: "profile",
    reason: "主要プロフィールサービス"
  },
  {
    id: "common-domain-note",
    name: "note",
    type: "domain",
    axis: "theme",
    priority: 76,
    pattern: "note.com",
    parentFolder: "メディア",
    targetFolder: "SNS・投稿",
    targetIcon: "chat",
    reason: "主要投稿プラットフォーム"
  },
  {
    id: "common-domain-news-yahoo",
    name: "Yahoo!ニュース",
    type: "domain",
    axis: "theme",
    priority: 78,
    pattern: "news.yahoo.co.jp",
    parentFolder: "インターネット",
    targetFolder: "ニュース・情報",
    targetIcon: "news",
    reason: "主要ニュースサイト"
  },
  {
    id: "common-domain-steam",
    name: "Steam",
    type: "domain",
    axis: "purpose",
    priority: 82,
    pattern: "store.steampowered.com",
    parentFolder: "娯楽",
    targetFolder: "ゲーム",
    targetIcon: "game",
    reason: "主要ゲームストア"
  },
  {
    id: "common-keyword-adult",
    name: "成人向け",
    type: "keyword",
    axis: "purpose",
    priority: 82,
    pattern: "adult, r18, 18禁, 成人向け, アダルト",
    parentFolder: "制限付き",
    targetFolder: "成人向け",
    targetIcon: "shield",
    reason: "成人向け関連キーワード"
  },
  {
    id: "common-keyword-delete-planned",
    name: "削除予定",
    type: "keyword",
    axis: "purpose",
    priority: 82,
    pattern: "削除予定, 削除候補, 不要ブックマーク, リンク切れ",
    parentFolder: DELETE_CATEGORY.parentFolder,
    targetFolder: DELETE_CATEGORY.targetFolder,
    targetIcon: DELETE_CATEGORY.targetIcon,
    reason: "削除予定カテゴリ"
  },
  {
    id: "common-keyword-travel",
    name: "旅行・交通",
    type: "keyword",
    axis: "usage",
    priority: 66,
    pattern: "travel, hotel, train, flight, route, map, 旅行, ホテル, 電車, 航空券, 交通, 地図",
    parentFolder: "インターネット",
    targetFolder: "地図・交通",
    targetIcon: "map",
    reason: "旅行・交通関連キーワード"
  },
  {
    id: "common-keyword-news",
    name: "ニュース・情報",
    type: "keyword",
    axis: "theme",
    priority: 64,
    pattern: "news, newspaper, media, press, ニュース, 新聞, 情報",
    parentFolder: "インターネット",
    targetFolder: "ニュース・情報",
    targetIcon: "news",
    reason: "ニュース関連キーワード"
  }
];

export function createRuleFromUrl(input, existingRules = []) {
  const url = String(input?.url || "").trim();
  const domain = getDomain(url);
  if (!domain) {
    throw new Error("URL からドメインを認識できません。");
  }

  const axis = input?.axis || "purpose";
  const parentFolder = String(input?.parentFolder || inferParentFolder(input?.targetFolder)).trim();
  const targetFolder = String(input?.targetFolder || "").trim();
  if (!targetFolder) {
    throw new Error("分類先フォルダを入力してください。");
  }
  if (!parentFolder) {
    throw new Error("大項目を入力してください。");
  }

  const duplicate = findDomainRule(existingRules, domain, axis);
  if (duplicate && !input?.allowDuplicate) {
    throw new Error(`${domain} の ${axis} ルールは既に存在します。`);
  }

  const priority = Number.isFinite(Number(input?.priority)) ? Number(input.priority) : 80;
  const rule = {
    id: uniqueRuleId(`domain-${slugify(domain)}`, existingRules),
    name: String(input?.name || domain).trim(),
    type: "domain",
    axis,
    priority,
    pattern: domain,
    parentFolder,
    targetFolder,
    targetIcon: String(input?.targetIcon || inferTargetIcon(targetFolder)).trim(),
    reason: String(input?.reason || `${domain} ドメイン`).trim()
  };

  const validation = validateRule(rule);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return rule;
}

export function suggestClassificationRules(bookmarks, existingRules = [], options = {}) {
  const groups = groupBookmarksByRuleDomain(bookmarks);
  const source = normalizeCandidateSource(options.source);
  const axes = normalizeCandidateAxes(options.axes);
  const minCount = Math.max(1, Number(options.minCount) || 2);
  const maxRules = Math.max(1, Number(options.maxRules) || 40);
  const suggestions = [];

  if ((source === "bookmarks" || source === "all") && axes.includes("purpose")) {
    for (const group of groups) {
      const inference = inferTarget(group.bookmarks);
      const shouldInclude = group.count >= minCount || inference.confidence >= 0.8;
      if (!shouldInclude) {
        continue;
      }

      const rule = {
        id: uniqueRuleId(`domain-${slugify(group.pattern)}`, [...existingRules, ...suggestions]),
        name: `${group.pattern} / ${inference.targetFolder}`,
        type: "domain",
        axis: "purpose",
        priority: inferPriority(group.count, inference.confidence),
        pattern: group.pattern,
        parentFolder: inference.parentFolder,
        targetFolder: inference.targetFolder,
        targetIcon: inference.targetIcon,
        reason: `${inference.reason}。${group.count} 件のブックマークから候補化。`
      };

      if (hasEquivalentRule([...existingRules, ...suggestions], rule)) {
        continue;
      }

      suggestions.push({
        ...rule,
        source: "bookmarks",
        sourceLabel: "現在のブックマーク",
        bookmarkCount: group.count,
        sampleTitles: group.bookmarks.slice(0, 3).map((bookmark) => bookmark.title || bookmark.url)
      });

      if (suggestions.length >= maxRules) {
        break;
      }
    }
  }

  if ((source === "common" || source === "all") && suggestions.length < maxRules) {
    for (const template of COMMON_RULE_TEMPLATES) {
      if (!axes.includes(template.axis) || validateRule(template).valid === false) {
        continue;
      }
      const rule = {
        ...template,
        id: uniqueRuleId(template.id, [...existingRules, ...suggestions])
      };
      if (hasEquivalentRule([...existingRules, ...suggestions], rule)) {
        continue;
      }
      suggestions.push({
        ...rule,
        source: "common",
        sourceLabel: "主要サイト",
        bookmarkCount: 0,
        sampleTitles: []
      });

      if (suggestions.length >= maxRules) {
        break;
      }
    }
  }

  const bookmarkCount = (Array.isArray(bookmarks) ? bookmarks : []).filter((bookmark) => bookmark?.url).length;
  return {
    bookmarkCount,
    domainCount: groups.length,
    commonRuleCount: COMMON_RULE_TEMPLATES.length,
    source,
    axes,
    rules: suggestions.map(({
      bookmarkCount: _bookmarkCount,
      sampleTitles: _sampleTitles,
      source: _source,
      sourceLabel: _sourceLabel,
      ...rule
    }) => rule),
    summaries: suggestions.map((suggestion) => ({
      domain: suggestion.pattern,
      bookmarkCount: suggestion.bookmarkCount,
      parentFolder: suggestion.parentFolder,
      targetFolder: suggestion.targetFolder,
      targetIcon: suggestion.targetIcon,
      reason: suggestion.reason,
      source: suggestion.source,
      sourceLabel: suggestion.sourceLabel,
      sampleTitles: suggestion.sampleTitles
    }))
  };
}

export function buildSiteRuleSources(bookmarks, existingRules = [], options = {}) {
  const maxSites = Math.max(1, Number(options.maxSites) || 300);
  const groups = groupBookmarksByRuleDomain(bookmarks);

  return {
    bookmarkCount: (Array.isArray(bookmarks) ? bookmarks : []).filter((bookmark) => bookmark?.url).length,
    siteCount: groups.length,
    sites: groups.slice(0, maxSites).map((group, index) => {
      const inference = inferTarget(group.bookmarks);
      const existingRule = findDomainRule(existingRules, group.pattern, "purpose");
      return {
        id: `site-${index + 1}-${slugify(group.pattern)}`,
        host: getRepresentativeHost(group.bookmarks, group.pattern),
        domain: group.pattern,
        rulePattern: group.pattern,
        bookmarkCount: group.count,
        sampleTitles: group.bookmarks.slice(0, 4).map((bookmark) => bookmark.title || bookmark.url),
        inferredParentFolder: inference.parentFolder,
        inferredTargetFolder: inference.targetFolder,
        inferredTargetIcon: inference.targetIcon,
        inferenceReason: inference.reason,
        existingRuleId: existingRule?.id || "",
        existingParentFolder: existingRule?.parentFolder || "",
        existingTargetFolder: existingRule?.targetFolder || "",
        existingTargetIcon: existingRule?.targetIcon || ""
      };
    })
  };
}

export function inferTarget(bookmarks) {
  const text = (Array.isArray(bookmarks) ? bookmarks : [])
    .map((bookmark) => [
      bookmark.domain,
      bookmark.title,
      bookmark.url,
      ...(Array.isArray(bookmark.path) ? bookmark.path : [])
    ].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();

  for (const rule of TARGET_INFERENCE_RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern.toLowerCase()))) {
      return {
        parentFolder: rule.parentFolder,
        targetFolder: rule.targetFolder,
        targetIcon: rule.targetIcon,
        reason: rule.reason,
        confidence: 0.9
      };
    }
  }

  const pathHint = inferTargetFromPathHint(bookmarks);
  if (pathHint) {
    return pathHint;
  }

  const folder = inferFolderFromPath(bookmarks);
  if (folder) {
    return {
      parentFolder: inferParentFolder(folder),
      targetFolder: folder,
      targetIcon: inferTargetIcon(folder),
      reason: "既存フォルダ名から推定",
      confidence: 0.75
    };
  }

  return {
    parentFolder: "未分類",
    targetFolder: "ドメイン別",
    targetIcon: "globe",
    reason: "頻出ドメインから推定",
    confidence: 0.5
  };
}

function getRepresentativeHost(bookmarks, fallback) {
  const counts = new Map();
  for (const bookmark of Array.isArray(bookmarks) ? bookmarks : []) {
    const host = bookmark?.domain || getDomain(bookmark?.url);
    if (!host) {
      continue;
    }
    counts.set(host, (counts.get(host) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || fallback;
}

function inferTargetFromPathHint(bookmarks) {
  for (const bookmark of Array.isArray(bookmarks) ? bookmarks : []) {
    const segments = Array.isArray(bookmark.path) ? bookmark.path : [];
    if (segments.some((segment) => String(segment || "").trim().toLowerCase() === "x")) {
      return {
        parentFolder: "メディア",
        targetFolder: "SNS・投稿",
        targetIcon: "chat",
        reason: "既存フォルダ X から推定",
        confidence: 0.82
      };
    }
  }

  return null;
}

function groupBookmarksByRuleDomain(bookmarks) {
  const groups = new Map();
  for (const bookmark of Array.isArray(bookmarks) ? bookmarks : []) {
    const domain = bookmark?.domain || getDomain(bookmark?.url);
    if (!domain) {
      continue;
    }

    const pattern = toRuleDomainPattern(domain);
    if (!groups.has(pattern)) {
      groups.set(pattern, []);
    }
    groups.get(pattern).push({ ...bookmark, domain });
  }

  return [...groups.entries()]
    .map(([pattern, groupedBookmarks]) => ({
      pattern,
      count: groupedBookmarks.length,
      bookmarks: groupedBookmarks
    }))
    .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));
}

function toRuleDomainPattern(domain) {
  const normalized = String(domain || "").toLowerCase().replace(/^www\./, "");
  if (normalized.endsWith(".twimg.com")) {
    return "twimg.com";
  }
  return normalized;
}

function inferFolderFromPath(bookmarks) {
  const counts = new Map();
  for (const bookmark of Array.isArray(bookmarks) ? bookmarks : []) {
    for (const segment of Array.isArray(bookmark.path) ? bookmark.path : []) {
      const normalized = String(segment || "").trim();
      if (!normalized || GENERIC_PATH_SEGMENTS.has(normalized.toLowerCase()) || GENERIC_PATH_SEGMENTS.has(normalized)) {
        continue;
      }
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
}

function inferPriority(count, confidence) {
  if (count >= 20) {
    return 98;
  }
  if (count >= 10) {
    return 94;
  }
  if (count >= 5) {
    return 90;
  }
  if (count >= 2) {
    return 86;
  }
  return confidence >= 0.8 ? 82 : 70;
}

function normalizeCandidateSource(source) {
  return ["bookmarks", "common", "all"].includes(source) ? source : "bookmarks";
}

function normalizeCandidateAxes(axes) {
  const values = Array.isArray(axes)
    ? axes
    : String(axes || "")
      .split(",")
      .map((axis) => axis.trim());
  const selected = values.filter((axis) => ["purpose", "usage", "theme"].includes(axis));
  return selected.length > 0 ? [...new Set(selected)] : ["purpose", "usage", "theme"];
}

function hasEquivalentRule(rules, candidate) {
  const candidateKey = createRuleMatchKey(candidate);
  return (Array.isArray(rules) ? rules : []).some((rule) => createRuleMatchKey(rule) === candidateKey);
}

function findDomainRule(rules, domain, axis) {
  const normalized = toRuleDomainPattern(domain);
  return (Array.isArray(rules) ? rules : []).find((rule) => {
    if (rule?.type !== "domain" || rule?.axis !== axis) {
      return false;
    }
    return toRuleDomainPattern(rule.pattern) === normalized;
  });
}

function uniqueRuleId(baseId, rules) {
  const used = new Set((Array.isArray(rules) ? rules : []).map((rule) => rule?.id).filter(Boolean));
  let id = baseId;
  let suffix = 2;
  while (used.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function createRuleMatchKey(rule) {
  return [
    rule?.type,
    rule?.axis,
    String(rule?.pattern || "").trim().toLowerCase().replace(/^www\./, "")
  ].join("::");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "rule";
}
