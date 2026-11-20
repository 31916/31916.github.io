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
IDEA_DESIGNS = "IdeaDesigns"
IMAGE_EXTENSIONS = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
PROJECT_CATEGORIES = {
    "software": "ソフトウェア",
    "research": "研究",
    "idea-design": "アイデアデザイン",
    "post": "投稿",
}
POST_CATEGORIES = {
    "technology": "IT・技術",
    "languages": "言語",
    "qualifications": "資格",
}
SPACE_FILES = (
    "index.html", "simple-view.css", "simple-view.js", "space.css", "space.js",
    "launch-scene.js", "launch-art.svg", "universe.js", "language.js", "view-controls.js",
    "celestial.js", "solar-system.js", "solar-orbits.js", "ASSETS.md",
    "vendor/three.module.min.js", "vendor/THREE-LICENSE.txt",
    *(f"vendor/addons/postprocessing/{name}.js" for name in (
        "EffectComposer", "MaskPass", "OutputPass", "Pass", "RenderPass", "ShaderPass", "UnrealBloomPass",
    )),
    *(f"vendor/addons/shaders/{name}.js" for name in ("CopyShader", "LuminosityHighPassShader", "OutputShader")),
    "textures/uranus-clouds.webp", "textures/deep-space.webp",
    *(f"textures/moon-{moon}-{layer}.webp" for moon in range(4) for layer in ("color", "height", "normal")),
    *(f"textures/solar/{body}.{ext}" for body in (
        "sun", "mercury", "venus", "mars", "jupiter", "saturn", "neptune",
    ) for ext in ("bin", "webp")),
    "textures/solar/earth.webp", "textures/solar/saturn-rings.png",
)
PUBLIC = (
    *(f"space/{name}" for name in SPACE_FILES),
    "CNAME", "index.html", "404.html", "robots.txt", "sitemap.xml",
    "google97bf67731c686ec9.html",  # Search Console ownership verification.
    "about/index.html", "resume/index.html", "projects/index.html", "posts/index.html", "hobbies/index.html",
    "google-forms-profile/index.html", "google-forms-profile/style.css",
    "google-forms-profile/article.js", "google-forms-profile/sample.gs", "google-forms-profile/setup.gs",
    "google-forms-profile/screenshots/01-resume-template.jpg",
    "google-forms-profile/screenshots/02-spreadsheet-settings.jpg",
    "google-forms-profile/screenshots/03-open-apps-script.jpg",
    "google-forms-profile/screenshots/04-run-setup.jpg",
    "google-forms-profile/screenshots/04b-created-trigger.jpg",
    "google-forms-profile/screenshots/05-created-form.jpg",
    "google-forms-profile/screenshots/06-form-submitted.jpg",
    "google-forms-profile/screenshots/07-response-status.jpg",
    "google-forms-profile/screenshots/08-generated-resume.jpg",
    "google-forms-profile/screenshots/09-output-folder.jpg",
    "google-forms-profile/screenshots/10-gmail-received.jpg",
    "assets/art/google-forms-profile-icons-LICENSE.txt",
    "google-forms-profile/screenshots/previews/01-resume-template.webp",
    "google-forms-profile/screenshots/previews/02-spreadsheet-settings.webp",
    "google-forms-profile/screenshots/previews/03-open-apps-script.webp",
    "google-forms-profile/screenshots/previews/04-run-setup.webp",
    "google-forms-profile/screenshots/previews/04b-created-trigger.webp",
    "google-forms-profile/screenshots/previews/05-created-form.webp",
    "google-forms-profile/screenshots/previews/06-form-submitted.webp",
    "google-forms-profile/screenshots/previews/07-response-status.webp",
    "google-forms-profile/screenshots/previews/08-generated-resume.webp",
    "google-forms-profile/screenshots/previews/09-output-folder.webp",
    "google-forms-profile/screenshots/previews/10-gmail-received.webp",
    "css/styles.css", "css/footer.css", "js/scripts.js", "css/resume.css", "css/projects.css",
    "css/home.css", "css/hobbies.css", "assets/projects.json",
    "css/cursors.css", "assets/cursors/arrow.png", "assets/cursors/hand.png", "assets/cursors/text.png",
    "assets/identity.json",
    "assets/fonts/quicksand-404.woff2", "assets/fonts/OFL-Quicksand.txt",
    "assets/translations.json", "js/i18n.js",
    "assets/art/favicon.svg", "assets/art/social-icon.png", "assets/art/handshape.svg", "assets/art/link-arrow.svg", "assets/art/chevron-right.svg",
    "assets/art/home-uranus.svg",
    "assets/tech/c.svg", "assets/tech/csharp.svg", "assets/tech/python.svg", "assets/tech/matlab.svg",
    "assets/tech/java.svg", "assets/tech/javascript.svg", "assets/tech/html.svg", "assets/tech/css.svg",
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
    f"{CURRENT}/downloads/ImeLayoutRouter-1.1.2-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-2.0.2-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-3.0.0-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-1.1.3-Setup.exe",
    f"{CURRENT}/downloads/ImeLayoutRouter-2.0.3-Setup.exe",
    f"{CURRENT}/downloads/SHA256SUMS.txt",
    "Design/index.html", "Design/en.html",
    "Design/google97bf67731c686ec9.html",  # Keep Search Console ownership verified.
    f"{IDEA_DESIGNS}/index.html", f"{IDEA_DESIGNS}/style.css", f"{IDEA_DESIGNS}/favicon.svg",
    f"{IDEA_DESIGNS}/social-d.png",
    f"{IDEA_DESIGNS}/sitemap.xml", f"{IDEA_DESIGNS}/number-cursors.svg",
    f"{IDEA_DESIGNS}/cursor-comparison-v2.png", f"{IDEA_DESIGNS}/cursor-comparison-v3.png",
    f"{IDEA_DESIGNS}/cursor-comparison-v4.png", f"{IDEA_DESIGNS}/preview.js",
    "NumberCursors/index.html", "NumberCursors/en.html",
    "NumberCursors/media/wait-preview.png",
    "NumberCursors/media/working-preview.png",
    "NumberCursors/downloads/NumberCursors-1.0.0.zip",
    "NumberCursors/downloads/NumberCursors-v4.zip",
    "NumberCursors/downloads/Number_Cursors_4.zip",
    "NumberCursors/downloads/NumberCursor-4.cur",
    "NumberCursors/downloads/SHA256SUMS.txt",
    "assets/art/number-cursors.png",
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


def share_metadata(page):
    metadata = ShareMetadata()
    metadata.feed((ROOT / page).read_text(encoding="utf-8"))
    return "\n  ".join(metadata.tags)


def redirect(page):
    target = f"/{CURRENT}/" + ("en.html" if page == "en.html" else "")
    language = "en" if page == "en.html" else "ja"
    sharing = share_metadata(f"{CURRENT}/{page}")
    return f'''<!doctype html>
<html lang="{language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IMELayoutRouter</title>
  <link rel="canonical" href="https://31916.ch{target}">
  <link rel="stylesheet" href="/css/cursors.css?v=3">
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
        if ".." in path.parts or path.suffix.lower() not in IMAGE_EXTENSIONS:
            raise ValueError(f"Invalid identity image: {source}")
        resolved = (ROOT / path).resolve()
        if not resolved.is_relative_to((ROOT / "assets/identity").resolve()):
            raise ValueError(f"Identity image is outside its public directory: {source}")
        names.append(path.as_posix())
    return tuple(dict.fromkeys(names))


def load_projects(settings=None):
    """Validate the project catalog."""
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
        for field in ("title", "description", "type", "tech", "href"):
            if not isinstance(project.get(field), str) or not project[field].strip():
                raise ValueError(f"Project {identifier} needs nonempty {field}")
        if project.get("category") not in PROJECT_CATEGORIES:
            raise ValueError(f"Project {identifier} category must be one of {', '.join(PROJECT_CATEGORIES)}")
        if project["category"] == "post" and project.get("topic", "technology") not in POST_CATEGORIES:
            raise ValueError(f"Post {identifier} has an unknown topic")
        href = project["href"]
        if not (href.startswith("https://") or (href.startswith("/") and not href.startswith("//"))):
            raise ValueError(f"Project {identifier} href must be HTTPS or a site-relative path")
        if any(character.isspace() or ord(character) < 32 for character in href) or "\\" in href:
            raise ValueError(f"Invalid project link: {href}")
        image = project.get("image")
        if not isinstance(image, dict) or not isinstance(image.get("alt"), str) or not image["alt"].strip():
            raise ValueError(f"Project {identifier} needs an image with alt text")
        version = image.get("version")
        if version is not None and (not isinstance(version, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", version)):
            raise ValueError(f"Project {identifier} has an invalid image version")
        for dimension in ("width", "height"):
            if type(image.get(dimension)) is not int or image[dimension] <= 0:
                raise ValueError(f"Project {identifier} image {dimension} must be a positive integer")
        if image.get("class", "") not in {"", "research-image", "app-icon-image", "cursor-art-image"}:
            raise ValueError(f"Project {identifier} has an unknown image class")
        source = image.get("src")
        if not isinstance(source, str) or not source.startswith(("/assets/", f"/{CURRENT}/", f"/{IDEA_DESIGNS}/")):
            raise ValueError(f"Project {identifier} image must use /assets/, /{CURRENT}/, or /{IDEA_DESIGNS}/")
        if any(character in source for character in ("?", "#", "\\", "%")):
            raise ValueError(f"Use a plain project image path without query, fragment or URL escapes: {source}")
        path = Path(source.lstrip("/"))
        if ".." in path.parts or path.suffix.lower() not in IMAGE_EXTENSIONS:
            raise ValueError(f"Invalid project image: {source}")
        if not (ROOT / path).resolve().is_relative_to(ROOT.resolve()):
            raise ValueError(f"Project image is outside the website: {source}")
    return settings


def project_image(project):
    image = project["image"]
    source = image["src"] + ("?v=" + image["version"] if image.get("version") else "")
    return (
        f'<img src="{escape(source, quote=True)}" '
        f'width="{image["width"]}" height="{image["height"]}" '
        f'loading="lazy" alt="{escape(image["alt"], quote=True)}" />'
    )


def render_project_filters(settings):
    categories = [project["category"] for project in settings["projects"]]
    buttons = ['<button data-filter="all" type="button" aria-pressed="true">すべて</button>']
    for category, label in PROJECT_CATEGORIES.items():
        buttons.append(
            f'<button data-filter="{category}" type="button" aria-pressed="false">'
            f'<span>{label}</span><span>（{categories.count(category)}）</span></button>'
        )
    return "\n".join(buttons)


def render_project_card(project, category, label):
    """One card layout for every work and post: image, caption, arrow, description."""
    target = '' if project["category"] == "post" else ' target="_blank" rel="noopener"'
    image_class = "project-image"
    if project["image"].get("class"):
        image_class += " " + project["image"]["class"]
    return (
        f'<article class="project-card" data-category="{category}">\n'
        f'  <a class="project-link" href="{escape(project["href"], quote=True)}"{target}>\n'
        f'    <div class="{image_class}">{project_image(project)}</div>\n'
        '    <div class="project-caption">\n'
        '      <div>\n'
        f'        <p class="project-type">{escape(label)} <span>{escape(project["tech"])}</span></p>\n'
        f'        <h3>{escape(project["title"])}</h3>\n'
        '      </div>\n'
        '      <svg class="link-arrow project-arrow" aria-hidden="true"><use href="/assets/art/link-arrow.svg#arrow"></use></svg>\n'
        '    </div>\n'
        f'    <p class="project-description">{escape(project["description"])}</p>\n'
        '  </a>\n'
        '</article>'
    )


def render_project_catalog(settings, *, posts_only=False):
    """Choose entries and labels; visual markup always comes from the shared card."""
    cards = []
    for project in settings["projects"]:
        if posts_only and project["category"] != "post":
            continue
        category = project.get("topic", "technology") if posts_only else project["category"]
        label = project["type"] if posts_only else PROJECT_CATEGORIES[project["category"]]
        cards.append(render_project_card(project, category, label))
    return "\n".join(cards)


def render_post_list(settings):
    return render_project_catalog(settings, posts_only=True)


def render_post_filters(settings):
    topics = [project.get("topic", "technology") for project in settings["projects"] if project["category"] == "post"]
    buttons = ['<button data-filter="all" type="button" aria-pressed="true">すべて</button>']
    for category, label in POST_CATEGORIES.items():
        buttons.append(
            f'<button data-filter="{category}" type="button" aria-pressed="false">'
            f'<span>{label}</span><span>（{topics.count(category)}）</span></button>'
        )
    return "\n".join(buttons)


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
    """Render configured logos, project cards and metadata for legacy shares."""
    if settings is None:
        settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    identity_assets(settings)
    source = content.decode("utf-8")
    if "<!-- home-introduction -->" in source:
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        intro = re.search(r"<!-- home-introduction:start -->(.*?)<!-- home-introduction:end -->", home, re.S)
        if not intro or not intro[1].strip():
            raise ValueError("Missing home introduction for the space view")
        source = source.replace("<!-- home-introduction -->", intro[1].strip())
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
    if any(f"<!-- {slot}:" in source for slot in ("project-filters", "project-catalog", "post-list", "post-filters")):
        projects = load_projects(projects)
        source = replace_project_slot(source, "project-filters", render_project_filters(projects))
        source = replace_project_slot(source, "project-catalog", render_project_catalog(projects))
        source = replace_project_slot(source, "post-list", render_post_list(projects))
        source = replace_project_slot(source, "post-filters", render_post_filters(projects))
    if '<footer class="site-footer shell" id="contact">' in source:
        footer = (ROOT / "assets/footer.html").read_text(encoding="utf-8").strip()
        if '<html lang="en">' in source:
            footer = footer.replace("コンタクト", "Contact").replace("メールアドレスをコピー", "Copy email address")
        resources = re.search(r'<div class="footer-resources">(.*?)</div>', source, flags=re.S)
        footer_start = source.index('<footer class="site-footer shell" id="contact">')
        if resources and resources.start() > footer_start:
            source = source[:resources.start()] + source[resources.end():]
            source = source.replace('</main>', resources[0] + '\n</main>', 1)
        source = re.sub(r'<footer class="site-footer shell" id="contact">.*?</footer>', lambda _: footer, source, flags=re.S)
    if "<!-- idea-designs-share -->" in source:
        source = source.replace("<!-- idea-designs-share -->", share_metadata(f"{IDEA_DESIGNS}/index.html"))
    return source.encode("utf-8")


def build(destination):
    settings = json.loads((ROOT / "assets/identity.json").read_text(encoding="utf-8"))
    projects = load_projects()
    project_images = tuple(project["image"]["src"].lstrip("/") for project in projects["projects"])
    with tarfile.open(destination, "w") as archive:
        for name in dict.fromkeys(PUBLIC + identity_assets(settings) + project_images):
            if not (ROOT / name).is_file() or (ROOT / name).is_symlink():
                raise ValueError(f"Expected a regular public file: {name}")
            if name.endswith(".html"):
                content = render_public_html((ROOT / name).read_bytes(), settings, projects)
                info = archive.gettarinfo(ROOT / name, arcname=name)
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))
            else:
                archive.add(ROOT / name, arcname=name)
                if name.startswith(f"{IDEA_DESIGNS}/"):
                    # Keep the previously submitted sitemap and direct asset links working.
                    relative = name.removeprefix(f"{IDEA_DESIGNS}/")
                    archive.add(ROOT / name, arcname=f"Design/{relative}")

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
