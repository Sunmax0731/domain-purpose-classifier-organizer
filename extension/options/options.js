import { getDomain } from "../src/shared/bookmarks.js";
import {
  AXIS_LABELS,
  DEFAULT_RULES,
  sanitizeRules,
  validateRule
} from "../src/shared/classifier.js";
import { createRuleFromUrl } from "../src/shared/ruleSuggestions.js";

const NEW_VALUE = "__new__";
const CUSTOM_ICON_VALUE = "__custom__";
const SITE_TITLE_LIMIT = 56;
const SITE_META_LIMIT = 72;
const SITE_SAMPLE_LIMIT = 64;
const EDITOR_SYNC_DELAY_MS = 300;

const MODE_CONFIG = {
  builder: { label: "分類先設定", syncBeforeEnter: true },
  board: { label: "サイト割り当て", syncBeforeEnter: true },
  rules: { label: "ルール管理", syncBeforeEnter: true },
  json: { label: "JSON 編集", syncBeforeEnter: false }
};

const VIEW_LABELS = {
  group: "グループ",
  grid: "グリッド",
  list: "リスト"
};

const RULE_VIEW_RENDERERS = {
  group: renderGroupedRules,
  grid: () => renderFlatRules("grid"),
  list: () => renderFlatRules("list")
};

const ICON_OPTIONS = [
  { value: "code", label: "コード", glyph: "{}" },
  { value: "ai", label: "AI", glyph: "AI" },
  { value: "network", label: "ネットワーク", glyph: "NW" },
  { value: "mail", label: "連絡", glyph: "@" },
  { value: "task", label: "タスク", glyph: "✓" },
  { value: "chat", label: "SNS", glyph: "SNS" },
  { value: "play", label: "動画", glyph: "▶" },
  { value: "wallet", label: "金融", glyph: "¥" },
  { value: "cart", label: "購入", glyph: "買" },
  { value: "calendar", label: "予約", glyph: "日" },
  { value: "image", label: "画像", glyph: "IMG" },
  { value: "palette", label: "デザイン", glyph: "UI" },
  { value: "chart", label: "分析", glyph: "↗" },
  { value: "profile", label: "プロフィール", glyph: "ID" },
  { value: "book", label: "学習", glyph: "本" },
  { value: "search", label: "調査", glyph: "探" },
  { value: "paper", label: "論文", glyph: "PDF" },
  { value: "game", label: "娯楽", glyph: "GAME" },
  { value: "shield", label: "制限", glyph: "18+" },
  { value: "trash", label: "削除", glyph: "DEL" },
  { value: "globe", label: "ドメイン", glyph: "WWW" },
  { value: "folder", label: "フォルダ", glyph: "DIR" }
];

const state = {
  rules: [],
  candidates: [],
  candidateSummaries: [],
  sites: [],
  siteSummary: null,
  mode: "builder",
  ruleView: "group",
  siteView: "grid",
  siteFilter: "",
  hideAssignedSites: false,
  editingCategoryKey: null
};

let editorSyncTimer = null;

const elements = {
  editor: document.querySelector("#rulesEditor"),
  statusLog: document.querySelector("#statusLog"),
  saveButton: document.querySelector("#saveButton"),
  resetButton: document.querySelector("#resetButton"),
  clearAllRulesButton: document.querySelector("#clearAllRulesButton"),
  ruleStats: document.querySelector("#ruleStats"),
  modeTabs: [...document.querySelectorAll(".mode-tab")],
  viewTabs: [...document.querySelectorAll(".view-tab")],
  siteViewTabs: [...document.querySelectorAll(".site-view-tab")],
  panels: {
    builder: document.querySelector("#builderPanel"),
    board: document.querySelector("#boardPanel"),
    rules: document.querySelector("#rulesPanel"),
    json: document.querySelector("#jsonPanel")
  },
  ruleForm: document.querySelector("#ruleForm"),
  addRuleButton: document.querySelector("#addRuleButton"),
  urlInput: document.querySelector("#urlInput"),
  parentFolderSelect: document.querySelector("#parentFolderSelect"),
  newParentFolderLabel: document.querySelector("#newParentFolderLabel"),
  newParentFolderInput: document.querySelector("#newParentFolderInput"),
  targetFolderSelect: document.querySelector("#targetFolderSelect"),
  newTargetFolderLabel: document.querySelector("#newTargetFolderLabel"),
  newTargetFolderInput: document.querySelector("#newTargetFolderInput"),
  targetIconSelect: document.querySelector("#targetIconSelect"),
  customIconLabel: document.querySelector("#customIconLabel"),
  customIconInput: document.querySelector("#customIconInput"),
  axisSelect: document.querySelector("#axisSelect"),
  priorityInput: document.querySelector("#priorityInput"),
  ruleNameInput: document.querySelector("#ruleNameInput"),
  reasonInput: document.querySelector("#reasonInput"),
  detectedDomain: document.querySelector("#detectedDomain"),
  candidateSourceSelect: document.querySelector("#candidateSourceSelect"),
  candidateAxisInputs: [...document.querySelectorAll(".axis-options input[type='checkbox']")],
  analyzeBookmarksButton: document.querySelector("#analyzeBookmarksButton"),
  addAllCandidatesButton: document.querySelector("#addAllCandidatesButton"),
  candidateSummary: document.querySelector("#candidateSummary"),
  candidateList: document.querySelector("#candidateList"),
  categoryManagerList: document.querySelector("#categoryManagerList"),
  loadSitesButton: document.querySelector("#loadSitesButton"),
  siteFilterInput: document.querySelector("#siteFilterInput"),
  hideAssignedSitesInput: document.querySelector("#hideAssignedSitesInput"),
  siteSummary: document.querySelector("#siteSummary"),
  categoryDropList: document.querySelector("#categoryDropList"),
  siteSourceList: document.querySelector("#siteSourceList"),
  ruleCards: document.querySelector("#ruleCards")
};

