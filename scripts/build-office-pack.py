#!/usr/bin/env python3
"""Build the sprite pack for the /office page.

Reads source art from assets-src/office/<pack>/, shifts colours toward the
site palette, packs everything into one atlas and writes the manifest the
engine reads. Run it again after changing a pack config or the colour rules.

    python3 scripts/build-office-pack.py            # builds the default pack (limezu)
    python3 scripts/build-office-pack.py pixel-agents

Outputs
    public/office/pack.png       the atlas
    src/office/pack.json         the manifest (atlas rects + animation tables)

Manifest shape (what the engine depends on; a new pack only has to fill it):

    tile          art pixels per floor tile
    atlas         URL of the atlas
    sprites       { id: {x, y, w, h, fw, fh, screens?} }   fw/fh = footprint in tiles;
                  screens = rectangles inside the sprite where screen content is drawn
    roles         { role: id | [ids] }           what the layout asks for
    characters    { id: { frameW, frameH, anims: { name: { dir: { sheet, row, frames:[cols] } | "flip:<dir>" } } } }
    sheets        { id: {x, y, w, h} }           character sheets in the atlas

The LimeZu sources are licensed and not redistributable: assets-src/office/limezu
is gitignored, only the derived atlas is committed. Requires Pillow.
"""
import colorsys
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "office"
ATLAS_OUT = ROOT / "public" / "office" / "pack.png"
MANIFEST_OUT = ROOT / "src" / "office" / "pack.json"

# ---------------------------------------------------------------- palette
BRAND = {"light": "#5E9BFF", "base": "#3B82F6", "shade": "#2456B8", "dark": "#1A3F8F", "deep": "#0F2A66"}
HAIR_DARK = {"light": "#4A4370", "base": "#34305A", "shade": "#26224A", "dark": "#1E1B33"}
GOLD = {"hi": "#FBBF24", "base": "#F59E0B", "lo": "#B45309", "bulb": "#FDE68A"}
PAPER = {"hi": "#E6ECFF", "lo": "#B7C2E0"}
NAVY_HUE = 222 / 360


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(rgb):
    return "#%02x%02x%02x" % rgb[:3]


def hls(rgb):
    r, g, b = (c / 255 for c in rgb)
    return colorsys.rgb_to_hls(r, g, b)


def from_hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


