import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyHttpStatus,
  createBrokenLinkDeletionPlan,
  createHttpLinkResult,
  createLinkCheckJob,
  createSkippedLinkResult,
  isCheckableUrl,
  summarizeLinkCheckJob
} from "../extension/src/shared/brokenLinks.js";

const bookmark = {
  id: "10",
  title: "Missing Page",
  url: "https://example.com/missing",
  parentId: "1",
  index: 0,
  path: ["Bookmarks bar"]
};

test("link check jobs track progress and deletion candidates", () => {
  const now = new Date("2026-05-07T00:00:00.000Z");
  const job = createLinkCheckJob([bookmark], { timeoutMs: 3000 }, now);
  job.results.push(createHttpLinkResult(bookmark, { status: 404, statusText: "Not Found", url: bookmark.url }, now));
  job.nextIndex = 1;
  job.updatedAt = now.toISOString();
  job.status = "completed";

  const summary = summarizeLinkCheckJob(job);
  assert.equal(summary.totalCount, 1);
  assert.equal(summary.summary.deletionCandidateCount, 1);
  assert.equal(summary.deletionPlan.candidates[0].bookmarkId, "10");
});

test("only 404 and 410 are deletion candidates", () => {
  assert.deepEqual(classifyHttpStatus(404).deletionCandidate, true);
  assert.deepEqual(classifyHttpStatus(410).deletionCandidate, true);
  assert.deepEqual(classifyHttpStatus(403).deletionCandidate, false);
  assert.deepEqual(classifyHttpStatus(500).deletionCandidate, false);
  assert.deepEqual(classifyHttpStatus(200).status, "ok");
});

test("non http urls are skipped and not deleted", () => {
  const skipped = createSkippedLinkResult({ ...bookmark, url: "chrome://extensions" });
  const plan = createBrokenLinkDeletionPlan([skipped]);

  assert.equal(isCheckableUrl("https://example.com"), true);
  assert.equal(isCheckableUrl("http://example.com"), true);
  assert.equal(isCheckableUrl("chrome://extensions"), false);
  assert.equal(plan.candidates.length, 0);
});
