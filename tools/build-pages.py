"""Package the static site with case-sensitive legacy URL aliases.

Use an archive so this also works on case-insensitive Windows filesystems.
Only the public files below are included; deployment tools stay private to Git.
"""

import io
from pathlib import Path
import sys
import tarfile


ROOT = Path(__file__).resolve().parents[1]
CURRENT = "IMELayoutRouter"
LEGACY = "IMELayOutRouter"
PUBLIC = ("CNAME", "index.html", "robots.txt", "assets", "css", "js", CURRENT)


def redirect(page):
    target = f"/{CURRENT}/" + ("en.html" if page == "en.html" else "")
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IME Layout Router</title>
  <link rel="canonical" href="https://31916.ch{target}">
  <script>location.replace("{target}" + location.search + location.hash);</script>
  <meta http-equiv="refresh" content="0; url={target}">
</head>
<body><p><a href="{target}">IME Layout Router — 新しいページ / New page</a></p></body>
</html>
'''.encode("utf-8")


def build(destination):
    with tarfile.open(destination, "w") as archive:
        for name in PUBLIC:
            archive.add(ROOT / name, arcname=name)

        # Old direct installer links keep serving the exact same bytes.
        for source in sorted((ROOT / CURRENT).rglob("*")):
            if not source.is_file():
                continue
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
