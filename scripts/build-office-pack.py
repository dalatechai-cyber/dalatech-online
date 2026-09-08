#!/usr/bin/env python3
"""Build the sprite pack for the /office page.

Reads source art from assets-src/office/<pack>/, shifts colours toward the
site palette, packs everything into one atlas and writes the manifest the
engine reads. Run it again after changing PACKS or the recolour rules.

    python3 scripts/build-office-pack.py            # builds the default pack
    python3 scripts/build-office-pack.py limezu     # builds another pack

Outputs
    public/office/pack.png       the atlas
    src/office/pack.json         the manifest (atlas rects + animation tables)

Manifest shape (what the engine depends on; a new pack only has to fill it):

    tile          art pixels per floor tile
    atlas         URL of the atlas
    sprites       { id: {x, y, w, h, fw, fh} }   fw/fh = footprint in tiles
    roles         { role: id | [ids] }           what the layout asks for
    characters    { id: { frameW, frameH, anims: { walk|type|read|idle: {
                    down|up|right|left: { sheet, row, frames:[cols] } | "flip:right" } } } }
    sheets        { id: {x, y, w, h} }           character sheets in the atlas

Requires Pillow. Not part of the site build.
"""
import colorsys
import json
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
NAVY_HUE = 222 / 360

# ---------------------------------------------------------------- packs
PACKS = {
    "pixel-agents": {
        "tile": 16,
        "dir": "pixel-agents",
        "credit": "pixel-agents (MIT) and JIK-A-4 MetroCity (CC0)",
        # character sheets: 7 columns x 3 rows of 16x32, rows are down/up/right
        "characters": {
            "frameW": 16, "frameH": 32, "cols": 7,
            "rows": {"down": 0, "up": 1, "right": 2},
            "anims": {"walk": [0, 1, 2, 1], "type": [3, 4], "read": [5, 6], "idle": [1]},
            "sheets": {
                # who gets which sheet, and the exact colour swaps that make them ours
                "ara":  {"file": "characters/char_1.png", "map": {
                    "#252525": BRAND["base"], "#2b2b2b": BRAND["light"], "#1a1a1a": BRAND["shade"], "#101010": BRAND["dark"],
                    "#f1c084": HAIR_DARK["light"], "#e39f5a": HAIR_DARK["base"], "#be7743": HAIR_DARK["shade"], "#7e4b29": HAIR_DARK["dark"]}},
                "veda": {"file": "characters/char_4.png", "map": {
                    "#eeeeee": BRAND["light"], "#d4d4d4": BRAND["base"], "#bdbdbd": BRAND["shade"], "#4c4c4c": BRAND["dark"]}},
                "nova": {"file": "characters/char_0.png", "map": {
                    "#114978": BRAND["base"], "#0f406a": BRAND["shade"], "#071c2e": BRAND["dark"]}},
                "eho":  {"file": "characters/char_5.png", "map": {
                    "#e16451": BRAND["light"], "#b24737": BRAND["base"], "#640026": BRAND["shade"]}},
            },
        },
        # furniture: id -> (file, footprint w, footprint h). Sizes come from the PNG.
        "sprites": {
            "DESK":        ("furniture/DESK_FRONT.png", 3, 2),
            "PC_1":        ("furniture/PC_FRONT_ON_1.png", 1, 1),  # 1-tile footprint, the monitor rises above it
            "PC_2":        ("furniture/PC_FRONT_ON_2.png", 1, 1),  # 1-tile footprint, the monitor rises above it
            "PC_3":        ("furniture/PC_FRONT_ON_3.png", 1, 1),  # 1-tile footprint, the monitor rises above it
            "CHAIR_BACK":  ("furniture/CUSHIONED_CHAIR_BACK.png", 1, 1),
            "CHAIR_FRONT": ("furniture/CUSHIONED_CHAIR_FRONT.png", 1, 1),
            "CHAIR_SIDE":  ("furniture/CUSHIONED_CHAIR_SIDE.png", 1, 1),
            "PLANT":       ("furniture/PLANT.png", 1, 2),
            "LARGE_PLANT": ("furniture/LARGE_PLANT.png", 2, 3),
            "CACTUS":      ("furniture/CACTUS.png", 1, 2),
            "SOFA":        ("furniture/SOFA_FRONT.png", 2, 1),
            "BOOKSHELF":   ("furniture/BOOKSHELF.png", 2, 1),
            "DOUBLE_BOOKSHELF": ("furniture/DOUBLE_BOOKSHELF.png", 2, 2),
            "WHITEBOARD":  ("furniture/WHITEBOARD.png", 2, 2),
            "CLOCK":       ("furniture/CLOCK.png", 1, 2),
            "COFFEE":      ("furniture/COFFEE.png", 1, 1),
            "COFFEE_TABLE": ("furniture/COFFEE_TABLE.png", 2, 2),
            "SMALL_TABLE": ("furniture/SMALL_TABLE_FRONT.png", 2, 2),
            "BIN":         ("furniture/BIN.png", 1, 1),
            "POT":         ("furniture/POT.png", 1, 1),
            "PAINTING":    ("furniture/SMALL_PAINTING.png", 1, 2),
            "LARGE_PAINTING": ("furniture/LARGE_PAINTING.png", 2, 2),
            "FLOOR_A":     ("floors/floor_1.png", 1, 1),
            "FLOOR_B":     ("floors/floor_3.png", 1, 1),
            "FLOOR_C":     ("floors/floor_5.png", 1, 1),
        },
        "roles": {
            "desk": "DESK", "pc": ["PC_1", "PC_2", "PC_3"], "chair": "CHAIR_BACK", "chairFront": "CHAIR_FRONT",
            "plant": "PLANT", "largePlant": "LARGE_PLANT", "cactus": "CACTUS", "sofa": "SOFA",
            "bookshelf": "BOOKSHELF", "doubleBookshelf": "DOUBLE_BOOKSHELF", "whiteboard": "WHITEBOARD", "clock": "CLOCK",
            "coffee": "COFFEE", "coffeeTable": "COFFEE_TABLE", "smallTable": "SMALL_TABLE", "bin": "BIN", "pot": "POT",
            "painting": "PAINTING", "largePainting": "LARGE_PAINTING", "floor": "FLOOR_A", "floorAlt": "FLOOR_B",
        },
        # ids whose colours are left alone (screens, plants keep their own colour rules anyway)
        "keep": set(),
    },
}


