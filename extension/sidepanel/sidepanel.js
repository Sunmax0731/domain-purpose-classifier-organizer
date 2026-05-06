const state = {
  bookmarks: [],
  results: [],
  plan: null,
  backup: null,
  linkCheckJob: null,
  brokenLinkDeletionPlan: null
};

const elements = {
  scanButton: document.querySelector("#scanButton"),
  openOptionsButton: document.querySelector("#openOptionsButton"),
  openOptionsTabButton: document.querySelector("#openOptionsTabButton"),
  closeOptionsPanelButton: document.querySelector("#closeOptionsPanelButton"),
  backupButton: document.querySelector("#backupButton"),
  restoreBackupButton: document.querySelector("#restoreBackupButton"),
  checkLinksButton: document.querySelector("#checkLinksButton"),
  deleteBrokenLinksButton: document.querySelector("#deleteBrokenLinksButton"),
  applyButton: document.querySelector("#applyButton"),
  rollbackButton: document.querySelector("#rollbackButton"),
  statusText: document.querySelector("#statusText"),
  backupStatusText: document.querySelector("#backupStatusText"),
  linkCheckSummary: document.querySelector("#linkCheckSummary"),
  bookmarkCount: document.querySelector("#bookmarkCount"),
  actionCount: document.querySelector("#actionCount"),
  folderCount: document.querySelector("#folderCount"),
  resultList: document.querySelector("#resultList"),
  planList: document.querySelector("#planList"),
  brokenLinkList: document.querySelector("#brokenLinkList"),
  optionsPanel: document.querySelector("#optionsPanel"),
  optionsFrame: document.querySelector("#optionsFrame"),
  messageLog: document.querySelector("#messageLog"),
  restoreWarningList: document.querySelector("#restoreWarningList")
};

elements.scanButton.addEventListener("click", scanAndClassify);
elements.openOptionsButton.addEventListener("click", showInlineOptions);
elements.openOptionsTabButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
elements.closeOptionsPanelButton.addEventListener("click", hideInlineOptions);
elements.backupButton.addEventListener("click", createBackup);
elements.restoreBackupButton.addEventListener("click", restoreBackup);
elements.checkLinksButton.addEventListener("click", checkBrokenLinks);
elements.deleteBrokenLinksButton.addEventListener("click", deleteBrokenLinks);
elements.applyButton.addEventListener("click", applyPlan);
elements.rollbackButton.addEventListener("click", rollbackLast);
refreshBackupStatus();

function showInlineOptions() {
  if (!elements.optionsFrame.src) {
    elements.optionsFrame.src = elements.optionsFrame.dataset.src;
  }
  elements.optionsPanel.hidden = false;
  elements.optionsPanel.scrollIntoView({ block: "start" });
  setStatus("Side Panel 内にルール編集を表示しています。");
}

function hideInlineOptions() {
  elements.optionsPanel.hidden = true;
  setStatus("ルール編集を閉じました。");
}

async function scanAndClassify() {
  setBusy(true, "スキャン中...");
  try {
    const payload = await sendMessage({
      type: "SCAN_AND_CLASSIFY",
      options: { axis: "purpose", rootTitle: "分類済みブックマーク" }
    });
    applyScanPayload(payload);
    state.linkCheckJob = null;
    state.brokenLinkDeletionPlan = null;
    renderAll();
    renderLinkCheck();
    log(`分類が完了しました。${payload.summary.actionCount} 件の移動候補があります。`);
  } catch (error) {
    logError(error);
  } finally {
    setBusy(false);
  }
}

async function checkBrokenLinks() {
  setBusy(true, "リンク切れ確認中...");
  try {
    let payload = await sendMessage({ type: "START_LINK_CHECK", options: { timeoutMs: 5000 } }, 20000);
    state.linkCheckJob = payload;
    renderLinkCheck(payload);
    while (payload.status === "running") {
      payload = await sendMessage({ type: "RUN_LINK_CHECK_STEP", limit: 8 }, 30000);
      state.linkCheckJob = payload;
      state.brokenLinkDeletionPlan = payload.deletionPlan;
      renderLinkCheck(payload);
    }

    const summary = payload.summary;
    setStatus(`リンク切れ確認完了: 削除候補 ${summary.deletionCandidateCount} 件`);
    log(
      `リンク切れ確認が完了しました。確認 ${summary.checkedCount}/${payload.totalCount} 件、` +
        `削除候補 ${summary.deletionCandidateCount} 件、要確認 ${summary.warningCount} 件、` +
        `対象外 ${summary.skippedCount} 件。`
    );
  } catch (error) {
    logError(error, "リンク切れ確認失敗");
  } finally {
    setBusy(false);
    renderLinkCheck(state.linkCheckJob);
  }
}

