# Harry / 31916

Personal portfolio at **https://31916.ch/**. Plain HTML, CSS, JavaScript and original SVG illustrations; no JavaScript framework or client-side dependencies.

## Pages

- `index.html`: minimal home, selected work, personal introduction and a link to Play.
- `projects/index.html`: project directory with Software / Research filters.
- `about/index.html`: biography, experience, education, research and slides.
- `play/index.html`: a separate visual hobby page with tennis, space, Merry and Switzerland.
- `IMELayoutRouter/`: existing product website and installer distribution.
- `404.html`: missing-page recovery.

Shared portfolio styles are in `css/styles.css`; navigation and project filters are in `js/scripts.js`. Play has its own `css/play.css` and `js/play.js`. Header/footer markup is intentionally static in each page. Update the stylesheet/script version query in each page when changing these files.

The IMELayoutRouter project card uses the existing, uncropped `IMELayoutRouter/social-ja-v2.png` social image and links to `/IMELayoutRouter/`. Product files and downloads remain maintained separately.

## Local preview

Run `python -m http.server 8000` from the repository root, then open `http://localhost:8000`. Use a server because asset paths start at the site root.

## Tennis motion

The inline SVG on `/play/` is an original right-handed silhouette. The `poses` array in `js/play.js` defines a serve from preparation to follow-through. Scroll position controls the interpolation; a range input also supports keyboard operation. Manual input pauses scroll updates, and the pause button can resume them. `prefers-reduced-motion` uses a static impact pose and removes the extra scroll distance. Short viewports also use the unpinned scene with manual controls. Without JavaScript the illustration and all main links remain usable.

## Publishing

Pushes to `main` deploy through `.github/workflows/pages.yml`. `tools/build-pages.py` builds the public archive, including the case-sensitive `IMELayOutRouter` legacy aliases. Add any new top-level public page/directory to `PUBLIC` in that script. Existing installer checksum checks run during deployment.

The pre-redesign site, including the existing product pages and downloads, is preserved at branch `backup/portfolio-before-redesign-2026-09-21` (commit `01b4c4e`).

The version before the minimal home and separate Play page is preserved at `backup/before-minimal-refresh-2026-10-13` (commit `d05f2ce`).

The SVG art in `assets/art/` was drawn for this portfolio. No illustrations from reference websites are included.