elements.saveButton.addEventListener("click", saveRules);
elements.resetButton.addEventListener("click", resetRules);
elements.clearAllRulesButton.addEventListener("click", clearAllRules);
elements.editor.addEventListener("input", handleEditorInput);
elements.editor.addEventListener("blur", () => {
  applyEditorRules({ silent: true });
});
elements.ruleForm.addEventListener("submit", addRuleFromForm);
elements.urlInput.addEventListener("input", renderDetectedDomain);
elements.parentFolderSelect.addEventListener("change", handleParentChange);
elements.targetFolderSelect.addEventListener("change", handleTargetChange);
elements.targetIconSelect.addEventListener("change", handleIconChange);
elements.analyzeBookmarksButton.addEventListener("click", analyzeBookmarks);
elements.addAllCandidatesButton.addEventListener("click", addAllCandidates);
elements.loadSitesButton.addEventListener("click", loadSiteSources);
elements.siteFilterInput.addEventListener("input", () => {
  state.siteFilter = elements.siteFilterInput.value.trim().toLowerCase();
  renderSiteSources();
});
elements.hideAssignedSitesInput.addEventListener("change", () => {
  state.hideAssignedSites = elements.hideAssignedSitesInput.checked;
  renderSiteSources();
});

for (const tab of elements.modeTabs) {
  tab.setAttribute("aria-pressed", String(tab.dataset.mode === state.mode));
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
}

for (const tab of elements.viewTabs) {
  tab.setAttribute("aria-pressed", String(tab.dataset.view === state.ruleView));
  tab.addEventListener("click", () => setRuleView(tab.dataset.view));
}

for (const tab of elements.siteViewTabs) {
  tab.setAttribute("aria-pressed", String(tab.dataset.siteView === state.siteView));
  tab.addEventListener("click", () => setSiteView(tab.dataset.siteView));
}

loadRules();

async function loadRules() {
  try {
    state.rules = await sendMessage({ type: "GET_RULES" });
    syncEditor();
    renderAll();
    setStatus("ルールを読み込みました。");
  } catch (error) {
    setStatus(`エラー: ${error.message || String(error)}`);
  }
}

async function saveRules() {
  try {
    const rules = parseEditorRules();
    state.rules = rules;
    state.rules = await sendMessage({ type: "SAVE_RULES", rules });
    syncEditor();
    renderAll();
    setStatus("ルールを保存しました。");
  } catch (error) {
    setStatus(`保存できません: ${error.message || String(error)}`);
  }
}

function resetRules() {
  state.rules = [...DEFAULT_RULES];
  state.candidates = [];
  state.candidateSummaries = [];
  state.editingCategoryKey = null;
  syncEditor();
  renderAll();
  setStatus("初期ルールをエディタへ戻しました。保存すると反映されます。");
}

function clearAllRules() {
  const approved = globalThis.confirm(
    "現在の編集状態から全ての分類ルールを削除します。保存するまで永続化されません。実行しますか？"
  );
  if (!approved) {
    setStatus("全ルール削除をキャンセルしました。");
    return;
  }

  state.rules = [];
  state.candidates = [];
  state.candidateSummaries = [];
  state.editingCategoryKey = null;
  clearForm();
  syncEditor();
  renderAll();
  setStatus("全てのルールを削除しました。保存すると反映されます。");
}

function handleEditorInput() {
  clearTimeout(editorSyncTimer);
  editorSyncTimer = setTimeout(() => {
    applyEditorRules({ silent: true });
  }, EDITOR_SYNC_DELAY_MS);
}

function applyEditorRules(options = {}) {
  try {
    state.rules = parseEditorRules();
    renderAll();
    return true;
  } catch (error) {
    if (!options.silent) {
      setStatus(`JSON を反映できません: ${error.message || String(error)}`);
    }
    return false;
  }
}

function addRuleFromForm(event) {
  event.preventDefault();
  try {
    const target = getSelectedTarget();
    const url = elements.urlInput.value.trim();

    if (!url) {
      const targetKey = createCategoryKey(target);
      const existingCategory = getManagedCategoryOptions().find((category) => createCategoryKey(category) === targetKey);
      if (!state.editingCategoryKey && existingCategory?.categoryRuleIndex >= 0) {
        state.editingCategoryKey = targetKey;
      }
    }

    if (state.editingCategoryKey && !url) {
      updateCategoryFromForm(target);
      syncEditor();
      renderAll();
      selectCategory(target.parentFolder, target.targetFolder, target.targetIcon);
      setStatus(`${target.parentFolder} / ${target.targetFolder} を更新しました。保存すると反映されます。`);
      return;
    }

    const rule = url
      ? createRuleFromUrl(
        {
          url,
          parentFolder: target.parentFolder,
          targetFolder: target.targetFolder,
          targetIcon: target.targetIcon,
          axis: elements.axisSelect.value,
          priority: elements.priorityInput.value,
          name: elements.ruleNameInput.value,
          reason: elements.reasonInput.value
        },
        state.rules
      )
      : createCategoryDefinitionRule(target, state.rules);
    state.rules = [...state.rules, rule];
    clearForm();
    syncEditor();
    renderAll();
    selectCategory(rule.parentFolder, rule.targetFolder, rule.targetIcon);
    setStatus(url
      ? `${rule.pattern} のサイトルールを追加しました。保存すると反映されます。`
      : `${rule.parentFolder} / ${rule.targetFolder} の分類先を追加しました。保存すると反映されます。`);
  } catch (error) {
    setStatus(`追加できません: ${error.message || String(error)}`);
  }
}

async function analyzeBookmarks() {
  elements.analyzeBookmarksButton.disabled = true;
  elements.candidateSummary.textContent = "候補を作成中...";
  try {
    const payload = await sendMessage({
      type: "SUGGEST_RULES_FROM_BOOKMARKS",
      options: {
        minCount: 2,
        maxRules: 80,
        source: elements.candidateSourceSelect.value,
        axes: getSelectedCandidateAxes(),
        rules: state.rules
      }
    });
    state.candidates = payload.rules || [];
    state.candidateSummaries = payload.summaries || [];
    populateCategoryControls();
    renderAssignmentBoard();
    renderCandidates(payload);
    setStatus(
      `現在のブックマーク ${payload.bookmarkCount} 件、${payload.domainCount} ドメインから ` +
        `${state.candidates.length} 件の候補を作成しました。`
    );
  } catch (error) {
    elements.candidateSummary.textContent = "候補を作成できませんでした。";
    setStatus(`候補作成エラー: ${error.message || String(error)}`);
  } finally {
    elements.analyzeBookmarksButton.disabled = false;
  }
}

