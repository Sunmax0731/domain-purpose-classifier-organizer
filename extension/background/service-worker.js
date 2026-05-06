import { flattenBookmarkTree } from "../src/shared/bookmarks.js";
import { DEFAULT_RULES, classifyBookmarks, sanitizeRules, validateRule } from "../src/shared/classifier.js";
import { buildReorganizationPlan, describePlan } from "../src/shared/reorgPlan.js";
import { STORAGE_KEYS, readStorage, writeStorage } from "../src/storage/storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  const rules = await readStorage(STORAGE_KEYS.rules, null);
  if (!rules) {
    await writeStorage(STORAGE_KEYS.rules, DEFAULT_RULES);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "GET_RULES":
      return sanitizeRules(await readStorage(STORAGE_KEYS.rules, DEFAULT_RULES));
    case "SAVE_RULES":
      return saveRules(message.rules);
    case "SCAN_AND_CLASSIFY":
      return scanAndClassify(message.options || {});
    case "BUILD_PLAN":
      return buildReorganizationPlan(message.results || [], {
        axis: message.axis || "purpose",
        rootTitle: message.rootTitle || "分類済みブックマーク",
        sourceBookmarks: message.bookmarks || []
      });
    case "APPLY_PLAN":
      return applyPlan(message.plan);
    case "ROLLBACK_LAST":
      return rollbackLastJob();
    case "OPEN_SIDE_PANEL":
      await chrome.sidePanel.open({ windowId: sender?.tab?.windowId || chrome.windows?.WINDOW_ID_CURRENT || -2 });
      return { opened: true };
    default:
      throw new Error(`Unknown message type: ${message?.type}`);
  }
}

async function saveRules(rules) {
  if (!Array.isArray(rules)) {
    throw new Error("ルールは配列で指定してください。");
  }

  const errors = [];
  for (const [index, rule] of rules.entries()) {
    const validation = validateRule(rule);
    if (!validation.valid) {
      errors.push(`#${index + 1}: ${validation.errors.join(" ")}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return writeStorage(STORAGE_KEYS.rules, sanitizeRules(rules));
}

async function scanAndClassify(options) {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const rules = sanitizeRules(await readStorage(STORAGE_KEYS.rules, DEFAULT_RULES));
  const results = classifyBookmarks(bookmarks, rules, options);
  const plan = buildReorganizationPlan(results, {
    axis: options.axis || "purpose",
    rootTitle: options.rootTitle || "分類済みブックマーク",
    sourceBookmarks: bookmarks
  });

  return {
    bookmarks,
    results,
    plan,
    summary: describePlan(plan)
  };
}

async function applyPlan(plan) {
  if (!plan || !Array.isArray(plan.actions) || plan.actions.length === 0) {
    throw new Error("適用できる整理計画がありません。");
  }

  const parentId = await getDefaultParentId();
  const appliedChanges = [];
  const warnings = [];

  for (const action of plan.actions) {
    try {
      const targetParentId = await ensureFolderPath(parentId, action.targetPath || []);
      const moved = await chrome.bookmarks.move(action.bookmarkId, { parentId: targetParentId });
      appliedChanges.push({
        bookmarkId: action.bookmarkId,
        title: action.title,
        targetParentId,
        targetPath: action.targetPath,
        moved
      });
    } catch (error) {
      warnings.push({
        bookmarkId: action.bookmarkId,
        title: action.title,
        error: error.message || String(error)
      });
    }
  }

  const job = {
    ...plan,
    status: warnings.length > 0 ? "completed-with-warnings" : "completed",
    appliedAt: new Date().toISOString(),
    appliedChanges,
    warnings
  };
  await writeStorage(STORAGE_KEYS.lastJob, job);
  return {
    job,
    appliedCount: appliedChanges.length,
    warningCount: warnings.length
  };
}

async function rollbackLastJob() {
  const job = await readStorage(STORAGE_KEYS.lastJob, null);
  if (!job || !Array.isArray(job.rollbackSnapshot) || job.rollbackSnapshot.length === 0) {
    throw new Error("復元できる直前ジョブがありません。");
  }

  const restored = [];
  const warnings = [];
  for (const snapshot of job.rollbackSnapshot) {
    if (!snapshot.parentId) {
      continue;
    }

    try {
      const options = { parentId: snapshot.parentId };
      if (Number.isInteger(snapshot.index)) {
        options.index = snapshot.index;
      }
      const moved = await chrome.bookmarks.move(snapshot.id, options);
      restored.push({ bookmarkId: snapshot.id, title: snapshot.title, moved });
    } catch (error) {
      warnings.push({
        bookmarkId: snapshot.id,
        title: snapshot.title,
        error: error.message || String(error)
      });
    }
  }

  const updatedJob = {
    ...job,
    rollbackAt: new Date().toISOString(),
    rollbackStatus: warnings.length > 0 ? "completed-with-warnings" : "completed",
    rollbackWarnings: warnings
  };
  await writeStorage(STORAGE_KEYS.lastJob, updatedJob);
  return {
    restoredCount: restored.length,
    warningCount: warnings.length,
    warnings
  };
}

async function getDefaultParentId() {
  const tree = await chrome.bookmarks.getTree();
  const root = tree?.[0];
  const firstEditableRoot = root?.children?.[0];
  if (!firstEditableRoot?.id) {
    throw new Error("ブックマークの保存先ルートを取得できません。");
  }
  return firstEditableRoot.id;
}

async function ensureFolderPath(parentId, pathSegments) {
  let currentParentId = parentId;
  for (const title of pathSegments) {
    const children = await chrome.bookmarks.getChildren(currentParentId);
    const existing = children.find((child) => !child.url && child.title === title);
    if (existing) {
      currentParentId = existing.id;
      continue;
    }
    const created = await chrome.bookmarks.create({ parentId: currentParentId, title });
    currentParentId = created.id;
  }
  return currentParentId;
}
