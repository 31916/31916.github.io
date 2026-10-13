"""Package the static site with case-sensitive legacy URL aliases.

Use an archive so this also works on case-insensitive Windows filesystems.
Only the public files below are included; tools remain in the public repository
but are not served as website content.
"""

import io
import json
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import sys
import tarfile


ROOT = Path(__file__).resolve().parents[1]
CURRENT = "IMELayoutRouter"
LEGACY = "IMELayOutRouter"
PUBLIC = (
    "CNAME", "index.html", "404.html", "robots.txt", "sitemap.xml",
    "about/index.html", "resume/index.html", "projects/index.html", "play/index.html", "assets/img/favicon.ico",
    "css/styles.css", "js/scripts.js", "css/resume.css",
    "assets/identity.json", "js/identity.js",
    "assets/translations.json", "js/i18n.js",
    "assets/art/favicon.svg", "assets/art/handshape.svg",
    "assets/art/icon-code.svg", "assets/art/icon-mail.svg",
    "assets/art/keyboard.svg",
    "assets/tech/c.svg", "assets/tech/csharp.svg", "assets/tech/python.svg",
    "assets/tech/javascript.svg", "assets/tech/html.svg", "assets/tech/css.svg",
    "assets/tech/git.svg", "assets/tech/github.svg", "assets/tech/linux.svg",
    "assets/tech/google-apps-script.png",
    "assets/tech/LICENSE-DEVICON.txt",
    f"{CURRENT}/index.html", f"{CURRENT}/en.html", f"{CURRENT}/style.css",
    f"{CURRENT}/app.ico", f"{CURRENT}/sitemap.xml",
    f"{CURRENT}/social-ja-v1.png", f"{CURRENT}/social-en-v1.png",
    f"{CURRENT}/social-ja-v2.png", f"{CURRENT}/social-en-v2.png",
    f"{CURRENT}/downloads/ImeLayoutRouter-V1-1.1.0-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-V2-2.0.0-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-1.1.1-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-2.0.1-Setup.exe",
    f"{CURRENT}/downloads/SHA256SUMS.txt",
)


class ShareMetadata(HTMLParser):
    """Keep legacy shares in sync without duplicating translated metadata."""

    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            attributes = dict(attrs)
            key = attributes.get("property", attributes.get("name", ""))
            if key.startswith(("og:", "twitter:")):
                self.tags.append(self.get_starttag_text())


class LogoSlots(HTMLParser):
    """Locate logo link contents without rewriting surrounding HTML."""

    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.line_offsets = [0]
        for line in source.split("\n")[:-1]:
            self.line_offsets.append(self.line_offsets[-1] + len(line) + 1)
        self.ranges = []
        self.content_start = None
        self.feed(source)
        self.close()
        if self.content_start is not None:
            raise ValueError("Unclosed data-site-logo link")

    def source_offset(self):
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        if self.content_start is not None:
            raise ValueError("Nested link inside data-site-logo")
        if "data-site-logo" in dict(attrs):
            self.content_start = self.source_offset() + len(self.get_starttag_text())

    def handle_endtag(self, tag):
        if tag == "a" and self.content_start is not None:
            self.ranges.append((self.content_start, self.source_offset()))
            self.content_start = None


def redirect(page):
    target = f"/{CURRENT}/" + ("en.html" if page == "en.html" else "")
    language = "en" if page == "en.html" else "ja"
    metadata = ShareMetadata()
    metadata.feed((ROOT / CURRENT / page).read_text(encoding="utf-8"))
    sharing = "\n  ".join(metadata.tags)
    return f'''<!doctype html>
<html lang="{language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IMELayoutRouter</title>
  <link rel="canonical" href="https://31916.ch{target}">
  {sharing}
  <script>location.replace("{target}" + location.search + location.hash);</script>
  <meta http-equiv="refresh" content="0; url={target}">
</head>
<body><p><a href="{target}">IME Layout Router — 新しいページ / New page</a></p></body>
</html>
'''.encode("utf-8")


def identity_assets(settings=None):
    """Publish only configured image files, without exposing other repository data."""
    if settings is None:
        settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    names = []
    for slot in ("logo", "hero"):
        source = settings.get(slot, {}).get("src", "")
        if not source:
            continue
        if not isinstance(source, str) or not source.startswith("/assets/identity/"):
            raise ValueError(f"Identity {slot} must use /assets/identity/")
        if any(character in source for character in ("?", "#", "\\", "%")):
            raise ValueError(f"Use a plain identity image path without query, fragment or URL escapes: {source}")
        path = Path(source.lstrip("/"))
        if ".." in path.parts or path.suffix.lower() not in {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}:
            raise ValueError(f"Invalid identity image: {source}")
        resolved = (ROOT / path).resolve()
        if not resolved.is_relative_to((ROOT / "assets/identity").resolve()):
            raise ValueError(f"Identity image is outside its public directory: {source}")
        names.append(path.as_posix())
    return tuple(dict.fromkeys(names))


def render_public_html(content, settings=None):
    """Render configured header logos into HTML before the first browser paint."""
    if settings is None:
        settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    identity_assets(settings)
    source = content.decode("utf-8")
    slots = LogoSlots(source)
    if not slots.ranges:
        return content
    logo = settings.get("logo", {})
    if logo.get("src"):
        alt = logo.get("alt")
        if not isinstance(alt, str) or not alt:
            alt = "31916"
        markup = (
            f'<img src="{escape(logo["src"], quote=True)}" '
            f'alt="{escape(alt, quote=True)}" width="120" height="48" '
            'loading="eager" fetchpriority="high" />'
        )
    else:
        markup = "31916<span>.</span>"
    for start, end in reversed(slots.ranges):
        source = source[:start] + markup + source[end:]
    return source.encode("utf-8")


def build(destination):
    settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    with tarfile.open(destination, "w") as archive:
        for name in PUBLIC + identity_assets(settings):
            if not (ROOT / name).is_file() or (ROOT / name).is_symlink():
                raise ValueError(f"Expected a regular public file: {name}")
            if name.endswith(".html"):
                content = render_public_html((ROOT / name).read_bytes(), settings)
                info = archive.gettarinfo(ROOT / name, arcname=name)
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))
            else:
                archive.add(ROOT / name, arcname=name)

        # Old direct installer links keep serving the exact same bytes.
        for name in PUBLIC:
            if not name.startswith(f"{CURRENT}/"):
                continue
            source = ROOT / name
            relative = source.relative_to(ROOT / CURRENT).as_posix()
            alias = f"{LEGACY}/{relative}"
            if relative in ("index.html", "en.html"):
                content = redirect(relative)
                info = tarfile.TarInfo(alias)
                info.size = len(content)
                info.mode = 0o644
                archive.addfile(info, io.BytesIO(content))
            else:
                archive.add(source, arcname=alias)


if __name__ == "__main__":
    build(sys.argv[1])