async function loadSiteSources() {
  elements.loadSitesButton.disabled = true;
  elements.siteSummary.textContent = "読み込み中...";
  try {
    const payload = await sendMessage({
      type: "GET_SITE_RULE_SOURCES",
      options: { maxSites: 400, rules: state.rules }
    });
    state.sites = payload.sites || [];
    state.siteSummary = payload;
    renderAssignmentBoard();
    setStatus(
      `現在のブックマーク ${payload.bookmarkCount} 件から ${payload.siteCount} 件のサイトを読み込みました。`
    );
  } catch (error) {
    elements.siteSummary.textContent = "読み込みできませんでした。";
    setStatus(`サイト読み込みエラー: ${error.message || String(error)}`);
  } finally {
    elements.loadSitesButton.disabled = false;
  }
}

function addAllCandidates() {
  if (state.candidates.length === 0) {
    return;
  }

  const added = [];
  for (const candidate of state.candidates) {
    try {
      added.push(materializeCandidateRule(candidate, [...state.rules, ...added]));
    } catch {
      // Duplicate candidates are ignored because existing rules already cover them.
    }
  }

  state.rules = [...state.rules, ...added];
  state.candidates = [];
  state.candidateSummaries = [];
  syncEditor();
  renderAll();
  setStatus(`${added.length} 件の候補をルールへ追加しました。保存すると反映されます。`);
}

function addCandidate(index) {
  const candidate = state.candidates[index];
  if (!candidate) {
    return;
  }

  try {
    const rule = materializeCandidateRule(candidate, state.rules);
    state.rules = [...state.rules, rule];
    state.candidates.splice(index, 1);
    state.candidateSummaries.splice(index, 1);
    syncEditor();
    renderAll();
    setStatus(`${candidate.pattern} の候補をルールへ追加しました。保存すると反映されます。`);
  } catch (error) {
    setStatus(`候補を追加できません: ${error.message || String(error)}`);
  }
}

function removeRule(index) {
  const [removed] = state.rules.splice(index, 1);
  syncEditor();
  renderAll();
  setStatus(`${removed?.name || "ルール"} を削除しました。保存すると反映されます。`);
}

function setMode(mode) {
  clearTimeout(editorSyncTimer);
  const config = MODE_CONFIG[mode] || MODE_CONFIG.builder;
  if (config.syncBeforeEnter && !applyEditorRules()) {
    return;
  }

  state.mode = mode;
  for (const tab of elements.modeTabs) {
    tab.classList.toggle("active", tab.dataset.mode === mode);
    tab.setAttribute("aria-pressed", String(tab.dataset.mode === mode));
  }
  for (const [key, panel] of Object.entries(elements.panels)) {
    panel.hidden = key !== mode;
  }
  setStatus(`${getModeLabel(mode)}を表示しています。`);
}

function setRuleView(view) {
  state.ruleView = view;
  for (const tab of elements.viewTabs) {
    tab.classList.toggle("active", tab.dataset.view === view);
    tab.setAttribute("aria-pressed", String(tab.dataset.view === view));
  }
  renderRuleCards();
  setStatus(`ルール管理を${getViewLabel(view)}表示にしました。`);
}

function setSiteView(view) {
  state.siteView = view;
  for (const tab of elements.siteViewTabs) {
    tab.classList.toggle("active", tab.dataset.siteView === view);
    tab.setAttribute("aria-pressed", String(tab.dataset.siteView === view));
  }
  renderSiteSources();
  setStatus(`サイト一覧を${getViewLabel(view)}表示にしました。`);
}

function renderAll() {
  populateIconOptions();
  populateCategoryControls();
  renderStats();
  renderCategoryManager();
  renderAssignmentBoard();
  renderRuleCards();
  renderCandidates();
}

function renderStats() {
  const byAxis = new Map();
  for (const rule of state.rules) {
    byAxis.set(rule.axis, (byAxis.get(rule.axis) || 0) + 1);
  }

  elements.ruleStats.textContent = "";
  elements.ruleStats.append(createStatPill(`合計 ${state.rules.length}`));
  for (const axis of ["purpose", "usage", "theme"]) {
    elements.ruleStats.append(createStatPill(`${AXIS_LABELS[axis]} ${byAxis.get(axis) || 0}`));
  }
}

function renderCategoryManager() {
  const categories = getManagedCategoryOptions();
  elements.categoryManagerList.textContent = "";
  if (categories.length === 0) {
    elements.categoryManagerList.className = "category-manager-list empty";
    elements.categoryManagerList.textContent = "分類先はまだありません。";
    return;
  }

  elements.categoryManagerList.className = "category-manager-list";
  for (const category of categories) {
    elements.categoryManagerList.append(createCategoryConfigCard(category));
  }
}

function createCategoryConfigCard(category) {
  const card = document.createElement("article");
  card.className = "category-config-card";
  const icon = createIconElement(category.targetIcon);
  const body = document.createElement("div");
  body.className = "category-config-body";

  const title = document.createElement("div");
  title.className = "category-config-title";
  const strong = document.createElement("strong");
  strong.textContent = category.name || category.targetFolder;
  const path = document.createElement("span");
  path.className = "rule-meta";
  path.textContent = `${category.parentFolder} / ${category.targetFolder}`;
  const meta = document.createElement("span");
  meta.className = "rule-meta";
  meta.textContent = `${AXIS_LABELS[category.axis] || category.axis} / 優先度 ${category.priority} / 割り当て ${category.assignedRuleCount} 件`;
  title.append(strong, path, meta);

  const actions = document.createElement("div");
  actions.className = "category-config-actions";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "編集";
  editButton.addEventListener("click", () => editCategory(category));
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-rule-button";
  deleteButton.textContent = "削除";
  deleteButton.addEventListener("click", () => deleteCategory(category));
  actions.append(editButton, deleteButton);

  body.append(title, actions);
  card.append(icon, body);
  return card;
}

function renderAssignmentBoard() {
  renderCategoryDropList();
  renderSiteSources();
}

