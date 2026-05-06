import { flattenBookmarkTree } from "../src/shared/bookmarks.js";
import {
  createErrorLinkResult,
  createHttpLinkResult,
  createLinkCheckJob,
  createSkippedLinkResult,
  isCheckableUrl,
  summarizeLinkCheckJob
} from "../src/shared/brokenLinks.js";
import {
  buildRestoreOperations,
  createBookmarkBackup,
  createRestoreJob,
  createRestoreMoveOptions,
  describeBackup,
  summarizeRestoreJob
} from "../src/shared/bookmarkBackup.js";
import { DEFAULT_RULES, classifyBookmarks, sanitizeRules, validateRule } from "../src/shared/classifier.js";
import { buildSiteRuleSources, suggestClassificationRules } from "../src/shared/ruleSuggestions.js";
import { buildReorganizationPlan, describePlan } from "../src/shared/reorgPlan.js";
import { STORAGE_KEYS, readStorage, writeStorage } from "../src/storage/storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  const rules = await readStorage(STORAGE_KEYS.rules, null);
  if (!rules) {
    await writeStorage(STORAGE_KEYS.rules, DEFAULT_RULES);
    await writeStorage(STORAGE_KEYS.rulesUserManaged, false);
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
      return readRules();
    case "SAVE_RULES":
      return saveRules(message.rules);
    case "SUGGEST_RULES_FROM_BOOKMARKS":
      return suggestRulesFromCurrentBookmarks(message.options || {});
    case "GET_SITE_RULE_SOURCES":
      return getSiteRuleSources(message.options || {});
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
    case "START_LINK_CHECK":
      return startLinkCheck(message.options || {});
    case "RUN_LINK_CHECK_STEP":
      return runLinkCheckStep(message.limit);
    case "GET_LINK_CHECK_JOB":
      return summarizeLinkCheckJob(await readStorage(STORAGE_KEYS.linkCheckJob, null));
    case "DELETE_BROKEN_LINKS":
      return deleteBrokenLinks(message.plan);
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

  const sanitized = sanitizeRules(rules, { mergeDefaults: false });
  await writeStorage(STORAGE_KEYS.rulesUserManaged, true);
  return writeStorage(STORAGE_KEYS.rules, sanitized);
}

async function suggestRulesFromCurrentBookmarks(options) {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const rules = Array.isArray(options.rules)
    ? sanitizeRules(options.rules, { mergeDefaults: false })
    : await readRules();
  return suggestClassificationRules(bookmarks, rules, options);
}

async function getSiteRuleSources(options) {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const rules = Array.isArray(options.rules)
    ? sanitizeRules(options.rules, { mergeDefaults: false })
    : await readRules();
  return buildSiteRuleSources(bookmarks, rules, options);
}

