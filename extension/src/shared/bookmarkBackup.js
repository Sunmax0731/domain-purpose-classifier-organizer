import { createBookmarkSnapshot } from "./bookmarks.js";

export function createBookmarkBackup(bookmarks, options = {}) {
  const now = options.now || new Date();
  const snapshot = createBookmarkSnapshot(bookmarks || []);
  return {
    id: createBackupId(now),
    createdAt: now.toISOString(),
    source: options.source || "manual",
    bookmarkCount: snapshot.length,
    snapshot
  };
}

export function describeBackup(backup) {
  if (!backup || !Array.isArray(backup.snapshot)) {
    return null;
  }

  return {
    id: backup.id,
    createdAt: backup.createdAt,
    source: backup.source || "manual",
    bookmarkCount: backup.bookmarkCount ?? backup.snapshot.length
  };
}

export function buildRestoreOperations(backup) {
  if (!backup || !Array.isArray(backup.snapshot)) {
    return [];
  }

  return backup.snapshot
    .filter((item) => item?.id && item.parentId)
    .map((item) => ({
      bookmarkId: String(item.id),
      title: item.title || item.url || String(item.id),
      parentId: String(item.parentId),
      index: Number.isInteger(item.index) ? item.index : null,
      path: Array.isArray(item.path) ? [...item.path] : []
    }))
    .sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return a.parentId.localeCompare(b.parentId);
      }
      return (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER);
    });
}

export function createRestoreJob(backup, options = {}) {
  const now = options.now || new Date();
  const operations = buildRestoreOperations(backup);
  return {
    id: createRestoreJobId(now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: operations.length > 0 ? "running" : "empty",
    sourceBackup: describeBackup(backup),
    totalCount: operations.length,
    nextIndex: 0,
    restoredCount: 0,
    adjustedCount: 0,
    pathFallbackCount: 0,
    warningCount: 0,
    warnings: [],
    operations
  };
}

export function summarizeRestoreJob(job) {
  if (!job || typeof job !== "object") {
    return null;
  }

  return {
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    status: job.status,
    sourceBackup: job.sourceBackup,
    totalCount: job.totalCount || 0,
    nextIndex: job.nextIndex || 0,
    restoredCount: job.restoredCount || 0,
    adjustedCount: job.adjustedCount || 0,
    pathFallbackCount: job.pathFallbackCount || 0,
    warningCount: job.warningCount || 0,
    remainingCount: Math.max(0, (job.totalCount || 0) - (job.nextIndex || 0)),
    warnings: Array.isArray(job.warnings) ? job.warnings.slice(-10) : []
  };
}

export function createRestoreMoveOptions(operation, options = {}) {
  if (!operation?.parentId) {
    throw new Error("復元先の親フォルダがありません。");
  }

  const moveOptions = { parentId: String(operation.parentId) };
  if (options.includeIndex !== false && Number.isInteger(operation.index)) {
    moveOptions.index = operation.index;
  }
  return moveOptions;
}

export function createBackupId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "");
  return `backup-${stamp}`;
}

export function createRestoreJobId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "");
  return `restore-${stamp}`;
}
