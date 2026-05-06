import { DEFAULT_RULES } from "../src/shared/classifier.js";

const editor = document.querySelector("#rulesEditor");
const statusLog = document.querySelector("#statusLog");
const saveButton = document.querySelector("#saveButton");
const resetButton = document.querySelector("#resetButton");

saveButton.addEventListener("click", saveRules);
resetButton.addEventListener("click", resetRules);
loadRules();

async function loadRules() {
  try {
    const rules = await sendMessage({ type: "GET_RULES" });
    editor.value = JSON.stringify(rules, null, 2);
    statusLog.textContent = "ルールを読み込みました。";
  } catch (error) {
    statusLog.textContent = `エラー: ${error.message || String(error)}`;
  }
}

async function saveRules() {
  try {
    const rules = JSON.parse(editor.value);
    await sendMessage({ type: "SAVE_RULES", rules });
    statusLog.textContent = "ルールを保存しました。";
  } catch (error) {
    statusLog.textContent = `保存できません: ${error.message || String(error)}`;
  }
}

function resetRules() {
  editor.value = JSON.stringify(DEFAULT_RULES, null, 2);
  statusLog.textContent = "初期ルールをエディタへ戻しました。保存すると反映されます。";
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "拡張機能から応答がありません。");
  }
  return response.payload;
}
