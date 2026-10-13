# Harry / 31916

Personal portfolio at **https://31916.ch/**. Plain HTML, CSS, JavaScript and original SVG illustrations; no JavaScript framework or client-side dependencies.

## Pages

- `index.html`: a home with two selected projects and contact (email/copy button). GitHub and X icons stay above the projects at the right edge.
- `projects/index.html`: project directory with Software / Research filters.
- `resume/index.html`: separate education and work timelines, a qualifications list, and a technology stack with icons.
- `about/index.html`: compatibility redirect to Resume.
- `play/index.html`: an intentionally blank hobby page; only the shared navigation remains.
- `IMELayoutRouter/`: existing product website and installer distribution.
- `404.html`: missing-page recovery.

Shared portfolio styles are in `css/styles.css`; navigation and project filters are in `js/scripts.js`. Resume adds `css/resume.css`. Header/footer markup is intentionally static in each page. Update the stylesheet/script version query in each page when changing these files.

The home body fills the viewport when its content fits and scrolls naturally on smaller screens. Selected cards use the same `project-grid` and `project-image` styles as the project catalog, including one card per row on phones. The home header uses the same unmodified shared styles as every other portfolio page. Check the home at phone portrait/landscape, tablet and desktop sizes in Japanese, English and German when changing its content.

## Selecting the two home projects

Edit `assets/projects.json`. The `projects` array is the full project catalog; `featured` selects exactly two IDs, in display order:

```json
"featured": ["ime-layout-router", "handshape-recognition"]
```

To add a project, copy a catalog entry, assign a unique `id`, and update its title, link, description and image. Set `category` to `software` or `research`. Add Japanese/English/German translations for new visible text and image descriptions in `assets/translations.json`. Change an ID in `featured` to show the new project on the home page. The build validates the selection, renders both the home and full project listing into HTML, and automatically includes local project images. No browser-side card replacement occurs.

The checked-in HTML includes the current cards for direct preview. After editing the catalog, preview the generated `tools/build-pages.py` output to see the new selection; deployment always uses the catalog. On Windows, extract current paths only for preview, excluding the case-sensitive `IMELayOutRouter/` aliases to avoid overwriting the current product directory.

The IMELayoutRouter project card uses the existing, uncropped `IMELayoutRouter/social-ja-v2.png` social image and links to `/IMELayoutRouter/`. Product files and downloads remain maintained separately.

## Changing identity images

The header uses `assets/identity/31916-transparent.png`, a transparent cutout of the owner-supplied logo. The original upload remains unchanged at `assets/identity/31916.png`; the home page has no portrait. To add or replace artwork:

1. Put the image in `assets/identity/` (SVG, PNG, JPEG, WebP, GIF or AVIF).
2. Edit `assets/identity.json`: the build renders `logo.src` into every portfolio header. Use a path such as `/assets/identity/logo.svg` and set descriptive `alt` text.
3. Keep `logo.src` empty to use the text mark. The build automatically includes the configured image file; no build-manifest edit is needed. The former optional `hero` slot is unused by the home page, which contains only Projects and Contact.

The HTML contains the logo image on first render, with reserved dimensions and eager loading; JavaScript never swaps the header logo after loading. `js/identity.js` retains support for the former optional illustration but makes no changes to the current home page. After changing logo settings, preview the extracted output of `tools/build-pages.py` to check the configured header. The checked-in HTML also contains the current logo for direct local preview.

The former face-photo file has been removed from the current tree and public package. Historical Git commits and the previously requested backup branches still retain their original contents.

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
