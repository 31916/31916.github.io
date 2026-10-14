"""Package the static site with case-sensitive legacy URL aliases.

Use an archive so this also works on case-insensitive Windows filesystems.
Only the public files below are included; tools remain in the public repository
but are not served as website content.
"""

import io
import json
import re
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
    "css/home.css", "assets/projects.json",
    "assets/identity.json", "js/identity.js",
    "assets/translations.json", "js/i18n.js",
    "assets/art/favicon.svg", "assets/art/handshape.svg",
    "assets/art/icon-code.svg", "assets/art/icon-mail.svg",
    "assets/art/keyboard.svg",
    "assets/tech/c.svg", "assets/tech/csharp.svg", "assets/tech/python.svg", "assets/tech/matlab.svg",
    "assets/tech/javascript.svg", "assets/tech/html.svg", "assets/tech/css.svg",
    "assets/tech/git.svg", "assets/tech/github.svg", "assets/tech/linux.svg",
    "assets/tech/google-apps-script.png",
    "assets/tech/LICENSE-DEVICON.txt",
    f"{CURRENT}/index.html", f"{CURRENT}/en.html", f"{CURRENT}/style.css",
    f"{CURRENT}/app.ico", f"{CURRENT}/sitemap.xml",
    f"{CURRENT}/google97bf67731c686ec9.html",  # Keep Search Console ownership verified.
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


