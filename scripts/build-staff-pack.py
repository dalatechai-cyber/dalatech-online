#!/usr/bin/env python3
"""Build the pixel-art pack for the /office page.

Composes the four AI staff from LimeZu's character generator layers, picks the
office props the page uses, shifts their colours toward the site palette and
packs everything into one atlas plus a manifest.

    python3 scripts/build-staff-pack.py

Outputs
    public/office/staff.png      the atlas (the only art that ships)
    src/office/staff.json        atlas rects + animation strips

The LimeZu sources are licensed and not redistributable: assets-src/office/limezu
is gitignored, only the derived atlas is committed. Requires Pillow.

Manifest shape:
    tile      art pixels per floor tile (32)
    atlas     URL of the atlas; width/height its size in pixels
    sprites   { id: {x, y, w, h, screens?: [{x, y, w, h}]} }   screens = glass to draw activity on
    chars     { id: { anim: {x, y, w, h, n} } }   n frames laid out left to right
"""
import colorsys
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LZ = ROOT / "assets-src" / "office" / "limezu"
ATLAS_OUT = ROOT / "public" / "office" / "staff.png"
MANIFEST_OUT = ROOT / "src" / "office" / "staff.json"

OFFICE = LZ / "Modern_Office_Revamped_v1.2" / "4_Modern_Office_singles" / "32x32" / "Modern_Office_Singles_32x32_{}.png"
THEMES = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Theme_Sorter_Singles_32x32"
KITCHEN = THEMES / "12_Kitchen_Singles_32x32" / "Kitchen_Singles_32x32_{}.png"
BEDROOM = THEMES / "4_Bedroom_Singles_32x32" / "Bedroom_Singles_32x32_{}.png"
CONDO = THEMES / "26_Condominium_Singles_32x32" / "Condominium_Singles_32x32_{}.png"
ROOM_OFFICE = LZ / "Modern_Office_Revamped_v1.2" / "1_Room_Builder_Office" / "Room_Builder_Office_32x32.png"
ROOM_GENERIC = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Room_Builder_32x32.png"
GEN = LZ / "moderninteriors-win" / "2_Characters" / "Character_Generator"
EMOTES = LZ / "moderninteriors-win" / "4_User_Interface_Elements" / "UI_thinking_emotes_animation_32x32.png"

# ---------------------------------------------------------------- palette
BRAND = {"light": "#5E9BFF", "base": "#3B82F6", "shade": "#2456B8", "dark": "#1A3F8F"}
HAIR_DARK = {"light": "#7A5240", "base": "#5A3A2C", "shade": "#3F281E"}
PAPER = {"hi": "#E6ECFF", "lo": "#B7C2E0"}
NAVY_HUE = 222 / 360
# LimeZu's outline greys: already near-navy, they give every object its edge.
OUTLINES = {(0x3A, 0x3A, 0x50), (0x46, 0x46, 0x5E), (0x56, 0x59, 0x72), (0x6C, 0x6E, 0x85), (0, 0, 0)}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hls(rgb):
    r, g, b = (c / 255 for c in rgb)
    return colorsys.rgb_to_hls(r, g, b)


def from_hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


def map_colours(img, cmap):
    """Exact colour swaps; pixels not in the map are left alone."""
    img = img.convert("RGBA")
    if not cmap:
        return img
    px = img.load()
    w, h = img.size
    table = {hex_rgb(k): hex_rgb(v) for k, v in cmap.items()}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return img


def tint_layer(img, shades):
    """Recolour a generator layer: its three main colours, darkest to lightest,
    become `shades` (dark, base, light). Outlines and highlights stay."""
    img = img.convert("RGBA")
    counts = {}
    for r, g, b, a in img.getdata():
        if a and (r, g, b) not in OUTLINES and (r, g, b) != (0, 0, 0):
            counts[(r, g, b)] = counts.get((r, g, b), 0) + 1
    main = sorted(sorted(counts, key=lambda c: -counts[c])[:3], key=lambda c: hls(c)[1])
    cmap = {"#%02x%02x%02x" % c: shades[i] for i, c in enumerate(main)}
    return map_colours(img, cmap)