async function scanAndClassify(options) {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const rules = await readRules();
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

async function readRules() {
  const savedRules = await readStorage(STORAGE_KEYS.rules, null);
  const userManaged = await readStorage(STORAGE_KEYS.rulesUserManaged, false);
  const source = savedRules || DEFAULT_RULES;
  return sanitizeRules(source, { mergeDefaults: !userManaged });
}

async function startLinkCheck(options) {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarkTree(tree);
  const job = createLinkCheckJob(bookmarks, options);
  await writeStorage(STORAGE_KEYS.linkCheckJob, job);
  return summarizeLinkCheckJob(job);
}

async function runLinkCheckStep(limit = 8) {
  const job = await readStorage(STORAGE_KEYS.linkCheckJob, null);
  if (!job || !Array.isArray(job.bookmarks)) {
    throw new Error("実行中のリンク切れチェックがありません。");
  }
  if (job.status !== "running") {
    return summarizeLinkCheckJob(job);
  }

  const batchSize = Math.max(1, Math.min(Number(limit) || 8, 12));
  const batch = job.bookmarks.slice(job.nextIndex, job.nextIndex + batchSize);
  const results = await Promise.all(batch.map((bookmark) => checkBookmarkLink(bookmark, job.options || {})));

  job.results.push(...results);
  job.nextIndex += batch.length;
  job.updatedAt = new Date().toISOString();
  if (job.nextIndex >= job.totalCount) {
    job.status = "completed";
  }

  await writeStorage(STORAGE_KEYS.linkCheckJob, job);
  return summarizeLinkCheckJob(job);
}

async function checkBookmarkLink(bookmark, options) {
  if (!isCheckableUrl(bookmark.url)) {
    return createSkippedLinkResult(bookmark);
  }

  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 5000);
  try {
    const head = await fetchWithTimeout(bookmark.url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store"
    }, timeoutMs);

    if (head.status === 405 || head.status === 501) {
      const get = await fetchWithTimeout(bookmark.url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      }, timeoutMs);
      return createHttpLinkResult(bookmark, {
        status: get.status,
        statusText: get.statusText,
        url: get.url,
        method: "GET"
      });
    }

    return createHttpLinkResult(bookmark, {
      status: head.status,
      statusText: head.statusText,
      url: head.url,
      method: "HEAD"
    });
  } catch (error) {
    return createErrorLinkResult(bookmark, error);
  }
}

async function deleteBrokenLinks(plan) {
  const candidates = Array.isArray(plan?.candidates) ? plan.candidates : [];
  if (candidates.length === 0) {
    throw new Error("削除できるリンク切れ候補がありません。");
  }

  const deleted = [];
  const warnings = [];
  for (const candidate of candidates) {
    try {
      await chrome.bookmarks.remove(String(candidate.bookmarkId));
      deleted.push({
        bookmarkId: String(candidate.bookmarkId),
        title: candidate.title,
        url: candidate.url,
        parentId: candidate.parentId == null ? null : String(candidate.parentId),
        index: Number.isInteger(candidate.index) ? candidate.index : null,
        path: Array.isArray(candidate.path) ? [...candidate.path] : [],
        httpStatus: candidate.httpStatus,
        reason: candidate.reason
      });
    } catch (error) {
      warnings.push({
        bookmarkId: String(candidate.bookmarkId),
        title: candidate.title,
        url: candidate.url,
        error: error.message || String(error)
      });
    }
  }

  const result = {
    id: `broken-delete-result-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`,
    sourcePlanId: plan.id || "",
    deletedAt: new Date().toISOString(),
    deletedCount: deleted.length,
    warningCount: warnings.length,
    deleted,
    warnings
  };
  await writeStorage(STORAGE_KEYS.lastBrokenLinkDeletion, result);
  return result;
}

async function applyPlan(plan) {
  if (!plan || !Array.isArray(plan.actions) || plan.actions.length === 0) {
    throw new Error("適用できる整理計画がありません。");
  }

  const parentId = await getDefaultParentId();
  const appliedChanges = [];
  const deletedChanges = [];
  const warnings = [];

  for (const action of plan.actions) {
    try {
      if (action.type === "delete") {
        await chrome.bookmarks.remove(String(action.bookmarkId));
        deletedChanges.push({
          bookmarkId: String(action.bookmarkId),
          title: action.title,
          url: action.url,
          fromPath: Array.isArray(action.fromPath) ? [...action.fromPath] : [],
          reason: action.reason || "削除予定カテゴリ"
        });
        continue;
      }

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
        actionType: action.type || "move",
        error: error.message || String(error)
      });
    }
  }

  const emptyFolderCleanup = await pruneEmptyFoldersAfterApply(plan, parentId);
  warnings.push(...emptyFolderCleanup.warnings);

  const job = {
    ...plan,
    status: warnings.length > 0 ? "completed-with-warnings" : "completed",
    appliedAt: new Date().toISOString(),
    appliedChanges,
    deletedChanges,
    deletedCount: deletedChanges.length,
    deletedEmptyFolders: emptyFolderCleanup.deleted,
    deletedEmptyFolderCount: emptyFolderCleanup.deleted.length,
    warnings
  };
  await writeStorage(STORAGE_KEYS.lastJob, job);
  return {
    job,
    appliedCount: appliedChanges.length,
    deletedCount: deletedChanges.length,
    deletedEmptyFolderCount: emptyFolderCleanup.deleted.length,
    warningCount: warnings.length
  };
}