function renderCategoryDropList() {
  const categories = getAvailableCategoryOptions();
  const byParent = new Map();
  for (const category of categories) {
    if (!byParent.has(category.parentFolder)) {
      byParent.set(category.parentFolder, []);
    }
    byParent.get(category.parentFolder).push(category);
  }

  elements.categoryDropList.textContent = "";
  if (categories.length === 0) {
    elements.categoryDropList.className = "category-drop-list empty";
    elements.categoryDropList.textContent =
      "分類先はまだありません。分類先設定で新規追加するか、候補作成で分類先を作成してください。";
    return;
  }

  elements.categoryDropList.className = "category-drop-list";
  for (const [parentFolder, targets] of [...byParent.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const group = document.createElement("section");
    group.className = "category-drop-group";
    const title = document.createElement("h2");
    title.textContent = parentFolder;
    const targetList = document.createElement("div");
    targetList.className = "category-drop-targets";

    for (const target of targets.sort((a, b) => a.targetFolder.localeCompare(b.targetFolder))) {
      targetList.append(createCategoryDropTarget(target));
    }

    group.append(title, targetList);
    elements.categoryDropList.append(group);
  }
}

function createCategoryDropTarget(category) {
  const target = document.createElement("button");
  target.className = "category-drop-target";
  target.type = "button";
  target.dataset.parentFolder = category.parentFolder;
  target.dataset.targetFolder = category.targetFolder;
  target.dataset.targetIcon = category.targetIcon;
  const assignedCount = countCategoryRules(category);
  const icon = createIconElement(category.targetIcon);
  const label = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = category.targetFolder;
  const meta = document.createElement("span");
  meta.className = "rule-meta";
  meta.textContent = `${assignedCount} ルール`;
  label.append(title, meta);
  target.append(icon, label);

  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    target.classList.add("drag-over");
  });
  target.addEventListener("dragleave", () => target.classList.remove("drag-over"));
  target.addEventListener("drop", (event) => {
    event.preventDefault();
    target.classList.remove("drag-over");
    const siteId = event.dataTransfer.getData("text/plain");
    assignSiteToCategory(siteId, category);
  });

  return target;
}

function renderSiteSources() {
  const sites = getFilteredSites();
  const total = state.siteSummary?.siteCount ?? state.sites.length;
  const bookmarkCount = state.siteSummary?.bookmarkCount ?? 0;
  elements.siteSummary.textContent =
    state.siteSummary
      ? `${bookmarkCount} 件 / サイト ${sites.length}/${total} 件`
      : "未読み込み";

  elements.siteSourceList.textContent = "";
  if (state.sites.length === 0) {
    elements.siteSourceList.className = "site-source-grid empty";
    elements.siteSourceList.textContent = "サイトを読み込むとここに表示されます。";
    return;
  }
  if (sites.length === 0) {
    elements.siteSourceList.className = "site-source-grid empty";
    elements.siteSourceList.textContent = "一致するサイトはありません。";
    return;
  }

  elements.siteSourceList.className = state.siteView === "list" ? "site-source-grid list" : "site-source-grid";
  for (const site of sites) {
    elements.siteSourceList.append(createSiteCard(site));
  }
}

function createSiteCard(site) {
  const assigned = getAssignedTargetForSite(site);
  const card = document.createElement("article");
  card.className = assigned ? "site-card assigned" : "site-card";
  card.draggable = true;
  card.dataset.siteId = site.id;

  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", site.id);
  });

  const thumbnail = createSiteThumbnail(site.host || site.rulePattern);
  const body = document.createElement("div");
  body.className = "site-card-body";

  const title = document.createElement("strong");
  setTruncatedText(title, site.host, SITE_TITLE_LIMIT);
  const domain = document.createElement("span");
  domain.className = "rule-meta";
  setTruncatedText(domain, `domain / ${site.rulePattern}`, SITE_META_LIMIT);
  const count = createRulePill(`${site.bookmarkCount} 件`);
  const target = document.createElement("span");
  target.className = "rule-meta";
  setTruncatedText(target, assigned
    ? `現在: ${assigned.parentFolder} / ${assigned.targetFolder}`
    : `推定: ${site.inferredParentFolder} / ${site.inferredTargetFolder}`, SITE_META_LIMIT);
  const meta = document.createElement("div");
  meta.className = "site-card-meta";
  meta.append(count, target);

  const samples = document.createElement("ul");
  samples.className = "site-samples";
  for (const sample of site.sampleTitles.slice(0, 3)) {
    const item = document.createElement("li");
    setTruncatedText(item, sample, SITE_SAMPLE_LIMIT);
    samples.append(item);
  }

  body.append(title, domain, meta, samples);
  card.append(thumbnail, body);
  return card;
}

function assignSiteToCategory(siteId, category) {
  const site = state.sites.find((item) => item.id === siteId);
  if (!site) {
    setStatus("サイトを取得できませんでした。");
    return;
  }

  const existingIndex = findDomainRuleIndex(site.rulePattern);
  if (existingIndex >= 0) {
    const existing = state.rules[existingIndex];
    state.rules[existingIndex] = {
      ...existing,
      parentFolder: category.parentFolder,
      targetFolder: category.targetFolder,
      targetIcon: category.targetIcon,
      reason: `${site.rulePattern} ドメイン`
    };
    setStatus(`${site.rulePattern} の既存ルールを ${category.parentFolder} / ${category.targetFolder} へ更新しました。保存すると反映されます。`);
  } else {
    const rule = createRuleFromUrl(
      {
        url: `https://${site.rulePattern}/`,
        parentFolder: category.parentFolder,
        targetFolder: category.targetFolder,
        targetIcon: category.targetIcon,
        axis: "purpose",
        priority: 88,
        name: site.host,
        reason: `${site.rulePattern} ドメイン`
      },
      state.rules
    );
    state.rules = [...state.rules, rule];
    setStatus(`${site.rulePattern} のルールを ${category.parentFolder} / ${category.targetFolder} へ追加しました。保存すると反映されます。`);
  }

  syncEditor();
  renderAll();
}

function getFilteredSites() {
  const filter = state.siteFilter;
  return [...state.sites]
    .sort((a, b) => b.bookmarkCount - a.bookmarkCount || a.host.localeCompare(b.host))
    .filter((site) => !state.hideAssignedSites || !getAssignedTargetForSite(site))
    .filter((site) => {
      if (!filter) {
        return true;
      }
      return [
        site.host,
        site.domain,
        site.rulePattern,
        site.inferredParentFolder,
        site.inferredTargetFolder,
        ...(site.sampleTitles || [])
      ].join(" ").toLowerCase().includes(filter);
    });
}

function countCategoryRules(category) {
  return state.rules.filter((rule) =>
    rule.type !== "category" &&
    rule.parentFolder === category.parentFolder &&
    rule.targetFolder === category.targetFolder
  ).length;
}

