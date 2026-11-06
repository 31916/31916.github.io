"""Package the Windows cursor set and its macOS and Linux ports."""

import argparse
import base64
from dataclasses import dataclass
import json
from pathlib import Path, PurePosixPath
import plistlib
from struct import iter_unpack, pack, unpack_from
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile
import zlib


NAME = "Number Cursors 4"
STEM = "Number_Cursors_4"
NUMBER_CURSORS = Path(__file__).resolve().parents[1] / "NumberCursors"
DOWNLOADS = NUMBER_CURSORS / "downloads"
SIZES = (32, 48, 64)

# Names used by desktop toolkits, including legacy X11 aliases.
LINUX_NAMES = {
    "Arrow": "default left_ptr arrow top_left_arrow context-menu",
    "Help": ("help left_ptr_help question_arrow whats_this "
             "d9ce0ab605698f320427677b458ad60b 5c6cd98b3f3ebcb1f9c7f1c204630408"),
    "AppStarting": ("progress left_ptr_watch half-busy 00000000000000020006000e7e9ffc3f "
                    "08e8e1c95fe2fc01f976f1e063a24ccd 3ecb610c1bf2410f44200f1e063a24ccd"),
    "Wait": "wait watch",
    "Crosshair": "crosshair cross tcross cell plus color-picker",
    "IBeam": "text xterm ibeam vertical-text",
    "NWPen": "pencil draft draft_large draft_small",
    "No": "not-allowed no-drop dnd-no-drop crossed_circle forbidden circle 03b6e0fcb3499374a867c041f52298f0",
    "SizeNS": ("ns-resize n-resize s-resize row-resize size_ver v_double_arrow sb_v_double_arrow "
               "top_side bottom_side split_v 00008160000006810000408080010102"),
    "SizeWE": ("ew-resize e-resize w-resize col-resize size_hor h_double_arrow sb_h_double_arrow "
               "left_side right_side split_h 028006030e0e7ebffc7f7070c0600140"),
    "SizeNWSE": "nwse-resize nw-resize se-resize size_fdiag top_left_corner bottom_right_corner c7088f0f3e6c8088236ef8e1e3e70000",
    "SizeNESW": "nesw-resize ne-resize sw-resize size_bdiag top_right_corner bottom_left_corner fcf1c3c7cd4491d801f1e1c78f100000",
    "SizeAll": "move all-scroll all-resize fleur size_all grab grabbing openhand closedhand dnd-move dnd-ask",
    "UpArrow": "up-arrow center_ptr",
    "Hand": ("pointer hand1 hand2 pointing_hand link alias dnd-link "
             "9d800788f1b08800ae810202380a0822 e29285e634086352946a0e7090d73106"),
}

# Mousecape uses CoreGraphics cursor identifiers and numbered system roles.
MAC_GRAPHICS = {
    "Arrow": ("Arrow", "ArrowCtx", "ArrowS"),
    "IBeam": ("IBeam", "IBeamXOR", "IBeamS"),
    "Wait": ("Wait",),
    "SizeAll": ("Move",),
    "UpArrow": ("Alias",),
}
MAC_ROLES = {
    "Hand": (2, 13), "No": (3,), "AppStarting": (4,),
    "Crosshair": (7, 8, 20, 41), "SizeAll": (11, 12, 39),
    "SizeWE": (17, 18, 19, 27, 28, 38), "SizeNS": (21, 22, 23, 31, 32, 36),
    "Arrow": (24,), "IBeam": (26,), "SizeNESW": (29, 30, 37),
    "SizeNWSE": (33, 34, 35), "Help": (40,),
}


@dataclass(frozen=True)
class Frame:
    size: int
    x: int
    y: int
    rgba: bytes