def rule_colours(img, rule):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    cache = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            k = (r, g, b)
            if k not in cache:
                cache[k] = rule(k)
            px[x, y] = cache[k] + (a,)
    return img


def furniture_rule(rgb):
    """Night office: greys and whites go navy, wood stays warm but muted,
    screens, plants, paper and outlines keep their colour."""
    if rgb in OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    hue = h * 360
    if s < 0.16:
        if l > 0.9:
            return rgb
        return from_hls(NAVY_HUE, 0.12 + l * 0.55, 0.26)
    if 15 <= hue <= 48:
        return from_hls(h, l * 0.78, s * 0.55)
    if 80 <= hue <= 170 or 190 <= hue <= 250:
        return rgb
    if 240 < hue < 300 and s < 0.35:
        return from_hls(NAVY_HUE, 0.12 + l * 0.55, 0.28)
    return from_hls(NAVY_HUE, 0.12 + l * 0.55, min(0.45, s * 0.6))


def surface_rule(rgb):
    """Desks and chairs: a lighter navy-grey so a surface reads against the wall."""
    if rgb in OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    if s < 0.16 or (240 < h * 360 < 300 and s < 0.35):
        return from_hls(NAVY_HUE, 0.26 + l * 0.6, 0.20)
    return furniture_rule(rgb)


def wall_rule(rgb):
    """Daylight wall: a muted periwinkle-grey the scene grades darker at night.
    The white band on the top tile is the ceiling edge; it stays pale."""
    if rgb in OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    if l > 0.85:
        return from_hls(NAVY_HUE, 0.64, 0.12)
    return from_hls(NAVY_HUE, 0.26 + l * 0.46, 0.22)


def floor_rule(rgb):
    """Daylight carpet, a step darker than the wall so the floor line reads."""
    h, l, s = hls(rgb)
    return from_hls(NAVY_HUE, 0.15 + l * 0.40, 0.22)


def crop_alpha(img):
    bb = img.getbbox()
    return img.crop(bb) if bb else img


def screen_rects(img):
    """Rectangles of blue glass inside a sprite, one per screen."""
    px = img.load()
    w, h = img.size
    cols = [False] * w
    pts = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            hh, l, s = hls((r, g, b))
            if 195 <= hh * 360 <= 240 and s > 0.45 and l > 0.35:
                cols[x] = True
                pts.append((x, y))
    rects = []
    x = 0
    while x < w:
        if not cols[x]:
            x += 1
            continue
        x0 = x
        while x < w and cols[x]:
            x += 1
        ys = [py for (qx, py) in pts if x0 <= qx < x]
        rects.append({"x": x0, "y": min(ys), "w": x - x0, "h": max(ys) - min(ys) + 1})
    return rects


def single(path, rule=furniture_rule, cmap=None, screens=False):
    im = crop_alpha(Image.open(path).convert("RGBA"))
    im = map_colours(im, cmap)
    entry = {}
    if screens:
        entry["screens"] = screen_rects(im)
    if rule:
        im = rule_colours(im, rule)
    return im, entry


