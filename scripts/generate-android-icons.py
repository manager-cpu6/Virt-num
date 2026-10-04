from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("android/app/src/main/res")
# Android launcher densities (pixels for a 48dp legacy icon).
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

def draw_icon(size: int, foreground_only: bool = False) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0) if foreground_only else (15, 22, 32, 255))
    draw = ImageDraw.Draw(image)
    if not foreground_only:
        # Deep navy tile with a teal halo and rounded square silhouette.
        pad = int(size * 0.035)
        draw.rounded_rectangle((pad, pad, size-pad, size-pad), radius=int(size*0.25), fill=(16, 25, 36, 255))
        draw.ellipse((size*.12, size*.08, size*.90, size*.86), fill=(23, 100, 102, 100))
    # Draw a bold custom N mark, using vector-like strokes for crisp small icons.
    stroke = max(2, int(size * 0.105))
    left, right = size*.29, size*.71
    top, bottom = size*.25, size*.75
    teal = (100, 245, 220, 255)
    draw.line((left, bottom, left, top), fill=teal, width=stroke)
    draw.line((left, top, right, bottom), fill=teal, width=stroke)
    draw.line((right, bottom, right, top), fill=teal, width=stroke)
    # Round the line joints with small circles.
    radius = stroke // 2
    for x, y in [(left, top), (left, bottom), (right, top), (right, bottom)]:
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=teal)
    return image

for density, size in DENSITIES.items():
    folder = ROOT / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = draw_icon(size)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")
    fg_size = int(size * 3)
    draw_icon(fg_size, foreground_only=True).save(folder / "ic_launcher_foreground.png")

# Adaptive icon resources (Android 8+).
anydpi = ROOT / "mipmap-anydpi-v26"
anydpi.mkdir(parents=True, exist_ok=True)
(anydpi / "ic_launcher.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '  <background android:drawable="@color/numelixa_icon_background"/>\n'
    '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    '</adaptive-icon>\n', encoding="utf-8")
(anydpi / "ic_launcher_round.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '  <background android:drawable="@color/numelixa_icon_background"/>\n'
    '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
    '</adaptive-icon>\n', encoding="utf-8")
values = ROOT / "values"
values.mkdir(parents=True, exist_ok=True)
colors = values / "numelixa-icon-colors.xml"
colors.write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<resources><color name="numelixa_icon_background">#101923</color></resources>\n',
    encoding="utf-8")
print("Generated Numelixa launcher icons for all Android densities.")
