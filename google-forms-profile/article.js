"use strict";

(() => {
  const contents = document.querySelector(".guide-contents");
  const narrow = window.matchMedia("(max-width: 1100px)");
  const updateContents = () => { if (contents) contents.open = !narrow.matches; };
  updateContents();
  narrow.addEventListener("change", updateContents);
  contents?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => { if (narrow.matches) contents.open = false; });
  });

  const viewer = document.querySelector(".image-viewer");
  if (!viewer || typeof viewer.showModal !== "function") return;
  const image = viewer.querySelector("img");
  const title = viewer.querySelector("#image-viewer-title");
  const zoom = viewer.querySelector("[data-image-zoom]");
  const close = viewer.querySelector("[data-image-close]");
  const original = viewer.querySelector("[data-image-original]");
  const viewport = viewer.querySelector(".image-viewer-content");
  let opener;

  function resetZoom() {
    viewer.classList.remove("is-zoomed");
    zoom.setAttribute("aria-pressed", "false");
    zoom.textContent = "等倍で見る";
    viewport.scrollTo(0, 0);
  }
  document.querySelectorAll(".guide-screenshot a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const preview = link.querySelector("img");
      opener = link;
      image.src = preview.currentSrc || preview.src;
      image.alt = preview.alt;
      title.textContent = preview.alt;
      original.href = link.href;
      resetZoom();
      viewer.showModal();
      document.documentElement.classList.add("image-viewer-open");
      close.focus();
    });
  });
  zoom.addEventListener("click", () => {
    const expanded = viewer.classList.toggle("is-zoomed");
    zoom.setAttribute("aria-pressed", String(expanded));
    zoom.textContent = expanded ? "全体を見る" : "等倍で見る";
    viewport.scrollTo(0, 0);
  });
  close.addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => {
    const rect = viewer.getBoundingClientRect();
    if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) viewer.close();
  });
  viewer.addEventListener("close", () => {
    document.documentElement.classList.remove("image-viewer-open");
    opener?.focus({ preventScroll: true });
  });
})();
