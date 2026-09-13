// Pixel-art stage for the /office page: loads the atlas built by
// scripts/build-staff-pack.py, sizes a canvas so every art pixel maps to a
// whole number of device pixels, and runs one draw callback per frame.
// Scenes live in scenes.js; this file only knows how to draw sprites.
import manifest from "./staff.json";

export const TILE = manifest.tile;
export const ATLAS = { url: manifest.atlas, w: manifest.width, h: manifest.height };
export const SPRITES = manifest.sprites;
export const CHARS = manifest.chars;

let atlasPromise = null;
export function loadAtlas() {
  if (!atlasPromise) {
    atlasPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        atlasPromise = null; // let a later stage retry
        reject(new Error(`Could not load ${manifest.atlas}`));
      };
      img.src = manifest.atlas;
    });
  }
  return atlasPromise;
}

// ---------------------------------------------------------------- drawing
export function sprite(ctx, img, id, x, y) {
  const s = SPRITES[id];
  if (!s) throw new Error(`Unknown sprite ${id}`);
  ctx.drawImage(img, s.x, s.y, s.w, s.h, x | 0, y | 0, s.w, s.h);
}

export function stripFrame(ctx, img, id, i, x, y) {
  const s = SPRITES[id];
  const w = s.w / s.n;
  ctx.drawImage(img, s.x + (i % s.n) * w, s.y, w, s.h, x | 0, y | 0, w, s.h);
}

export function charFrame(ctx, img, id, anim, i, x, y) {
  const a = CHARS[id][anim];
  const f = ((i % a.n) + a.n) % a.n;
  ctx.drawImage(img, a.x + f * a.w, a.y, a.w, a.h, x | 0, y | 0, a.w, a.h);
}

