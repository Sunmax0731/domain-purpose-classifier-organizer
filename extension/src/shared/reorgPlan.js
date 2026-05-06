import { AXIS_LABELS } from "./classifier.js";
import { createBookmarkSnapshot } from "./bookmarks.js";

export function buildReorganizationPlan(results, options = {}) {
  const rootTitle = options.rootTitle || "分類済みブックマーク";
  const axis = options.axis || "purpose";
  const sourceBookmarks = Array.isArray(options.sourceBookmarks) ? options.sourceBookmarks : [];
  const actions = [];

  for (const result of results || []) {
    if (!result || !result.bookmarkId || !result.url) {
      continue;
    }

    const selectedAxis = result.selectedAxis || axis;
    const category = result.suggestedCategory || result.axes?.[axis] || result.domain || "未分類";
    const targetPath = [
      normalizeFolderSegment(rootTitle),
      AXIS_LABELS[selectedAxis] || AXIS_LABELS.domain,
      normalizeFolderSegment(category)
    ];

    actions.push({
      type: "move",
      bookmarkId: String(result.bookmarkId),
      title: result.title || result.url,
      url: result.url,
      fromPath: Array.isArray(result.path) ? [...result.path] : [],
      targetPath,
      reason: (result.reasons || []).join(" / "),
      confidence: result.confidence ?? 0
    });
  }

  return {
    id: createPlanId(options.now),
    createdAt: (options.now || new Date()).toISOString(),
    status: "preview",
    rootTitle,
    axis,
    actions,
    foldersToCreate: collectFolderPaths(actions),
    rollbackSnapshot: createBookmarkSnapshot(sourceBookmarks)
  };
}

export function collectFolderPaths(actions) {
  const seen = new Set();
  for (const action of actions || []) {
    const key = (action.targetPath || []).join("/");
    if (key) {
      seen.add(key);
    }
  }
  return [...seen].sort();
}

export function normalizeFolderSegment(value) {
  const normalized = String(value || "未分類")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "未分類";
}

export function createPlanId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "");
  return `plan-${stamp}`;
}

export function describePlan(plan) {
  return {
    actionCount: plan?.actions?.length || 0,
    folderCount: plan?.foldersToCreate?.length || 0,
    rollbackCount: plan?.rollbackSnapshot?.length || 0
  };
}
