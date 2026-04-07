from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
COPY_PATH = ROOT / "src/assets/store-artwork/copy.json"
OUTPUT_DIR = ROOT / "images"


def hex_rgb(value: str) -> tuple[int, int, int]:
    return ImageColor.getrgb(value)


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def load_copy() -> dict:
    return json.loads(COPY_PATH.read_text())


def font(size: int, *, serif: bool = False, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates: list[str]
    if serif:
        candidates = [
            "/System/Library/Fonts/NewYork.ttf",
            "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
            "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
        ]
    elif bold:
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    else:
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)

    return ImageFont.load_default()


def make_gradient(size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        color = blend(start, end, y / max(1, height - 1))
        draw.line((0, y, width, y), fill=color)
    return image


def add_glow(base: Image.Image, center: tuple[float, float], radius: float, color: tuple[int, int, int], opacity: int) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x, y = center
    bounds = (x - radius, y - radius, x + radius, y + radius)
    draw.ellipse(bounds, fill=(*color, opacity))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(10, int(radius * 0.2))))
    base.alpha_composite(overlay)


def rounded_panel(
    draw: ImageDraw.ImageDraw,
    box: tuple[float, float, float, float],
    fill: tuple[int, int, int],
    *,
    radius: int,
    outline: tuple[int, int, int] | None = None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.ImageFont, max_width: int) -> str:
    wrapped_lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            wrapped_lines.append("")
            continue
        line = words[0]
        for word in words[1:]:
            trial = f"{line} {word}"
            if draw.textbbox((0, 0), trial, font=text_font)[2] <= max_width:
                line = trial
            else:
                wrapped_lines.append(line)
                line = word
        wrapped_lines.append(line)
    return "\n".join(wrapped_lines)


def draw_pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    *,
    bg: tuple[int, int, int],
    fg: tuple[int, int, int],
    text_font: ImageFont.ImageFont,
    hpad: int,
    vpad: int,
    radius: int,
) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=text_font)
    width = bbox[2] - bbox[0] + hpad * 2
    height = bbox[3] - bbox[1] + vpad * 2
    x, y = xy
    draw.rounded_rectangle((x, y, x + width, y + height), radius=radius, fill=bg)
    draw.text((x + hpad, y + vpad - 1), text, font=text_font, fill=fg)
    return width, height


def draw_timeline_card(
    base: Image.Image,
    box: tuple[int, int, int, int],
    palette: dict[str, str],
    *,
    dense: bool = False,
    show_tags: bool = True,
) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x1, y1, x2, y2 = box
    rose = hex_rgb(palette["rose"])
    blush = hex_rgb(palette["blush"])
    mist = hex_rgb(palette["mist"])
    white = hex_rgb(palette["white"])
    line = hex_rgb(palette["line"])
    ink = hex_rgb(palette["ink"])

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x1 + 10, y1 + 18, x2 + 10, y2 + 18), radius=28, fill=(126, 45, 63, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)

    rounded_panel(draw, box, white, radius=28)
    rounded_panel(draw, (x1 + 24, y1 + 22, x2 - 24, y1 + 74), mist, radius=18)
    draw.ellipse((x1 + 42, y1 + 38, x1 + 66, y1 + 62), fill=rose)
    draw.rounded_rectangle((x1 + 82, y1 + 41, x1 + 190, y1 + 55), radius=7, fill=blush)
    draw.rounded_rectangle((x1 + 82, y1 + 60, x1 + 152, y1 + 71), radius=6, fill=line)

    cursor_y = y1 + 98
    line_height = 17 if dense else 20
    line_gap = 13 if dense else 15
    widths = [0.86, 0.74, 0.68]
    for index, ratio in enumerate(widths):
        draw.rounded_rectangle(
            (x1 + 30, cursor_y, x1 + 30 + int((x2 - x1 - 72) * ratio), cursor_y + line_height),
            radius=8,
            fill=blush if index == 0 else line,
        )
        cursor_y += line_height + line_gap

    media_top = cursor_y + 10
    media_bottom = y2 - (86 if show_tags else 30)
    media_height = max(36, media_bottom - media_top)
    media_width = int((x2 - x1 - 76) / 2)
    rounded_panel(draw, (x1 + 30, media_top, x1 + 30 + media_width, media_top + media_height), blend(blush, white, 0.2), radius=24)
    rounded_panel(draw, (x1 + 42 + media_width, media_top, x2 - 30, media_top + media_height), blend(line, white, 0.18), radius=24)

    if show_tags:
        pill_font = font(20 if dense else 24, bold=True)
        pill_y = y2 - 64
        pill_x = x1 + 30
        for label in ("Clean", "Read", "Share"):
            pill_w, _ = draw_pill(
                draw,
                (pill_x, pill_y),
                label,
                bg=(255, 245, 247),
                fg=ink,
                text_font=pill_font,
                hpad=18,
                vpad=10,
                radius=18,
            )
            pill_x += pill_w + 12

    base.alpha_composite(overlay)


