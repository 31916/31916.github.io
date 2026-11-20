import { initializeLanguage, getLanguage, translate } from './language.js';

const sectionInfo = {
  projects: { title: '制作物', path: '/projects/', size: .31, color: '#cbbc99' },
  resume: { title: '履歴書', path: '/resume/', size: .29, color: '#a5b6ce' },
  hobbies: { title: '趣味', path: '/hobbies/', size: .28, color: '#b28d8e' },
  contact: { title: 'コンタクト', path: '/', size: .27, color: '#b1bca7' },
};
Object.values(sectionInfo).forEach((section, index) => { section.phase = 1.25 + index * Math.PI / 2; });
const canvas = document.querySelector('#universe');
const simpleLink = document.querySelector('#simple-view');
const dialog = document.querySelector('.content-panel');
const frame = document.querySelector('#content-frame');
const introCopy = document.querySelector('#intro-copy');
const panelBody = document.querySelector('.panel-body');
const fullPageLink = document.querySelector('.full-page-link');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selected = null, entered = false;
let lastTrigger = null;
let universe;

function sectionURL(id) {
  const info = sectionInfo[id];
  return info.path + '?lang=' + getLanguage();
}
function refreshPanel(reload = false) {
  if (!selected) return;
  const introduction = selected === 'introduction';
  introCopy.hidden = !introduction;
  panelBody.hidden = introduction;
  fullPageLink.hidden = introduction;
  dialog.classList.toggle('introduction-panel', introduction);
  if (introduction) {
    document.querySelector('#panel-title').textContent = translate('自己紹介');
    return;
  }
  const info = sectionInfo[selected], url = sectionURL(selected);
  document.querySelector('#panel-title').textContent = translate(info.title);
  document.querySelector('.full-page-link').href = url + (selected === 'contact' ? '#contact' : '');
  frame.title = translate(info.title);
  if (reload) { frame.classList.remove('loaded'); frame.src = url; }
}
function openSection(id, trigger) {
  if (!entered || dialog.open) return;
  selected = id; lastTrigger = trigger;
  universe?.resetView();
  document.querySelector('.panel-loading').hidden = false;
  document.querySelector('.panel-loading').textContent = translate('読み込んでいます。');
  refreshPanel(true);
  document.body.classList.add('panel-open');
  dialog.showModal();
}
for (const button of document.querySelectorAll('[data-section]')) {
  button.addEventListener('click', () => openSection(button.dataset.section, button));
}
document.querySelector('#open-introduction').addEventListener('click', event => openSection('introduction', event.currentTarget));
function closeSection() {
  dialog.close();
  selected = null;
  document.body.classList.remove('panel-open');
  lastTrigger?.focus({ preventScroll: true });
}
document.querySelector('.close-panel').addEventListener('click', closeSection);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeSection();
});
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeSection();
});

const frameStyles = `
  :root { color-scheme: dark; --paper: #0b121c; --ink: #f4f0dd; --muted: #a9bcb9; --sand: #1c2b3c; --mist: #24384b; --accent: #b7d3cb; --line: #91a6bc35; --sans: 'Noto Sans JP', 'Yu Gothic', sans-serif; background: transparent !important; }
  html { background: transparent !important; font-size: 16px !important; scrollbar-color: #637c72 transparent; }
  body, body.home-page { background: transparent !important; color: var(--ink) !important; display: block !important; min-height: 0 !important; }
  .site-header, .site-footer, body > .skip-link, main > h1, .home-intro { display: none !important; }
  main.shell, main.home-main, main.resume-page { width: 100% !important; max-width: none !important; padding: 28px !important; margin: 0 !important; }
  a { color: var(--accent); }
  .project-card { background: #b1d4c306 !important; border-color: #99b8aa28 !important; }
  .project-card:hover { background: #b1d4c30e !important; }
  .project-card img { border-radius: 8px; }
  .project-filter, .filter-button, .filter { border-color: #99b8aa38; }
  .resume-content { max-width: none !important; }
  .tech-stack img:is([src='/assets/tech/github.svg'], [src='/assets/tech/linux.svg']) { background: #f4f0dd; border-radius: 4px; padding: 3px; }
  .hobby-section { border-color: var(--line) !important; }
  body.contact-panel-page { display: grid !important; place-items: center; min-height: 100dvh !important; padding: 12px; }
  .contact-panel-page main { display: none !important; }
  .contact-panel-page .site-footer { display: grid !important; width: 100%; margin: 0; padding: 0; border: 0; }
  .contact-panel-page .footer-label { display: none; }
  @media (max-width: 500px) { main.shell, main.home-main, main.resume-page { padding: 22px !important; } }
`;

frame.addEventListener('load', () => {
  try {
    const doc = frame.contentDocument;
    if (!doc?.querySelector('main')) throw new Error('Content is unavailable');
    doc.body.classList.toggle('contact-panel-page', selected === 'contact');
    const style = doc.createElement('style');
    style.textContent = frameStyles;
    doc.head.append(style);
    doc.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        link.target = '_blank'; link.relList.add('noopener', 'noreferrer');
      }
    });
    doc.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeSection(); } });
    frame.classList.add('loaded');
    document.querySelector('.panel-loading').hidden = true;
  } catch {
    document.querySelector('.panel-loading').textContent = translate('パネルを読み込めませんでした。下のリンクからページを開けます。');
  }
});

document.addEventListener('portfolio:languagechange', () => {
  const language = getLanguage();
  simpleLink.href = `/?lang=${language}`;
  document.querySelector('#return-top').href = `/?lang=${language}`;
  refreshPanel(true);
});
function reveal() {
  if (entered) return;
  entered = true;
  document.body.classList.add('scene-visible');
  document.querySelector('#loading-screen').setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    document.querySelector('#loading-screen').remove();
    document.querySelector('.masthead').inert = false;
    document.querySelector('#main').inert = false;
    document.body.classList.add('scene-interactive');
  }, reducedMotion.matches ? 0 : 2200);
}
function showFallback() {
  document.body.classList.add('fallback');
  document.querySelector('#render-status').textContent = translate('この環境では3Dを表示できません。各項目はそのまま開けます。');
}
async function loadUniverse() {
  const [{ createUniverse }] = await Promise.all([import('./universe.js'), initializeLanguage()]);
  universe = await createUniverse({
    canvas, sections: sectionInfo,
    getState: () => ({ paused: reducedMotion.matches, selected, entered, reduced: reducedMotion.matches }),
    onOpen: openSection,
    onTop: () => location.assign(document.querySelector('#return-top').href),
    onFallback: showFallback,
  });
}

const sceneReady = loadUniverse().catch(error => {
  console.error('Orbit scene:', error);
  showFallback();
});
const launchReady = Promise.resolve(window.launchSequenceDone).catch(error => {
  console.error('Launch animation:', error);
});
Promise.all([launchReady, sceneReady]).then(reveal);
