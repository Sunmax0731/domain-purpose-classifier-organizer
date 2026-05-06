import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRestoreOperations,
  createBookmarkBackup,
  createRestoreJob,
  createRestoreMoveOptions,
  describeBackup
} from "../extension/src/shared/bookmarkBackup.js";

test("createBookmarkBackup stores bookmark placement snapshot", () => {
  const now = new Date("2026-05-06T12:00:00.000Z");
  const backup = createBookmarkBackup(
    [
      { id: "10", title: "Docs", url: "https://example.com/docs", parentId: "1", index: 0, path: ["bar"] },
      { id: "folder", title: "Folder", children: [] }
    ],
    { now, source: "test" }
  );

  assert.equal(backup.id, "backup-20260506120000000");
  assert.equal(backup.source, "test");
  assert.equal(backup.bookmarkCount, 1);
  assert.deepEqual(backup.snapshot[0], {
    id: "10",
    title: "Docs",
    url: "https://example.com/docs",
    parentId: "1",
    index: 0,
    path: ["bar"]
  });
});

test("describeBackup hides snapshot details", () => {
  const backup = {
    id: "backup-1",
    createdAt: "2026-05-06T12:00:00.000Z",
    source: "manual",
    bookmarkCount: 2,
    snapshot: [{ id: "1" }, { id: "2" }]
  };

  assert.deepEqual(describeBackup(backup), {
    id: "backup-1",
    createdAt: "2026-05-06T12:00:00.000Z",
    source: "manual",
    bookmarkCount: 2
  });
});

test("buildRestoreOperations sorts by parent and index", () => {
  const operations = buildRestoreOperations({
    snapshot: [
      { id: "b", title: "B", parentId: "2", index: 2, path: ["bar", "later"] },
      { id: "a", title: "A", parentId: "2", index: 0, path: ["bar"] },
      { id: "c", title: "C", parentId: "1", index: 1, path: ["other"] },
      { id: "missing-parent", title: "Skip" }
    ]
  });

  assert.deepEqual(operations.map((operation) => operation.bookmarkId), ["c", "a", "b"]);
  assert.deepEqual(operations[2].path, ["bar", "later"]);
});

test("createRestoreMoveOptions can omit index for fallback restores", () => {
  const operation = {
    bookmarkId: "a",
    title: "A",
    parentId: "2",
    index: 10
  };

  assert.deepEqual(createRestoreMoveOptions(operation), { parentId: "2", index: 10 });
  assert.deepEqual(createRestoreMoveOptions(operation, { includeIndex: false }), { parentId: "2" });
});

test("createRestoreJob initializes progress counters", () => {
  const job = createRestoreJob(
    {
      id: "backup-1",
      createdAt: "2026-05-06T12:00:00.000Z",
      snapshot: [
        { id: "a", title: "A", url: "https://example.com/a", parentId: "1", index: 0 },
        { id: "b", title: "B", url: "https://example.com/b", parentId: "1", index: 1 }
      ]
    },
    { now: new Date("2026-05-06T12:30:00.000Z") }
  );

  assert.equal(job.id, "restore-20260506123000000");
  assert.equal(job.status, "running");
  assert.equal(job.totalCount, 2);
  assert.equal(job.nextIndex, 0);
  assert.equal(job.restoredCount, 0);
  assert.equal(job.pathFallbackCount, 0);
});
