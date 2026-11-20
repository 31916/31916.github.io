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
  const path = window.location.pathname.startsWith("/google-forms-profile/") ? "/posts/" : window.location.pathname;
  if (link.getAttribute("href") === path) {
    link.setAttribute("aria-current", "page");
  }
});

const filters = document.querySelectorAll("[data-filter]");
function updateFilterResult() {
  const result = document.getElementById("filter-result");
  if (!result) return;
  const count = document.querySelectorAll("[data-category]:not([hidden])").length;
  const posts = Boolean(document.querySelector("[data-post-catalog]"));
  result.textContent = window.portfolioI18n?.formatCount(count, posts) ?? `${count}件の${posts ? "投稿" : "制作物"}を表示`;
  document.querySelectorAll("[data-filter-empty]").forEach((message) => { message.hidden = count > 0; });
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
  const email = document.querySelector("[data-contact-email]");
  const status = document.querySelector("[data-copy-status]");
  const copyIcon = copyEmailButton.querySelector("[data-copy-icon]");
  const copiedIcon = copyEmailButton.querySelector("[data-copied-icon]");
  let copyResetTimer;
  const resetCopyState = () => {
    clearTimeout(copyResetTimer);
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
      message = document.documentElement.lang === "en" ? "Email address copied" : "メールアドレスをコピーしました";
      copyResetTimer = setTimeout(resetCopyState, 6000);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(email);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message = document.documentElement.lang === "en" ? "Could not copy. The email address is selected." : "コピーできませんでした。メールアドレスを選択しました。";
    } finally {
      copyEmailButton.disabled = false;
    }
    status.textContent = window.portfolioI18n?.translate(message) ?? message;
  });
  document.addEventListener("portfolio:languagechange", resetCopyState);
}