async function deleteBrokenLinks() {
  const candidates = state.brokenLinkDeletionPlan?.candidates || [];
  if (candidates.length === 0) {
    return;
  }

  const approved = confirm(
    `HTTP 404 / 410 のリンク切れ候補 ${candidates.length} 件を削除します。` +
      "削除済みブックマークは通常のバックアップ復元では再作成されません。実行しますか？"
  );
  if (!approved) {
    log("リンク切れ候補の削除をキャンセルしました。");
    return;
  }

  setBusy(true, "リンク切れ候補を削除中...");
  try {
    const payload = await sendMessage({
      type: "DELETE_BROKEN_LINKS",
      plan: state.brokenLinkDeletionPlan
    }, 30000);
    log(`リンク切れ候補を削除しました。削除 ${payload.deletedCount} 件、警告 ${payload.warningCount} 件。`);
    setStatus(`リンク切れ削除完了: ${payload.deletedCount} 件 / 警告 ${payload.warningCount} 件`);
    const scan = await sendMessage({
      type: "SCAN_AND_CLASSIFY",
      options: { axis: "purpose", rootTitle: "分類済みブックマーク" }
    }, 30000);
    applyScanPayload(scan);
    state.linkCheckJob = null;
    state.brokenLinkDeletionPlan = null;
    renderAll();
    renderLinkCheck();
  } catch (error) {
    logError(error, "リンク切れ削除失敗");
  } finally {
    setBusy(false);
  }
}

async function createBackup() {
  const message = state.backup
    ? "保存済みバックアップを現在のブックマーク状態で上書きします。実行しますか？"
    : "現在のブックマーク状態をバックアップします。実行しますか？";
  if (!confirm(message)) {
    return;
  }

  setBusy(true, "バックアップ作成中...");
  try {
    state.backup = await sendMessage({ type: "CREATE_BOOKMARK_BACKUP" });
    renderBackup();
    setStatus(`バックアップ作成完了: ${state.backup.bookmarkCount} 件`);
    log(`バックアップを作成しました。対象 ${state.backup.bookmarkCount} 件。`);
  } catch (error) {
    logError(error, "バックアップ作成失敗");
  } finally {
    setBusy(false);
  }
}

async function restoreBackup() {
  if (!state.backup) {
    return;
  }

  const approved = confirm(
    `バックアップ ${state.backup.bookmarkCount} 件を保存時点の親フォルダへ戻します。` +
      "拡張機能が作成した空フォルダは削除しません。実行しますか？"
  );
  if (!approved) {
    return;
  }

  setBusy(true, "バックアップから復元中...");
  try {
    let payload = await sendMessage({ type: "START_RESTORE_BOOKMARK_BACKUP" });
    logRestoreProgress(payload);
    while (payload.status === "running") {
      payload = await sendMessage({ type: "RUN_RESTORE_STEP", limit: 20 }, 20000);
      logRestoreProgress(payload);
    }
    log(
      `バックアップから復元しました。復元 ${payload.restoredCount} / ${payload.totalCount} 件、` +
        `順序調整 ${payload.adjustedCount || 0} 件、` +
        `パス復元 ${payload.pathFallbackCount || 0} 件、` +
        `警告 ${payload.warningCount} 件。`
    );
    setStatus(`バックアップ復元完了: ${payload.restoredCount}/${payload.totalCount}`);
    renderRestoreWarnings(payload);
  } catch (error) {
    logError(error, "バックアップ復元失敗");
  } finally {
    setBusy(false);
  }
}

function logRestoreProgress(payload) {
  if (!payload) {
    return;
  }

  const done = payload.nextIndex || 0;
  const total = payload.totalCount || 0;
  setStatus(`バックアップから復元中... ${done}/${total}`);
  log(
    `バックアップから復元中... ${done}/${total} 件。` +
      `復元 ${payload.restoredCount || 0} 件、` +
      `順序調整 ${payload.adjustedCount || 0} 件、` +
      `パス復元 ${payload.pathFallbackCount || 0} 件、` +
      `警告 ${payload.warningCount || 0} 件。`
  );
  renderRestoreWarnings(payload);
}

