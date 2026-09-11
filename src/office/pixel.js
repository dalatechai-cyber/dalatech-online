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
  if (hour < 18) return 0;
  if (hour < 20.5) return (hour - 18) / 2.5;
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

// A window frame around an opening: two-pixel posts, a mullion and a sill.
export function windowFrame(ctx, x, y, w, h) {
  const f = "#2B3566";
  const hi = "#3D4A85";
  rect(ctx, x - 2, y - 2, w + 4, 2, f);
  rect(ctx, x - 2, y + h, w + 4, 2, f);
  rect(ctx, x - 2, y, 2, h, f);
  rect(ctx, x + w, y, 2, h, f);
  rect(ctx, x + ((w / 2) | 0) - 1, y, 2, h, f);
  rect(ctx, x - 4, y + h + 2, w + 8, 3, hi);
  rect(ctx, x - 4, y + h + 5, w + 8, 1, "#1A2148");
}

// Wall tiles across the top two rows, carpet below.
export function room(ctx, img, W, H, floorY = 64) {
  for (let x = 0; x < W; x += TILE) {
    sprite(ctx, img, "WALL_TOP", x, 0);
    for (let y = 32; y < floorY; y += 32) sprite(ctx, img, "WALL_MID", x, y);
  }
  for (let y = floorY; y < H; y += 64) {
    for (let x = 0; x < W; x += 64) sprite(ctx, img, "FLOOR", x, y);
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
  for (let r = 22; r > 4; r -= 6) {
    ctx.globalAlpha = 0.05 * amount;
    rect(ctx, x - r, y - r, r * 2, r * 2, "#F59E0B");
  }
  ctx.globalAlpha = 1;
}

// Dim the room at night, leaving the window alone.
export function nightTint(ctx, W, H, amount, hole) {
  if (amount <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  if (hole) ctx.rect(hole.x, hole.y, hole.w, hole.h);
  ctx.clip("evenodd");
  ctx.globalAlpha = 0.42 * amount;
  rect(ctx, 0, 0, W, H, "#050A18");
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

  const render = () => {
    ctx.setTransform(sDev, 0, 0, sDev, 0, 0);
    ctx.imageSmoothingEnabled = false;
    draw(ctx, img, { W, H, t, progress });
  };

  const resize = () => {
    const host = canvas.parentElement || canvas;
    const cssW = host.clientWidth;
    if (!cssW) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
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
    const should = visible && !reduced && !document.hidden;
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
    update();
  }, { rootMargin: "80px" });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  document.addEventListener("visibilitychange", update);
  resize();

  return {
    setProgress(p) {
      progress = p;
      if (!running) render(); // reduced motion or off-screen: still reflect scroll
    },
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", update);
    },
  };
}
