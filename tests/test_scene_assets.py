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
        content = gzip.decompress(BUILDER["pack_scene_assets"]())
        header_length = int.from_bytes(content[:4], "little")
        manifest = json.loads(content[4:4 + header_length])
        expected = {
            name.removeprefix("textures/")
            for name in BUILDER["SPACE_FILES"] if name.startswith("textures/")
        }
        self.assertEqual(set(manifest), expected)
        for name, (offset, length) in manifest.items():
            with self.subTest(asset=name):
                start = 4 + header_length + offset
                self.assertEqual(
                    content[start:start + length],
                    (ROOT / "space/textures" / name).read_bytes(),
                )


if __name__ == "__main__":
    unittest.main()
