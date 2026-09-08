"""Small textures for the 3D office: a night skyline behind the windows, the
screens on the monitors, the whiteboard. PIL only, written to a temp dir."""
from PIL import Image, ImageDraw
import random, math, os

NAVY = (15, 23, 42)
SKY = (56, 189, 248)
PAPER = (230, 236, 255)
MUTED = (139, 159, 196)


def skyline(path, w=2048, h=768, seed=3):
    rnd = random.Random(seed)
    im = Image.new("RGB", (w, h), (4, 7, 18))
    d = ImageDraw.Draw(im)
    # sky gradient
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(4 + 6 * t), int(7 + 10 * t), int(18 + 30 * t)))
    for _ in range(320):
        x, y = rnd.randrange(w), rnd.randrange(int(h * 0.55))
        d.point((x, y), fill=(200, 215, 255) if rnd.random() < 0.7 else (120, 140, 190))
    # distant hills
    pts = [(x, int(h * 0.62 + 28 * math.sin(x / 260) + 16 * math.sin(x / 90 + 1))) for x in range(0, w + 40, 40)]
    d.polygon(pts + [(w, h), (0, h)], fill=(8, 12, 30))
    # buildings, tallest near the middle
    x = 0
    while x < w:
        bw = rnd.randrange(50, 150)
        bh = rnd.randrange(60, 260) + int(120 * math.exp(-((x - w * 0.55) / (w * 0.25)) ** 2))
        top = h - bh
        d.rectangle([x, top, x + bw, h], fill=(10, 15, 34) if rnd.random() < 0.5 else (13, 19, 42))
        for wy in range(top + 10, h - 10, 18):
            for wx in range(x + 8, x + bw - 10, 16):
                r = rnd.random()
                if r < 0.35:
                    d.rectangle([wx, wy, wx + 7, wy + 9], fill=(150, 170, 210) if r < 0.25 else (255, 200, 120))
        x += bw + rnd.randrange(6, 30)
    im.save(path)


def screen_chat(path, w=512, h=320):
    im = Image.new("RGB", (w, h), (10, 18, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 40], fill=(14, 24, 50))
    d.ellipse([14, 8, 38, 32], fill=SKY)
    d.rectangle([50, 14, 180, 26], fill=MUTED)
    rows = [("in", 300), ("out", 220), ("in", 170), ("out", 260), ("out", 120)]
    y = 62
    for side, ln in rows:
        x0 = 20 if side == "in" else w - 20 - ln
        d.rounded_rectangle([x0, y, x0 + ln, y + 40], 12, fill=SKY if side == "in" else PAPER)
        d.rectangle([x0 + 16, y + 16, x0 + ln - 16, y + 24], fill=NAVY if side == "in" else (42, 53, 88))
        y += 52
    im.save(path)


def screen_chart(path, w=512, h=320):
    im = Image.new("RGB", (w, h), (10, 18, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 40], fill=(14, 24, 50))
    d.rectangle([20, 14, 150, 26], fill=MUTED)
    for gy in range(70, h - 40, 40):
        d.line([(30, gy), (w - 30, gy)], fill=(22, 32, 63))
    bars = [0.35, 0.6, 0.45, 0.8, 0.55, 0.7, 0.5, 0.9]
    bw = (w - 80) // len(bars)
    for i, v in enumerate(bars):
        x = 40 + i * bw
        d.rectangle([x + 8, int((h - 40) - v * (h - 120)), x + bw - 8, h - 40], fill=SKY if i % 2 else (94, 155, 255))
    d.line([(30, h - 40), (w - 30, h - 40)], fill=MUTED, width=2)
    im.save(path)


def screen_table(path, w=512, h=320):
    im = Image.new("RGB", (w, h), (10, 18, 38))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 40], fill=(14, 24, 50))
    for i in range(6):
        y = 60 + i * 42
        d.rectangle([24, y, 60, y + 22], fill=SKY if i == 1 else (30, 42, 80))
        d.rectangle([76, y + 6, 76 + 300 - (i * 37) % 160, y + 16, ], fill=MUTED)
    im.save(path)


def screen_off(path, w=512, h=320):
    Image.new("RGB", (w, h), (12, 16, 30)).save(path)


def whiteboard(path, w=1024, h=640):
    im = Image.new("RGB", (w, h), (236, 240, 246))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, h], outline=(180, 190, 205), width=10)
    d.line([(90, h - 110), (w - 90, h - 110)], fill=(60, 70, 90), width=6)
    d.line([(90, h - 110), (90, 90)], fill=(60, 70, 90), width=6)
    pts = [(120, h - 160), (260, h - 240), (400, h - 210), (560, h - 340), (720, h - 300), (900, h - 470)]
    d.line(pts, fill=(37, 99, 235), width=8)
    for p in pts:
        d.ellipse([p[0] - 10, p[1] - 10, p[0] + 10, p[1] + 10], fill=(245, 158, 11))
    for i in range(4):
        d.rectangle([w - 300, 60 + i * 44, w - 300 + 180 - i * 30, 60 + i * 44 + 16], fill=(80, 90, 110))
    d.text((110, 40), "Q4", fill=(60, 70, 90))
    im.save(path)


def all_textures(dirpath):
    os.makedirs(dirpath, exist_ok=True)
    out = {}
    for name, fn in [("skyline", skyline), ("chat", screen_chat), ("chart", screen_chart), ("table", screen_table), ("off", screen_off), ("whiteboard", whiteboard)]:
        p = os.path.join(dirpath, name + ".png")
        fn(p)
        out[name] = p
    return out


if __name__ == "__main__":
    print(all_textures("/tmp/office3d/tex"))
