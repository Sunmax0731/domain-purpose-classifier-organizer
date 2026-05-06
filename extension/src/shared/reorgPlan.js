import { AXIS_LABELS, isDeletionTarget } from "./classifier.js";
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
    const targetSegments = Array.isArray(result.targetPathSegments) && result.targetPathSegments.length > 0
      ? result.targetPathSegments
      : [AXIS_LABELS[selectedAxis] || selectedAxis || "未分類", result.suggestedCategory || result.axes?.[axis] || result.domain || "未分類"];
    const targetPath = [
      normalizeFolderSegment(rootTitle),
      ...targetSegments.map((segment) => normalizeFolderSegment(segment))
    ];
    const deleteOnApply = result.deleteOnApply || isDeletionTarget({
      parentFolder: targetSegments[0],
      targetFolder: targetSegments[1]
    });

    actions.push({
      type: deleteOnApply ? "delete" : "move",
      bookmarkId: String(result.bookmarkId),
      title: result.title || result.url,
      url: result.url,
      fromPath: Array.isArray(result.path) ? [...result.path] : [],
      targetPath: deleteOnApply ? [] : targetPath,
      deleteTarget: deleteOnApply
        ? {
          parentFolder: targetSegments[0],
          targetFolder: targetSegments[1]
        }
        : null,
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
    if (action.type === "delete") {
      continue;
    }
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
  const actions = Array.isArray(plan?.actions) ? plan.actions : [];
  return {
    actionCount: actions.length,
    moveCount: actions.filter((action) => action.type !== "delete").length,
    deleteCount: actions.filter((action) => action.type === "delete").length,
    folderCount: plan?.foldersToCreate?.length || 0,
    rollbackCount: plan?.rollbackSnapshot?.length || 0
  };
}
