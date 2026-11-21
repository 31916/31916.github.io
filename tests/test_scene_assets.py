"""Verify that the startup download preserves every original scene asset."""

import gzip
import json
from pathlib import Path
import runpy
import unittest


ROOT = Path(__file__).resolve().parents[1]
BUILDER = runpy.run_path(str(ROOT / "tools/build-pages.py"))


class SceneAssetsTest(unittest.TestCase):
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
            for name in BUILDER["SPACE_FILES"] if name.startswith("textures/")
        }
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