def draw_brand_corner(draw: ImageDraw.ImageDraw, palette: dict[str, str], *, x: int, y: int, label: str) -> None:
    rose = hex_rgb(palette["rose"])
    white = hex_rgb(palette["white"])
    title_font = font(22, bold=True)
    draw.rounded_rectangle((x, y + 2, x + 22, y + 24), radius=11, fill=white)
    draw.text((x + 5, y + 1), "X", font=font(16, bold=True), fill=rose)
    draw.text((x + 34, y), label, font=title_font, fill=white)


def draw_promo_small(spec: dict, brand: dict, tags: Iterable[str]) -> Image.Image:
    width, height = spec["size"]
    palette = brand["colors"]
    image = make_gradient((width, height), hex_rgb(palette["pink"]), hex_rgb(palette["rose"])).convert("RGBA")
    add_glow(image, (width * 0.15, height * 0.15), width * 0.3, hex_rgb(palette["blush"]), 130)
    add_glow(image, (width * 0.86, height * 0.82), width * 0.22, (255, 255, 255), 70)
    draw = ImageDraw.Draw(image)

    draw_brand_corner(draw, palette, x=24, y=20, label=brand["name"])

    headline_font = font(38, serif=True)
    support_font = font(17)
    headline = wrap_text(draw, spec["headline"], headline_font, 190)
    draw.multiline_text((24, 70), headline, font=headline_font, fill=hex_rgb(palette["white"]), spacing=4)
    if spec["support"]:
        support = wrap_text(draw, spec["support"], support_font, 192)
        draw.multiline_text((24, 166), support, font=support_font, fill=(255, 241, 244), spacing=5)

    tag_font = font(15, bold=True)
    tag_x = 24
    for label in tags:
        pill_w, _ = draw_pill(
            draw,
            (tag_x, 232),
            label,
            bg=(255, 241, 244),
            fg=hex_rgb(palette["rose"]),
            text_font=tag_font,
            hpad=10,
            vpad=6,
            radius=15,
        )
        tag_x += pill_w + 8

    draw_timeline_card(image, (242, 28, 418, 252), palette, dense=True, show_tags=False)
    return image


def draw_promo_marquee(spec: dict, brand: dict, tags: Iterable[str]) -> Image.Image:
    width, height = spec["size"]
    palette = brand["colors"]
    image = make_gradient((width, height), hex_rgb(palette["pink"]), hex_rgb(palette["rose"])).convert("RGBA")
    add_glow(image, (width * 0.18, height * 0.2), width * 0.28, hex_rgb(palette["blush"]), 115)
    add_glow(image, (width * 0.82, height * 0.78), width * 0.18, (255, 255, 255), 60)
    draw = ImageDraw.Draw(image)

    draw_brand_corner(draw, palette, x=72, y=56, label=brand["name"])

    headline_font = font(70, serif=True)
    support_font = font(30)
    draw.multiline_text((72, 132), spec["headline"], font=headline_font, fill=hex_rgb(palette["white"]), spacing=8)
    support = wrap_text(draw, spec["support"], support_font, 540)
    draw.multiline_text((72, 300), support, font=support_font, fill=(255, 241, 244), spacing=8)

    tag_font = font(24, bold=True)
    tag_x = 72
    for label in tags:
        pill_w, _ = draw_pill(
            draw,
            (tag_x, 468),
            label,
            bg=(255, 241, 244),
            fg=hex_rgb(palette["rose"]),
            text_font=tag_font,
            hpad=20,
            vpad=12,
            radius=22,
        )
        tag_x += pill_w + 12

    draw_timeline_card(image, (838, 64, 1320, 500), palette, dense=False, show_tags=True)
    caption_font = font(20, bold=True)
    caption_text = "Cleaner feed. Smoother reading. Export-ready posts."
    caption_x = 992 - int(width * 0.2)
    cleaner_feed_width = draw.textbbox((0, 0), "Cleaner feed.", font=caption_font)[2]
    draw.text((caption_x + cleaner_feed_width, 32), caption_text, font=caption_font, fill=(255, 241, 244))
    return image