def read_cur(data):
    reserved, kind, count = unpack_from("<HHH", data)
    if (reserved, kind) != (0, 2):
        raise ValueError("Expected a Windows CUR image")
    images = {}
    for index in range(count):
        width, height, _, _, x, y, length, offset = unpack_from("<BBBBHHII", data, 6 + 16 * index)
        header, dib_width, dib_height, planes, bits, compression = unpack_from("<IiiHHI", data, offset)
        if (width != height or not 0 <= x < width or not 0 <= y < height
                or (dib_width, dib_height, planes, bits, compression) != (width, height * 2, 1, 32, 0)
                or header < 40 or header + width * height * 4 > length or offset + length > len(data)):
            raise ValueError("Expected a square 32-bit CUR bitmap with a valid hotspot")
        stride = width * 4
        pixels = offset + header
        bgra = b"".join(data[pixels + row * stride:pixels + (row + 1) * stride]
                        for row in range(height - 1, -1, -1))
        rgba = bytearray(bgra)
        rgba[0::4], rgba[2::4] = bgra[2::4], bgra[0::4]
        images[width] = Frame(width, x, y, bytes(rgba))
    if tuple(sorted(images)) != SIZES:
        raise ValueError(f"Expected cursor sizes {SIZES}, got {sorted(images)}")
    return images


def riff_chunks(data):
    offset = 0
    while offset < len(data):
        kind, size = unpack_from("<4sI", data, offset)
        end = offset + 8 + size
        if end > len(data):
            raise ValueError("Truncated ANI chunk")
        yield kind, data[offset + 8:end]
        offset = end + size % 2


def read_ani(data):
    if data[:4] != b"RIFF" or data[8:12] != b"ACON" or unpack_from("<I", data, 4)[0] != len(data) - 8:
        raise ValueError("Expected a Windows ANI file")
    chunks = {kind: payload for kind, payload in riff_chunks(data[12:])
              if kind != b"LIST" or payload.startswith(b"fram")}
    _, frame_count, steps, _, _, _, _, default_rate, flags = unpack_from("<9I", chunks[b"anih"])
    frames = [read_cur(frame) for kind, frame in riff_chunks(chunks[b"LIST"][4:]) if kind == b"icon"]
    order = unpack_from(f"<{steps}I", chunks[b"seq "]) if flags & 2 else range(steps)
    rates = unpack_from(f"<{steps}I", chunks[b"rate"]) if b"rate" in chunks else [default_rate] * steps
    if len(frames) != frame_count or not 0 < steps <= 24:
        raise ValueError("Expected an ANI with 1 to 24 cursor frames")
    if any(index >= frame_count for index in order) or not all(rates):
        raise ValueError("Invalid ANI frame sequence or timing")
    return [(frames[index], rate) for index, rate in zip(order, rates)]


def read_windows(source):
    with ZipFile(source) as archive:
        scripts = [PurePosixPath(name) for name in archive.namelist() if PurePosixPath(name).name == "Register-Scheme.ps1"]
        if len(scripts) != 1:
            raise ValueError("Expected one Windows cursor scheme in the input ZIP")
        root = scripts[0].parent
        files = {}
        for member in archive.infolist():
            path = PurePosixPath(member.filename)
            if not member.is_dir() and path.is_relative_to(root):
                relative = path.relative_to(root)
                if ".." in relative.parts or "\\" in member.filename or ":" in member.filename or path.is_absolute():
                    raise ValueError(f"Unsafe archive path: {member.filename}")
                files[relative] = archive.read(member)
    cursors = {}
    for path, data in files.items():
        if path.parent != PurePosixPath("cursors"):
            continue
        if path.suffix == ".cur":
            cursors[path.stem] = [(read_cur(data), 0)]
        elif path.suffix == ".ani":
            cursors[path.stem] = read_ani(data)
    return files, cursors


def png(size, frames):
    def chunk(kind, payload):
        return pack(">I", len(payload)) + kind + payload + pack(">I", zlib.crc32(kind + payload))

    stride = size * 4
    rows = b"".join(b"\0" + frame.rgba[offset:offset + stride]
                    for frame in frames for offset in range(0, len(frame.rgba), stride))
    header = pack(">IIBBBBB", size, size * len(frames), 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"sRGB", b"\0")
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


