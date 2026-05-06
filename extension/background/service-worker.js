import { flattenBookmarkTree } from "../src/shared/bookmarks.js";
import {
  buildRestoreOperations,
  createBookmarkBackup,
  createRestoreJob,
  createRestoreMoveOptions,
  describeBackup,
  summarizeRestoreJob
} from "../src/shared/bookmarkBackup.js";
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
    case "CREATE_BOOKMARK_BACKUP":
      return createCurrentBookmarkBackup();
    case "GET_BOOKMARK_BACKUP":
      return describeBackup(await readStorage(STORAGE_KEYS.bookmarkBackup, null));
    case "START_RESTORE_BOOKMARK_BACKUP":
      return startBookmarkBackupRestore();
    case "RUN_RESTORE_STEP":
      return runRestoreStep(message.limit);
    case "GET_RESTORE_JOB":
      return summarizeRestoreJob(await readStorage(STORAGE_KEYS.bookmarkRestoreJob, null));
    case "RESTORE_BOOKMARK_BACKUP":
      return restoreBookmarkBackup();
    case "OPEN_SIDE_PANEL":
      await chrome.sidePanel.open({ windowId: sender?.tab?.windowId || chrome.windows?.WINDOW_ID_CURRENT || -2 });
      return { opened: true };
    default:
      throw new Error(`Unknown message type: ${message?.type}`);
  }
}

async function createCurrentBookmarkBackup() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const backup = createBookmarkBackup(bookmarks);
  await writeStorage(STORAGE_KEYS.bookmarkBackup, backup);
  return describeBackup(backup);
}

async function restoreBookmarkBackup() {
  const job = await startBookmarkBackupRestore();
  let current = job;
  while (current?.status === "running") {
    current = await runRestoreStep(25);
  }
  return {
    backup: current.sourceBackup,
    restoredCount: current.restoredCount,
    adjustedCount: current.adjustedCount,
    pathFallbackCount: current.pathFallbackCount,
    warningCount: current.warningCount,
    warnings: current.warnings
  };
}

async function startBookmarkBackupRestore() {
  const backup = await readStorage(STORAGE_KEYS.bookmarkBackup, null);
  const job = createRestoreJob(backup);
  if (job.totalCount === 0) {
    throw new Error("復元できるバックアップがありません。");
  }

  await writeStorage(STORAGE_KEYS.bookmarkRestoreJob, job);
  return summarizeRestoreJob(job);
}

async function runRestoreStep(limit = 20) {
  const job = await readStorage(STORAGE_KEYS.bookmarkRestoreJob, null);
  if (!job || !Array.isArray(job.operations)) {
    throw new Error("実行中の復元ジョブがありません。");
  }

  if (job.status !== "running") {
    return summarizeRestoreJob(job);
  }

  const batchSize = Math.max(1, Math.min(Number(limit) || 20, 50));
  let processed = 0;
  while (job.nextIndex < job.operations.length && processed < batchSize) {
    const operation = job.operations[job.nextIndex];
    job.nextIndex += 1;
    processed += 1;

    try {
      const result = await moveBookmarkWithIndexFallback(operation);
      job.restoredCount += 1;
      if (result.usedIndexFallback) {
        job.adjustedCount += 1;
      }
    } catch (error) {
      try {
        const result = await moveBookmarkWithPathFallback(operation);
        job.restoredCount += 1;
        job.pathFallbackCount = (job.pathFallbackCount || 0) + 1;
        if (result.usedIndexFallback) {
          job.adjustedCount += 1;
        }
      } catch (pathError) {
        job.warningCount += 1;
        job.warnings.push({
          bookmarkId: operation.bookmarkId,
          title: operation.title,
          path: operation.path,
          error: pathError.message || String(pathError),
          firstError: error.message || String(error)
        });
      }
    }
  }

  if (job.nextIndex >= job.operations.length) {
    job.status = job.warningCount > 0 ? "completed-with-warnings" : "completed";
  }
  job.updatedAt = new Date().toISOString();
  await writeStorage(STORAGE_KEYS.bookmarkRestoreJob, job);
  return summarizeRestoreJob(job);
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
  const adjusted = [];
  const warnings = [];
  for (const snapshot of job.rollbackSnapshot) {
    if (!snapshot.parentId) {
      continue;
    }

    try {
      const result = await moveBookmarkWithIndexFallback({
        bookmarkId: snapshot.id,
        title: snapshot.title,
        parentId: snapshot.parentId,
        index: snapshot.index
      });
      restored.push({ bookmarkId: snapshot.id, title: snapshot.title, moved: result.moved });
      if (result.usedIndexFallback) {
        adjusted.push({ bookmarkId: snapshot.id, title: snapshot.title });
      }
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
    rollbackAdjustedCount: adjusted.length,
    rollbackWarnings: warnings
  };
  await writeStorage(STORAGE_KEYS.lastJob, updatedJob);
  return {
    restoredCount: restored.length,
    adjustedCount: adjusted.length,
    warningCount: warnings.length,
    warnings
  };
}

async function moveBookmarkWithIndexFallback(operation) {
  try {
    const moved = await withTimeout(
      chrome.bookmarks.move(operation.bookmarkId, createRestoreMoveOptions(operation, { includeIndex: true })),
      3000,
      `${operation.title} を保存時の順序へ復元`
    );
    return { moved, usedIndexFallback: false };
  } catch (error) {
    if (!Number.isInteger(operation.index)) {
      throw error;
    }

    const moved = await withTimeout(
      chrome.bookmarks.move(operation.bookmarkId, createRestoreMoveOptions(operation, { includeIndex: false })),
      3000,
      `${operation.title} を保存時の親フォルダへ復元`
    );
    return { moved, usedIndexFallback: true, originalError: error.message || String(error) };
  }
}

async function moveBookmarkWithPathFallback(operation) {
  if (!Array.isArray(operation.path) || operation.path.length === 0) {
    throw new Error("保存済みフォルダパスがないため、パス復元できません。");
  }

  const targetParentId = await resolveFolderPath(operation.path);
  const result = await moveBookmarkWithIndexFallback({
    ...operation,
    parentId: targetParentId
  });
  return { ...result, usedPathFallback: true };
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} がタイムアウトしました。`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function resolveFolderPath(pathSegments) {
  const segments = pathSegments
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return getDefaultParentId();
  }

  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree?.[0]?.children || [];
  const firstRootFolder = rootChildren.find((child) => !child.url && child.title === segments[0]);
  if (firstRootFolder) {
    return ensureFolderPath(firstRootFolder.id, segments.slice(1));
  }

  const defaultParentId = await getDefaultParentId();
  return ensureFolderPath(defaultParentId, segments);
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