# ---------------------------------------------------------------- props
def props():
    O = lambda n: str(OFFICE).format(n)
    K = lambda n: str(KITCHEN).format(n)
    B = lambda n: str(BEDROOM).format(n)
    C = lambda n: str(CONDO).format(n)
    gold_lamp = {"#e2f2f3": "#F59E0B", "#cce6ec": "#D98A0A", "#d4dee6": "#C27C0B", "#bad2e0": "#B06E0A",
                 "#a4bbd5": "#8F5A0A", "#91a5cf": "#7A4C0A", "#738ca8": "#5C3808"}
    off_lamp = {"#e2f2f3": "#3A4478", "#cce6ec": "#3A4478", "#d4dee6": "#3A4478", "#bad2e0": "#343D6A",
                "#a4bbd5": "#2A3358", "#91a5cf": "#2A3358", "#738ca8": "#1F274A"}
    S = {
        "DESK_L": single(O(219), rule=surface_rule),
        "DESK_M": single(O(220), rule=surface_rule),
        "DESK_R": single(O(221), rule=surface_rule),
        "CHAIR": single(O(101), rule=surface_rule),
        "CHAIR_2": single(O(102), rule=surface_rule),
        "MONITOR": single(O(130), screens=True),
        "MONITOR_KB": single(O(133), screens=True),
        "LAPTOP": single(O(136), screens=True),
        "DUAL": single(O(227), screens=True),
        "KEYBOARD": single(O(128)),
        "DESK_PHONE": single(O(119)),
        "LAMP": single(O(142), cmap=gold_lamp),
        "LAMP_OFF": single(O(142), cmap=off_lamp),
        "PRINTER": single(O(149)),
        "PAPERS": single(O(153)),
        "PAPER_STACK": single(O(154)),
        "TRAY": single(O(155)),
        "PLANT": single(O(98)),
        "PLANT_2": single(O(99)),
        "PLANT_3": single(O(100)),
        "CABINET": single(O(180)),
        "WHITEBOARD": single(O(171)),
        "COFFEE": single(O(317)),
        "STICKY": single(B(452)),
        "BOOKSHELF": single(C(29)),
        "CLOCK": single(C(9)),
        # the office around the desks: what makes the room read as one
        "WHITEBOARD_CHART": single(O(172)),
        "WHITEBOARD_LINE": single(O(171)),
        "POST": single(O(207), rule=surface_rule),
        "PANEL": single(O(208), rule=surface_rule),
        "COOLER": single(O(173)),
        "PRINTER_STAND": single(O(177)),
        "CERT": single(O(113)),
        "NOTICE": single(O(116)),
        "BUSH": single(O(337)),
        "BIN": single(O(329)),
        "CHAIR_ORANGE": single(O(107), rule=surface_rule),
    }
    # walls from the generic room builder; floor carpet from the office builder
    gb = Image.open(ROOM_GENERIC).convert("RGBA")
    tile = lambda c, r: gb.crop((c * 32, r * 32, (c + 1) * 32, (r + 1) * 32))
    wall_top = tile(22, 15)
    wall_bottom = tile(22, 16)
    face = wall_bottom.crop((0, 0, 32, 16))
    wall_mid = Image.new("RGBA", (32, 32))
    wall_mid.paste(face, (0, 0))
    wall_mid.paste(face, (0, 16))
    # the bottom tile's last 12 rows: a strip of face over the skirting board
    skirt = wall_bottom.crop((0, 20, 32, 32))
    for sid, im in (("WALL_TOP", wall_top), ("WALL_MID", wall_mid), ("WALL_BOTTOM", wall_bottom), ("SKIRT", skirt)):
        S[sid] = (rule_colours(im, wall_rule), {})
    rb = Image.open(ROOM_OFFICE).convert("RGBA")
    S["FLOOR"] = (rule_colours(rb.crop((320, 160, 384, 224)), floor_rule), {})
    # speech bubbles: the "..." thinking emote and the heart one, five growing frames each
    em = Image.open(EMOTES).convert("RGBA")
    def emote(row, col0, n):
        strip = Image.new("RGBA", (n * 32, 32))
        for i in range(n):
            strip.paste(em.crop(((col0 + i) * 32, row * 32, (col0 + i + 1) * 32, (row + 1) * 32)), (i * 32, 0))
        return (strip, {"n": n})
    S["BUBBLE"] = emote(0, 0, 5)   # the "..." thought bubble growing
    S["HEART"] = emote(2, 0, 5)    # the bubble growing into a heart (row 1 was the sheet's sample dots)
    S["MSG"] = emote(6, 8, 2)      # a message box: Ара receives one, Нова sends them
    S["TYPING"] = emote(9, 2, 2)   # the "..." dots
    S["STAR"] = emote(6, 4, 2)     # a sparkle, for a satisfied customer
    S["ALERT"] = emote(4, 0, 2)    # "!" — an incoming call
    S["DOLLAR"] = emote(4, 2, 2)   # a sale, for Веда's report
    return S


