#!/usr/bin/env python3
"""Gera os assets do app Cobrinha (pixel art, paleta LCD verde).

Uso: python3 scripts/generate-assets.py   (requer Pillow)

Saidas:
  assets/icon.png, android-icon-*.png, splash-icon.png, favicon.png
  store/feature-graphic.png (Play Store, 1024x500)
  store/social-preview.png  (GitHub, 1280x640)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
STORE = ROOT / "store"
ASSETS.mkdir(exist_ok=True)
STORE.mkdir(exist_ok=True)

# Paleta
DARK = (15, 56, 15)  # #0F380F
MID = (48, 98, 48)  # #306230
LIGHT = (139, 172, 15)  # #8BAC0F
PALE = (155, 188, 15)  # #9BBC0F
GRID = (143, 176, 15)
CORAL = (214, 69, 107)  # #D6456B
HILITE = (255, 205, 214)
WHITE = (255, 255, 255)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

# ---------------------------------------------------------------- pixel art
ART = 12  # grade 12x12


def snake_cells():
    body = set()

    def rect(x0, x1, y0, y1):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                body.add((x, y))

    rect(2, 9, 1, 2)  # barra de cima (cabeca na direita)
    rect(2, 3, 3, 4)  # curva esquerda
    rect(2, 9, 5, 6)  # barra do meio
    rect(8, 9, 7, 8)  # curva direita
    rect(1, 9, 9, 10)  # barra de baixo
    body.add((0, 10))  # ponta da cauda
    head = {(8, 1), (9, 1), (8, 2), (9, 2)}
    eye = {(9, 1)}
    tongue = {(10, 2), (11, 1), (11, 3)}
    apple = {(6, 3), (7, 3), (6, 4), (7, 4)}
    hi = {(6, 3)}
    return body, head, eye, tongue, apple, hi


def cell_rect(ox, oy, cell, x, y, inset):
    return [
        ox + x * cell + inset,
        oy + y * cell + inset,
        ox + (x + 1) * cell - inset - 1,
        oy + (y + 1) * cell - inset - 1,
    ]


MODES = {
    "lcd": dict(body=DARK, tex=MID, head=DARK, eye=PALE, tongue=CORAL, apple=CORAL, hi=HILITE),
    "inv": dict(body=PALE, tex=LIGHT, head=PALE, eye=DARK, tongue=CORAL, apple=CORAL, hi=HILITE),
    "mono": dict(body=WHITE, tex=None, head=WHITE, eye=None, tongue=WHITE, apple=WHITE, hi=None),
}


def draw_art(draw, ox, oy, cell, mode):
    p = MODES[mode]
    gap = max(1, round(cell * 0.055))
    tex_inset = gap + round(cell * 0.24)
    body, head, eye, tongue, apple, hi = snake_cells()

    for (x, y) in sorted(body):
        if (x, y) in eye and p["eye"] is None:
            continue  # furo (monocromatico)
        color = p["head"] if (x, y) in head else p["body"]
        draw.rectangle(cell_rect(ox, oy, cell, x, y, gap), fill=color)
        if p["tex"] and (x, y) not in head and (x + y) % 2 == 0:
            draw.rectangle(cell_rect(ox, oy, cell, x, y, tex_inset), fill=p["tex"])
    for (x, y) in eye:
        if p["eye"] is not None:
            draw.rectangle(cell_rect(ox, oy, cell, x, y, gap + round(cell * 0.18)), fill=p["eye"])
    for (x, y) in tongue:
        draw.rectangle(cell_rect(ox, oy, cell, x, y, gap + round(cell * 0.12)), fill=p["tongue"])
    for (x, y) in apple:
        draw.rectangle(cell_rect(ox, oy, cell, x, y, gap), fill=p["apple"])
    for (x, y) in hi:
        if p["hi"] is not None:
            draw.rectangle(cell_rect(ox, oy, cell, x, y, gap + round(cell * 0.2)), fill=p["hi"])


def lcd_bg(w, h, step, line=2):
    img = Image.new("RGB", (w, h), PALE)
    d = ImageDraw.Draw(img)
    for x in range(0, w, step):
        d.rectangle([x, 0, x + line - 1, h], fill=GRID)
    for y in range(0, h, step):
        d.rectangle([0, y, w, y + line - 1], fill=GRID)
    return img


# ---------------------------------------------------------------- fonte pixel
GLYPHS = {
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
}


def pixel_text(draw, text, x, y, cell, color, shadow=None):
    def paint(ox, oy, col):
        for i, ch in enumerate(text):
            for r, row in enumerate(GLYPHS[ch]):
                for c, v in enumerate(row):
                    if v == "#":
                        px = ox + (i * 6 + c) * cell
                        py = oy + r * cell
                        draw.rectangle([px + 1, py + 1, px + cell - 2, py + cell - 2], fill=col)

    if shadow:
        paint(x + cell // 2, y + cell // 2, shadow)
    paint(x, y, color)


def text_width(text, cell):
    return (len(text) * 6 - 1) * cell


# ---------------------------------------------------------------- icones
def make_icons():
    size = 1024
    cell = 56
    off = (size - ART * cell) // 2  # 176

    # icon.png (fundo + cobra)
    icon = lcd_bg(size, size, cell)
    draw_art(ImageDraw.Draw(icon), off, off, cell, "lcd")
    icon.save(ASSETS / "icon.png")

    # adaptive: fundo
    lcd_bg(size, size, cell).save(ASSETS / "android-icon-background.png")

    # adaptive: frente (transparente)
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_art(ImageDraw.Draw(fg), off, off, cell, "lcd")
    fg.save(ASSETS / "android-icon-foreground.png")

    # adaptive: monocromatico
    mono = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_art(ImageDraw.Draw(mono), off, off, cell, "mono")
    mono.save(ASSETS / "android-icon-monochrome.png")

    # splash (transparente, paleta invertida; fundo vem do app.json)
    splash = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_art(ImageDraw.Draw(splash), off, off, cell, "inv")
    splash.save(ASSETS / "splash-icon.png")

    # favicon
    icon.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")


# ---------------------------------------------------------------- banners
def make_banner(w, h, cell, title_cell, subtitle_size, path):
    img = Image.new("RGB", (w, h), DARK)
    margin = 28
    pw, ph = w - 2 * margin, h - 2 * margin
    panel = lcd_bg(pw, ph, cell)
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=22, fill=255)
    img.paste(panel, (margin, margin), mask)
    d = ImageDraw.Draw(img)

    ox = margin + 2 * cell
    oy = (h - ART * cell) // 2
    draw_art(d, ox, oy, cell, "lcd")

    title = "COBRINHA"
    tx = ox + ART * cell + 2 * cell
    tw = text_width(title, title_cell)
    assert tx + tw <= w - margin - 20, f"titulo nao cabe: {tx + tw} > {w - margin - 20}"
    font = ImageFont.truetype(FONT_BOLD, subtitle_size)
    sub = "JOGO DA COBRINHA PARA ANDROID"
    sub_h = subtitle_size
    block = 7 * title_cell + round(title_cell * 2.6) + sub_h
    ty = (h - block) // 2
    pixel_text(d, title, tx, ty, title_cell, DARK, shadow=LIGHT)
    d.text((tx, ty + 7 * title_cell + round(title_cell * 2.6)), sub, font=font, fill=MID)
    img.save(path)


def main():
    make_icons()
    make_banner(1024, 500, cell=30, title_cell=9, subtitle_size=24, path=STORE / "feature-graphic.png")
    make_banner(1280, 640, cell=38, title_cell=11, subtitle_size=30, path=STORE / "social-preview.png")
    print("ok")


if __name__ == "__main__":
    main()