def map_colours(img, cmap):
    """Exact colour swaps. Pixels not in the map are left alone."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    table = {hex_rgb(k): hex_rgb(v) for k, v in cmap.items()}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = table[(r, g, b)] + (a,)
    return img


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


# ---------------------------------------------------------------- packing
def shelf_pack(items, width=1024):
    items = sorted(items, key=lambda t: -t[1].size[1])
    x = y = 0
    shelf_h = 0
    rects = {}
    for iid, im in items:
        w, h = im.size
        if x + w > width:
            x = 0
            y += shelf_h
            shelf_h = 0
        rects[iid] = (x, y, w, h)
        x += w
        shelf_h = max(shelf_h, h)
    atlas = Image.new("RGBA", (width, y + shelf_h), (0, 0, 0, 0))
    for iid, im in items:
        rx, ry, _, _ = rects[iid]
        atlas.paste(im, (rx, ry), im)
    return atlas, rects


def write_outputs(pack_name, credit, tile, items, sprites, characters, sheet_ids, roles, atlas_width):
    atlas, rects = shelf_pack(items, atlas_width)
    for sid in sprites:
        x, y, w, h = rects[sid]
        sprites[sid].update({"x": x, "y": y, "w": w, "h": h})
    sheets = {sid: dict(zip("xywh", rects[sid])) for sid in sheet_ids}
    ATLAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_OUT, optimize=True)
    manifest = {
        "name": pack_name, "credit": credit, "tile": tile, "atlas": "/office/pack.png",
        "sprites": sprites, "roles": roles, "characters": characters, "sheets": sheets,
    }
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
    print("atlas", atlas.size, ATLAS_OUT.stat().st_size // 1024, "kB;", len(sprites), "sprites,", len(characters), "characters")


# ================================================================ LimeZu Modern Interiors + Modern Office
LZ = SRC / "limezu"
LZ_OFFICE = LZ / "Modern_Office_Revamped_v1.2" / "4_Modern_Office_singles" / "32x32" / "Modern_Office_Singles_32x32_{}.png"
LZ_LIVING = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Theme_Sorter_Singles_32x32" / "2_Living_Room_Singles_32x32" / "Living_Room_Singles_32x32_{}.png"
LZ_CONF = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Theme_Sorter_Singles_32x32" / "13_Conference_Hall_Singles_32x32" / "Conference_Hall_Singles_32x32_{}.png"
LZ_THEMES = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Theme_Sorter_Singles_32x32"
LZ_CONDO = LZ_THEMES / "26_Condominium_Singles_32x32" / "Condominium_Singles_32x32_{}.png"
LZ_BASE = LZ_THEMES / "14_Basement_Singles_32x32" / "Basement_Singles_32x32_{}.png"
LZ_BED = LZ_THEMES / "4_Bedroom_Singles_32x32" / "Bedroom_Singles_32x32_{}.png"
LZ_KIT = LZ_THEMES / "12_Kitchen_Singles_32x32" / "Kitchen_Singles_32x32_{}.png"
LZ_GENERIC_ROOM = LZ / "moderninteriors-win" / "1_Interiors" / "32x32" / "Room_Builder_32x32.png"
LZ_ROOM = LZ / "Modern_Office_Revamped_v1.2" / "1_Room_Builder_Office" / "Room_Builder_Office_32x32.png"
LZ_GEN = LZ / "moderninteriors-win" / "2_Characters" / "Character_Generator"

# LimeZu's outline greys. They are already near-navy and give every object
# its edge, so the colour rules leave them alone.
LZ_OUTLINES = {hex_rgb(c) for c in ("#3a3a50", "#46465e", "#565972", "#6c6e85", "#000000")}


def lz_furniture_rule(rgb):
    """Night office: wood stays warm but muted, greys and whites go navy,
    screens, plants, paper and outlines keep their colour."""
    if rgb in LZ_OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    hue = h * 360
    if s < 0.16:
        if l > 0.9:
            return rgb  # paper, highlights
        return from_hls(NAVY_HUE, 0.12 + l * 0.55, 0.26)
    if 15 <= hue <= 48:  # wood
        return from_hls(h, l * 0.78, s * 0.55)
    if 80 <= hue <= 170:  # plants
        return rgb
    if 190 <= hue <= 250:  # screens, phone blue
        return rgb
    if 240 < hue < 300 and s < 0.35:  # lavender-greys (chairs, cabinets)
        return from_hls(NAVY_HUE, 0.12 + l * 0.55, 0.28)
    # anything else: pull toward navy but keep some of its own hue
    return from_hls(NAVY_HUE, 0.12 + l * 0.55, min(0.45, s * 0.6))


def lz_chair_rule(rgb):
    """Chairs: a lighter navy-grey than the rest, so a seat reads against the wall."""
    if rgb in LZ_OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    if s < 0.16 or (240 < h * 360 < 300 and s < 0.35):
        return from_hls(NAVY_HUE, 0.26 + l * 0.6, 0.22)
    return lz_furniture_rule(rgb)


def lz_desk_rule(rgb):
    """Desks: a cool grey-blue, lighter than the carpet so the top reads as a surface."""
    if rgb in LZ_OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    if s < 0.16 or (240 < h * 360 < 300 and s < 0.35):
        return from_hls(NAVY_HUE, 0.26 + l * 0.6, 0.20)
    return lz_furniture_rule(rgb)


def lz_wall_rule(rgb):
    """Walls: the lavender set goes navy, a shade lighter than the carpet; the cap stays pale."""
    if rgb in LZ_OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    if l > 0.85:
        return from_hls(NAVY_HUE, 0.36, 0.16)  # the cap: a muted coving, not a pale band
    return from_hls(NAVY_HUE, 0.10 + l * 0.32, 0.30)


def lz_frame_rule(rgb):
    """Window frames: the wood goes to a dark slate so the city, not the frame, is what you see."""
    if rgb in LZ_OUTLINES:
        return rgb
    h, l, s = hls(rgb)
    return from_hls(NAVY_HUE, 0.14 + l * 0.30, 0.20)


def lz_floor_rule(rgb):
    h, l, s = hls(rgb)
    return from_hls(NAVY_HUE, 0.07 + l * 0.22, 0.30)


def crop_alpha(img):
    bb = img.getbbox()
    return img.crop(bb) if bb else img


def lz_single(path, fw=None, fh=1, rule=lz_furniture_rule, cmap=None, screens=None, keep=False):
    im = Image.open(path).convert("RGBA")
    # LimeZu singles sit in a 64x96 canvas, bottom-left anchored to the tile
    # grid. Keep the artist's offset so pieces line up when placed by tile.
    bb = im.getbbox() or (0, 0, im.size[0], im.size[1])
    ox, oy = bb[0], bb[3] - im.size[1]
    im = crop_alpha(im)
    if cmap:
        im = map_colours(im, cmap)
    if not keep and rule:
        im = rule_colours(im, rule)
    entry = {"fw": fw or max(1, -(-im.size[0] // 32)), "fh": fh, "ox": ox, "oy": oy}
    if screens:
        entry["screens"] = screens
    return im, entry


# Office furniture: role id -> (source, footprint w, footprint h, options)
def lz_sprites():
    S = {}
    add = lambda sid, im_entry: S.__setitem__(sid, im_entry)
    O = lambda n: LZ_OFFICE.with_name(LZ_OFFICE.name.format(n))
    Lv = lambda n: LZ_LIVING.with_name(LZ_LIVING.name.format(n))
    Cf = lambda n: LZ_CONF.with_name(LZ_CONF.name.format(n))

    # lamp 142 is a light blue-grey desk lamp; the lit one goes gold, the unlit one navy
    gold_lamp = {"#e2f2f3": "#F59E0B", "#cce6ec": "#D98A0A", "#d4dee6": "#C27C0B", "#bad2e0": "#B06E0A",
                 "#a4bbd5": "#8F5A0A", "#91a5cf": "#7A4C0A", "#738ca8": "#5C3808"}
    off_lamp = {"#e2f2f3": "#3A4478", "#cce6ec": "#3A4478", "#d4dee6": "#3A4478", "#bad2e0": "#343D6A",
                "#a4bbd5": "#2A3358", "#91a5cf": "#2A3358", "#738ca8": "#1F274A"}

    Cd = lambda n: LZ_CONDO.with_name(LZ_CONDO.name.format(n))
    Bs = lambda n: LZ_BASE.with_name(LZ_BASE.name.format(n))
    Bd = lambda n: LZ_BED.with_name(LZ_BED.name.format(n))
    Kt = lambda n: LZ_KIT.with_name(LZ_KIT.name.format(n))

    # desks: one-tile pieces make a desk; the grey finish goes navy so gold stays the only warm thing
    add("DESK_L", lz_single(O(213), rule=lz_desk_rule))
    add("DESK_M", lz_single(O(214), rule=lz_desk_rule))
    add("DESK_R", lz_single(O(215), rule=lz_desk_rule))
    # things on desks (screen rects measured from the blue glass in each sprite)
    add("MONITOR", lz_single(O(130), screens=[{"x": 4, "y": 6, "w": 24, "h": 12}]))
    add("MONITOR_2", lz_single(O(133), screens=[{"x": 4, "y": 6, "w": 24, "h": 12}]))
    add("DUAL_MONITOR", lz_single(O(227), screens=[{"x": 4, "y": 6, "w": 22, "h": 16}, {"x": 36, "y": 8, "w": 24, "h": 12}]))
    add("LAPTOP", lz_single(O(136), screens=[{"x": 4, "y": 4, "w": 16, "h": 10}]))
    add("KEYBOARD", lz_single(O(128)))
    add("PHONE", lz_single(O(119)))
    add("PHONE_2", lz_single(O(242)))
    add("LAMP", lz_single(O(142), cmap=gold_lamp))
    add("LAMP_OFF", lz_single(O(142), cmap=off_lamp))
    add("PAPERS", lz_single(O(153)))
    add("PAPER_STACK", lz_single(O(154)))
    add("PAPER_PILE", lz_single(O(155)))
    add("FAX", lz_single(O(156)))
    add("PRINTER_SMALL", lz_single(O(149)))
    add("MUG", lz_single(Kt(182)))
    add("MUG_2", lz_single(Kt(181)))
    add("CUPS", lz_single(Kt(137)))
    add("STICKY", lz_single(Bd(452)))
    # seats
    add("CHAIR", lz_single(O(101), rule=lz_chair_rule))
    add("CHAIR_2", lz_single(O(105), rule=lz_chair_rule))
    add("ARMCHAIR_BLUE", lz_single(Bs(205), fw=1, rule=lz_chair_rule))
    add("ARMCHAIR_WHITE", lz_single(Bs(203), fw=1, rule=lz_chair_rule))
    add("SOFA", lz_single(Cf(56), fw=2, rule=lz_chair_rule))
    # storage
    add("CABINET", lz_single(O(180)))
    add("CABINET_2", lz_single(O(181)))
    add("DRAWERS", lz_single(O(167)))
    add("DRAWERS_2", lz_single(O(168)))
    add("BOOKSHELF", lz_single(Cd(29)))
    add("BOOKSHELF_2", lz_single(Cd(28)))
    add("BOOKSHELF_TALL", lz_single(Cd(51), fw=2))
    add("CUPBOARD", lz_single(Bd(539), fw=2))
    add("FILING", lz_single(Cd(76), fw=2))
    add("FILING_2", lz_single(Cd(80), fw=2))
    add("RACK", lz_single(Bs(27), fw=2))
    add("RACK_WOOD", lz_single(Bs(39), fw=2))
    add("RACK_WHITE", lz_single(Bs(45), fw=2))
    add("RACK_LOW", lz_single(Bs(29), fw=2))
    add("LOCKER", lz_single(Bs(4)))
    add("CRATES", lz_single(Lv(99), fw=2))
    add("CRATE", lz_single(Lv(97)))
    add("BOX", lz_single(Cd(71)))
    add("BOX_2", lz_single(Cd(73)))
    # machines
    add("PRINTER", lz_single(O(178), fw=2))
    add("COPIER", lz_single(O(177), fw=2))
    add("WATER_COOLER", lz_single(O(173)))
    add("VENDING", lz_single(O(175), fw=2))
    add("COFFEE_MACHINE", lz_single(O(317)))
    add("COFFEE_COUNTER", lz_single(O(320), fw=2))
    add("BIN", lz_single(O(329)))
    add("BIN_GREY", lz_single(O(333)))
    add("EXTINGUISHER", lz_single(Cf(59)))
    # tables
    add("TABLE_SMALL", lz_single(O(188), fw=2))
    add("TABLE_LOW", lz_single(O(190), fw=2))
    add("TV", lz_single(Bs(161)))
    # plants
    add("PLANT_OFFICE", lz_single(O(98)))
    add("PLANT_OFFICE_2", lz_single(O(99)))
    add("PLANT_OFFICE_3", lz_single(O(100)))
    add("PLANT_TALL", lz_single(Lv(13), fw=1))
    add("PLANT_PALM", lz_single(Lv(14), fw=2))
    add("PLANT_SMALL", lz_single(Lv(15)))
    add("PLANT_SMALL_2", lz_single(Lv(16)))
    add("PLANT_BUSH", lz_single(Lv(18), fw=2))
    add("FRUIT_BOWL", lz_single(Lv(49)))
    # flat things on the floor (drawn with the floor, no footprint)
    add("RUG_CHECK", lz_single(Bd(385), fw=2, fh=2))
    add("RUG_ROUND", lz_single(Bd(386), fw=2, fh=2))
    add("RUG_MAT", lz_single(Cd(65), fw=2))
    # wall items (no footprint)
    add("WHITEBOARD", lz_single(O(171), fw=2))
    add("WHITEBOARD_BLANK", lz_single(O(170), fw=2))
    add("POSTER", lz_single(O(96)))
    add("POSTER_2", lz_single(O(163)))
    add("CERTIFICATE", lz_single(O(113)))
    add("PICTURE", lz_single(Bd(481)))
    add("STRING_LIGHTS", lz_single(Bd(463), fw=2))
    # walls and a hollow window frame from the generic room builder
    gb = Image.open(LZ_GENERIC_ROOM).convert("RGBA")
    tile = lambda c, r, w=1, h=1: gb.crop((c * 32, r * 32, (c + w) * 32, (r + h) * 32))
    wall_top = tile(22, 15); wall_bottom = tile(22, 16)
    face = wall_bottom.crop((0, 0, 32, 16)); wall_mid = Image.new("RGBA", (32, 32)); wall_mid.paste(face, (0, 0)); wall_mid.paste(face, (0, 16))
    for sid, im in (("WALL_TOP", wall_top), ("WALL_MID", wall_mid), ("WALL_BOTTOM", wall_bottom)):
        S[sid] = (rule_colours(im, lz_wall_rule), {"fw": 1, "fh": 1, "ox": 0, "oy": 0})
    frame = crop_alpha(tile(22, 1, 3, 3))  # left post, middle bars, right post
    fa = frame.getchannel("A"); fw_, fh_ = frame.size
    # the transparent interior is where the city gets drawn: scan out from the centre
    cx, cy = fw_ // 2, fh_ // 2
    ix = next(x for x in range(cx, -1, -1) if fa.getpixel((x, cy)) != 0) + 1
    ex = next(x for x in range(cx, fw_) if fa.getpixel((x, cy)) != 0)
    iy = next(y for y in range(cy, -1, -1) if fa.getpixel((cx, y)) != 0) + 1
    ey = next(y for y in range(cy, fh_) if fa.getpixel((cx, y)) != 0)
    iw, ih = ex - ix, ey - iy
    S["WINDOW_FRAME"] = (rule_colours(frame, lz_frame_rule), {"fw": 2, "fh": 3, "ox": 0, "oy": 0, "inner": {"x": ix, "y": iy, "w": iw, "h": ih}})
    # floor: the office carpet 2x2 pattern from the room builder
    rb = Image.open(LZ_ROOM).convert("RGBA")
    floor = rb.crop((320, 160, 384, 224))
    S["FLOOR"] = (rule_colours(floor, lz_floor_rule), {"fw": 2, "fh": 2, "tileable": True})
    return S


LZ_ROLES = {
    "deskL": "DESK_L", "deskM": "DESK_M", "deskR": "DESK_R",
    "monitor": "MONITOR", "monitor2": "MONITOR_2", "dualMonitor": "DUAL_MONITOR", "laptop": "LAPTOP", "keyboard": "KEYBOARD",
    "phone": "PHONE", "phone2": "PHONE_2", "lamp": "LAMP", "lampOff": "LAMP_OFF",
    "papers": "PAPERS", "paperStack": "PAPER_STACK", "paperPile": "PAPER_PILE", "fax": "FAX", "printerSmall": "PRINTER_SMALL",
    "mug": "MUG", "mug2": "MUG_2", "cups": "CUPS", "sticky": "STICKY",
    "chair": "CHAIR", "chair2": "CHAIR_2", "armchairBlue": "ARMCHAIR_BLUE", "armchairWhite": "ARMCHAIR_WHITE", "sofa": "SOFA",
    "cabinet": "CABINET", "cabinet2": "CABINET_2", "drawers": "DRAWERS", "drawers2": "DRAWERS_2",
    "bookshelf": "BOOKSHELF", "bookshelf2": "BOOKSHELF_2", "bookshelfTall": "BOOKSHELF_TALL", "cupboard": "CUPBOARD", "filing": "FILING", "filing2": "FILING_2",
    "rack": "RACK", "rackWood": "RACK_WOOD", "rackWhite": "RACK_WHITE", "rackLow": "RACK_LOW", "locker": "LOCKER",
    "crates": "CRATES", "crate": "CRATE", "box": "BOX", "box2": "BOX_2",
    "printer": "PRINTER", "copier": "COPIER", "waterCooler": "WATER_COOLER", "vending": "VENDING",
    "coffeeMachine": "COFFEE_MACHINE", "coffeeCounter": "COFFEE_COUNTER", "bin": "BIN", "binGrey": "BIN_GREY", "extinguisher": "EXTINGUISHER",
    "tableSmall": "TABLE_SMALL", "tableLow": "TABLE_LOW", "tv": "TV",
    "plantOffice": "PLANT_OFFICE", "plantOffice2": "PLANT_OFFICE_2", "plantOffice3": "PLANT_OFFICE_3",
    "plantTall": "PLANT_TALL", "plantPalm": "PLANT_PALM", "plantSmall": "PLANT_SMALL", "plantSmall2": "PLANT_SMALL_2", "plantBush": "PLANT_BUSH", "fruitBowl": "FRUIT_BOWL",
    "rugCheck": "RUG_CHECK", "rugRound": "RUG_ROUND", "rugMat": "RUG_MAT",
    "whiteboard": "WHITEBOARD", "whiteboardBlank": "WHITEBOARD_BLANK", "poster": "POSTER", "poster2": "POSTER_2", "certificate": "CERTIFICATE", "picture": "PICTURE", "stringLights": "STRING_LIGHTS",
    "wallTop": "WALL_TOP", "wallMid": "WALL_MID", "wallBottom": "WALL_BOTTOM", "windowFrame": "WINDOW_FRAME",
    "floor": "FLOOR",
}

# ---- characters composed from the generator layers.
# LimeZu 32x32 sheets: 56 columns of 32x64 frames. Row = animation, columns run
# right, up, left, down for the four-direction rows.
LZ_FW, LZ_FH = 32, 64
LZ_ROWS = {"idle": 1, "walk": 2, "sit": 4, "phone": 6, "read": 7}
LZ_DIRS = ["right", "up", "left", "down"]


def lz_layer(kind, name):
    return LZ_GEN / kind / "32x32" / f"{name}.png"


def lz_compose(spec):
    """Body + eyes + outfit + hair (+ accessory), the order LimeZu documents."""
    layers = [
        Image.open(lz_layer("Bodies", spec["body"])).convert("RGBA"),
        Image.open(lz_layer("Eyes", spec["eyes"])).convert("RGBA"),
        map_colours(Image.open(lz_layer("Outfits", spec["outfit"])), spec.get("outfitMap", {})),
        map_colours(Image.open(lz_layer("Hairstyles", spec["hair"])), spec.get("hairMap", {})),
    ]
    if spec.get("accessory"):
        layers.append(Image.open(lz_layer("Accessories", spec["accessory"])).convert("RGBA"))
    w = min(l.size[0] for l in layers)
    h = min(l.size[1] for l in layers)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for l in layers:
        out.alpha_composite(l.crop((0, 0, w, h)))
    return out


def lz_frame(sheet, row, col):
    return sheet.crop((col * LZ_FW, row * LZ_FH, (col + 1) * LZ_FW, (row + 1) * LZ_FH))


def lz_headset(frame):
    """Эхо's headset: a band over the hair and two cups, drawn from the frame's
    own silhouette so it follows the head in every frame."""
    frame = frame.copy()
    px = frame.load()
    w, h = frame.size
    # find the top of the head and its width at the ear line
    top = None
    for y in range(h):
        if any(px[x, y][3] for x in range(w)):
            top = y
            break
    if top is None:
        return frame
    ear_y = top + 9
    row = [x for x in range(w) if px[x, ear_y][3]]
    if not row:
        return frame
    x0, x1 = min(row), max(row)
    band = hex_rgb("#B7C2E0") + (255,)
    dark = hex_rgb("#5A6E94") + (255,)
    for x in range(x0 + 1, x1):
        if px[x, top][3]:
            px[x, top - 1] = band
    for dy in range(0, 4):
        px[x0, ear_y - 1 + dy] = dark if dy in (0, 3) else band
        px[x1, ear_y - 1 + dy] = dark if dy in (0, 3) else band
    return frame


def lz_characters():
    people = {
        # Ара: reception. Long dark hair, light-blue jacket over a white top.
        "ara": {"body": "Body_32x32_02", "eyes": "Eyes_32x32_01", "outfit": "Outfit_25_32x32_01", "hair": "Hairstyle_21_32x32_07",
                "outfitMap": {"#fbabc6": PAPER["hi"], "#dd71a3": PAPER["lo"]},
                "hairMap": {"#647e99": HAIR_DARK["light"], "#566279": HAIR_DARK["base"], "#535662": HAIR_DARK["shade"]}},
        # Веда: analyst. Hair up, glasses, navy shirt with a pale collar.
        "veda": {"body": "Body_32x32_04", "eyes": "Eyes_32x32_04", "outfit": "Outfit_21_32x32_01", "hair": "Hairstyle_18_32x32_04",
                 "accessory": "Accessory_15_Glasses_32x32_01",
                 "outfitMap": {"#645d9a": BRAND["shade"], "#76689e": BRAND["base"], "#8d6ea7": BRAND["light"], "#8e99c8": BRAND["dark"]}},
        # Нова: customer care. Short brown hair, brand-blue top.
        "nova": {"body": "Body_32x32_07", "eyes": "Eyes_32x32_01", "outfit": "Outfit_24_32x32_01", "hair": "Hairstyle_12_32x32_03",
                 "outfitMap": {"#fbabc6": PAPER["hi"], "#eb8fb3": PAPER["lo"], "#0092e3": BRAND["base"], "#0970d4": BRAND["shade"], "#96d0f0": BRAND["light"]}},
        # Эхо: phone operator. Short crop, light hoodie, headset.
        "eho": {"body": "Body_32x32_01", "eyes": "Eyes_32x32_05", "outfit": "Outfit_31_32x32_01", "hair": "Hairstyle_06_32x32_04", "headset": True},
    }
    items, characters = [], {}
    for cid, spec in people.items():
        sheet = lz_compose(spec)
        book_overlay = None
        # book frames sit in row 7 after the 12 reading frames; composite them on
        rows_out = []
        anims = {}
        row_i = 0
        for aname, src_row in LZ_ROWS.items():
            if aname in ("idle", "walk"):
                frames = [lz_frame(sheet, src_row, c) for c in range(24)]
                anims[aname] = {d: {"sheet": f"sheet_{cid}", "row": row_i, "frames": list(range(k * 6, k * 6 + 6))} for k, d in enumerate(LZ_DIRS)}
            elif aname == "sit":
                frames = [lz_frame(sheet, src_row, c) for c in range(12)]
                anims[aname] = {d: {"sheet": f"sheet_{cid}", "row": row_i, "frames": list(range(k * 3, k * 3 + 3))} for k, d in enumerate(LZ_DIRS)}
            elif aname == "phone":
                frames = [lz_frame(sheet, src_row, c) for c in range(12)]
                anims[aname] = {"down": {"sheet": f"sheet_{cid}", "row": row_i, "frames": list(range(12))}}
            else:  # read: 12 character frames + 12 book overlays
                frames = []
                for c in range(12):
                    fr = lz_frame(sheet, src_row, c)
                    fr.alpha_composite(lz_frame(sheet, src_row, 13 + c))  # col 12 is the sheet's "loop" label
                    frames.append(fr)
                anims[aname] = {"down": {"sheet": f"sheet_{cid}", "row": row_i, "frames": list(range(12))}}
            if spec.get("headset"):
                frames = [lz_headset(f) for f in frames]
            rows_out.append(frames)
            row_i += 1
        cols = max(len(r) for r in rows_out)
        out = Image.new("RGBA", (cols * LZ_FW, len(rows_out) * LZ_FH), (0, 0, 0, 0))
        for r, frames in enumerate(rows_out):
            for c, fr in enumerate(frames):
                out.paste(fr, (c * LZ_FW, r * LZ_FH), fr)
        items.append((f"sheet_{cid}", out))
        # the engine uses "type" while seated at the keyboard; LimeZu has no typing pose, so it is the seated pose
        anims["type"] = anims["sit"]
        characters[cid] = {"frameW": LZ_FW, "frameH": LZ_FH, "anims": anims}
    return items, characters


def build_limezu():
    sprites_src = lz_sprites()
    items = [(sid, im) for sid, (im, _) in sprites_src.items()]
    sprites = {sid: entry for sid, (_, entry) in sprites_src.items()}
    char_items, characters = lz_characters()
    items += char_items
    write_outputs("limezu", "LimeZu Modern Interiors and Modern Office (commercial licence, credit required)", 32,
                  items, sprites, characters, [i for i, _ in char_items], LZ_ROLES, 1024)


# ================================================================ pixel-agents (16px, MIT) — kept as the fallback pack
PA = SRC / "pixel-agents"


def navy_shift(rgb, floor=False, plant=False):
    h, l, s = hls(rgb)
    if plant and 0.17 < h < 0.47 and s > 0.25:
        return rgb
    if l > 0.86:
        return rgb
    if floor:
        return from_hls(NAVY_HUE, 0.08 + l * 0.30, 0.28)
    return from_hls(NAVY_HUE, 0.10 + l * 0.55, min(0.5, 0.26 + s * 0.3))


PA_SPRITES = {
    "DESK": ("furniture/DESK_FRONT.png", 3, 2), "PC_1": ("furniture/PC_FRONT_ON_1.png", 1, 1), "PC_2": ("furniture/PC_FRONT_ON_2.png", 1, 1),
    "PC_3": ("furniture/PC_FRONT_ON_3.png", 1, 1), "CHAIR_BACK": ("furniture/CUSHIONED_CHAIR_BACK.png", 1, 1), "PLANT": ("furniture/PLANT.png", 1, 2),
    "LARGE_PLANT": ("furniture/LARGE_PLANT.png", 2, 3), "CACTUS": ("furniture/CACTUS.png", 1, 2), "SOFA": ("furniture/SOFA_FRONT.png", 2, 1),
    "DOUBLE_BOOKSHELF": ("furniture/DOUBLE_BOOKSHELF.png", 2, 2), "CLOCK": ("furniture/CLOCK.png", 1, 2), "COFFEE": ("furniture/COFFEE.png", 1, 1),
    "COFFEE_TABLE": ("furniture/COFFEE_TABLE.png", 2, 2), "SMALL_TABLE": ("furniture/SMALL_TABLE_FRONT.png", 2, 2), "BIN": ("furniture/BIN.png", 1, 1),
}
PA_ROLES = {"desk": "DESK", "pc": ["PC_1", "PC_2", "PC_3"], "chair": "CHAIR_BACK", "plant": "PLANT", "largePlant": "LARGE_PLANT", "cactus": "CACTUS",
            "sofa": "SOFA", "doubleBookshelf": "DOUBLE_BOOKSHELF", "clock": "CLOCK", "coffee": "COFFEE", "coffeeTable": "COFFEE_TABLE", "smallTable": "SMALL_TABLE", "bin": "BIN"}
PA_CHARS = {
    "ara": ("characters/char_1.png", {"#252525": BRAND["base"], "#2b2b2b": BRAND["light"], "#1a1a1a": BRAND["shade"], "#101010": BRAND["dark"],
                                       "#f1c084": HAIR_DARK["light"], "#e39f5a": HAIR_DARK["base"], "#be7743": HAIR_DARK["shade"], "#7e4b29": HAIR_DARK["dark"]}),
    "veda": ("characters/char_4.png", {"#eeeeee": BRAND["light"], "#d4d4d4": BRAND["base"], "#bdbdbd": BRAND["shade"], "#4c4c4c": BRAND["dark"]}),
    "nova": ("characters/char_0.png", {"#114978": BRAND["base"], "#0f406a": BRAND["shade"], "#071c2e": BRAND["dark"]}),
    "eho": ("characters/char_5.png", {"#e16451": BRAND["light"], "#b24737": BRAND["base"], "#640026": BRAND["shade"]}),
}


def build_pixel_agents():
    items, sprites = [], {}
    for sid, (rel, fw, fh) in PA_SPRITES.items():
        plant = "PLANT" in sid or "CACTUS" in sid
        im = rule_colours(Image.open(PA / rel), lambda rgb, p=plant: navy_shift(rgb, False, p))
        items.append((sid, im))
        sprites[sid] = {"fw": fw, "fh": fh}
    sprites["PC_1"]["screens"] = sprites["PC_2"]["screens"] = sprites["PC_3"]["screens"] = [{"x": 2, "y": 2, "w": 12, "h": 9}]
    characters = {}
    for cid, (rel, cmap) in PA_CHARS.items():
        items.append((f"sheet_{cid}", map_colours(Image.open(PA / rel), cmap)))
        rows = {"down": 0, "up": 1, "right": 2}
        anims = {}
        for aname, cols in {"walk": [0, 1, 2, 1], "type": [3, 4], "read": [5, 6], "idle": [1], "sit": [3, 4]}.items():
            anims[aname] = {d: {"sheet": f"sheet_{cid}", "row": r, "frames": cols} for d, r in rows.items()}
            anims[aname]["left"] = "flip:right"
        characters[cid] = {"frameW": 16, "frameH": 32, "anims": anims}
    write_outputs("pixel-agents", "pixel-agents (MIT) and JIK-A-4 MetroCity (CC0)", 16, items, sprites, characters, [f"sheet_{c}" for c in PA_CHARS], PA_ROLES, 256)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "limezu"
    {"limezu": build_limezu, "pixel-agents": build_pixel_agents}[which]()