# ---------------------------------------------------------------- characters
FW, FH = 32, 64
# LimeZu 32x32 sheets: rows of 32x64 frames. The idle row runs right, up,
# left, down; the sitting row only has side views, so a person at a desk
# facing the camera uses the idle frames and lets the desk hide the legs.
# Row 5 is seated in profile. The generator has no front-facing seated pose,
# so a person behind a desk keeps using the idle frames with the desk hiding
# the legs; the profile pose is here for someone turning to a side task.
ROWS = {"idle": 1, "sitSide": 5, "phone": 6, "read": 7}


def layer(kind, name):
    return GEN / kind / "32x32" / f"{name}.png"


def compose(spec):
    """Body + eyes + outfit + hair (+ accessory), the order LimeZu documents."""
    layers = [
        Image.open(layer("Bodies", spec["body"])).convert("RGBA"),
        Image.open(layer("Eyes", spec["eyes"])).convert("RGBA"),
        tint_layer(Image.open(layer("Outfits", spec["outfit"])), spec["outfitTint"]) if spec.get("outfitTint")
        else map_colours(Image.open(layer("Outfits", spec["outfit"])), spec.get("outfitMap")),
        tint_layer(Image.open(layer("Hairstyles", spec["hair"])), spec["hairTint"]) if spec.get("hairTint")
        else map_colours(Image.open(layer("Hairstyles", spec["hair"])), spec.get("hairMap")),
    ]
    if spec.get("accessory"):
        layers.append(Image.open(layer("Accessories", spec["accessory"])).convert("RGBA"))
    w = min(l.size[0] for l in layers)
    h = min(l.size[1] for l in layers)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for l in layers:
        out.alpha_composite(l.crop((0, 0, w, h)))
    return out


def frame(sheet, row, col):
    return sheet.crop((col * FW, row * FH, (col + 1) * FW, (row + 1) * FH))


def headset(fr):
    """A band over the hair and two cups, drawn from the frame's own silhouette."""
    fr = fr.copy()
    px = fr.load()
    w, h = fr.size
    top = next((y for y in range(h) if any(px[x, y][3] for x in range(w))), None)
    if top is None:
        return fr
    ear_y = top + 9
    row = [x for x in range(w) if px[x, ear_y][3]]
    if not row:
        return fr
    x0, x1 = min(row), max(row)
    band = hex_rgb("#B7C2E0") + (255,)
    dark = hex_rgb("#5A6E94") + (255,)
    for x in range(x0 + 1, x1):
        if px[x, top][3]:
            px[x, top - 1] = band
    for dy in range(4):
        px[x0, ear_y - 1 + dy] = dark if dy in (0, 3) else band
        px[x1, ear_y - 1 + dy] = dark if dy in (0, 3) else band
    return fr


# Four people who read as four at a glance: different hair, clothes, skin,
# and each in the pose of their own job. Hair and outfit layers are tinted by
# luminance rank so any LimeZu style can take any colour.
PEOPLE = {
    # Ара: reception. Long auburn hair, white blouse, at the laptop.
    "ara": {"body": "Body_32x32_02", "eyes": "Eyes_32x32_01", "outfit": "Outfit_08_32x32_01", "hair": "Hairstyle_12_32x32_04",
            "hairTint": ("#7A2E1E", "#A8442A", "#C9603C"),
            # the blouse: pale blue-grey rather than white, which blew out against the dark room
            "outfitTint": ("#8FA0C8", "#B7C2E0", "#D5DDF0")},
    # Веда: analyst. Black hair up, glasses, brand-blue cardigan, reading the report.
    "veda": {"body": "Body_32x32_01", "eyes": "Eyes_32x32_04", "outfit": "Outfit_21_32x32_01", "hair": "Hairstyle_18_32x32_04",
             "accessory": "Accessory_15_Glasses_32x32_01",
             "hairTint": ("#1B1826", "#2A2638", "#443E5C"),
             "outfitMap": {"#645d9a": BRAND["shade"], "#76689e": BRAND["base"], "#8d6ea7": BRAND["light"], "#8e99c8": BRAND["dark"]}},
    # Эхо: phone operator. Blond crop, orange hoodie, headset, on the phone.
    "eho": {"body": "Body_32x32_07", "eyes": "Eyes_32x32_05", "outfit": "Outfit_16_32x32_01", "hair": "Hairstyle_26_32x32_02",
            "hairTint": ("#A67B2C", "#D1A64A", "#EED07C"), "headset": True},
    # Нова: customer care. Dark brown bob, teal top, phone in hand.
    "nova": {"body": "Body_32x32_04", "eyes": "Eyes_32x32_01", "outfit": "Outfit_23_32x32_03", "hair": "Hairstyle_20_32x32_03",
             "hairTint": ("#3B261C", "#5A3B2C", "#75503C")},
}