function getAssignedTargetForSite(site) {
  const rule = getDomainRuleForSite(site);
  return rule
    ? {
      parentFolder: rule.parentFolder,
      targetFolder: rule.targetFolder,
      targetIcon: rule.targetIcon,
      axis: rule.axis
    }
    : null;
}

function getDomainRuleForSite(site) {
  const pattern = normalizeDomainPattern(site.rulePattern);
  return state.rules
    .filter((item) =>
      item.type === "domain" &&
      normalizeDomainPattern(item.pattern) === pattern
    )
    .sort((a, b) => {
      if (a.axis === "purpose" && b.axis !== "purpose") {
        return -1;
      }
      if (a.axis !== "purpose" && b.axis === "purpose") {
        return 1;
      }
      return b.priority - a.priority;
    })[0] || null;
}

function findDomainRuleIndex(pattern) {
  return state.rules.findIndex((rule) =>
    rule.type === "domain" &&
    rule.axis === "purpose" &&
    normalizeDomainPattern(rule.pattern) === normalizeDomainPattern(pattern)
  );
}

function renderRuleCards() {
  elements.ruleCards.textContent = "";
  if (state.rules.length === 0) {
    elements.ruleCards.className = "rule-grid empty";
    elements.ruleCards.textContent = "分類ルールはありません。";
    return;
  }

  const renderer = RULE_VIEW_RENDERERS[state.ruleView] || RULE_VIEW_RENDERERS.group;
  renderer();
}

function renderFlatRules(view) {
  elements.ruleCards.className = state.ruleView === "list" ? "rule-grid list" : "rule-grid";
  const sorted = state.rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) =>
      a.rule.parentFolder.localeCompare(b.rule.parentFolder) ||
      a.rule.targetFolder.localeCompare(b.rule.targetFolder) ||
      b.rule.priority - a.rule.priority ||
      a.rule.name.localeCompare(b.rule.name)
    );

  for (const item of sorted) {
    elements.ruleCards.append(createRuleCard(item.rule, item.index, state.ruleView));
  }
}

function renderGroupedRules() {
  elements.ruleCards.className = "rule-groups";
  for (const group of groupRules(state.rules)) {
    const section = document.createElement("section");
    section.className = "rule-group";

    const header = document.createElement("div");
    header.className = "rule-group-header";
    const title = document.createElement("h2");
    const icon = createIconElement(group.targetIcon);
    title.append(icon, ` ${group.parentFolder} / ${group.targetFolder}`);
    header.append(title, createStatPill(`${group.rules.length} 件`));

    const grid = document.createElement("div");
    grid.className = "rule-group-grid";
    for (const item of group.rules) {
      grid.append(createRuleCard(item.rule, item.index, "grid"));
    }

    section.append(header, grid);
    elements.ruleCards.append(section);
  }
}

function renderCandidates(payload = null) {
  elements.addAllCandidatesButton.disabled = state.candidates.length === 0;

  if (payload) {
    elements.candidateSummary.textContent =
      `${payload.bookmarkCount} 件 / ${payload.domainCount} ドメイン / ` +
      `主要 ${payload.commonRuleCount || 0} 件 / 候補 ${state.candidates.length} 件`;
  } else if (state.candidates.length === 0) {
    elements.candidateSummary.textContent = "候補はまだありません。";
  }

  elements.candidateList.textContent = "";
  if (state.candidates.length === 0) {
    elements.candidateList.className = "rule-grid empty";
    elements.candidateList.textContent = "候補を作成するとここに表示されます。";
    return;
  }

  elements.candidateList.className = "rule-grid";
  state.candidates.forEach((candidate, index) => {
    const summary = state.candidateSummaries[index];
    elements.candidateList.append(createCandidateCard(candidate, summary, index));
  });
}

function createRuleCard(rule, index, view = "grid") {
  const card = document.createElement("article");
  card.className = view === "list" ? "rule-card list-item" : "rule-card";

  const header = document.createElement("div");
  header.className = "rule-card-header";
  const icon = createIconElement(rule.targetIcon);
  const title = document.createElement("div");
  title.className = "rule-title";
  const strong = document.createElement("strong");
  strong.textContent = rule.name;
  const path = document.createElement("span");
  path.className = "rule-meta";
  path.textContent = `${rule.parentFolder} / ${rule.targetFolder}`;
  title.append(strong, path);
  const priority = createRulePill(`優先度 ${rule.priority}`);
  header.append(icon, title, priority);

  const pattern = document.createElement("div");
  pattern.className = "rule-meta";
  pattern.textContent = `${rule.type} / ${rule.pattern}`;

  const reason = document.createElement("div");
  reason.className = "rule-meta";
  reason.textContent = rule.reason || "理由なし";

  const actions = document.createElement("div");
  actions.className = "rule-card-actions";
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-rule-button";
  deleteButton.type = "button";
  deleteButton.textContent = "削除";
  deleteButton.addEventListener("click", () => removeRule(index));
  actions.append(deleteButton);

  card.append(header, pattern, reason, actions);
  return card;
}

function createCandidateCard(candidate, summary, index) {
  const card = document.createElement("article");
  card.className = "rule-card";

  const header = document.createElement("div");
  header.className = "rule-card-header";
  const icon = candidate.type === "domain"
    ? createSiteThumbnail(candidate.pattern)
    : createIconElement(candidate.targetIcon);
  const title = document.createElement("div");
  title.className = "rule-title";
  const strong = document.createElement("strong");
  strong.textContent = candidate.name;
  const path = document.createElement("span");
  path.className = "rule-meta";
  path.textContent = `${candidate.parentFolder} / ${candidate.targetFolder}`;
  title.append(strong, path);
  header.append(icon, title, createRulePill(`${summary?.bookmarkCount || 0} 件`));

  const pattern = document.createElement("div");
  pattern.className = "rule-meta";
  pattern.textContent = `domain / ${candidate.pattern}`;

  const reason = document.createElement("div");
  reason.className = "rule-meta";
  reason.textContent = `${summary?.sourceLabel || "候補"}: ${candidate.reason}`;

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "追加";
  addButton.addEventListener("click", () => addCandidate(index));

  card.append(header, pattern, reason, addButton);
  return card;
}