function renderRestoreWarnings(payload) {
  const warnings = payload?.warnings || [];
  if (warnings.length === 0) {
    elements.restoreWarningList.hidden = true;
    elements.restoreWarningList.textContent = "";
    return;
  }

  elements.restoreWarningList.hidden = false;
  elements.restoreWarningList.textContent = "";
  const heading = document.createElement("strong");
  heading.textContent = `復元できない項目の詳細: ${warnings.length} 件表示`;
  elements.restoreWarningList.append(heading);

  for (const warning of warnings) {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = warning.title || warning.bookmarkId;
    const error = document.createElement("span");
    error.textContent = warning.error || "詳細不明";
    const path = document.createElement("span");
    path.textContent = `保存先: ${(warning.path || []).join(" / ") || "不明"}`;
    item.append(title, error, path);
    elements.restoreWarningList.append(item);
  }
}

async function refreshBackupStatus() {
  try {
    state.backup = await sendMessage({ type: "GET_BOOKMARK_BACKUP" });
    renderBackup();
  } catch (error) {
    state.backup = null;
    renderBackup();
  }
}

async function applyPlan() {
  if (!state.plan || state.plan.actions.length === 0) {
    return;
  }

  const moveCount = countPlanActions("move");
  const deleteCount = countPlanActions("delete");
  const approved = confirm(
    `移動 ${moveCount} 件、削除予定 ${deleteCount} 件の整理を適用します。` +
      "削除予定カテゴリのブックマークと、移動後に空になったフォルダも削除します。実行しますか？"
  );
  if (!approved) {
    log("整理の適用をキャンセルしました。");
    return;
  }

  setBusy(true, "整理を適用中...");
  try {
    const payload = await sendMessage({ type: "APPLY_PLAN", plan: state.plan });
    setStatus(
      `整理適用完了: 移動 ${payload.appliedCount} 件 / 削除 ${payload.deletedCount || 0} 件 / ` +
        `空フォルダ ${payload.deletedEmptyFolderCount || 0} 件 / 警告 ${payload.warningCount} 件`
    );
    log(
      `整理を適用しました。移動 ${payload.appliedCount} 件、` +
        `削除予定 ${payload.deletedCount || 0} 件、` +
        `空フォルダ削除 ${payload.deletedEmptyFolderCount || 0} 件、` +
        `警告 ${payload.warningCount} 件。`
    );
    elements.applyButton.disabled = true;
  } catch (error) {
    logError(error, "整理適用失敗");
  } finally {
    setBusy(false);
  }
}

async function rollbackLast() {
  const approved = confirm("直前の整理ジョブを可能な範囲で復元します。実行しますか？");
  if (!approved) {
    return;
  }

  setBusy(true, "復元中...");
  try {
    const payload = await sendMessage({ type: "ROLLBACK_LAST" });
    log(
      `復元が完了しました。復元 ${payload.restoredCount} 件、` +
        `順序調整 ${payload.adjustedCount || 0} 件、警告 ${payload.warningCount} 件。`
    );
    setStatus(`直前復元完了: ${payload.restoredCount} 件 / 警告 ${payload.warningCount} 件`);
  } catch (error) {
    logError(error, "直前復元失敗");
  } finally {
    setBusy(false);
  }
}

function renderAll() {
  elements.bookmarkCount.textContent = String(state.bookmarks.length);
  elements.actionCount.textContent = String(state.plan?.actions?.length || 0);
  elements.folderCount.textContent = String(state.plan?.foldersToCreate?.length || 0);
  elements.statusText.textContent = `最終スキャン: ${new Date().toLocaleString()}`;
  elements.applyButton.disabled = !state.plan || state.plan.actions.length === 0;
  renderResults();
  renderPlan();
  renderBackup();
}

function applyScanPayload(payload) {
  state.bookmarks = payload.bookmarks || [];
  state.results = payload.results || [];
  state.plan = payload.plan || null;
}

function renderBackup() {
  if (!state.backup) {
    elements.backupStatusText.textContent = "保存済みバックアップはありません。";
    elements.restoreBackupButton.disabled = true;
    return;
  }

  const createdAt = new Date(state.backup.createdAt).toLocaleString();
  elements.backupStatusText.textContent = `保存済み: ${createdAt} / ${state.backup.bookmarkCount} 件`;
  elements.restoreBackupButton.disabled = false;
}