async function pruneEmptyFoldersAfterApply(plan, defaultParentId) {
  const protectedIds = await getProtectedBookmarkFolderIds();
  protectedIds.add(String(defaultParentId));
  const deleted = [];
  const warnings = [];

  const sourceParentIds = [...new Set(
    (Array.isArray(plan.rollbackSnapshot) ? plan.rollbackSnapshot : [])
      .map((snapshot) => snapshot.parentId)
      .filter(Boolean)
      .map(String)
  )];

  for (const folderId of sourceParentIds) {
    await pruneEmptyAncestors(folderId, protectedIds, deleted, warnings);
  }

  const managedRoot = await findChildFolder(defaultParentId, plan.rootTitle || "分類済みブックマーク");
  if (managedRoot?.id) {
    protectedIds.add(String(managedRoot.id));
    await pruneEmptyDescendants(String(managedRoot.id), protectedIds, deleted, warnings);
  }

  return { deleted, warnings };
}

async function pruneEmptyAncestors(folderId, protectedIds, deleted, warnings) {
  let currentId = String(folderId);
  while (currentId && !protectedIds.has(currentId)) {
    const node = await getBookmarkNode(currentId);
    if (!node || node.url) {
      return;
    }

    const children = await chrome.bookmarks.getChildren(currentId);
    if (children.length > 0) {
      return;
    }

    try {
      await chrome.bookmarks.remove(currentId);
      deleted.push({
        folderId: currentId,
        title: node.title,
        parentId: node.parentId || "",
        reason: "整理適用後に空になった元フォルダ"
      });
      currentId = node.parentId ? String(node.parentId) : "";
    } catch (error) {
      warnings.push({
        folderId: currentId,
        title: node.title,
        error: error.message || String(error)
      });
      return;
    }
  }
}

async function pruneEmptyDescendants(folderId, protectedIds, deleted, warnings) {
  const children = await chrome.bookmarks.getChildren(folderId);
  for (const child of children) {
    if (!child.url) {
      await pruneEmptyDescendants(String(child.id), protectedIds, deleted, warnings);
    }
  }

  if (protectedIds.has(String(folderId))) {
    return;
  }

  const remainingChildren = await chrome.bookmarks.getChildren(folderId);
  if (remainingChildren.length > 0) {
    return;
  }

  const node = await getBookmarkNode(folderId);
  try {
    await chrome.bookmarks.remove(String(folderId));
    deleted.push({
      folderId: String(folderId),
      title: node?.title || String(folderId),
      parentId: node?.parentId || "",
      reason: "整理済みブックマーク配下の空フォルダ"
    });
  } catch (error) {
    warnings.push({
      folderId: String(folderId),
      title: node?.title || String(folderId),
      error: error.message || String(error)
    });
  }
}

async function getProtectedBookmarkFolderIds() {
  const tree = await chrome.bookmarks.getTree();
  const ids = new Set(["0"]);
  const root = tree?.[0];
  for (const child of root?.children || []) {
    if (!child.url && child.id) {
      ids.add(String(child.id));
    }
  }
  return ids;
}

async function findChildFolder(parentId, title) {
  if (!title) {
    return null;
  }
  const children = await chrome.bookmarks.getChildren(parentId);
  return children.find((child) => !child.url && child.title === title) || null;
}

async function getBookmarkNode(bookmarkId) {
  try {
    const nodes = await chrome.bookmarks.get(String(bookmarkId));
    return nodes?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
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
