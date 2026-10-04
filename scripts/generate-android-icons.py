from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path("android/app/src/main/res")
DENSITIES = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}

def lerp(a,b,t):
    return tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))

def draw_icon(size:int, foreground_only:bool=False)->Image.Image:
    image=Image.new("RGBA",(size,size),(0,0,0,0) if foreground_only else (2,8,23,255))
    draw=ImageDraw.Draw(image)
    if not foreground_only:
        pad=max(1,int(size*.02))
        for y in range(size):
            t=y/max(1,size-1)
            c=lerp((2,8,23),(6,27,77),t)
            draw.line((0,y,size,y),fill=(*c,255))
        draw.rounded_rectangle((pad,pad,size-pad,size-pad),radius=int(size*.24),outline=(21,223,255,255),width=max(1,int(size*.012)))
    # Numelixa ribbon N.
    s=max(2,int(size*.105))
    left,right=size*.29,size*.71
    top,bottom=size*.25,size*.72
    cyan=(56,230,239,255)
    blue=(18,57,255,255)
    draw.line((left,bottom,left,top),fill=cyan,width=s)
    draw.line((left,top,right,bottom),fill=blue,width=s)
    draw.line((right,bottom,right,top),fill=cyan,width=s)
    r=s//2
    for x,y in ((left,top),(left,bottom),(right,top),(right,bottom)):
        draw.ellipse((x-r,y-r,x+r,y+r),fill=cyan)
    # Play mark.
    p1=(size*.70,size*.20); p2=(size*.83,size*.285); p3=(size*.70,size*.37)
    draw.polygon((p1,p2,p3),fill=blue)
    return image

for density,size in DENSITIES.items():
    folder=ROOT/f"mipmap-{density}"
    folder.mkdir(parents=True,exist_ok=True)
    icon=draw_icon(size)
    icon.save(folder/"ic_launcher.png")
    icon.save(folder/"ic_launcher_round.png")
    draw_icon(int(size*3),foreground_only=True).save(folder/"ic_launcher_foreground.png")

anydpi=ROOT/"mipmap-anydpi-v26"
anydpi.mkdir(parents=True,exist_ok=True)
xml='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/numelixa_icon_background"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
(anydpi/"ic_launcher.xml").write_text(xml,encoding="utf-8")
(anydpi/"ic_launcher_round.xml").write_text(xml,encoding="utf-8")
values=ROOT/"values"
values.mkdir(parents=True,exist_ok=True)
(values/"numelixa-icon-colors.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="numelixa_icon_background">#020817</color></resources>\n',
    encoding="utf-8"
)
print("Generated Numelixa launcher icons.")
