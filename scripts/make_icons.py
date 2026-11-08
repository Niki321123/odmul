"""Render PNG app icons (Pillow can't read SVG, so the brain is redrawn with primitives)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "src" / "icons"
S = 1024  # draw large, downscale for smooth edges


def draw_icon():
    img = Image.new("RGBA", (S, S), (255, 241, 246, 255))
    d = ImageDraw.Draw(img)
    fill, stroke = (255, 148, 194), (217, 84, 142)
    lobes = [(512, 330, 210), (330, 420, 190), (694, 420, 190), (300, 600, 180), (724, 600, 180), (420, 700, 170), (604, 700, 170), (512, 520, 260)]
    for cx, cy, r in lobes:  # outline pass
        d.ellipse((cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14), fill=stroke)
    for cx, cy, r in lobes:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    d.line((512, 170, 512, 300), fill=stroke, width=16)
    d.arc((330, 230, 440, 340), 270, 90, fill=stroke, width=14)
    d.arc((584, 230, 694, 340), 90, 270, fill=stroke, width=14)
    # happy closed eyes
    d.arc((360, 470, 470, 570), 200, 340, fill=(43, 43, 43), width=26)
    d.arc((554, 470, 664, 570), 200, 340, fill=(43, 43, 43), width=26)
    # smile
    d.chord((420, 540, 604, 720), 0, 180, fill=(122, 42, 69))
    d.chord((470, 640, 554, 712), 0, 180, fill=(255, 143, 177))
    # blush
    d.ellipse((280, 590, 360, 630), fill=(255, 126, 168, 140))
    d.ellipse((664, 590, 744, 630), fill=(255, 126, 168, 140))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    big = draw_icon()
    for size in (180, 192, 512):
        big.resize((size, size), Image.LANCZOS).convert("RGB").save(OUT / f"icon-{size}.png", optimize=True)
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