def load_projects(settings=None):
    """Validate the shared project catalog and the two home selections."""
    if settings is None:
        settings = json.loads((ROOT / "assets/projects.json").read_text(encoding="utf-8"))
    if not isinstance(settings, dict) or not isinstance(settings.get("projects"), list):
        raise ValueError("Project configuration must contain a projects array")
    identifiers = set()
    for project in settings["projects"]:
        if not isinstance(project, dict):
            raise ValueError("Every project must be an object")
        identifier = project.get("id")
        if not isinstance(identifier, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", identifier):
            raise ValueError(f"Invalid project id: {identifier!r}")
        if identifier in identifiers:
            raise ValueError(f"Duplicate project id: {identifier}")
        identifiers.add(identifier)
        for field in ("title", "type", "tech", "description", "destination", "href"):
            if not isinstance(project.get(field), str) or not project[field].strip():
                raise ValueError(f"Project {identifier} needs nonempty {field}")
        if project.get("category") not in {"software", "research"}:
            raise ValueError(f"Project {identifier} category must be software or research")
        href = project["href"]
        if not (href.startswith("https://") or (href.startswith("/") and not href.startswith("//"))):
            raise ValueError(f"Project {identifier} href must be HTTPS or a site-relative path")
        if any(character.isspace() or ord(character) < 32 for character in href) or "\\" in href:
            raise ValueError(f"Invalid project link: {href}")
        image = project.get("image")
        if not isinstance(image, dict) or not isinstance(image.get("alt"), str) or not image["alt"].strip():
            raise ValueError(f"Project {identifier} needs an image with alt text")
        for dimension in ("width", "height"):
            if type(image.get(dimension)) is not int or image[dimension] <= 0:
                raise ValueError(f"Project {identifier} image {dimension} must be a positive integer")
        if image.get("class", "") not in {"", "research-image"}:
            raise ValueError(f"Project {identifier} has an unknown image class")
        source = image.get("src")
        if not isinstance(source, str) or not source.startswith(("/assets/", f"/{CURRENT}/")):
            raise ValueError(f"Project {identifier} image must use /assets/ or /{CURRENT}/")
        if any(character in source for character in ("?", "#", "\\", "%")):
            raise ValueError(f"Use a plain project image path without query, fragment or URL escapes: {source}")
        path = Path(source.lstrip("/"))
        if ".." in path.parts or path.suffix.lower() not in {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}:
            raise ValueError(f"Invalid project image: {source}")
        if not (ROOT / path).resolve().is_relative_to(ROOT.resolve()):
            raise ValueError(f"Project image is outside the website: {source}")
    featured = settings.get("featured")
    if not isinstance(featured, list) or len(featured) != 2 or not all(isinstance(item, str) for item in featured):
        raise ValueError("featured must contain exactly two project ids")
    if len(set(featured)) != 2:
        raise ValueError("featured must contain two distinct project ids")
    if any(identifier not in identifiers for identifier in featured):
        raise ValueError("Every featured id must exist in projects")
    return settings


def project_assets(settings=None):
    """Include catalog images automatically when new projects are added."""
    settings = load_projects(settings)
    return tuple(dict.fromkeys(project["image"]["src"].lstrip("/") for project in settings["projects"]))


def project_image(project, loading="lazy"):
    image = project["image"]
    return (
        f'<img src="{escape(image["src"], quote=True)}" '
        f'width="{image["width"]}" height="{image["height"]}" '
        f'loading="{loading}" alt="{escape(image["alt"], quote=True)}" />'
    )


def render_featured_projects(settings):
    """Keep the home cards compact; their full details live in the catalog."""
    projects = {project["id"]: project for project in settings["projects"]}
    cards = []
    for identifier in settings["featured"]:
        project = projects[identifier]
        image_class = "project-image"
        if project["image"].get("class"):
            image_class += " " + project["image"]["class"]
        cards.append(
            f'<a class="featured-card" href="{escape(project["href"], quote=True)}">\n'
            f'  <div class="{image_class}">{project_image(project, "eager")}</div>\n'
            '  <div class="featured-info">\n'
            f'    <h3>{escape(project["title"])}</h3>\n'
            f'    <p class="featured-type">{escape(project["type"])}</p>\n'
            '  </div>\n'
            '  <span class="featured-arrow" aria-hidden="true">↗</span>\n'
            '</a>'
        )
    return "\n".join(cards)


def render_project_catalog(settings):
    """Use the existing project-page markup and styling for every catalog entry."""
    cards = []
    for project in settings["projects"]:
        image_class = "project-image"
        if project["image"].get("class"):
            image_class += " " + project["image"]["class"]
        cards.append(
            f'<article class="project-card" data-category="{project["category"]}">\n'
            f'  <a class="project-link" href="{escape(project["href"], quote=True)}">\n'
            f'    <div class="{image_class}">{project_image(project)}</div>\n'
            '    <div class="project-caption">\n'
            '      <div>\n'
            f'        <p class="project-type">{escape(project["type"])} <span>{escape(project["tech"])}</span></p>\n'
            f'        <h3>{escape(project["title"])}</h3>\n'
            '      </div>\n'
            '      <span class="project-arrow" aria-hidden="true">↗</span>\n'
            '    </div>\n'
            f'    <p class="project-description">{escape(project["description"])}</p>\n'
            '  </a>\n'
            '</article>'
        )
    return "\n".join(cards)


def replace_project_slot(source, name, markup):
    start_marker = f"<!-- {name}:start -->"
    end_marker = f"<!-- {name}:end -->"
    starts, ends = source.count(start_marker), source.count(end_marker)
    if not starts and not ends:
        return source
    if starts != 1 or ends != 1:
        raise ValueError(f"Expected one matching {name} comment pair")
    start = source.index(start_marker) + len(start_marker)
    end = source.index(end_marker)
    if end < start:
        raise ValueError(f"Reversed {name} comments")
    return source[:start] + "\n" + markup + "\n" + source[end:]


def render_public_html(content, settings=None, projects=None):
    """Render configured logos and project cards before the first browser paint."""
    if settings is None:
        settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    identity_assets(settings)
    source = content.decode("utf-8")
    slots = LogoSlots(source)
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
    if "<!-- featured-projects:" in source or "<!-- project-catalog:" in source:
        projects = load_projects(projects)
        source = replace_project_slot(source, "featured-projects", render_featured_projects(projects))
        source = replace_project_slot(source, "project-catalog", render_project_catalog(projects))
    return source.encode("utf-8")


def build(destination):
    settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    projects = load_projects()
    with tarfile.open(destination, "w") as archive:
        for name in dict.fromkeys(PUBLIC + identity_assets(settings) + project_assets(projects)):
            if not (ROOT / name).is_file() or (ROOT / name).is_symlink():
                raise ValueError(f"Expected a regular public file: {name}")
            if name.endswith(".html"):
                content = render_public_html((ROOT / name).read_bytes(), settings, projects)
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