function populateCategoryControls() {
  const previousParent = elements.parentFolderSelect.value;
  const previousTarget = elements.targetFolderSelect.value;
  const categories = getAvailableCategoryOptions();
  const parents = [...new Set(categories.map((category) => category.parentFolder))].sort();

  replaceOptions(elements.parentFolderSelect, [
    ...parents.map((parent) => ({ value: parent, label: parent })),
    { value: NEW_VALUE, label: "新規作成..." }
  ]);

  if (parents.includes(previousParent) || previousParent === NEW_VALUE) {
    elements.parentFolderSelect.value = previousParent;
  } else {
    elements.parentFolderSelect.value = parents[0] || NEW_VALUE;
  }

  populateTargetOptions(previousTarget);
  handleParentChange({ preserveTarget: true });
}

function populateTargetOptions(preferredTarget = "") {
  const parent = elements.parentFolderSelect.value;
  const categories = getAvailableCategoryOptions().filter((category) => category.parentFolder === parent);
  replaceOptions(elements.targetFolderSelect, [
    ...categories.map((category) => ({ value: category.targetFolder, label: category.targetFolder })),
    { value: NEW_VALUE, label: "新規作成..." }
  ]);

  if (categories.some((category) => category.targetFolder === preferredTarget)) {
    elements.targetFolderSelect.value = preferredTarget;
  } else {
    elements.targetFolderSelect.value = categories[0]?.targetFolder || NEW_VALUE;
  }
  syncIconToSelectedTarget();
}

function populateIconOptions() {
  const current = elements.targetIconSelect.value;
  replaceOptions(elements.targetIconSelect, [
    ...ICON_OPTIONS.map((icon) => ({ value: icon.value, label: `${icon.glyph} ${icon.label}` })),
    { value: CUSTOM_ICON_VALUE, label: "カスタム..." }
  ]);

  if (ICON_OPTIONS.some((icon) => icon.value === current) || current === CUSTOM_ICON_VALUE) {
    elements.targetIconSelect.value = current;
  } else {
    elements.targetIconSelect.value = "folder";
  }
  handleIconChange();
}

function handleParentChange(options = {}) {
  const isNew = elements.parentFolderSelect.value === NEW_VALUE;
  elements.newParentFolderLabel.hidden = !isNew;
  elements.newParentFolderInput.disabled = !isNew;
  if (!options.preserveTarget) {
    populateTargetOptions();
  }
  handleTargetChange();
}

function handleTargetChange() {
  const isNew = elements.targetFolderSelect.value === NEW_VALUE;
  elements.newTargetFolderLabel.hidden = !isNew;
  elements.newTargetFolderInput.disabled = !isNew;
  syncIconToSelectedTarget();
}

function handleIconChange() {
  const isCustom = elements.targetIconSelect.value === CUSTOM_ICON_VALUE;
  elements.customIconLabel.hidden = !isCustom;
  elements.customIconInput.disabled = !isCustom;
}

function syncIconToSelectedTarget() {
  const selected = getAvailableCategoryOptions().find(
    (category) =>
      category.parentFolder === elements.parentFolderSelect.value &&
      category.targetFolder === elements.targetFolderSelect.value
  );
  if (selected?.targetIcon && elements.targetIconSelect.value !== CUSTOM_ICON_VALUE) {
    elements.targetIconSelect.value = selected.targetIcon;
  }
  handleIconChange();
}

function getSelectedTarget() {
  const parentFolder = elements.parentFolderSelect.value === NEW_VALUE
    ? elements.newParentFolderInput.value.trim()
    : elements.parentFolderSelect.value;
  const targetFolder = elements.targetFolderSelect.value === NEW_VALUE
    ? elements.newTargetFolderInput.value.trim()
    : elements.targetFolderSelect.value;
  const targetIcon = elements.targetIconSelect.value === CUSTOM_ICON_VALUE
    ? elements.customIconInput.value.trim()
    : elements.targetIconSelect.value;

  if (!parentFolder) {
    throw new Error("大項目を入力してください。");
  }
  if (!targetFolder) {
    throw new Error("中項目を入力してください。");
  }
  if (!targetIcon) {
    throw new Error("アイコンを選択または入力してください。");
  }

  return { parentFolder, targetFolder, targetIcon };
}

function selectCategory(parentFolder, targetFolder, targetIcon) {
  populateCategoryControls();
  if ([...elements.parentFolderSelect.options].some((option) => option.value === parentFolder)) {
    elements.parentFolderSelect.value = parentFolder;
  }
  populateTargetOptions(targetFolder);
  if ([...elements.targetFolderSelect.options].some((option) => option.value === targetFolder)) {
    elements.targetFolderSelect.value = targetFolder;
  }
  setIconInputValue(targetIcon);
  handleParentChange({ preserveTarget: true });
  handleTargetChange();
}

function editCategory(category) {
  state.editingCategoryKey = createCategoryKey(category);
  populateCategoryControls();
  elements.parentFolderSelect.value = NEW_VALUE;
  handleParentChange();
  elements.newParentFolderInput.value = category.parentFolder;
  elements.targetFolderSelect.value = NEW_VALUE;
  handleTargetChange();
  elements.newTargetFolderInput.value = category.targetFolder;
  setIconInputValue(category.targetIcon);
  elements.urlInput.value = "";
  elements.ruleNameInput.value = category.name || "";
  elements.reasonInput.value = category.reason || "";
  elements.axisSelect.value = category.axis || "purpose";
  elements.priorityInput.value = category.priority || 85;
  elements.addRuleButton.textContent = "分類先を更新";
  renderDetectedDomain();
  setStatus(`${category.parentFolder} / ${category.targetFolder} を編集中です。`);
}

function deleteCategory(category) {
  const affected = state.rules.filter((rule) =>
    rule.parentFolder === category.parentFolder &&
    rule.targetFolder === category.targetFolder
  ).length;
  const ok = globalThis.confirm(
    `${category.parentFolder} / ${category.targetFolder} と関連ルール ${affected} 件を削除します。実行しますか？`
  );
  if (!ok) {
    return;
  }

  const key = createCategoryKey(category);
  state.rules = state.rules.filter((rule) => createCategoryKey(rule) !== key);
  if (state.editingCategoryKey === key) {
    state.editingCategoryKey = null;
  }
  clearForm();
  syncEditor();
  renderAll();
  setStatus(`${category.parentFolder} / ${category.targetFolder} を削除しました。保存すると反映されます。`);
}