def characters():
    phone_sheet = Image.open(layer("Smartphones", "Smartphone_32x32_1")).convert("RGBA")
    items = {}
    for cid, spec in PEOPLE.items():
        sheet = compose(spec)
        anims = {}
        for aname, row in ROWS.items():
            if aname == "idle":
                frames = [frame(sheet, row, c) for c in range(18, 24)]  # facing down
            elif aname == "sitSide":
                frames = [frame(sheet, row, c) for c in range(0, 6)]   # seated, side view (row 5 has no front-facing frames)
            elif aname == "phone":
                frames = []
                for c in range(12):
                    fr = frame(sheet, row, c)
                    # the handset lives on its own layer, row 4 of the smartphone sheet
                    fr.alpha_composite(phone_sheet.crop((c * FW, 4 * FH, (c + 1) * FW, 5 * FH)))
                    frames.append(fr)
            else:  # read: 12 frames + 12 book overlays after the sheet's "loop" label
                frames = []
                for c in range(12):
                    fr = frame(sheet, row, c)
                    fr.alpha_composite(frame(sheet, row, 14 + c))
                    frames.append(fr)
            if spec.get("headset"):
                frames = [headset(f) for f in frames]
            strip = Image.new("RGBA", (len(frames) * FW, FH), (0, 0, 0, 0))
            for i, fr in enumerate(frames):
                strip.paste(fr, (i * FW, 0), fr)
            anims[aname] = (strip, len(frames))
        items[cid] = anims
    return items


# ---------------------------------------------------------------- packing
def shelf_pack(items, width=1024):
    items = sorted(items, key=lambda t: -t[1].size[1])
    x = y = shelf_h = 0
    rects = {}
    for iid, im in items:
        w, h = im.size
        if x + w > width:
            x, y, shelf_h = 0, y + shelf_h, 0
        rects[iid] = (x, y, w, h)
        x += w
        shelf_h = max(shelf_h, h)
    atlas = Image.new("RGBA", (width, y + shelf_h), (0, 0, 0, 0))
    for iid, im in items:
        atlas.paste(im, rects[iid][:2], im)
    return atlas, rects


def build():
    sprites_src = props()
    chars_src = characters()
    items = [(sid, im) for sid, (im, _) in sprites_src.items()]
    for cid, anims in chars_src.items():
        for aname, (strip, _) in anims.items():
            items.append((f"{cid}:{aname}", strip))
    atlas, rects = shelf_pack(items, 512)
    sprites = {}
    for sid, (_, entry) in sprites_src.items():
        x, y, w, h = rects[sid]
        sprites[sid] = {"x": x, "y": y, "w": w, "h": h, **entry}
    chars = {}
    for cid, anims in chars_src.items():
        chars[cid] = {}
        for aname, (_, n) in anims.items():
            x, y, w, h = rects[f"{cid}:{aname}"]
            chars[cid][aname] = {"x": x, "y": y, "w": FW, "h": FH, "n": n}
    ATLAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_OUT, optimize=True)
    manifest = {"tile": 32, "atlas": "/office/staff.png", "width": atlas.size[0], "height": atlas.size[1], "sprites": sprites, "chars": chars}
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
    print("atlas", atlas.size, ATLAS_OUT.stat().st_size // 1024, "kB;", len(sprites), "sprites,", len(chars), "characters")
    for sid in ("MONITOR", "MONITOR_KB", "LAPTOP", "DUAL"):
        print(sid, sprites[sid]["w"], "x", sprites[sid]["h"], "screens", sprites[sid]["screens"])


if __name__ == "__main__":
    build()