// A seeded 0..1 noise so "random" pixels stay put between frames.
export function noise(seed) {
  let t = (seed * 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mapRange = (v, a, b, oa, ob) => lerp(oa, ob, clamp01((v - a) / (b - a)));

export function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

const rgb = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// The sky through the window over a 24 hour day: [hour, top colour, horizon colour].
const SKY = [
  [0, [8, 12, 38], [18, 26, 66]],
  [4.5, [10, 14, 44], [30, 34, 78]],
  [6, [42, 52, 120], [214, 122, 84]],
  [7.5, [86, 138, 214], [236, 196, 150]],
  [10, [78, 142, 226], [176, 212, 246]],
  [14, [70, 132, 224], [168, 206, 244]],
  [17.5, [72, 118, 200], [238, 190, 128]],
  [19, [50, 54, 128], [226, 110, 92]],
  [20.5, [18, 24, 66], [70, 44, 100]],
  [22, [8, 12, 38], [24, 30, 72]],
  [24, [8, 12, 38], [18, 26, 66]],
];

function skyColours(hour) {
  for (let i = 1; i < SKY.length; i++) {
    if (hour <= SKY[i][0]) {
      const t = clamp01((hour - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
      return [mix(SKY[i - 1][1], SKY[i][1], t), mix(SKY[i - 1][2], SKY[i][2], t)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

// How dark the room is: 1 at night, 0 in daylight, eased through dawn and dusk.
export function nightAmount(hour) {
  if (hour < 5.5) return 1;
  if (hour < 7.5) return 1 - (hour - 5.5) / 2;
  if (hour < 17.5) return 0;
  if (hour < 20.5) return (hour - 17.5) / 3;
  return 1;
}

// Sky, stars, sun or moon and a distant skyline inside a window opening.
export function sky(ctx, x, y, w, h, hour, seed = 1) {
  const [top, horizon] = skyColours(hour);
  for (let row = 0; row < h; row++) {
    rect(ctx, x, y + row, w, 1, rgb(mix(top, horizon, row / Math.max(1, h - 1))));
  }
  const night = nightAmount(hour);
  if (night > 0) {
    for (let i = 0; i < w / 5; i++) {
      const sx = x + Math.floor(noise(seed * 91 + i) * w);
      const sy = y + Math.floor(noise(seed * 37 + i) * (h * 0.7));
      const twinkle = 0.45 + 0.55 * noise(seed + i + Math.floor(hour * 3));
      ctx.globalAlpha = night * twinkle;
      rect(ctx, sx, sy, 1, 1, "#E6ECFF");
    }
    ctx.globalAlpha = 1;
  }
  // sun from 6 to 19, moon the rest; both ride an arc across the opening
  const daylight = hour >= 6 && hour <= 19;
  const arc = daylight ? (hour - 6) / 13 : ((hour + 5) % 24) / 11;
  const bx = x + 4 + Math.floor(arc * (w - 12));
  const by = y + 3 + Math.floor((1 - Math.sin(arc * Math.PI)) * (h - 10));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (daylight) {
    rect(ctx, bx + 1, by, 4, 6, "#FDE68A");
    rect(ctx, bx, by + 1, 6, 4, "#FDE68A");
    rect(ctx, bx + 2, by + 2, 2, 2, "#FFF7D6");
  } else {
    rect(ctx, bx + 1, by, 4, 6, "#DDE4F5");
    rect(ctx, bx, by + 1, 6, 4, "#DDE4F5");
    rect(ctx, bx + 3, by + 2, 2, 2, rgb(mix(top, horizon, 0.3)));
  }
  // skyline: a row of dark blocks with windows that light up at night
  const base = y + h;
  let cx = x - 2;
  let i = 0;
  while (cx < x + w) {
    const bw = 5 + Math.floor(noise(seed * 7 + i) * 9);
    const bh = 5 + Math.floor(noise(seed * 13 + i) * (h * 0.45));
    rect(ctx, cx, base - bh, bw, bh, rgb(mix([14, 18, 46], [60, 70, 120], 1 - night * 0.6)));
    for (let wy = base - bh + 2; wy < base - 1; wy += 3) {
      for (let wx = cx + 1; wx < cx + bw - 1; wx += 3) {
        if (noise(seed * 3 + wx * 31 + wy) > 0.55) {
          ctx.globalAlpha = 0.25 + 0.75 * night;
          rect(ctx, wx, wy, 1, 1, "#F6D87A");
        }
      }
    }
    ctx.globalAlpha = 1;
    cx += bw + 1;
    i++;
  }
  ctx.restore();
}

// A window frame around an opening: two-pixel posts, a sill, and mullions
// at `posts` (x positions inside the opening; the middle by default).
export function windowFrame(ctx, x, y, w, h, posts = [x + ((w / 2) | 0) - 1]) {
  const f = "#2B3566";
  const hi = "#3D4A85";
  rect(ctx, x - 2, y - 2, w + 4, 2, f);
  rect(ctx, x - 2, y + h, w + 4, 2, f);
  rect(ctx, x - 2, y, 2, h, f);
  rect(ctx, x + w, y, 2, h, f);
  for (const px of posts) rect(ctx, px, y, 2, h, f);

  // The sill. The glass used to stop on a single flat line, so the city met
  // the wall on a hard edge and the whole window read as a poster hung on the
  // wall rather than as a hole in it. A ledge needs three tones to be a ledge:
  // a top face the light lands on, a front face for its thickness, and the
  // dark under-edge where it leaves the wall.
  const sy = y + h + 2;
  rect(ctx, x - 5, sy, w + 10, 2, "#5566AD");
  rect(ctx, x - 5, sy + 2, w + 10, 3, hi);
  rect(ctx, x - 5, sy + 5, w + 10, 1, "#1A2148");
  // and the shadow it throws down the wall, which is also what stops that
  // wall from being one flat band
  rect(ctx, x - 3, sy + 6, w + 6, 1, "rgba(9,12,34,0.34)");
  rect(ctx, x - 3, sy + 7, w + 6, 1, "rgba(9,12,34,0.21)");
  rect(ctx, x - 3, sy + 8, w + 6, 1, "rgba(9,12,34,0.11)");
}

// The wall down to `floorY`, then the floor. The wall is three courses of
// LimeZu's office wall: a cornice at the ceiling, plain face between, and a
// bottom course whose last two rows are the dark line where wall meets floor
// — which is why the skirting lands exactly on floorY. The floor pattern is
// 96x64, so it is stepped by its own size rather than by a tile.
export function room(ctx, img, W, H, floorY = 44) {
  const skirtY = floorY - SPRITES.SKIRT.h;
  for (let x = 0; x < W; x += TILE) {
    sprite(ctx, img, "WALL_TOP", x, 0);
    for (let y = TILE; y < skirtY; y += TILE) sprite(ctx, img, "WALL_MID", x, y);
    sprite(ctx, img, "SKIRT", x, skirtY);
  }
  // Every course of this wall is one flat colour — the pack's face has no
  // texture at all, which is fine behind furniture and reads as a painted
  // band wherever a long run of it is left bare, as it is under the chapter
  // windows. Light falling off toward the floor is enough to make it a
  // surface. Drawn before the glass, so the window is never dimmed by it.
  const wallH = Math.max(1, floorY);
  for (let y = 0; y < wallH; y += 1) {
    const a = 0.24 * (y / wallH) ** 1.7;
    if (a > 0.004) rect(ctx, 0, y, W, 1, `rgba(8,11,32,${a.toFixed(3)})`);
  }
  const f = SPRITES.FLOOR;
  for (let y = floorY; y < H; y += f.h) {
    for (let x = 0; x < W; x += f.w) sprite(ctx, img, "FLOOR", x, y);
  }
  // What the wall throws onto the carpet at its foot. Without it the floor
  // meets the wall on a drawn line and reads as a second flat band rather
  // than as a plane going away from the viewer — which is most of why the
  // things standing on it looked like they belonged to nothing.
  for (let i = 0; i < 9; i += 1) {
    const a = 0.30 * (1 - i / 9) ** 1.5;
    if (a > 0.004) rect(ctx, 0, floorY + i, W, 1, `rgba(7,10,30,${a.toFixed(3)})`);
  }
}

// Lines of activity on a screen: a header bar and rows that change every half second.
export function screenActivity(ctx, id, x, y, t, seed = 0) {
  const s = SPRITES[id];
  if (!s.screens) return;
  const tick = Math.floor(t * 2);
  s.screens.forEach((sc, k) => {
    const sx = x + sc.x;
    const sy = y + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    rect(ctx, sx, sy, sc.w, 2, "#3B6FD6");
    for (let row = sy + 3; row < sy + sc.h - 1; row += 2) {
      const n = noise(seed * 17 + k * 101 + row * 7 + tick);
      const len = Math.max(2, Math.floor(n * (sc.w - 4)));
      rect(ctx, sx + 1, row, len, 1, n > 0.8 ? "#9CC5FF" : "#5E9BFF");
    }
  });
}

// A bar chart on a screen, bars grown by `grow` (0..1) from left to right.
export function screenChart(ctx, id, k, x, y, values, grow) {
  const sc = SPRITES[id].screens[k];
  const sx = x + sc.x;
  const sy = y + sc.y;
  rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
  rect(ctx, sx + 1, sy + sc.h - 2, sc.w - 2, 1, "#5E9BFF");
  const bw = Math.max(2, Math.floor((sc.w - 2) / values.length) - 1);
  values.forEach((v, i) => {
    const local = clamp01(grow * values.length - i);
    const bh = Math.round(v * (sc.h - 4) * local);
    if (bh > 0) rect(ctx, sx + 1 + i * (bw + 1), sy + sc.h - 2 - bh, bw, bh, i === values.length - 1 ? "#9CC5FF" : "#5E9BFF");
  });
}

// Warm light from a desk lamp: stacked translucent squares, pixel style.
export function lampGlow(ctx, x, y, amount) {
  if (amount <= 0) return;
  // Stepped rings with the corners cut, added with "lighter": a pool of
  // light rather than the stack of translucent squares this used to draw,
  // whose edges showed against the dark wall.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let r = 24; r > 4; r -= 5) {
    ctx.globalAlpha = 0.028 * amount;
    const c = Math.max(2, Math.round(r * 0.45));
    rect(ctx, x - r + c, y - r, r * 2 - c * 2, r * 2, "#F59E0B");
    rect(ctx, x - r, y - r + c, r * 2, r * 2 - c * 2, "#F59E0B");
  }
  ctx.restore();
}

// The light in the room over the day: [hour, multiply colour]. White is
// plain daylight, the night colour is what the lamps and screens punch through.
const LIGHT = [
  [0, [98, 106, 176]],
  [5, [98, 106, 176]],
  [6, [178, 134, 144]],
  [7, [244, 202, 170]],
  [9, [252, 246, 236]],
  [12, [255, 255, 255]],
  [16, [255, 247, 228]],
  [18, [255, 202, 142]],
  [19, [216, 142, 126]],
  [20, [138, 114, 170]],
  [21, [98, 106, 176]],
  [24, [98, 106, 176]],
];

function lightColour(hour) {
  for (let i = 1; i < LIGHT.length; i++) {
    if (hour <= LIGHT[i][0]) {
      const t = clamp01((hour - LIGHT[i - 1][0]) / (LIGHT[i][0] - LIGHT[i - 1][0]));
      return mix(LIGHT[i - 1][1], LIGHT[i][1], t);
    }
  }
  return LIGHT[0][1];
}

// The brand is a cool dark navy, and at a low sun the table above tints the
// whole interior far enough toward orange that the room turns brown and
// fights everything around it on the page. The sky keeps the full warmth —
// it is the part that should say what time it is — but the light falling
// *into* the room is pulled back toward a neutral of the same brightness, so
// the wall and the carpet stay in the ink range at every hour.
const INTERIOR_COOL = 0.55;

function interiorLight(hour) {
  const c = lightColour(hour);
  const warmth = clamp01((c[0] - Math.min(c[1], c[2])) / 80);
  if (warmth <= 0) return c;
  const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return mix(c, [lum, lum, lum * 1.07], warmth * INTERIOR_COOL);
}

// Where the sun is: 0 at sunrise (6:00), 1 at sunset (19:00); null at night.
export function sunArc(hour) {
  if (hour < 6 || hour > 19) return null;
  return (hour - 6) / 13;
}

// Grade the whole room for the hour, leaving the window openings alone.
export function grade(ctx, W, H, hour, holes = []) {
  const c = interiorLight(hour);
  if (c[0] >= 254 && c[1] >= 254 && c[2] >= 254) return;
  const fill = rgb(c);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  if (holes.length === 1) {
    // One rectangular opening is four rectangles, not a clip path. An
    // evenodd clip cannot take the fast integer path, so it was rebuilding a
    // path mask every frame for a shape that is always the same four edges.
    // clamped and ordered: a hole with a negative extent, or one entirely off
    // the canvas, has to leave the canvas fully graded rather than inverted
    const h = holes[0];
    const x0 = Math.max(0, Math.min(W, h.x));
    const x1 = Math.max(x0, Math.min(W, h.x + h.w));
    const y0 = Math.max(0, Math.min(H, h.y));
    const y1 = Math.max(y0, Math.min(H, h.y + h.h));
    rect(ctx, 0, 0, W, y0, fill);
    rect(ctx, 0, y1, W, H - y1, fill);
    rect(ctx, 0, y0, x0, y1 - y0, fill);
    rect(ctx, x1, y0, W - x1, y1 - y0, fill);
  } else {
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    for (const h of holes) ctx.rect(h.x, h.y, h.w, h.h);
    ctx.clip("evenodd");
    rect(ctx, 0, 0, W, H, fill);
  }
  ctx.restore();
}

// Sunlight through a window onto the floor in front of it: a soft patch
// that drifts away from the sun, long and warm when the sun is low, short
// and pale at noon. It starts at the floor line; the wall itself stays lit
// only by the grade.
export function sunPatch(ctx, win, floorY, H, hour) {
  const arc = sunArc(hour);
  if (arc === null) return;
  const elevation = Math.sin(arc * Math.PI);
  const warm = 1 - elevation;
  const colour = rgb(mix([255, 250, 228], [255, 184, 120], warm * warm));
  const lean = (0.5 - arc) * 1.1; // pixels of drift per row
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.05 + 0.11 * elevation;
  for (let y = floorY; y < H; y++) {
    const d = y - floorY;
    const drift = Math.round(d * lean);
    const spread = Math.floor(d / 5);
    rect(ctx, win.x + 4 + drift - spread, y, win.w - 8 + spread * 2, 1, colour);
  }
  ctx.restore();
}

// The blue cast of a screen on whoever sits at it, and the glass itself
// relit after the grade so screens stay bright at night.
export function screenLight(ctx, id, x, y, night) {
  const s = SPRITES[id];
  if (!s.screens || night <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const sc of s.screens) {
    const cx = x + sc.x + sc.w / 2;
    const cy = y + sc.y + sc.h / 2;
    for (let r = 18; r > 6; r -= 4) {
      ctx.globalAlpha = 0.045 * night;
      rect(ctx, cx - r, cy - r - 6, r * 2, r * 2, "#3B82F6");
    }
  }
  ctx.restore();
}

// Sound rings beside a ringing phone.
export function ringing(ctx, x, y, t) {
  const phase = (t * 2) % 1;
  ctx.globalAlpha = 1 - phase;
  const r = 2 + Math.floor(phase * 6);
  rect(ctx, x + r, y - r, 1, 2, "#9CC5FF");
  rect(ctx, x + r + 1, y - r + 2, 1, 3, "#9CC5FF");
  rect(ctx, x + r, y - r + 5, 1, 2, "#9CC5FF");
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- stage
/**
 * Drives a canvas: integer pixel scale, DPR, resize, visibility and the
 * frame loop. `draw(ctx, img, view)` gets { W, H, t, progress }.
 * `scale(cssWidth)` returns the wanted CSS pixels per art pixel and
 * `logicalH` is a height in art pixels or a function of the CSS width.
 */
// A global freeze. While a full-screen overlay is up, nothing behind it needs
// to repaint — and a canvas running at 60fps under a translucent layer keeps
// the compositor re-sampling the page on every frame of the overlay's own
// animation, which is what made closing the request sheet stutter.

// How much device resolution a pixel stage is allowed to ask for.
// Every art pixel is already several device pixels wide, so a third device
// pixel per step buys no detail a viewer can see — and it is not free: the
// backing store grows with the square of this number, and on a phone the
// four chapter scenes are composited on every scrolled frame. At dpr 3 that
// measured about 20fps on a throttled mid-range device; capped at 2 it is
// roughly double, with nothing lost. Nothing is lost because the canvas is
// `image-rendering: pixelated` and the numbers stay whole: an art pixel is
// 4 canvas pixels here, and on a 3x screen those 4 display as exactly 6, so
// every art-pixel edge still lands on a device-pixel boundary.
export const MAX_STAGE_DPR = 2;
export const stageDpr = () =>
  Math.min(MAX_STAGE_DPR, (typeof window !== "undefined" && window.devicePixelRatio) || 1);

let stagesFrozen = false;
const freezeSubscribers = new Set();

export function setStagesFrozen(next) {
  if (stagesFrozen === next) return;
  stagesFrozen = next;
  for (const fn of freezeSubscribers) fn();
}

export function createStage(canvas, { img, draw, logicalH, scale, minW = 64, reduced = false }) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D canvas unavailable");
  const heightFor = typeof logicalH === "function" ? logicalH : () => logicalH;
  let W = 0;
  let H = heightFor(canvas.parentElement ? canvas.parentElement.clientWidth : 0);
  let sDev = 1;
  let progress = 0;
  let raf = 0;
  let visible = false;
  let running = false;
  let last = 0;
  let t = 0;
  let dirty = false;

  const render = () => {
    dirty = false; // whatever was recorded is on the canvas now
    ctx.setTransform(sDev, 0, 0, sDev, 0, 0);
    ctx.imageSmoothingEnabled = false;
    draw(ctx, img, { W, H, t, progress });
  };

  const resize = () => {
    const host = canvas.parentElement || canvas;
    const cssW = host.clientWidth;
    if (!cssW) return;
    const dpr = stageDpr();
    // never scale so far that the scene's content no longer fits the width
    sDev = Math.max(1, Math.min(Math.round(scale(cssW) * dpr), Math.floor((cssW * dpr) / minW)));
    W = Math.max(minW, Math.floor((cssW * dpr) / sDev));
    H = heightFor(cssW);
    canvas.width = W * sDev;
    canvas.height = H * sDev;
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    render();
  };

  const loop = (now) => {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    render();
    raf = requestAnimationFrame(loop);
  };

  const update = () => {
    const should = visible && !reduced && !document.hidden && !stagesFrozen;
    if (should && !running) {
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    // A scroll that happened while this stage was off screen still has to
    // land, and it lands here, once, rather than on every scroll event. This
    // runs BEFORE update(): update() starts the loop, and then `running`
    // would be true and the catch-up neither drawn nor cleared.
    if (visible && dirty) { dirty = false; render(); }
    update();
  }, { rootMargin: "80px" });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  document.addEventListener("visibilitychange", update);
  freezeSubscribers.add(update);
  resize();

  return {
    setProgress(p) {
      progress = p;
      // The scroll spring feeds this from a scroll handler and keeps feeding
      // it for a second or two after the finger lifts. Redrawing a canvas
      // nobody can see is the whole frame's work for nothing — and the
      // scroll range that drives progress is wider than the range that keeps
      // the stage on screen, so it was happening on every chapter. Off
      // screen the progress is just recorded; the observer draws it once
      // when the stage comes back.
      if (running) return;
      if (visible) render();
      else dirty = true;
    },
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", update);
      freezeSubscribers.delete(update);
    },
  };
}

// Darkens everything outside the art-pixel band [x0, x1] in three hard steps.
// Stepped rather than a gradient: a soft radial falloff over a pixel room
// reads as a CSS effect pasted on top of the art. Call it last — after
// grade(), after sunPatch(), after the deferred lights — so the focused
// desk's screen and lamp glow survive it.
export function focusDim(ctx, W, H, x0, x1, amount) {
  if (amount <= 0) return;
  const STEPS = [[44, 0.14], [24, 0.22], [0, 0.3]];
  ctx.save();
  ctx.fillStyle = "#050A18";
  for (const [pad, a] of STEPS) {
    ctx.globalAlpha = a * amount;
    const L = Math.max(0, (x0 - pad) | 0);
    const R = Math.min(W, (x1 + pad) | 0);
    ctx.fillRect(0, 0, L, H);
    ctx.fillRect(R, 0, W - R, H);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
