# Technology logos

Locally vendored logos used to identify the languages and tools listed on the Resume page. These files retain their upstream geometry and colors; they are not loaded from a third-party CDN.

## Devicon

- Project: https://github.com/devicons/devicon
- Pinned revision: `6a37858047b0e8d9c9c0e68f4a071fc410652e89`
- License: MIT; the full notice is preserved in [LICENSE-DEVICON.txt](LICENSE-DEVICON.txt).
- Source URL pattern: `https://raw.githubusercontent.com/devicons/devicon/6a37858047b0e8d9c9c0e68f4a071fc410652e89/icons/<upstream path>`

| Local file | Upstream path | viewBox |
| --- | --- | --- |
| `csharp.svg` | `csharp/csharp-original.svg` | `0 0 128 128` |
| `python.svg` | `python/python-original.svg` | `0 0 128 128` |
| `javascript.svg` | `javascript/javascript-original.svg` | `0 0 128 128` |
| `html.svg` | `html5/html5-original.svg` | `0 0 128 128` |
| `css.svg` | `css3/css3-original.svg` | `0 0 128 128` |
| `git.svg` | `git/git-original.svg` | `0 0 128 128` |
| `github.svg` | `github/github-original.svg` | `0 0 128 128` |
| `linux.svg` | `linux/linux-plain.svg` | `0 0 128 128` |

The simpler upstream Linux variant keeps the small icon lightweight. No logo paths have been redrawn or altered.

`c.svg` uses the blue hexagon and white C from Devicon v2.16.0, pinned to revision `6910f0503efdd315c8f9b858234310c06e04d9c0`. It is an unchanged copy of [c-original.svg](https://raw.githubusercontent.com/devicons/devicon/6910f0503efdd315c8f9b858234310c06e04d9c0/icons/c/c-original.svg), with viewBox `0 0 128 128`, under the same MIT license.

## Google Apps Script

- `google-apps-script.png` is the unchanged 96 × 96 color product icon supplied by Google, as linked from the [Apps Script developer site](https://developers.google.com/apps-script).
- Source: https://www.gstatic.com/images/branding/product/2x/apps_script_48dp.png
- Retrieved: 2026-10-13. This Google product mark is not covered by the Devicon MIT license.

Product names and logos belong to their respective owners. They identify technologies used; they do not imply endorsement.

## Content basis

The original portfolio at Git revision `01b4c4e`, `index.html`, explicitly listed C, Python, JavaScript, HTML, CSS, Git / GitHub, and Google Apps Script. C# is used by the published IMELayoutRouter project; Linux was explicitly listed in the owner's supplied website strategy. This section does not claim proficiency levels or add technologies from the original Bootstrap template's placeholder examples.

All SVGs were checked for valid XML, a viewBox, scripts, event handlers, foreign objects, and external resource references when imported.
