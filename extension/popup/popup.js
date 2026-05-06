const statusLog = document.querySelector("#statusLog");

document.querySelector("#openSidePanelButton").addEventListener("click", async () => {
  try {
    await chrome.sidePanel.open({ windowId: chrome.windows?.WINDOW_ID_CURRENT || -2 });
    statusLog.textContent = "Side Panel を開きました。";
  } catch (error) {
    statusLog.textContent = `Side Panel を開けません: ${error.message || String(error)}`;
  }
});

document.querySelector("#openOptionsButton").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
