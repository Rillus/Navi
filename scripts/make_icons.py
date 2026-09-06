import zlib
import struct
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    rows = []
    cx = cy = size / 2
    r_outer = size * 0.42
    r_inner = size * 0.28
    for y in range(size):
        row = bytearray()
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            # navy background
            r, g, b = 11, 28, 36
            if dist < r_outer:
                r, g, b = 26, 92, 110
            if dist < r_inner:
                r, g, b = 11, 28, 36
            # north triangle
            if dy < 0 and abs(dx) < -dy * 0.45 and dist < r_outer * 0.9:
                r, g, b = 232, 196, 104
            row.extend((r, g, b))
        rows.append(b"\x00" + bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


out = Path("/workspace/public/icons")
out.mkdir(parents=True, exist_ok=True)
write_png(out / "icon-192.png", 192)
write_png(out / "icon-512.png", 512)
print("wrote icons")
