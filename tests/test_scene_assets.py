"""Verify that the startup download preserves every original scene asset."""

import gzip
import json
import math
from pathlib import Path
import runpy
import unittest
from urllib.parse import urlsplit

try:
    from PIL import Image
except ImportError:
    Image = None


ROOT = Path(__file__).resolve().parents[1]
BUILDER = runpy.run_path(str(ROOT / "tools/build-pages.py"))


class SceneAssetsTest(unittest.TestCase):
    def test_preload_list_only_fetches_published_startup_files(self):
        urls = BUILDER["space_preload_urls"]()
        published = set(BUILDER["PUBLIC"]) | set(BUILDER["pack_scene_assets"]())
        self.assertEqual(len(urls), len(set(urls)))
        self.assertIn("/space/", urls)
        self.assertIn("/space/vendor/three.module.min.js", urls)
        self.assertIn("/space/launch-scene.js", urls)
        self.assertTrue(any(url.startswith("/space/moon-normal-worker.js?") for url in urls))
        self.assertEqual(sum(url.startswith("/space/scene-assets-") for url in urls), BUILDER["SCENE_PACK_COUNT"])
        for url in urls:
            with self.subTest(url=url):
                target = urlsplit(url)
                self.assertFalse(target.netloc or target.scheme)
                path = target.path.lstrip("/")
                if path.endswith("/"):
                    path += "index.html"
                self.assertIn(path, published)

    def test_all_original_files_round_trip(self):
        packs = BUILDER["pack_scene_assets"]()
        self.assertEqual(len(packs), BUILDER["SCENE_PACK_COUNT"])
        actual = set()
        for pack in packs.values():
            content = gzip.decompress(pack)
            header_length = int.from_bytes(content[:4], "little")
            manifest = json.loads(content[4:4 + header_length])
            for name, (offset, length) in manifest.items():
                with self.subTest(asset=name):
                    self.assertNotIn(name, actual)
                    actual.add(name)
                    start = 4 + header_length + offset
                    self.assertEqual(
                        content[start:start + length],
                        (ROOT / "space/textures" / name).read_bytes(),
                    )
        expected = {
            name.removeprefix("textures/")
            for name in BUILDER["SPACE_FILES"] if name.startswith("textures/") and not name.endswith("-normal.webp")
        }
        self.assertEqual(actual, expected)

    @unittest.skipUnless(Image, "Pillow is required to compare decoded texture pixels")
    def test_height_maps_reproduce_original_normals(self):
        for index in range(4):
            with self.subTest(moon=index):
                with Image.open(ROOT / f"space/textures/moon-{index}-height.webp") as image:
                    width, height = image.size
                    terrain = image.convert("L").tobytes()
                normals = bytearray()
                for y in range(height):
                    for x in range(width):
                        dx = (terrain[y * width + (x - 1) % width] - terrain[y * width + (x + 1) % width]) / 255 * 5
                        dy = (terrain[max(0, y - 1) * width + x] - terrain[min(height - 1, y + 1) * width + x]) / 255 * 5
                        length = math.sqrt(dx * dx + dy * dy + 1)
                        normals.extend(round(127.5 + 127.5 * component / length) for component in (dx, dy, 1))
                with Image.open(ROOT / f"space/textures/moon-{index}-normal.webp") as image:
                    self.assertEqual(normals, image.convert("RGB").tobytes())


if __name__ == "__main__":
    unittest.main()