function updateCategoryFromForm(target) {
  const oldKey = state.editingCategoryKey;
  const oldCategory = getManagedCategoryOptions().find((category) => createCategoryKey(category) === oldKey);
  if (!oldCategory) {
    state.rules = [...state.rules, createCategoryDefinitionRule(target, state.rules)];
    clearForm();
    return;
  }

  let updatedCategoryRule = false;
  state.rules = state.rules.map((rule) => {
    if (createCategoryKey(rule) !== oldKey) {
      return rule;
    }

    const updated = {
      ...rule,
      parentFolder: target.parentFolder,
      targetFolder: target.targetFolder,
      targetIcon: target.targetIcon
    };

    if (rule.type === "category") {
      updatedCategoryRule = true;
      return {
        ...updated,
        name: elements.ruleNameInput.value.trim() || target.targetFolder,
        axis: elements.axisSelect.value,
        priority: Number(elements.priorityInput.value),
        pattern: createCategoryPattern(target.parentFolder, target.targetFolder),
        reason: elements.reasonInput.value.trim() || `${target.parentFolder} / ${target.targetFolder} 分類先`
      };
    }

    return updated;
  });

  if (!updatedCategoryRule) {
    state.rules = [...state.rules, createCategoryDefinitionRule(target, state.rules)];
  }

  clearForm();
}

function setIconInputValue(targetIcon) {
  if ([...elements.targetIconSelect.options].some((option) => option.value === targetIcon)) {
    elements.targetIconSelect.value = targetIcon;
  } else {
    elements.targetIconSelect.value = CUSTOM_ICON_VALUE;
    elements.customIconInput.value = targetIcon || "";
  }
  handleIconChange();
}

function groupRules(rules) {
  const groups = new Map();
  rules.forEach((rule, index) => {
    const key = `${rule.parentFolder}::${rule.targetFolder}`;
    if (!groups.has(key)) {
      groups.set(key, {
        parentFolder: rule.parentFolder,
        targetFolder: rule.targetFolder,
        targetIcon: rule.targetIcon,
        rules: []
      });
    }
    groups.get(key).rules.push({ rule, index });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rules: group.rules.sort((a, b) => b.rule.priority - a.rule.priority || a.rule.name.localeCompare(b.rule.name))
    }))
    .sort((a, b) => a.parentFolder.localeCompare(b.parentFolder) || a.targetFolder.localeCompare(b.targetFolder));
}

function getAvailableCategoryOptions() {
  return mergeCategoryOptions([
    ...createCategoryOptionsFromRules(state.rules),
    ...createCategoryOptionsFromRules(state.candidates)
  ]);
}

function createCategoryOptionsFromRules(rules) {
  const categories = new Map();
  for (const rule of sanitizeRules(rules, { mergeDefaults: false })) {
    const key = createCategoryKey(rule);
    const option = {
      parentFolder: rule.parentFolder,
      targetFolder: rule.targetFolder,
      targetIcon: rule.targetIcon,
      name: rule.name,
      axis: rule.axis,
      priority: rule.priority,
      reason: rule.reason,
      sourceType: rule.type
    };
    const current = categories.get(key);
    if (
      !current ||
      rule.type === "category" ||
      (current.sourceType !== "category" && rule.priority > current.priority)
    ) {
      categories.set(key, option);
    }
  }

  return [...categories.values()];
}

function mergeCategoryOptions(categories) {
  const merged = new Map();
  for (const category of categories) {
    if (!category?.parentFolder || !category?.targetFolder) {
      continue;
    }
    const key = `${category.parentFolder}::${category.targetFolder}`;
    if (!merged.has(key)) {
      merged.set(key, {
        parentFolder: category.parentFolder,
        targetFolder: category.targetFolder,
        targetIcon: category.targetIcon || "folder",
        name: category.name,
        axis: category.axis,
        priority: category.priority,
        reason: category.reason,
        sourceType: category.sourceType
      });
    }
  }

  return [...merged.values()].sort(
    (a, b) => a.parentFolder.localeCompare(b.parentFolder) || a.targetFolder.localeCompare(b.targetFolder)
  );
}

function getManagedCategoryOptions() {
  const categories = new Map();
  for (const [index, rawRule] of state.rules.entries()) {
    const [rule] = sanitizeRules([rawRule], { mergeDefaults: false });
    if (!rule) {
      continue;
    }
    const key = createCategoryKey(rule);
    const current = categories.get(key) || {
      parentFolder: rule.parentFolder,
      targetFolder: rule.targetFolder,
      targetIcon: rule.targetIcon,
      name: rule.name,
      axis: rule.axis,
      priority: rule.priority,
      reason: rule.reason,
      sourceType: rule.type,
      categoryRuleIndex: -1,
      assignedRuleCount: 0,
      ruleIndices: []
    };

    current.ruleIndices.push(index);
    if (rule.type === "category") {
      current.categoryRuleIndex = index;
      current.targetIcon = rule.targetIcon;
      current.name = rule.name;
      current.axis = rule.axis;
      current.priority = rule.priority;
      current.reason = rule.reason;
      current.sourceType = "category";
    } else {
      current.assignedRuleCount += 1;
      if (current.sourceType !== "category" && rule.priority > current.priority) {
        current.targetIcon = rule.targetIcon;
        current.name = rule.name;
        current.axis = rule.axis;
        current.priority = rule.priority;
        current.reason = rule.reason;
        current.sourceType = rule.type;
      }
    }

    categories.set(key, current);
  }

  return [...categories.values()].sort(
    (a, b) => a.parentFolder.localeCompare(b.parentFolder) || a.targetFolder.localeCompare(b.targetFolder)
  );
}

function createCategoryDefinitionRule(target, existingRules) {
  const parentFolder = target.parentFolder.trim();
  const targetFolder = target.targetFolder.trim();
  const rule = {
    id: uniqueRuleId(`category-${slugify(parentFolder)}-${slugify(targetFolder)}`, existingRules),
    type: "category",
    axis: elements.axisSelect.value,
    priority: Number(elements.priorityInput.value),
    pattern: createCategoryPattern(parentFolder, targetFolder),
    parentFolder,
    targetFolder,
    targetIcon: target.targetIcon,
    name: elements.ruleNameInput.value.trim() || targetFolder,
    reason: elements.reasonInput.value.trim() || `${parentFolder} / ${targetFolder} 分類先`
  };
  const [sanitized] = sanitizeRules([rule], { mergeDefaults: false });
  if (!sanitized) {
    throw new Error("分類先ルールが無効です。");
  }
  return sanitized;
}