function renderResults() {
  elements.resultList.classList.toggle("empty", state.results.length === 0);
  if (state.results.length === 0) {
    elements.resultList.textContent = "スキャンすると分類候補が表示されます。";
    return;
  }

  elements.resultList.textContent = "";
  for (const result of state.results.slice(0, 120)) {
    const item = document.createElement("article");
    item.className = "result-item";
    item.innerHTML = `
      <strong></strong>
      <span class="domain"></span>
      <span class="folder"></span>
      <span class="reason"></span>
    `;
    item.querySelector("strong").textContent = result.title;
    item.querySelector(".domain").textContent = result.domain || result.url;
    item.querySelector(".folder").textContent = result.deleteOnApply
      ? `削除予定: ${result.suggestedFolder}`
      : `移動先: ${result.suggestedFolder}`;
    item.querySelector(".reason").textContent = `理由: ${(result.reasons || []).join(" / ")}`;
    elements.resultList.append(item);
  }
}

function renderPlan() {
  const actions = state.plan?.actions || [];
  elements.planList.classList.toggle("empty", actions.length === 0);
  if (actions.length === 0) {
    elements.planList.textContent = "整理計画はまだありません。";
    return;
  }

  elements.planList.textContent = "";
  for (const action of actions.slice(0, 120)) {
    const item = document.createElement("article");
    item.className = "plan-item";
    item.innerHTML = `
      <strong></strong>
      <span class="from"></span>
      <span class="to"></span>
    `;
    item.querySelector("strong").textContent = action.title;
    item.querySelector(".from").textContent = `現在: ${(action.fromPath || []).join(" / ") || "ルート"}`;
    item.querySelector(".to").textContent = action.type === "delete"
      ? `予定: 削除予定 (${action.reason || "削除予定カテゴリ"})`
      : `予定: ${(action.targetPath || []).join(" / ")}`;
    elements.planList.append(item);
  }
}

function countPlanActions(type) {
  return (state.plan?.actions || []).filter((action) =>
    type === "move" ? action.type !== "delete" : action.type === type
  ).length;
}

function renderLinkCheck(payload = state.linkCheckJob) {
  const summary = payload?.summary;
  if (!summary) {
    elements.linkCheckSummary.textContent = "未チェックです。";
    elements.brokenLinkList.classList.add("empty");
    elements.brokenLinkList.textContent = "リンク切れ候補はまだありません。";
    elements.deleteBrokenLinksButton.disabled = true;
    return;
  }

  elements.linkCheckSummary.textContent =
    `確認 ${summary.checkedCount}/${payload.totalCount} 件 / ` +
    `削除候補 ${summary.deletionCandidateCount} 件 / ` +
    `要確認 ${summary.warningCount} 件 / 対象外 ${summary.skippedCount} 件`;

  const candidates = payload.deletionPlan?.candidates || [];
  state.brokenLinkDeletionPlan = payload.deletionPlan;
  elements.deleteBrokenLinksButton.disabled = candidates.length === 0;
  elements.brokenLinkList.classList.toggle("empty", candidates.length === 0);

  if (candidates.length === 0) {
    elements.brokenLinkList.textContent = "削除候補はありません。通信エラーや認証エラーは削除候補にしていません。";
    return;
  }

  elements.brokenLinkList.textContent = "";
  for (const candidate of candidates.slice(0, 80)) {
    const item = document.createElement("article");
    item.className = "broken-link-item";
    item.innerHTML = `
      <strong></strong>
      <span class="url"></span>
      <span class="reason"></span>
    `;
    item.querySelector("strong").textContent = candidate.title || candidate.url;
    item.querySelector(".url").textContent = candidate.url;
    item.querySelector(".reason").textContent = candidate.reason || `HTTP ${candidate.httpStatus}`;
    elements.brokenLinkList.append(item);
  }
}

function setBusy(isBusy, text = null) {
  elements.scanButton.disabled = isBusy;
  elements.backupButton.disabled = isBusy;
  elements.restoreBackupButton.disabled = isBusy || !state.backup;
  elements.checkLinksButton.disabled = isBusy;
  elements.deleteBrokenLinksButton.disabled =
    isBusy || (state.brokenLinkDeletionPlan?.candidates || []).length === 0;
  elements.applyButton.disabled = isBusy || !state.plan || state.plan.actions.length === 0;
  if (text) {
    setStatus(text);
  }
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function log(message) {
  elements.messageLog.textContent = message;
}

function logError(error, statusMessage = "エラー") {
  setStatus(statusMessage);
  elements.messageLog.textContent = `エラー: ${error.message || String(error)}`;
}

async function sendMessage(message, timeoutMs = 15000) {
  const response = await withTimeout(
    chrome.runtime.sendMessage(message),
    timeoutMs,
    `${message.type} の応答`
  );
  if (!response?.ok) {
    throw new Error(response?.error || "拡張機能から応答がありません。");
  }
  return response.payload;
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} がタイムアウトしました。`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
