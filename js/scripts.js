"use strict";

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
  const count = [...document.querySelectorAll("[data-category]")].filter(
    (card) => !card.hidden,
  ).length;
  result.textContent =
    window.portfolioI18n?.formatCount(count) ?? `${count}件の制作物を表示`;
}
filters.forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.hidden =
        button.dataset.filter !== "all" &&
        card.dataset.category !== button.dataset.filter;
    });
    filters.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    updateFilterResult();
  }),
);
document.addEventListener("portfolio:languagechange", updateFilterResult);
