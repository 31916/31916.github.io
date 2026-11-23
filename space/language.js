const supported = ['ja', 'en', 'de'];
const storageKey = '31916-language';
const additions = {
  en: {
    '簡易版': 'Simple version',
    '自己紹介': 'About me', '自己紹介を開く': 'Open introduction',
    'トップに戻る': 'Return to home',
    '読み込み中': 'Loading',
    '宇宙に戻る': 'Return to space', '戻る': 'Back',
    'ページを別タブで開く': 'Open page in a new tab', '読み込んでいます。': 'Loading.',
    '選択した項目': 'Selected section',
    'ポートフォリオの項目': 'Portfolio sections',
    '制作物を開く': 'Open projects', '履歴書を開く': 'Open resume',
    '趣味を開く': 'Open hobbies', '投稿を開く': 'Open posts',
    'この環境では3Dを表示できません。各項目はそのまま開けます。': '3D is unavailable in this browser. You can still open each section.',
    'パネルを読み込めませんでした。下のリンクからページを開けます。': 'The panel could not load. Use the link below to open the page.',
  },
  de: {
    '簡易版': 'Einfache Version',
    '自己紹介': 'Über mich', '自己紹介を開く': 'Vorstellung öffnen',
    'トップに戻る': 'Zurück zur Startseite',
    '読み込み中': 'Wird geladen',
    '宇宙に戻る': 'Zurück ins All', '戻る': 'Zurück',
    'ページを別タブで開く': 'Seite in einem neuen Tab öffnen', '読み込んでいます。': 'Wird geladen.',
    '選択した項目': 'Ausgewählter Bereich',
    'ポートフォリオの項目': 'Portfolio-Bereiche',
    '制作物を開く': 'Projekte öffnen', '履歴書を開く': 'Lebenslauf öffnen',
    '趣味を開く': 'Hobbys öffnen', '投稿を開く': 'Beiträge öffnen',
    'この環境では3Dを表示できません。各項目はそのまま開けます。': '3D ist in diesem Browser nicht verfügbar. Die einzelnen Bereiche lassen sich weiterhin öffnen.',
    'パネルを読み込めませんでした。下のリンクからページを開けます。': 'Der Bereich konnte nicht geladen werden. Der Link unten öffnet die Seite.',
  },
};
let language = 'ja';
let messages = {};
export const getLanguage = () => language;
export const translate = source => messages[language]?.[source] ?? source;

export async function initializeLanguage() {
  window.portfolioI18n = { translate };
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const records = [];
  const attributes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script, style, select, [data-no-translate], [data-i18n-dynamic], [data-year]')) continue;
    const source = normalize(node.textContent);
    if (source) records.push({ node, source, prefix: node.textContent.match(/^\s*/)[0], suffix: node.textContent.match(/\s*$/)[0] });
  }
  for (const name of ['alt', 'title', 'aria-label']) {
    document.querySelectorAll(`[${name}]`).forEach(node => {
      if (!node.closest('[data-no-translate]')) attributes.push({ node, name, source: normalize(node.getAttribute(name)) });
    });
  }
  try {
    const response = await fetch('/assets/translations.json');
    if (response.ok) messages = await response.json();
  } catch {}
  for (const lang of ['en', 'de']) messages[lang] = { ...messages[lang], ...additions[lang] };
  function apply(next, remember = false) {
    if (!supported.includes(next)) return;
    language = next;
    document.documentElement.lang = next;
    records.forEach(({ node, source, prefix, suffix }) => { node.textContent = prefix + translate(source) + suffix; });
    attributes.forEach(({ node, name, source }) => node.setAttribute(name, translate(source)));
    document.querySelectorAll('[data-language-select]').forEach(selector => { selector.value = next; });
    if (remember) {
      try { localStorage.setItem(storageKey, next); } catch {}
      const url = new URL(location.href);
      url.searchParams.delete('v');
      if (next === 'ja') url.searchParams.delete('lang');
      else url.searchParams.set('lang', next);
      history.replaceState(history.state, '', url);
    }
    document.dispatchEvent(new CustomEvent('portfolio:languagechange', { detail: { language: next } }));
  }
  function preference() {
    const requested = new URL(location.href).searchParams.get('lang');
    if (supported.includes(requested)) return requested;
    try { const saved = localStorage.getItem(storageKey); if (supported.includes(saved)) return saved; } catch {}
    return 'ja';
  }
  document.querySelectorAll('[data-language-select]').forEach(selector => selector.addEventListener('change', event => apply(event.target.value, true)));
  addEventListener('popstate', () => apply(preference()));
  apply(preference());
}
