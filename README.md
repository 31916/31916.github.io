# Harry / 31916

Personal portfolio at **https://31916.ch/**. Plain HTML, CSS, JavaScript and original SVG illustrations; no JavaScript framework or client-side dependencies.

## Pages

- `index.html`: home, selected work, personal introduction and tennis scene.
- `projects/index.html`: project directory with Software / Research filters.
- `about/index.html`: biography, experience, education, research and slides.
- `IMELayoutRouter/`: existing product website and installer distribution.
- `404.html`: missing-page recovery.

Shared styles are in `css/styles.css`; behavior is in `js/scripts.js`. Header/footer markup is intentionally static in each page. Update the stylesheet/script version query in each page when changing these shared files.

## Local preview

Run `python -m http.server 8000` from the repository root, then open `http://localhost:8000`. Use a server because asset paths start at the site root.

## Tennis motion

The inline SVG is an original right-handed silhouette. The `poses` array in `js/scripts.js` defines a serve from preparation to follow-through. Scroll position controls the interpolation; a range input also supports keyboard operation. The pause button freezes scroll updates. `prefers-reduced-motion` uses a static impact pose and removes the extra scroll distance. Without JavaScript the illustration and all main links remain usable.

## Publishing

Pushes to `main` deploy through `.github/workflows/pages.yml`. `tools/build-pages.py` builds the public archive, including the case-sensitive `IMELayOutRouter` legacy aliases. Add any new top-level public page/directory to `PUBLIC` in that script. Existing installer checksum checks run during deployment.

The pre-redesign site, including the existing product pages and downloads, is preserved at branch `backup/portfolio-before-redesign-2026-09-21` (commit `01b4c4e`).

The SVG art in `assets/art/` was drawn for this portfolio. No illustrations from reference websites are included.
