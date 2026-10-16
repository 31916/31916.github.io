"use strict";

(() => {
  const languages = ["ja", "en", "de"];
  const storageKey = "31916-language";
  const selector = document.getElementById("site-language");
  if (!selector) return;
  const normalize = (value) => value.replace(/\s+/g, " ").trim();
  const records = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (
      node.parentElement.closest(
        "script, style, noscript, [data-no-translate], [data-i18n-dynamic], [data-year]",
      )
    )
      continue;
    const source = normalize(node.textContent);
    if (source)
      records.push({
        node,
        source,
        prefix: node.textContent.match(/^\s*/)[0],
        suffix: node.textContent.match(/\s*$/)[0],
      });
  }
  const attributes = [];
  for (const name of ["alt", "title", "aria-label"]) {
    document.querySelectorAll(`[${name}]`).forEach((node) => {
      if (!node.closest("[data-no-translate]"))
        attributes.push({
          node,
          name,
          source: normalize(node.getAttribute(name)),
        });
    });
  }
  document
    .querySelectorAll(
      'meta[name="description"], meta[property="og:description"], meta[property="og:title"]',
    )
    .forEach((node) => {
      attributes.push({
        node,
        name: "content",
        source: normalize(node.content),
      });
    });
  const title = document.title;
  const links = [...document.querySelectorAll("a[href]")].map((node) => ({
    node,
    source: node.getAttribute("href"),
  }));
  const portfolioPaths = new Set([
    "/",
    "/projects/",
    "/resume/",
    "/about/",
    "/play/",
    "/404.html",
  ]);
  const socialImages = [
    ...document.querySelectorAll(
      'img[src="/IMELayoutRouter/social-ja-v2.png"]',
    ),
  ];
  let translations;
  let language = "ja";

  function readPreference() {
    const requested = new URL(location.href).searchParams.get("lang");
    if (languages.includes(requested)) return requested;
    try {
      const saved = localStorage.getItem(storageKey);
      if (languages.includes(saved)) return saved;
    } catch {
      /* Storage may be disabled; URL selection still works. */
    }
    return "ja";
  }

  function translate(source) {
    return translations?.[language]?.[source] ?? source;
  }

  function applyLanguage(next, remember = false) {
    if (!languages.includes(next)) return;
    language = next;
    document.documentElement.lang = language;
    document.title = translate(title);
    records.forEach(({ node, source, prefix, suffix }) => {
      node.textContent = prefix + translate(source) + suffix;
    });
    attributes.forEach(({ node, name, source }) =>
      node.setAttribute(name, translate(source)),
    );
    links.forEach(({ node, source }) => {
      if (source.startsWith("#")) return;
      const url = new URL(source, location.href);
      if (url.origin !== location.origin) return;
      if (portfolioPaths.has(url.pathname)) {
        url.searchParams.set("lang", language);
        node.setAttribute("href", url.pathname + url.search + url.hash);
      } else if (source === "/IMELayoutRouter/") {
        node.setAttribute(
          "href",
          language === "ja" ? source : "/IMELayoutRouter/en.html",
        );
      }
    });
    socialImages.forEach((image) => {
      image.src = `/IMELayoutRouter/social-${language === "ja" ? "ja" : "en"}-v2.png`;
    });
    selector.value = language;
    selector.closest(".language-picker").hidden = false;
    if (remember) {
      try {
        localStorage.setItem(storageKey, language);
      } catch {
        /* Optional persistence. */
      }
      const url = new URL(location.href);
      url.searchParams.set("lang", language);
      history.replaceState(history.state, "", url);
    }
    document.dispatchEvent(
      new CustomEvent("portfolio:languagechange", { detail: { language } }),
    );
  }

  window.portfolioI18n = {
    get language() {
      return language;
    },
    t: translate,
    formatCount: (count) =>
      translate("{count}件の制作物を表示").replace("{count}", String(count)),
  };

  fetch("/assets/translations.json?v=20261017b")
    .then((response) => {
      if (!response.ok) throw new Error("Translations unavailable");
      return response.json();
    })
    .then((messages) => {
      translations = messages;
      selector.addEventListener("change", () =>
        applyLanguage(selector.value, true),
      );
      window.addEventListener("popstate", () =>
        applyLanguage(readPreference()),
      );
      applyLanguage(readPreference());
    })
    .catch(() => {
      /* Keep the complete Japanese HTML if translation loading fails. */
    });
})();
