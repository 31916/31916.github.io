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
filters.forEach((button) =>
  button.addEventListener("click", () => {
    let count = 0;
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.hidden =
        button.dataset.filter !== "all" &&
        card.dataset.category !== button.dataset.filter;
      if (!card.hidden) count += 1;
    });
    filters.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    const result = document.getElementById("filter-result");
    if (result) result.textContent = `${count}件の制作物を表示`;
  }),
);
