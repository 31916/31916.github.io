"""Check that the short page routes retain their assets and downloads."""

from html.parser import HTMLParser
from pathlib import Path
import runpy
import unittest
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
BUILDER = runpy.run_path(str(ROOT / "tools/build-pages.py"))


class References(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.urls = []
        self.canonical = None
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        for key in ("href", "src", "data-plain-src", "data-outlined-src"):
            if key in attributes:
                self.urls.append(attributes[key])
        if tag == "link" and attributes.get("rel") == "canonical":
            self.canonical = attributes["href"]
        if tag == "meta" and attributes.get("property") == "og:image":
            self.urls.append(attributes["content"])


class PageURLsTest(unittest.TestCase):
    def test_short_pages_keep_all_resources_available(self):
        published = set(BUILDER["PUBLIC"]) | set(BUILDER["PAGE_ALIASES"])
        identity = BUILDER["identity_assets"]()
        published.update(identity)
        for destination, source in BUILDER["PAGE_ALIASES"].items():
            with self.subTest(page=destination):
                html = BUILDER["render_public_html"]((ROOT / source).read_bytes()).decode()
                references = References(html)
                url = "https://31916.ch/" + destination.removesuffix("index.html")
                self.assertEqual(references.canonical, url)
                for value in references.urls:
                    target = urlsplit(urljoin(url, value))
                    if target.scheme not in ("http", "https") or target.netloc != "31916.ch":
                        continue
                    path = target.path.lstrip("/")
                    if not path or path.endswith("/"):
                        path += "index.html"
                    self.assertIn(path, published, (destination, value))


if __name__ == "__main__":
    unittest.main()