def draw_screenshot(spec: dict, brand: dict, tags: Iterable[str]) -> Image.Image:
    width, height = spec["size"]
    palette = brand["colors"]
    image = make_gradient((width, height), hex_rgb(palette["mist"]), hex_rgb(palette["blush"])).convert("RGBA")
    add_glow(image, (width * 0.1, height * 0.1), width * 0.22, hex_rgb(palette["blush"]), 120)
    add_glow(image, (width * 0.78, height * 0.18), width * 0.24, hex_rgb(palette["pink"]), 32)
    add_glow(image, (width * 0.9, height * 0.82), width * 0.18, hex_rgb(palette["rose"]), 40)
    draw = ImageDraw.Draw(image)

    left_x = 74
    top_y = 74
    divider_x = width // 2 + 12

    title_font = font(78, serif=True)
    support_font = font(28)
    eyebrow_font = font(20, bold=True)
    brand_font = font(20, bold=True)

    draw.text((left_x, 30), brand["name"], font=brand_font, fill=hex_rgb(palette["muted"]))
    draw_pill(
        draw,
        (left_x, top_y),
        spec["eyebrow"],
        bg=(255, 255, 255),
        fg=hex_rgb(palette["rose"]),
        text_font=eyebrow_font,
        hpad=16,
        vpad=9,
        radius=18,
    )
    draw.multiline_text((left_x, top_y + 72), spec["headline"], font=title_font, fill=hex_rgb(palette["ink"]), spacing=6)
    support = wrap_text(draw, spec["support"], support_font, 430)
    draw.multiline_text((left_x, top_y + 252), support, font=support_font, fill=hex_rgb(palette["muted"]), spacing=9)

    mini_font = font(16, bold=True)
    tag_y = 668
    tag_x = left_x
    for label in tags:
        pill_w, _ = draw_pill(
            draw,
            (tag_x, tag_y),
            label,
            bg=(255, 255, 255),
            fg=hex_rgb(palette["rose"]),
            text_font=mini_font,
            hpad=12,
            vpad=7,
            radius=16,
        )
        tag_x += pill_w + 10

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Right half intentionally blank for later compositing, but framed.
    panel = (divider_x + 24, 52, width - 54, height - 52)
    rounded_panel(overlay_draw, panel, (255, 255, 255, 145), radius=34, outline=(255, 255, 255, 220), width=2)
    inner = (panel[0] + 34, panel[1] + 34, panel[2] - 34, panel[3] - 34)
    rounded_panel(overlay_draw, inner, (255, 255, 255, 78), radius=26, outline=(247, 200, 209, 210), width=3)

    # Soft guide frame with corner marks, no screenshot content.
    gx1, gy1, gx2, gy2 = inner
    guide = (gx1 + 36, gy1 + 48, gx2 - 36, gy2 - 48)
    overlay_draw.rounded_rectangle(guide, radius=22, outline=(255, 255, 255, 170), width=2)
    guide_color = (255, 79, 109, 110)
    length = 42
    corners = [
        ((guide[0], guide[1]), (guide[0] + length, guide[1]), (guide[0], guide[1] + length)),
        ((guide[2], guide[1]), (guide[2] - length, guide[1]), (guide[2], guide[1] + length)),
        ((guide[0], guide[3]), (guide[0] + length, guide[3]), (guide[0], guide[3] - length)),
        ((guide[2], guide[3]), (guide[2] - length, guide[3]), (guide[2], guide[3] - length)),
    ]
    for corner, horiz, vert in corners:
        overlay_draw.line((*corner, *horiz), fill=guide_color, width=4)
        overlay_draw.line((*corner, *vert), fill=guide_color, width=4)

    image.alpha_composite(overlay)

    divider = ImageDraw.Draw(image)
    divider.rounded_rectangle((divider_x - 2, 88, divider_x + 2, height - 88), radius=2, fill=(247, 200, 209))

    return image


def save_jpeg(image: Image.Image, path: Path) -> None:
    image.convert("RGB").save(path, format="JPEG", quality=95, optimize=True)


def main() -> None:
    payload = load_copy()
    brand = payload["brand"]
    tags = payload["promoTags"]
    OUTPUT_DIR.mkdir(exist_ok=True)

    for name, spec in payload["assets"].items():
        if spec["type"] == "promo-small":
            image = draw_promo_small(spec, brand, tags)
        elif spec["type"] == "promo-marquee":
            image = draw_promo_marquee(spec, brand, tags)
        else:
            image = draw_screenshot(spec, brand, tags)
        save_jpeg(image, OUTPUT_DIR / f"{name}.jpg")


if __name__ == "__main__":
    main()
