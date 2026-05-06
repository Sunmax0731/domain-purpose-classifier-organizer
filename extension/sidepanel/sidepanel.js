const state = {
  bookmarks: [],
  results: [],
  plan: null
};

const elements = {
  scanButton: document.querySelector("#scanButton"),
  openOptionsButton: document.querySelector("#openOptionsButton"),
  applyButton: document.querySelector("#applyButton"),
  rollbackButton: document.querySelector("#rollbackButton"),
  statusText: document.querySelector("#statusText"),
  bookmarkCount: document.querySelector("#bookmarkCount"),
  actionCount: document.querySelector("#actionCount"),
  folderCount: document.querySelector("#folderCount"),
  resultList: document.querySelector("#resultList"),
  planList: document.querySelector("#planList"),
  messageLog: document.querySelector("#messageLog")
};

elements.scanButton.addEventListener("click", scanAndClassify);
elements.openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
elements.applyButton.addEventListener("click", applyPlan);
elements.rollbackButton.addEventListener("click", rollbackLast);

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
    log(`整理を適用しました。適用 ${payload.appliedCount} 件、警告 ${payload.warningCount} 件。`);
    elements.applyButton.disabled = true;
  } catch (error) {
    logError(error);
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
    log(`復元が完了しました。復元 ${payload.restoredCount} 件、警告 ${payload.warningCount} 件。`);
  } catch (error) {
    logError(error);
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
  elements.applyButton.disabled = isBusy || !state.plan || state.plan.actions.length === 0;
  if (text) {
    elements.statusText.textContent = text;
  }
}

function log(message) {
  elements.messageLog.textContent = message;
}

function logError(error) {
  elements.messageLog.textContent = `エラー: ${error.message || String(error)}`;
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "拡張機能から応答がありません。");
  }
  return response.payload;
}
