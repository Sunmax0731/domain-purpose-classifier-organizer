import { getDomain } from "./bookmarks.js";

export const LINK_CHECK_DEFAULTS = {
  timeoutMs: 5000
};

const DELETABLE_HTTP_STATUSES = new Set([404, 410]);
const NON_DELETABLE_HTTP_STATUSES = new Set([401, 403, 405, 429]);

export function createLinkCheckJob(bookmarks, options = {}, now = new Date()) {
  const items = (Array.isArray(bookmarks) ? bookmarks : [])
    .filter((bookmark) => bookmark?.url)
    .map((bookmark) => normalizeBookmarkForCheck(bookmark));

  return {
    id: createLinkCheckJobId(now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: items.length > 0 ? "running" : "completed",
    totalCount: items.length,
    nextIndex: 0,
    bookmarks: items,
    results: [],
    options: {
      timeoutMs: Math.max(1000, Number(options.timeoutMs) || LINK_CHECK_DEFAULTS.timeoutMs)
    }
  };
}

export function summarizeLinkCheckJob(job) {
  const results = Array.isArray(job?.results) ? job.results : [];
  const summary = summarizeLinkCheckResults(results);
  const deletionPlan = createBrokenLinkDeletionPlan(results, {
    sourceJobId: job?.id,
    createdAt: job?.updatedAt || job?.createdAt
  });

  return {
    id: job?.id || "",
    createdAt: job?.createdAt || "",
    updatedAt: job?.updatedAt || "",
    status: job?.status || "idle",
    totalCount: Number(job?.totalCount) || 0,
    nextIndex: Number(job?.nextIndex) || 0,
    summary,
    results,
    deletionPlan
  };
}

export function summarizeLinkCheckResults(results) {
  const summary = {
    checkedCount: 0,
    okCount: 0,
    brokenCount: 0,
    warningCount: 0,
    skippedCount: 0,
    deletionCandidateCount: 0
  };

  for (const result of Array.isArray(results) ? results : []) {
    summary.checkedCount += 1;
    if (result.status === "ok") {
      summary.okCount += 1;
    } else if (result.status === "broken") {
      summary.brokenCount += 1;
    } else if (result.status === "skipped") {
      summary.skippedCount += 1;
    } else {
      summary.warningCount += 1;
    }
    if (result.deletionCandidate) {
      summary.deletionCandidateCount += 1;
    }
  }

  return summary;
}

export function createSkippedLinkResult(bookmark, reason = "HTTP/HTTPS 以外の URL はチェック対象外です。", now = new Date()) {
  return {
    ...baseResult(bookmark, now),
    status: "skipped",
    reason,
    deletionCandidate: false
  };
}

export function createHttpLinkResult(bookmark, response, now = new Date()) {
  const status = Number(response?.status) || 0;
  const classification = classifyHttpStatus(status);
  return {
    ...baseResult(bookmark, now),
    status: classification.status,
    reason: classification.reason,
    httpStatus: status,
    statusText: String(response?.statusText || ""),
    finalUrl: String(response?.url || bookmark?.url || ""),
    method: String(response?.method || "HEAD"),
    deletionCandidate: classification.deletionCandidate
  };
}

export function createErrorLinkResult(bookmark, error, now = new Date()) {
  return {
    ...baseResult(bookmark, now),
    status: "warning",
    reason: "通信エラーまたはタイムアウトのため、削除候補にはしません。",
    error: error?.message || String(error),
    deletionCandidate: false
  };
}

export function classifyHttpStatus(status) {
  if (DELETABLE_HTTP_STATUSES.has(status)) {
    return {
      status: "broken",
      reason: `HTTP ${status} のためリンク切れ候補です。`,
      deletionCandidate: true
    };
  }

  if (status >= 200 && status < 400) {
    return {
      status: "ok",
      reason: `HTTP ${status} で到達可能です。`,
      deletionCandidate: false
    };
  }

  if (NON_DELETABLE_HTTP_STATUSES.has(status)) {
    return {
      status: "warning",
      reason: `HTTP ${status} は認証、拒否、制限、または HEAD 非対応の可能性があるため削除候補にはしません。`,
      deletionCandidate: false
    };
  }

  if (status >= 400 && status < 600) {
    return {
      status: "warning",
      reason: `HTTP ${status} ですが一時的な障害の可能性があるため削除候補にはしません。`,
      deletionCandidate: false
    };
  }

  return {
    status: "warning",
    reason: "HTTP 状態を判定できませんでした。",
    deletionCandidate: false
  };
}

export function createBrokenLinkDeletionPlan(results, options = {}) {
  const candidates = (Array.isArray(results) ? results : [])
    .filter((result) => result?.deletionCandidate)
    .map((result) => ({
      bookmarkId: String(result.bookmarkId),
      title: result.title || result.url,
      url: result.url,
      parentId: result.parentId == null ? null : String(result.parentId),
      index: Number.isInteger(result.index) ? result.index : null,
      path: Array.isArray(result.path) ? [...result.path] : [],
      httpStatus: result.httpStatus,
      reason: result.reason
    }));

  return {
    id: `broken-delete-${String(options.createdAt || new Date().toISOString()).replace(/[-:.TZ]/g, "")}`,
    sourceJobId: options.sourceJobId || "",
    createdAt: options.createdAt || new Date().toISOString(),
    candidates
  };
}

export function normalizeBookmarkForCheck(bookmark) {
  return {
    id: String(bookmark.id),
    title: bookmark.title || bookmark.url,
    url: bookmark.url,
    parentId: bookmark.parentId == null ? null : String(bookmark.parentId),
    index: Number.isInteger(bookmark.index) ? bookmark.index : null,
    path: Array.isArray(bookmark.path) ? [...bookmark.path] : [],
    domain: bookmark.domain || getDomain(bookmark.url)
  };
}

export function isCheckableUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function baseResult(bookmark, now) {
  const normalized = normalizeBookmarkForCheck(bookmark);
  return {
    bookmarkId: normalized.id,
    title: normalized.title,
    url: normalized.url,
    domain: normalized.domain,
    parentId: normalized.parentId,
    index: normalized.index,
    path: normalized.path,
    checkedAt: now.toISOString()
  };
}

function createLinkCheckJobId(now) {
  return `link-check-${now.toISOString().replace(/[-:.TZ]/g, "")}`;
}