function createCategoryPattern(parentFolder, targetFolder) {
  return `category:${parentFolder}/${targetFolder}`;
}

function createCategoryKey(category) {
  return `${category?.parentFolder || ""}::${category?.targetFolder || ""}`;
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

function renderDetectedDomain() {
  const domain = getDomain(elements.urlInput.value);
  elements.detectedDomain.textContent = domain ? `認識ドメイン: ${domain}` : "ドメイン未検出";
}

function clearForm() {
  state.editingCategoryKey = null;
  elements.urlInput.value = "";
  elements.ruleNameInput.value = "";
  elements.reasonInput.value = "";
  elements.addRuleButton.textContent = "分類先を追加";
  renderDetectedDomain();
}

function syncEditor() {
  state.rules = sanitizeRules(state.rules, { mergeDefaults: false });
  elements.editor.value = JSON.stringify(state.rules, null, 2);
}

function parseEditorRules() {
  const rules = JSON.parse(elements.editor.value);
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

  return sanitizeRules(rules, { mergeDefaults: false });
}

function materializeCandidateRule(candidate, existingRules) {
  if (candidate.type === "domain") {
    const rule = createRuleFromUrl(
      {
        url: `https://${candidate.pattern}/`,
        parentFolder: candidate.parentFolder,
        targetFolder: candidate.targetFolder,
        targetIcon: candidate.targetIcon,
        axis: candidate.axis,
        priority: candidate.priority,
        name: candidate.name,
        reason: candidate.reason
      },
      existingRules
    );
    return { ...rule, id: uniqueRuleId(candidate.id || rule.id, existingRules) };
  }

  const [rule] = sanitizeRules([candidate], { mergeDefaults: false });
  if (!rule) {
    throw new Error("候補ルールが無効です。");
  }
  if (hasEquivalentRule(existingRules, rule)) {
    throw new Error("同じ候補ルールは既に存在します。");
  }
  return { ...rule, id: uniqueRuleId(rule.id, existingRules) };
}

function getSelectedCandidateAxes() {
  const axes = elements.candidateAxisInputs
    .filter((input) => input.checked)
    .map((input) => input.value);
  if (axes.length > 0) {
    return axes;
  }
  return ["purpose"];
}

function hasEquivalentRule(rules, candidate) {
  const key = createRuleMatchKey(candidate);
  return (Array.isArray(rules) ? rules : []).some((rule) => createRuleMatchKey(rule) === key);
}

function createRuleMatchKey(rule) {
  return [
    rule?.type,
    rule?.axis,
    normalizeDomainPattern(rule?.pattern || "")
  ].join("::");
}

function uniqueRuleId(baseId, rules) {
  const used = new Set((Array.isArray(rules) ? rules : []).map((rule) => rule?.id).filter(Boolean));
  const base = String(baseId || "rule");
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function createIconElement(iconValue) {
  const icon = document.createElement("span");
  icon.className = "category-icon";
  if (isImageIcon(iconValue)) {
    icon.classList.add("image");
    icon.style.backgroundImage = `url("${String(iconValue).replace(/"/g, "%22")}")`;
    icon.textContent = "";
  } else {
    icon.textContent = getIconGlyph(iconValue);
  }
  icon.title = iconValue || "folder";
  return icon;
}

function createSiteThumbnail(value) {
  const host = getThumbnailHost(value);
  const thumbnail = document.createElement("span");
  thumbnail.className = "site-thumbnail";
  thumbnail.title = host;
  thumbnail.style.setProperty("--thumbnail-hue", `${hashString(host) % 360}deg`);

  const fallback = document.createElement("span");
  fallback.className = "site-thumbnail-fallback";
  fallback.textContent = getSiteInitials(host);

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.src = buildFaviconUrl(host);
  image.addEventListener("load", () => thumbnail.classList.add("has-image"));
  image.addEventListener("error", () => {
    image.remove();
    thumbnail.classList.add("fallback-only");
  });

  thumbnail.append(fallback, image);
  return thumbnail;
}

function getThumbnailHost(value) {
  const normalized = normalizeDomainPattern(value || "");
  if (normalized) {
    return normalized;
  }
  try {
    return normalizeDomainPattern(new URL(value).hostname);
  } catch {
    return String(value || "site").trim() || "site";
  }
}

function buildFaviconUrl(host) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

function getSiteInitials(host) {
  const normalized = normalizeDomainPattern(host);
  const parts = normalized.split(".").filter((part) => part && part !== "www");
  const source = (parts[0] || normalized || host || "site").replace(/[^a-z0-9]/gi, "");
  return (source.slice(0, 2) || "?").toUpperCase();
}

function hashString(value) {
  return [...String(value || "")].reduce((hash, char) =>
    ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function isImageIcon(iconValue) {
  return /^(https?:\/\/|data:image\/)/i.test(String(iconValue || "").trim());
}

function getIconGlyph(iconValue) {
  const known = ICON_OPTIONS.find((icon) => icon.value === iconValue);
  if (known) {
    return known.glyph;
  }
  return String(iconValue || "DIR").slice(0, 4).toUpperCase();
}

function normalizeDomainPattern(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function createStatPill(text) {
  const pill = document.createElement("span");
  pill.className = "stat-pill";
  pill.textContent = text;
  return pill;
}

function createRulePill(text) {
  const pill = document.createElement("span");
  pill.className = "rule-pill";
  pill.textContent = text;
  return pill;
}

function setTruncatedText(element, value, maxLength) {
  const fullText = String(value || "");
  const text = truncateText(fullText, maxLength);
  element.textContent = text;
  if (text !== fullText) {
    element.title = fullText;
  }
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
}

function replaceOptions(select, options) {
  select.textContent = "";
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
}

function setStatus(message) {
  elements.statusLog.textContent = message;
}

function getModeLabel(mode) {
  return MODE_CONFIG[mode]?.label || "分類ルール";
}

function getViewLabel(view) {
  return VIEW_LABELS[view] || "一覧";
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "拡張機能から応答がありません。");
  }
  return response.payload;
}
