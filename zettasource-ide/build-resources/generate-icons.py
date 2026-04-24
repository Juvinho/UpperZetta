"""
generate-icons.py — Generates all installer BMP images and SVG icons
for ZettaSource. Run with: python generate-icons.py

Requires: Pillow (pip install pillow)
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))

def draw_text_centered(draw, text, y, width, size, color, bold=False, italic=False):
    try:
        # Try to load a system font
        font_path = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
        font = ImageFont.truetype(font_path, size)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (width - tw) // 2
    draw.text((x, y), text, fill=color, font=font)

def make_sidebar():
    """164x314px sidebar for NSIS installer"""
    img = Image.new('RGB', (164, 314), color=(13, 13, 13))
    draw = ImageDraw.Draw(img)

    # Accent line at top
    draw.rectangle([(0, 0), (3, 314)], fill=(229, 48, 48))

    # "ZS" logo
    draw_text_centered(draw, "ZS", 80, 164, 42, (229, 48, 48), bold=True)

    # "ZettaSource"
    draw_text_centered(draw, "ZettaSource", 136, 164, 13, (212, 212, 212), bold=True)

    # Subtitle
    draw_text_centered(draw, "IDE for UpperZetta", 155, 164, 10, (106, 106, 106))

    # Divider
    draw.rectangle([(20, 175), (144, 176)], fill=(34, 34, 34))

    # Version
    draw_text_centered(draw, "v1.0.0", 290, 164, 9, (58, 58, 58))

    img.save(os.path.join(OUT, "installer-sidebar.bmp"), "BMP")
    print("✓ installer-sidebar.bmp (164x314)")

def make_header():
    """150x57px header for NSIS installer"""
    img = Image.new('RGB', (150, 57), color=(13, 13, 13))
    draw = ImageDraw.Draw(img)

    # "ZS" logo left
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
    except:
        font = ImageFont.load_default()
    draw.text((12, 16), "ZS", fill=(229, 48, 48), font=font)

    # Bottom accent line
    draw.rectangle([(0, 54), (150, 57)], fill=(229, 48, 48))

    img.save(os.path.join(OUT, "installer-header.bmp"), "BMP")
    print("✓ installer-header.bmp (150x57)")

def make_icon_base(size, bg, text, text_color, badge=None, badge_color=None):
    """Create a square icon image"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background
    r = max(2, size // 8)
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=r, fill=bg)

    # Text
    font_size = int(size * 0.42)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - size // 16
    draw.text((x, y), text, fill=text_color, font=font)

    # Badge
    if badge:
        br = max(3, size // 10)
        bx = size - br * 2 - 2
        by = size - br * 2 - 2
        draw.ellipse([(bx, by), (size - 2, size - 2)], fill=badge_color)
        try:
            bf = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", br)
        except:
            bf = ImageFont.load_default()
        draw.text((bx + 2, by + 1), badge, fill=(255, 255, 255), font=bf)

    return img

def save_ico(name, images):
    """Save multiple sizes as .ico — must pass largest image first (256x256 base)"""
    path = os.path.join(OUT, name)
    base = images[-1]  # 256x256 is the last in the list
    sizes = [(img.width, img.height) for img in images]
    base.save(path, format='ICO', sizes=sizes)
    print(f"✓ {name}")

def save_png(name, img):
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print(f"✓ {name}")

def generate_all():
    sizes = [16, 32, 48, 64, 128, 256]

    # Main app icon (ZS — dark bg, red text)
    app_icons = [make_icon_base(s, (13, 13, 13), "ZS", (229, 48, 48)) for s in sizes]
    save_ico("icon.ico", app_icons)
    save_png("icon.png", app_icons[-1])  # 256x256 PNG for Linux

    # .uz file icon (UZ — dark, red, no badge)
    uz_icons = [make_icon_base(s, (17, 17, 17), "UZ", (229, 48, 48)) for s in sizes]
    save_ico("uz-file.ico", uz_icons)

    # .uzs sealed icon (UZ — darker red, no badge — lock implied by color)
    uzs_icons = [make_icon_base(s, (17, 17, 17), "UZ", (192, 22, 22)) for s in sizes]
    save_ico("uzs-file.ico", uzs_icons)

    # .uzb bytecode icon (UZ — gray, red badge "B")
    uzb_icons = [make_icon_base(s, (17, 17, 17), "UZ", (106, 106, 106), badge="B", badge_color=(229, 48, 48)) for s in sizes]
    save_ico("uzb-file.ico", uzb_icons)

    print("\n✅ All icons generated in:", OUT)

if __name__ == "__main__":
    make_sidebar()
    make_header()
    generate_all()
