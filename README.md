# Harry / 31916

Personal portfolio at **https://31916.ch/**. Plain HTML, CSS, JavaScript and original SVG illustrations; no JavaScript framework or client-side dependencies.

## Pages

- `index.html`: a home with an introduction and contact links to GitHub and X.
- `projects/index.html` lists projects with Software, Research, Idea Designs and Posts filters. Technical posts also appear in this catalog.
- `posts/index.html` is the independent Posts navigation page, with IT & technology, Languages and Qualifications filters. It uses the same linked cards and arrows as Projects, without a visible introduction block.
- `google-forms-profile/` explains applicant-profile automation with Google Apps Script, links to copyable native Google templates, and provides `setup.gs`. Actual screenshots cover setup, generated documents, PDF output and Gmail delivery. Its search indexing remains disabled.
- `resume/index.html`: separate education and work timelines, a qualifications list, and a technology stack with icons.
- `about/index.html`: compatibility redirect to Resume.
- `hobbies/index.html`: sports with experience, clubs and results, games, anime and manga. Styles are in `css/hobbies.css`.
- `IMELayoutRouter/`: existing product website and installer distribution.
- `IdeaDesigns/` hosts Idea Designs in English. Add each release as its own article with a unique, stable ID. Its Share button uses that ID as the link fragment. `Design/` and `Design/en.html` redirect to Idea Designs.
- `NumberCursors/`: cursor release assets and redirects from the original download pages.
- `404.html`: missing-page recovery.

Shared portfolio styles are in `css/styles.css`; navigation and project filters are in `js/scripts.js`. Resume adds `css/resume.css`. Header markup is static in each page. The build renders `assets/footer.html` into every active portfolio and product page; `css/footer.css` keeps contact information and copyright in the normal document flow. Update the stylesheet/script version query in each page when changing these files.

The home body fills the viewport when its content fits and scrolls naturally on smaller screens. The home header uses the same shared styles as every other portfolio page. Check the home at phone portrait/landscape, tablet and desktop sizes in Japanese, English and German when changing its content.

## Editing the project catalog

To add a project to `assets/projects.json`, copy a catalog entry, assign a unique `id`, and update its title, link and image. Set `category` to `software`, `research`, `idea-design` or `post`. Entries in `post` also populate the Posts page. Set `topic` to `technology`, `languages`, or `qualifications`; filter counts are derived from the catalog. Add translations for new visible text and image descriptions in `assets/translations.json`. The build validates the catalog, renders both listings into HTML, and automatically includes local project images. Page-specific catalog and post styles are in `css/projects.css`.

The checked-in HTML includes the current cards for direct preview. After editing the catalog, preview the generated `tools/build-pages.py` output to see the new selection; deployment always uses the catalog. On Windows, extract current paths only for preview, excluding the case-sensitive `IMELayOutRouter/` aliases to avoid overwriting the current product directory.

The IMELayoutRouter project card uses the existing, uncropped `IMELayoutRouter/social-ja-v2.png` social image and links to `/IMELayoutRouter/`. Product files and downloads remain maintained separately.

## Changing identity images

The header uses `assets/identity/31916-transparent.png`, a transparent cutout of the owner-supplied logo. The original upload remains unchanged at `assets/identity/31916.png`; the home page has no portrait. To add or replace artwork:

1. Put the image in `assets/identity/` (SVG, PNG, JPEG, WebP, GIF or AVIF).
2. Edit `assets/identity.json`: the build renders `logo.src` into every portfolio header. Use a path such as `/assets/identity/logo.svg` and set descriptive `alt` text.
3. Keep `logo.src` empty to use the text mark. The build automatically includes the configured image file; no build-manifest edit is needed.

The HTML contains the logo image on first render, with reserved dimensions and eager loading; JavaScript never swaps the header logo after loading. After changing logo settings, preview the extracted output of `tools/build-pages.py` to check the configured header. The checked-in HTML also contains the current logo for direct local preview.

The site uses the configured logo; personal portrait images are not included in the public package.

## Local preview

Run `python -m http.server 8000` from the repository root, then open `http://localhost:8000`. Use a server because asset paths start at the site root.

## Languages

The portfolio supports Japanese, English and German through the header language selector. `assets/translations.json` stores entries that differ from the normalized Japanese source text. `js/i18n.js` applies them to text, metadata and accessible labels without replacing page markup. When editing source copy, update its translations too.

A valid `?lang=ja`, `?lang=en` or `?lang=de` takes priority over the saved browser preference. The default is Japanese. Navigation retains the selected language, and explicit selections persist locally when storage is available. Japanese HTML remains usable if scripts or translation loading are unavailable.

The separate IMELayoutRouter product site keeps its existing Japanese/English pages; English and German portfolio visitors are linked to its English page and see the existing English social image.

## Publishing

Pushes to `main` deploy through `.github/workflows/pages.yml`. `tools/build-pages.py` builds the public archive, including the case-sensitive `IMELayOutRouter` legacy aliases. Add any new top-level public page/directory to `PUBLIC` in that script. Existing installer checksum checks run during deployment.

The unoutlined Number Cursors 4 download is `NumberCursors/downloads/Number_Cursors_4.zip`; the outlined variant is `NumberCursors/downloads/Number_Cursors_4_Outlined.zip`. Rebuild them with `python3 tools/build-number-cursors.py NumberCursors/windows-source.zip` and `python3 tools/build-number-cursors.py --outlined NumberCursors/windows-outlined-source.zip`. Each ZIP packages Windows, macOS, and Linux themes, with separate scheme names and installation paths for the two variants. The builder includes `NumberCursors/README.txt` as `Windows/README.txt`, adapting it for the outlined variant. Refresh both entries in `NumberCursors/downloads/SHA256SUMS.txt`.

Most SVG art in `assets/art/` was drawn for this portfolio. The Google Forms article thumbnail uses sourced Google service logos and the Bootstrap resume icon; sources and licensing are recorded in `assets/art/google-forms-profile-icons-LICENSE.txt`. Article screenshots are actual Google Workspace captures using fictional applicant details. The displayed resume is a duplicate with its email field anonymized, and the Gmail screenshot omits the sender header and sidebar. `tools/build-article-previews.py` produces lossless crops of the actual screenshots; the article viewer supports fitting, natural-size viewing and opening the original capture. No UI is redrawn.