# ---------------------------------------------------------------- colour rules
def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def navy_shift(rgb, floor=False, plant=False):
    """Pull a furniture pixel toward the site's navy. Plant greens and
    near-whites (paper, screens) are left alone. Floors are pushed darker."""
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if plant and 0.17 < h < 0.47 and s > 0.25:
        return rgb
    if l > 0.86:
        return rgb
    if floor:
        nl = 0.08 + l * 0.30
        ns = 0.28
    else:
        nl = 0.10 + l * 0.55
        ns = min(0.5, 0.26 + s * 0.3)
    nr, ng, nb = colorsys.hls_to_rgb(NAVY_HUE, nl, ns)
    return (round(nr * 255), round(ng * 255), round(nb * 255))


def recolour_image(img, rule, cmap=None):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            key = "#%02x%02x%02x" % (r, g, b)
            if cmap is not None:
                if key in cmap:
                    px[x, y] = hex_rgb(cmap[key]) + (a,)
                continue
            px[x, y] = rule((r, g, b)) + (a,)
    return img


# ---------------------------------------------------------------- packing
def shelf_pack(items, width=256):
    """items: list of (id, image). Returns (atlas, {id: (x, y, w, h)})."""
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
    height = y + shelf_h
    atlas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for iid, im in items:
        rx, ry, _, _ = rects[iid]
        atlas.paste(im, (rx, ry), im)
    return atlas, rects


def main(pack_name):
    pack = PACKS[pack_name]
    base = SRC / pack["dir"]
    items = []
    sprites = {}
    for sid, (rel, fw, fh) in pack["sprites"].items():
        im = Image.open(base / rel)
        floor = sid.startswith("FLOOR")
        plant = "PLANT" in sid or "CACTUS" in sid
        im = recolour_image(im, lambda rgb, f=floor, p=plant: navy_shift(rgb, f, p)) if sid not in pack["keep"] else im.convert("RGBA")
        items.append((sid, im))
        sprites[sid] = {"fw": fw, "fh": fh}

    ch = pack["characters"]
    characters = {}
    sheet_ids = {}
    for cid, spec in ch["sheets"].items():
        im = Image.open(base / spec["file"])
        im = recolour_image(im, None, spec["map"])
        sheet_id = "sheet_" + cid
        items.append((sheet_id, im))
        sheet_ids[cid] = sheet_id
        anims = {}
        for aname, cols in ch["anims"].items():
            anims[aname] = {}
            for d, row in ch["rows"].items():
                anims[aname][d] = {"sheet": sheet_id, "row": row, "frames": cols}
            if "left" not in ch["rows"]:
                anims[aname]["left"] = "flip:right"
        characters[cid] = {"frameW": ch["frameW"], "frameH": ch["frameH"], "anims": anims}

    atlas, rects = shelf_pack(items)
    for sid in sprites:
        x, y, w, h = rects[sid]
        sprites[sid].update({"x": x, "y": y, "w": w, "h": h})
    sheets = {sid: dict(zip("xywh", rects[sid])) for sid in sheet_ids.values()}

    ATLAS_OUT.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(ATLAS_OUT, optimize=True)
    manifest = {
        "name": pack_name, "credit": pack["credit"], "tile": pack["tile"], "atlas": "/office/pack.png",
        "sprites": sprites, "roles": pack["roles"], "characters": characters, "sheets": sheets,
    }
    MANIFEST_OUT.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
    print("atlas", atlas.size, ATLAS_OUT.stat().st_size // 1024, "kB;", len(sprites), "sprites,", len(characters), "characters")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "pixel-agents")
