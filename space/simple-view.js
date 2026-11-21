const labels = { ja: '天王星版', en: 'Uranus version', de: 'Uranus-Version' };
const query = new URLSearchParams(location.search);

if (query.get('view') === 'space') {
  const destination = new URL('/space/', location.origin);
  const language = query.get('lang');
  if (Object.hasOwn(labels, language)) destination.searchParams.set('lang', language);
  destination.hash = location.hash;
  location.replace(destination.href);
} else {
  const link = document.querySelector('.space-view-link');
  function updateLink() {
    const language = document.documentElement.lang;
    link.querySelector('span').textContent = labels[language] ?? labels.ja;
    link.href = '/space/' + (language === 'ja' ? '' : `?lang=${language}`);
  }
  document.addEventListener('portfolio:languagechange', updateLink);
  updateLink();
}
