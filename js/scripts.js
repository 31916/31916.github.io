"use strict";

const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty(
      "--header-height",
      `${siteHeader.getBoundingClientRect().height}px`,
    );
  };
  updateHeaderHeight();
  new ResizeObserver(updateHeaderHeight).observe(siteHeader);
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

document.querySelectorAll(".site-header nav a").forEach((link) => {
  if (link.getAttribute("href") === window.location.pathname) {
    link.setAttribute("aria-current", "page");
  }
});

const filters = document.querySelectorAll("[data-filter]");
function updateFilterResult() {
  const result = document.getElementById("filter-result");
  if (!result) return;
  const count = document.querySelectorAll("[data-category]:not([hidden])").length;
  result.textContent =
    window.portfolioI18n?.formatCount(count) ?? `${count}件の制作物を表示`;
}
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const category = button.dataset.filter;
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
    filters.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    updateFilterResult();
  }),
);
document.addEventListener("portfolio:languagechange", updateFilterResult);

const copyEmailButton = document.querySelector("[data-copy-email]");
if (copyEmailButton) {
  const email = document.querySelector(".home-contact-email");
  const status = document.querySelector("[data-copy-status]");
  const copyIcon = copyEmailButton.querySelector("[data-copy-icon]");
  const copiedIcon = copyEmailButton.querySelector("[data-copied-icon]");
  const resetCopyState = () => {
    copyIcon.toggleAttribute("hidden", false);
    copiedIcon.toggleAttribute("hidden", true);
    status.textContent = "";
  };

  copyEmailButton.addEventListener("click", async () => {
    resetCopyState();
    copyEmailButton.disabled = true;
    let message;
    try {
      await navigator.clipboard.writeText(email.textContent.trim());
      copyIcon.toggleAttribute("hidden", true);
      copiedIcon.toggleAttribute("hidden", false);
      message = "メールアドレスをコピーしました";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(email);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message = "コピーできませんでした。メールアドレスを選択しました。";
    } finally {
      copyEmailButton.disabled = false;
    }
    status.textContent = window.portfolioI18n?.translate(message) ?? message;
  });
  document.addEventListener("portfolio:languagechange", resetCopyState);
}