def cape(cursors):
    entries = {}
    for name in sorted(MAC_GRAPHICS.keys() | MAC_ROLES.keys()):
        frames = cursors[name]
        reference = frames[0][0][64]
        if any((images[64].x, images[64].y, rate) != (reference.x, reference.y, frames[0][1])
               for images, rate in frames):
            raise ValueError(f"Mousecape needs a consistent hotspot and duration for {name}")
        entry = {
            "FrameCount": len(frames), "FrameDuration": frames[0][1] / 60,
            "PointsWide": 32.0, "PointsHigh": 32.0,
            "HotSpotX": reference.x / 2, "HotSpotY": reference.y / 2,
            # Each representation is a vertical strip of frames at 1x or 2x.
            "Representations": [png(size, [images[size] for images, _ in frames]) for size in (32, 64)],
        }
        for identifier in MAC_GRAPHICS.get(name, ()):
            entries[f"com.apple.coregraphics.{identifier}"] = entry
        for identifier in MAC_ROLES.get(name, ()):
            entries[f"com.apple.cursor.{identifier}"] = entry
    return plistlib.dumps({
        "Author": "31916", "CapeName": NAME, "CapeVersion": 1.0, "Cloud": False,
        "HiDPI": True, "Identifier": "ch.31916.number-cursors-4", "MinimumVersion": 2.0,
        "Version": 2.0, "Cursors": entries,
    }, fmt=plistlib.FMT_BINARY)


def milliseconds(jiffies):
    return round(jiffies * 1000 / 60)


def xcursor(frames):
    image_type = 0xFFFD0002
    count = len(frames) * len(SIZES)
    toc = bytearray(pack("<4sIII", b"Xcur", 16, 0x10000, count))
    chunks = bytearray()
    for size in SIZES:
        for images, rate in frames:
            frame = images[size]
            toc += pack("<III", image_type, size, 16 + count * 12 + len(chunks))
            chunks += pack("<9I", 36, image_type, size, 1, size, size, frame.x, frame.y, milliseconds(rate))
            # Xcursor stores premultiplied ARGB in little-endian order.
            for red, green, blue, alpha in iter_unpack("4B", frame.rgba):
                chunks.extend(((blue * alpha + 127) // 255, (green * alpha + 127) // 255,
                               (red * alpha + 127) // 255, alpha))
    return toc + chunks


def scalable(frames):
    files = {}
    metadata = []
    for index, (images, rate) in enumerate(frames):
        frame = images[64]
        filename = f"frame-{index + 1:02}.svg"
        encoded = base64.b64encode(png(frame.size, [frame])).decode("ascii")
        files[filename] = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
                           f'width="{frame.size}" height="{frame.size}" viewBox="0 0 {frame.size} {frame.size}">'
                           f'<image width="{frame.size}" height="{frame.size}" xlink:href="data:image/png;base64,{encoded}"/>'
                           '</svg>')
        entry = {"filename": filename, "nominal_size": frame.size, "hotspot_x": frame.x, "hotspot_y": frame.y}
        if len(frames) > 1:
            entry["delay"] = milliseconds(rate)
        metadata.append(entry)
    files["metadata.json"] = json.dumps(metadata, indent=2) + "\n"
    return files


def write_linux(archive, cursors):
    theme = f"Linux/{STEM}"
    archive.writestr(f"{theme}/index.theme", f"[Icon Theme]\nName={NAME}\nComment=Number cursors by 31916\nInherits=Adwaita\n")
    for name, aliases in LINUX_NAMES.items():
        bitmap = xcursor(cursors[name])
        svg_files = scalable(cursors[name])
        for alias in aliases.split():
            # Regular files also work with ZIP extractors that discard symlinks.
            archive.writestr(f"{theme}/cursors/{alias}", bitmap)
            if not (len(alias) == 32 and all(character in "0123456789abcdef" for character in alias)):
                for filename, content in svg_files.items():
                    archive.writestr(f"{theme}/cursors_scalable/{alias}/{filename}", content)


def build(windows_zip):
    windows_files, cursors = read_windows(windows_zip)
    windows_files[PurePosixPath("README.txt")] = (NUMBER_CURSORS / "README.txt").read_bytes()
    target = DOWNLOADS / f"{STEM}.zip"
    with NamedTemporaryFile(dir=DOWNLOADS, suffix=".zip", delete=False) as temporary:
        pending = Path(temporary.name)
    try:
        with ZipFile(pending, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for path, data in windows_files.items():
                archive.writestr(f"Windows/{path}", data)
            archive.writestr(f"macOS/{STEM}.cape", cape(cursors))
            write_linux(archive, cursors)
        pending.replace(target)
    finally:
        pending.unlink(missing_ok=True)
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("windows_zip", type=Path, help="ZIP containing the Windows scheme and cursor files")
    print(build(parser.parse_args().windows_zip))
