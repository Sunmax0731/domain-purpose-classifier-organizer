const state = {
  bookmarks: [],
  results: [],
  plan: null,
  backup: null
};

const elements = {
  scanButton: document.querySelector("#scanButton"),
  openOptionsButton: document.querySelector("#openOptionsButton"),
  backupButton: document.querySelector("#backupButton"),
  restoreBackupButton: document.querySelector("#restoreBackupButton"),
  applyButton: document.querySelector("#applyButton"),
  rollbackButton: document.querySelector("#rollbackButton"),
  statusText: document.querySelector("#statusText"),
  backupStatusText: document.querySelector("#backupStatusText"),
  bookmarkCount: document.querySelector("#bookmarkCount"),
  actionCount: document.querySelector("#actionCount"),
  folderCount: document.querySelector("#folderCount"),
  resultList: document.querySelector("#resultList"),
  planList: document.querySelector("#planList"),
  messageLog: document.querySelector("#messageLog"),
  restoreWarningList: document.querySelector("#restoreWarningList")
};

elements.scanButton.addEventListener("click", scanAndClassify);
elements.openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
elements.backupButton.addEventListener("click", createBackup);
elements.restoreBackupButton.addEventListener("click", restoreBackup);
elements.applyButton.addEventListener("click", applyPlan);
elements.rollbackButton.addEventListener("click", rollbackLast);
refreshBackupStatus();

async function scanAndClassify() {
  setBusy(true, "スキャン中...");
  try {
    const payload = await sendMessage({
      type: "SCAN_AND_CLASSIFY",
      options: { axis: "purpose", rootTitle: "分類済みブックマーク" }
    });
    state.bookmarks = payload.bookmarks;
    state.results = payload.results;
    state.plan = payload.plan;
    renderAll();
    log(`分類が完了しました。${payload.summary.actionCount} 件の移動候補があります。`);
  } catch (error) {
    logError(error);
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

  const approved = confirm(`${state.plan.actions.length} 件のブックマークを移動します。実行しますか？`);
  if (!approved) {
    log("整理の適用をキャンセルしました。");
    return;
  }

  setBusy(true, "整理を適用中...");
  try {
    const payload = await sendMessage({ type: "APPLY_PLAN", plan: state.plan });
    setStatus(`整理適用完了: ${payload.appliedCount} 件 / 警告 ${payload.warningCount} 件`);
    log(`整理を適用しました。適用 ${payload.appliedCount} 件、警告 ${payload.warningCount} 件。`);
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
    item.querySelector(".folder").textContent = `移動先: ${result.suggestedFolder}`;
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
    item.querySelector(".to").textContent = `予定: ${(action.targetPath || []).join(" / ")}`;
    elements.planList.append(item);
  }
}

function setBusy(isBusy, text = null) {
  elements.scanButton.disabled = isBusy;
  elements.backupButton.disabled = isBusy;
  elements.restoreBackupButton.disabled = isBusy || !state.backup;
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
