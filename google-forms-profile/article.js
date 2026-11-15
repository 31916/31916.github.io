"use strict";

(() => {
  const button = document.querySelector("[data-copy-code]");
  const code = document.getElementById("sample-code");
  const status = document.getElementById("copy-status");
  if (!button || !code || !status) return;

  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "";
    try {
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = "サンプルコードをコピーしました。";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "コードを選択しました。コピーするか、ダウンロードをご利用ください。";
    } finally {
      button.disabled = false;
    }
  });
})();
