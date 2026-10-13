# Harry / 31916

Personal portfolio at **https://31916.ch/**. Plain HTML, CSS, JavaScript and original SVG illustrations; no JavaScript framework or client-side dependencies.

## Pages

- `index.html`: minimal home, selected work, personal introduction and a link to Play.
- `projects/index.html`: project directory with Software / Research filters.
- `resume/index.html`: separate education and work timelines, a qualifications list, and a technology stack with icons.
- `about/index.html`: compatibility redirect to Resume.
- `play/index.html`: an intentionally blank hobby page; only the shared navigation remains.
- `IMELayoutRouter/`: existing product website and installer distribution.
- `404.html`: missing-page recovery.

Shared portfolio styles are in `css/styles.css`; navigation and project filters are in `js/scripts.js`. Resume adds `css/resume.css`. Header/footer markup is intentionally static in each page. Update the stylesheet/script version query in each page when changing these files.

The IMELayoutRouter project card uses the existing, uncropped `IMELayoutRouter/social-ja-v2.png` social image and links to `/IMELayoutRouter/`. Product files and downloads remain maintained separately.

## Changing identity images

The header uses `assets/identity/31916-transparent.png`, a transparent cutout of the owner-supplied logo. The original upload remains unchanged at `assets/identity/31916.png`; the home page has no portrait. To add or replace artwork:

1. Put the image in `assets/identity/` (SVG, PNG, JPEG, WebP, GIF or AVIF).
2. Edit `assets/identity.json`: `logo.src` replaces the header mark everywhere, and `hero.src` adds artwork to the home introduction. Use a path such as `/assets/identity/logo.svg` and set descriptive `alt` text.
3. Keep a `src` empty to retain the text mark or hide the home illustration. The build automatically includes exactly the configured image files; no build-manifest edit is needed.

`js/identity.js` keeps the fallback intact when an image cannot load. The former face-photo file has been removed from the current tree and public package. Historical Git commits and the previously requested backup branches still retain their original contents.

### Transparent logo edit

Created with the built-in image generation/editing tool, with transparent output enabled and `assets/identity/31916.png` as the edit target. Final asset: `assets/identity/31916-transparent.png`.

Prompt:

> Use case: background-extraction. Edit target: the attached existing 31916 logo. Remove only its white/off-white background and background texture, including inside the enclosed counters of the digits 9 and 6. Output genuine alpha transparency. Preserve the exact existing custom glyphs spelling 31916, the small blue dot on the right, their shapes, spacing, relative positions, colors, edges, and the original wide aspect ratio and original padding as closely as possible. Do not redesign, retype, stylize or add anything. No shadow, no border, no white rectangle, no checkerboard baked into pixels. This is a precise transparent cutout for the header of a website.

## Local preview

Run `python -m http.server 8000` from the repository root, then open `http://localhost:8000`. Use a server because asset paths start at the site root.

## Languages

The portfolio supports Japanese, English and German through the header language selector. `assets/translations.json` contains matching dictionaries keyed by normalized Japanese source text; `js/i18n.js` applies text, metadata and accessible labels without replacing page markup. When editing source copy, update its dictionary entry too.

A valid `?lang=ja`, `?lang=en` or `?lang=de` takes priority over the saved browser preference. The default is Japanese. Navigation retains the selected language, and explicit selections persist locally when storage is available. Japanese HTML remains usable if scripts or translation loading are unavailable. The hobby page stays empty in all languages.

The separate IMELayoutRouter product site keeps its existing Japanese/English pages; English and German portfolio visitors are linked to its English page and see the existing English social image.

## Publishing

Pushes to `main` deploy through `.github/workflows/pages.yml`. `tools/build-pages.py` builds the public archive, including the case-sensitive `IMELayOutRouter` legacy aliases. Add any new top-level public page/directory to `PUBLIC` in that script. Existing installer checksum checks run during deployment.

The pre-redesign site, including the existing product pages and downloads, is preserved at branch `backup/portfolio-before-redesign-2026-09-21` (commit `01b4c4e`).

The version before the minimal home and separate Play page is preserved at `backup/before-minimal-refresh-2026-10-13` (commit `d05f2ce`).

The SVG art in `assets/art/` was drawn for this portfolio. No illustrations from reference websites are included.
