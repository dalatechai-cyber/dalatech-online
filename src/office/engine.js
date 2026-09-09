/**
 * The office engine: a small tile renderer with four people who work, get up,
 * walk somewhere, and come back. Plain JS, no React; OfficeScene.jsx mounts it.
 *
 * Everything drawn comes from the pack manifest (src/office/pack.json) and the
 * floor plan (src/office/layout.js). Swapping the art pack means a new
 * manifest; the engine never names a sprite directly.
 *
 * Rendering: a world canvas at 1 art pixel per canvas pixel is redrawn eight
 * times a second (floor + walls prerendered, then furniture and people sorted
 * by their feet, then lamp light with a screen blend, then screen contents). It is blitted to the visible canvas at an integer
 * scale through a camera that can ease onto one desk. Nothing runs while the
 * canvas is off screen, and reduced-motion gets one still frame.
 */
import * as L from "./layout";

const TICK_MS = 125; // 8 fps: pixel art reads better slow
const WALK_TICKS_PER_TILE = 3;
const GOLD_LIGHT = [255, 200, 96];

// Screens, bubbles and signs use the same vocabulary as the rest of the site.
const C = {
  wall: "#141D38", wallTop: "#1B2545", wallBase: "#0B1222", wallShade: "#0F172A", wallLine: "#1A2447",
  // the city at night: the sky glows towards the horizon so silhouettes read dark against it
  frame: "#2A3358", frameHi: "#3A4478", sky: "#0B1330", skyLo: "#152046", horizon: "#1E2C5C",
  mountain: "#0D1636", bldg: "#050914", bldgHi: "#090F22", winLit: "#8FA0C4", winDim: "#2E3A5E", star: "#BFD3FF", moon: "#DDE6FF",
  floorA: "#171F3B", floorB: "#141C36", rug: "#1B2548", rugEdge: "#26325E", rugIn: "#1F2A52",
  screenBg: "#0A1226", bubbleIn: "#38BDF8", bubbleInTx: "#0A1226", bubbleOut: "#E6ECFF", bubbleOutTx: "#2A3558", dot: "#B7C2E0",
  chart: ["#38BDF8", "#5E9BFF", "#8B9FC4"], axis: "#8B9FC4", wave: "#38BDF8", waveAlt: "#5E9BFF",
  lampStem: "#3A3F55", lampBase: "#2A3358", lampShade: "#F59E0B", lampShadeLo: "#B45309", lampShadeHi: "#FBBF24", bulb: "#FDE68A",
  lampOff: "#2A3358", lampOffLo: "#1F274A",
  frost: [196, 210, 240], frostRail: "#8B9FC4", statue: "#020408", talk: "#E6ECFF", talkTx: "#2A3558", shadow: "rgba(5,10,24,0.35)",
};

// ------------------------------------------------------------------ work loops
const SCRIPTS = {
  chat: [
    { k: "in", len: 5, ms: 1100 }, { k: "read", ms: 700 }, { k: "type", ms: 1600 }, { k: "out", len: 4, ms: 1000 },
    { k: "in", len: 3, ms: 1100 }, { k: "read", ms: 600 }, { k: "type", ms: 1400 }, { k: "out", len: 5, ms: 1500 },
    { k: "hold", ms: 1000 }, { k: "clear", ms: 300 },
  ],
  chart: [
    { k: "read", ms: 1400 }, { k: "type", ms: 1800 }, { k: "grow", ms: 2400 }, { k: "book", ms: 2600 },
    { k: "type", ms: 1500 }, { k: "hold", ms: 1200 }, { k: "clear", ms: 300 },
  ],
  outreach: [
    { k: "type", ms: 1700 }, { k: "out", len: 5, ms: 1300 }, { k: "read", ms: 900 }, { k: "type", ms: 1500 },
    { k: "out", len: 4, ms: 1300 }, { k: "in", len: 3, ms: 1400 }, { k: "read", ms: 800 }, { k: "hold", ms: 800 }, { k: "clear", ms: 300 },
  ],
  call: [{ k: "ring", ms: 1200 }, { k: "talk", ms: 3600 }, { k: "type", ms: 1800 }, { k: "hold", ms: 1400 }],
};
const PHASE_OFFSET = { ara: 0, veda: 3100, nova: 1900, eho: 5200 };

function runScript(script, t) {
  const total = script.reduce((s, p) => s + p.ms, 0);
  let u = t % total;
  const done = [];
  for (const p of script) {
    if (u < p.ms) return { phase: p, phaseT: u, done };
    u -= p.ms;
    done.push(p);
  }
  return { phase: script[0], phaseT: 0, done };
}

function workState(kind, t) {
  const { phase, phaseT, done } = runScript(SCRIPTS[kind], t);
  const bubbles = done.filter((p) => p.k === "in" || p.k === "out").map((p) => ({ side: p.k, len: p.len }));
  if (phase.k === "in" || phase.k === "out") bubbles.push({ side: phase.k, len: phase.len, fresh: phaseT < 160 });
  if (phase.k === "clear") bubbles.length = 0;
  const grown = done.some((p) => p.k === "grow") ? 1 : phase.k === "grow" ? phaseT / phase.ms : 0;
  return {
    bubbles: bubbles.slice(-2),
    typing: phase.k === "type",
    talking: phase.k === "talk",
    ringing: phase.k === "ring",
    reading: phase.k === "book",
    grown,
  };
}

// ------------------------------------------------------------------ helpers
function bfsPath(walkable, from, to) {
  // Uniform-cost grid, so breadth-first search is the whole of A* we need.
  const key = (c, r) => r * L.COLS + c;
  const prev = new Map();
  const queue = [[from.col, from.row]];
  prev.set(key(from.col, from.row), null);
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === to.col && r === to.row) break;
    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= L.COLS || nr >= L.ROWS) continue;
      const k = key(nc, nr);
      if (prev.has(k)) continue;
      const isGoal = nc === to.col && nr === to.row;
      if (!walkable[nr][nc] && !isGoal) continue;
      prev.set(k, key(c, r));
      queue.push([nc, nr]);
    }
  }
  const goalKey = key(to.col, to.row);
  if (!prev.has(goalKey)) return null;
  const path = [];
  for (let k = goalKey; k !== null; k = prev.get(k)) path.push({ col: k % L.COLS, row: Math.floor(k / L.COLS) });
  path.reverse();
  return path.slice(1); // exclude the start tile
}

function faceFrom(a, b) {
  if (b.col > a.col) return "right";
  if (b.col < a.col) return "left";
  if (b.row > a.row) return "down";
  return "up";
}

// ------------------------------------------------------------------ engine
export function createOffice({ canvas, manifest, atlas, onView, reducedMotion = false, seed = 7 }) {
  const T = manifest.tile;
  const K = T / 16; // 1 at 16px tiles, 2 at 32px: scales the hand-drawn bits
  const U = Math.max(1, Math.round(K)); // unit for screen content
  const W = L.COLS * T, H = L.ROWS * T;
  const world = document.createElement("canvas");
  world.width = W; world.height = H;
  const wctx = world.getContext("2d");
  const sctx = canvas.getContext("2d");
  sctx.imageSmoothingEnabled = false;

  // deterministic randomness, so the office looks the same on every visit
  let rnd = seed >>> 0;
  const random = () => { rnd += 0x6D2B79F5; let t = rnd; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const hasRole = (role) => Boolean(manifest.roles[role]);
  const spriteOf = (role, i = 0) => {
    const id = manifest.roles[role];
    const sid = Array.isArray(id) ? id[i % id.length] : id;
    const s = manifest.sprites[sid];
    if (!s) throw new Error(`office pack has no sprite for role "${role}"`);
    return s;
  };
  const drawSprite = (ctx, s, x, y) => ctx.drawImage(atlas, s.x, s.y, s.w, s.h, x, y, s.w, s.h);

  // ---- placements: furniture instances, walkability, seats
  const walkable = Array.from({ length: L.ROWS }, (_, r) => Array.from({ length: L.COLS }, () => r >= L.WALL_ROWS));
  const furniture = [];
  const pcs = {}; // deskId -> pc placement
  L.FURNITURE.forEach((f) => {
    const s = spriteOf(f.role);
    const x = f.col * T + (s.ox || 0) + (f.offsetX || 0);
    // sprites are bottom-aligned to their footprint, so tall ones rise into the rows above
    const y = (f.row + s.fh) * T - s.h + (f.offsetY || 0);
    const item = { ...f, s, x, y, sortY: (f.row + s.fh) * T };
    if (f.wall || f.flat) item.sortY = -1;
    if (f.onDesk) {
      // stands on a surface: drawn right after the surface beneath it
      const under = furniture.find((o) => !o.onDesk && !o.seat && !o.wall && f.col >= o.col && f.col < o.col + o.s.fw && f.row >= o.row && f.row < o.row + o.s.fh);
      // nearer-the-viewer items on the same surface are drawn last
      item.sortY = (under ? under.sortY : (f.row + 1) * T) + 0.5 + (y + s.h) / 1e4;
    }
    if (f.seat) item.sortY = f.row * T + T - 1; // chair: behind the person on it
    furniture.push(item);
    if (f.screenOf) pcs[f.screenOf] = item;
    if (f.wall || f.flat || f.onDesk || f.seat) return;
    for (let r = f.row; r < f.row + s.fh; r++) for (let c = f.col; c < f.col + s.fw; c++) if (walkable[r]) walkable[r][c] = false;
  });
  // seats are for their owner only; nobody paths through them
  L.DESKS.forEach((d) => { walkable[d.seat.row][d.seat.col] = false; });

  // ---- people
  const people = L.DESKS.map((d) => ({
    id: d.id, desk: d, char: manifest.characters[d.id],
    col: d.seat.col, row: d.seat.row, x: d.seat.col * T, y: d.seat.row * T,
    face: "down", state: "seated", path: [], stepTick: 0, walkFrame: 0,
    waitUntil: 0, dest: null, talk: null, work: null,
  }));
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  // ---- static layers
  const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
  const light = document.createElement("canvas"); light.width = W; light.height = H;
  let skylineSeed = null;

  // ---- windows: the pack's hollow frame, `panes` copies side by side, with one
  // continuous view of the city painted through all of them
  const wallH = L.WALL_ROWS * T;
  const windows = L.WINDOW.map((win) => {
    const s = hasRole("windowFrame") ? spriteOf("windowFrame") : null;
    const n = win.panes || 1;
    const x0 = win.col * T + (win.dx || 0), y0 = (win.row || 0) * T + (win.dy || 0);
    const panes = [];
    for (let i = 0; i < n; i++) {
      if (s) { const fx = x0 + i * s.w; panes.push({ fx, fy: y0, inner: { x: fx + s.inner.x, y: y0 + s.inner.y, w: s.inner.w, h: s.inner.h } }); }
      else { const pw = Math.round((win.cols || 3.5) * T); panes.push({ fx: x0, fy: y0, w: pw, h: wallH - y0 - 14 * K, inner: { x: x0 + K, y: y0 + K, w: pw - 2 * K, h: wallH - y0 - 16 * K } }); }
    }
    const first = panes[0].inner, last = panes[n - 1].inner;
    return { ...win, s, panes, glass: { x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h } };
  });

  // Ulaanbaatar at night, seen through one window. Units are K art pixels;
  // `uy` counts up from the sill. Bogd Khan Uul behind, the city on the
  // horizon, and one landmark in front: the Blue Sky tower's sail in one
  // pane, Sükhbaatar on his horse over the square in the other.
  function drawSkyline(ctx, g, t, landmark) {
    const { x, y, w, h } = g;
    const uw = Math.floor(w / K), uh = Math.floor(h / K);
    const px = (ux, uy, cw, ch, c) => { ctx.fillStyle = c; ctx.fillRect(x + ux * K, y + h - (uy + ch) * K, cw * K, ch * K); };
    ctx.fillStyle = C.sky; ctx.fillRect(x, y, w, h);
    px(0, 0, uw, 15, C.skyLo); px(0, 0, uw, 9, C.horizon);
    skylineSeed.stars.forEach(([sx, sy]) => { if (sx < uw && sy < uh - 14) px(sx, uh - 1 - sy, 1, 1, C.star); });
    if (landmark === "tower") { px(5, uh - 7, 4, 4, C.moon); px(7, uh - 6, 4, 4, C.sky); }
    // the mountain ridge south of the city
    for (let i = 0; i < uw; i++) { const m = 7 + Math.round(2 * Math.sin(i / 4.5) + 1.4 * Math.sin(i / 2.2 + 1)); px(i, 0, 1, m + 2, C.mountain); }
    // blocks along the horizon, a few windows lit, some switching over time
    skylineSeed.bldgs.forEach((b, i) => {
      if (b.x >= uw) return;
      const bw = Math.min(b.w, uw - b.x), bh = Math.min(b.h, 10);
      px(b.x, 0, bw, bh, i % 3 === 0 ? C.bldgHi : C.bldg);
      b.lit.forEach(([lx, ly], k) => { if (lx >= bw || ly >= bh) return; const on = ((i * 7 + k * 13 + Math.floor(t / 2400)) % 5) !== 0; px(b.x + lx, ly, 1, 1, on ? C.winLit : C.winDim); });
    });
    // the landmarks sit in the pane that is not hidden behind the frame's post
    if (landmark === "tower") {
      // Blue Sky: a straight spine on the left and a sail curving down to the right
      const tx = uw - 14, th = 21, tw = 11;
      for (let i = 0; i < tw; i++) { const hi = th - Math.round((i / (tw - 1)) * (i / (tw - 1)) * 15); px(tx + i, 0, 1, hi, C.bldg); }
      px(tx, 0, 1, th, C.bldgHi);
      for (let k = 0; k < 9; k++) { const ux = tx + 1 + ((k * 5) % 8), uy = 2 + k * 2; const hi = th - Math.round(((ux - tx) / (tw - 1)) * ((ux - tx) / (tw - 1)) * 15); if (uy < hi - 1) px(ux, uy, 1, 1, (k % 3) ? C.winLit : C.winDim); }
      // a low block in front, so the tower stands in a street and not on a line
      px(tx - 5, 0, 5, 4, C.bldg); px(tx - 4, 1, 1, 1, C.winLit); px(tx - 2, 2, 1, 1, C.winLit);
    } else {
      // the Government Palace's long colonnade behind the square, then the statue
      px(-6, 0, 40, 6, C.bldg); px(2, 0, 14, 7, C.bldg);
      for (let i = -4; i <= 30; i += 3) px(i, 1, 1, 4, i % 2 ? C.winDim : C.winLit);
      const S = [
        "....#...........", ".....#..##......", "......#.##......", ".......####.....", ".##....####.....",
        "####..#####.....", ".####.######....", "..###########.#.", "...###########.#", "....##########..",
        "....##.....##...", "....##.....##...", "....##.....##...", "..############..", "....########....",
        "....########....", "....########....", "....########....", "..############..", "################",
      ];
      const top = S.length;
      S.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === "#") px(c, top - 1 - r, 1, 1, C.statue); });
    }
    // reflection of the room in the glass: a faint gold band low in the pane
    ctx.fillStyle = "rgba(245,158,11,0.05)"; ctx.fillRect(x, y + h - 10 * K, w, 10 * K);
  }
  function paintWindows(ctx, t) {
    windows.forEach((win) => {
      ctx.save(); ctx.beginPath();
      win.panes.forEach((p) => ctx.rect(p.inner.x, p.inner.y, p.inner.w, p.inner.h));
      ctx.clip(); drawSkyline(ctx, win.glass, t, win.landmark); ctx.restore();
      win.panes.forEach((p) => {
        if (win.s) { drawSprite(ctx, win.s, p.fx, p.fy); return; }
        ctx.fillStyle = C.frame; ctx.fillRect(p.fx, p.fy, p.w, K); ctx.fillRect(p.fx, p.fy + p.h - K, p.w, K); ctx.fillRect(p.fx, p.fy, K, p.h); ctx.fillRect(p.fx + p.w - K, p.fy, K, p.h);
        ctx.fillStyle = C.frameHi; ctx.fillRect(p.fx, p.fy + p.h, p.w, K);
      });
    });
  }

  // ---- low frosted partitions across the unbuilt desks: glass with a top
  // rail and end posts, drawn in the y-sort so people walking in front pass it
  const partitions = L.DESKS.filter((d) => d.partition).map((d) => {
    const q = d.partition, pw = q.cols * T - 4 * K, ph = 11 * K;
    const cv = document.createElement("canvas"); cv.width = pw; cv.height = ph;
    const c = cv.getContext("2d");
    for (let yy = K; yy < ph - K; yy += K) for (let xx = 0; xx < pw; xx += K) {
      const al = (((xx / K) + (yy / K)) & 1) ? 0.30 : 0.20;
      c.fillStyle = `rgba(${C.frost[0]},${C.frost[1]},${C.frost[2]},${al})`; c.fillRect(xx, yy, K, K);
    }
    c.fillStyle = "rgba(230,236,255,0.16)"; c.fillRect(2 * K, 2 * K, pw - 4 * K, K); // a pale sheen under the rail
    c.fillStyle = C.frostRail; c.fillRect(0, 0, pw, K); c.fillStyle = C.frame; c.fillRect(0, ph - K, pw, K);
    c.fillRect(0, 0, 2 * K, ph); c.fillRect(pw - 2 * K, 0, 2 * K, ph);
    c.fillStyle = C.frostRail; c.fillRect(0, 0, K, ph); c.fillRect(pw - 2 * K, 0, K, ph);
    const x = q.col * T + 2 * K, y = Math.round(q.row * T) - 7 * K;
    return { cv, x, y, w: pw, h: ph, sortY: q.row * T + 6 * K, deskId: d.id };
  });

  function buildStatic() {
    const stars = []; for (let i = 0; i < 26; i++) stars.push([Math.floor(random() * 70), Math.floor(random() * 18)]);
    const bldgs = []; let bx = 0;
    while (bx < 80) { const w = 3 + Math.floor(random() * 6), h = 3 + Math.floor(random() * 9); const lit = []; for (let k = 0; k < Math.max(1, Math.floor(w * h / 14)); k++) lit.push([Math.floor(random() * w), Math.floor(random() * h)]); bldgs.push({ x: bx, w, h, lit }); bx += w + (random() < 0.3 ? 1 : 0); }
    skylineSeed = { stars, bldgs };

    const ctx = bg.getContext("2d");
    if (hasRole("wallTop")) {
      // the pack's standing wall: cap row, plain rows, baseboard row
      const top = spriteOf("wallTop"), mid = spriteOf("wallMid"), bot = spriteOf("wallBottom");
      for (let r = 0; r < L.WALL_ROWS; r++) for (let c = 0; c < L.COLS; c++) drawSprite(ctx, r === 0 ? top : r === L.WALL_ROWS - 1 ? bot : mid, c * T, r * T);
    } else {
      // wall: a flat navy face with a faint panel line and a skirting board
      ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, wallH);
      ctx.fillStyle = C.wallTop; ctx.fillRect(0, 0, W, K);
      ctx.fillStyle = C.wallLine; for (let x = 0; x < W; x += 4 * T) ctx.fillRect(x, K, 1, wallH - 4 * K);
      ctx.fillStyle = C.wallBase; ctx.fillRect(0, wallH - 3 * K, W, 3 * K);
      ctx.fillStyle = C.wallShade; ctx.fillRect(0, wallH - 4 * K, W, K);
    }
    paintWindows(ctx, 0);
    // floor: the pack's carpet tile if it has one, otherwise a quiet checker
    if (hasRole("floor")) {
      const fs = spriteOf("floor");
      for (let y = wallH; y < H; y += fs.h) for (let x = 0; x < W; x += fs.w) {
        const cw = Math.min(fs.w, W - x), ch = Math.min(fs.h, H - y);
        ctx.drawImage(atlas, fs.x, fs.y, cw, ch, x, y, cw, ch);
      }
    } else {
      for (let r = L.WALL_ROWS; r < L.ROWS; r++) for (let c = 0; c < L.COLS; c++) { ctx.fillStyle = ((c + r) & 1) ? C.floorA : C.floorB; ctx.fillRect(c * T, r * T, T, T); }
    }
    // rugs
    L.RUGS.forEach((rg) => {
      const x = rg.col * T + 2 * K, y = rg.row * T + 2 * K, w = rg.cols * T - 4 * K, h = rg.rows * T - 4 * K;
      ctx.fillStyle = C.rugEdge; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.rug; ctx.fillRect(x + K, y + K, w - 2 * K, h - 2 * K);
      ctx.fillStyle = C.rugIn;
      if (rg.kind === "runner") { for (let yy = y + 6 * K; yy < y + h - 4 * K; yy += 10 * K) ctx.fillRect(x + 3 * K, yy, w - 6 * K, K); }
      else ctx.fillRect(x + 5 * K, y + 5 * K, w - 10 * K, h - 10 * K);
    });
    // rugs lie on the floor; wall items go on the wall layer once
    furniture.filter((f) => f.flat).forEach((f) => drawSprite(ctx, f.s, f.x, f.y));
    furniture.filter((f) => f.wall).forEach((f) => drawSprite(ctx, f.s, f.x, f.y));

    // lamp light: gold pools on the desk and floor around each lit lamp, dithered on the grid
    const lctx = light.getContext("2d");
    const img = lctx.createImageData(W, H), d = img.data;
    const lamps = L.DESKS.filter((k) => k.live).map((k) => k.light);
    const TINTS = [0, 0.13, 0.26, 0.42];
    const R = 36 * K;
    for (let y = wallH - 12 * K; y < H; y++) for (let x = 0; x < W; x++) {
      let a = 0;
      // the pool falls forward of the bulb, onto the desk and the person
      for (const lp of lamps) { const dx = x - lp.x, dy = (y - lp.y - 6 * K) * 1.25; const dist = Math.sqrt(dx * dx + dy * dy); const v = Math.max(0, 1 - dist / R); a = Math.max(a, v * v * 3.4); }
      if (a <= 0) continue;
      // hard bands, the way pixel art draws a light cone (a dithered seam read as an outline)
      const tt = TINTS[Math.min(3, Math.round(a))];
      if (!tt) continue;
      const k = (y * W + x) * 4;
      d[k] = GOLD_LIGHT[0] * tt; d[k + 1] = GOLD_LIGHT[1] * tt; d[k + 2] = GOLD_LIGHT[2] * tt; d[k + 3] = 255;
    }
    lctx.putImageData(img, 0, 0);

  }

  function lampPos(desk) { return desk.light; }

  // hand-drawn lamp, only for packs without a lamp sprite
  function drawLamp(ctx, desk, on) {
    const { x, y } = lampPos(desk);
    ctx.fillStyle = C.lampBase; ctx.fillRect(x - 2, y + 8, 5, 2);
    ctx.fillStyle = C.lampStem; ctx.fillRect(x, y + 1, 1, 7);
    ctx.fillStyle = on ? C.lampShadeLo : C.lampOffLo; ctx.fillRect(x - 4, y + 2, 9, 1);
    ctx.fillStyle = on ? C.lampShade : C.lampOff; ctx.fillRect(x - 4, y - 1, 9, 3);
    ctx.fillStyle = on ? C.lampShadeHi : C.lampStem; ctx.fillRect(x - 3, y - 2, 7, 1);
    if (on) { ctx.fillStyle = C.bulb; ctx.fillRect(x - 1, y + 2, 3, 1); }
  }

  // ---- screens: content drawn in U-sized blocks inside each screen rect of the desk's PC sprite
  function drawScreen(ctx, r, desk, st, t, secondary) {
    const x0 = r.x, y0 = r.y, cols = Math.floor(r.w / U), rows = Math.floor(r.h / U);
    ctx.fillStyle = C.screenBg; ctx.fillRect(x0, y0, cols * U, rows * U);
    const blk = (cx, cy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + cx * U, y0 + cy * U, w * U, h * U); };
    if (secondary) {
      // the second monitor: a quiet table of rows that fills over time
      const n = 1 + Math.floor((t / 1500) % Math.max(1, rows / 2));
      for (let i = 0; i < n && i * 2 + 1 < rows; i++) blk(1, 1 + i * 2, Math.max(1, cols - 2 - (i % 3)), 1, i === n - 1 ? C.bubbleIn : C.axis);
      return;
    }
    if (desk.work === "chart") {
      // faint gridlines so the screen is never blank between charts
      for (let gy = 2; gy < rows - 2; gy += 2) blk(1, gy, cols - 2, 1, "#16203F");
      const bars = [3, 6, 4, 7, 5, 6, 4];
      const usable = Math.min(bars.length, Math.floor((cols - 2) / 2));
      for (let i = 0; i < usable; i++) {
        const reveal = Math.min(1, Math.max(0, st.grown * usable - i)); if (reveal <= 0) continue;
        const hh = Math.max(1, Math.round(bars[i] * reveal * ((rows - 3) / 7)));
        blk(1 + i * 2, rows - 2 - hh, 1, hh, C.chart[i % 3]);
      }
      blk(1, rows - 2, cols - 2, 1, C.axis);
      return;
    }
    if (desk.work === "call") {
      const mid = Math.floor(rows / 2);
      if (st.talking) { for (let i = 1; i < cols - 1; i++) { const h = 1 + Math.round((mid - 1) * (0.5 + 0.5 * Math.sin(t / 90 + i * 1.1))); blk(i, mid - Math.floor(h / 2), 1, h, i % 2 ? C.wave : C.waveAlt); } }
      else if (st.ringing) { if (Math.floor(t / 250) % 2) blk(Math.floor(cols / 2) - 1, mid - 1, 2, 2, C.bubbleIn); }
      else { blk(1, 2, cols - 3, 1, C.axis); blk(1, 4, Math.max(1, cols - 6), 1, C.axis); if (rows > 6) blk(1, 6, Math.max(1, cols - 4), 1, C.axis); }
      return;
    }
    const n = st.bubbles.length + (st.typing ? 1 : 0);
    let row = rows - 1 - n * 3 + 1; if (row < 1) row = 1;
    st.bubbles.forEach((b) => {
      const w = Math.min(cols - 2, b.len + 2), col = b.side === "in" ? 1 : cols - 1 - w, lift = b.fresh ? 1 : 0;
      blk(col, row - lift, w, 2, b.side === "in" ? C.bubbleIn : C.bubbleOut);
      blk(col + 1, row - lift + 1, w - 2, 1, b.side === "in" ? C.bubbleInTx : C.bubbleOutTx);
      row += 3;
    });
    if (st.typing) { const w = 5, col = cols - 1 - w; blk(col, row, w, 2, C.bubbleOut); const on = Math.floor(t / 200) % 3; for (let i = 0; i < 3; i++) blk(col + 1 + i, row + 1, 1, 1, i === on ? C.bubbleOutTx : C.dot); }
  }

  // ---- character frames
  function frameRect(p, anim, face, index) {
    let set = p.char.anims[anim] || p.char.anims.idle;
    let spec = set[face] || set.down || Object.values(set)[0];
    let flip = false;
    if (typeof spec === "string" && spec.startsWith("flip:")) { spec = set[spec.slice(5)]; flip = true; }
    const sheet = manifest.sheets[spec.sheet];
    const col = spec.frames[index % spec.frames.length];
    return { sx: sheet.x + col * p.char.frameW, sy: sheet.y + spec.row * p.char.frameH, flip, n: spec.frames.length };
  }
  function drawPerson(ctx, p, t) {
    let anim = "idle", index = Math.floor(t / 180);
    if (p.state === "walking") { anim = "walk"; index = p.walkFrame; }
    else if (p.state === "seated") {
      if (p.desk.work === "call" && p.work.talking && p.char.anims.phone) { anim = "phone"; index = 3 + Math.floor(t / 160) % 6; }
      else { anim = p.work.typing ? "type" : "sit"; index = Math.floor(t / (p.work.typing ? 220 : 480)); }
    }
    const f = frameRect(p, anim, p.face, index);
    const fw = p.char.frameW, fh = p.char.frameH;
    // feet on the tile; a seated person sits two pixels lower so the chin clears the monitor
    const dx = Math.round(p.x), dy = Math.round(p.y) + T - fh + (p.state === "seated" ? 2 : 0);
    // contact shadow under a standing or walking person
    if (p.state !== "seated") { ctx.fillStyle = C.shadow; ctx.fillRect(dx + 5 * K, dy + fh - 2 * K, fw - 10 * K, 2 * K); }
    if (f.flip) { ctx.save(); ctx.translate(dx + fw, dy); ctx.scale(-1, 1); ctx.drawImage(atlas, f.sx, f.sy, fw, fh, 0, 0, fw, fh); ctx.restore(); }
    else ctx.drawImage(atlas, f.sx, f.sy, fw, fh, dx, dy, fw, fh);
    if (p.talk && t < p.talk.until) {
      const bw = 11 * K, bh = 6 * K, bx = dx + fw / 2 - bw / 2, by = dy + (fh - 32 * K) - 8 * K;
      ctx.fillStyle = C.talk; ctx.fillRect(bx, by, bw, bh); ctx.fillRect(bx + 4 * K, by + bh, 2 * K, K);
      const on = Math.floor(t / 220) % 3; for (let i = 0; i < 3; i++) { ctx.fillStyle = i === on ? C.talkTx : C.dot; ctx.fillRect(bx + (2 + i * 3) * K, by + 3 * K, K, K); }
    }
  }

  // ---- excursions: one person at a time gets up and goes somewhere
  let nextExcursionAt = 12000;
  let walker = null;
  function planExcursion(t) {
    // only the live agents get up; the two behind the panel are not built yet
    const candidates = people.filter((p) => p.state === "seated" && p.desk.live);
    if (!candidates.length) return;
    const p = candidates[Math.floor(random() * candidates.length)];
    const dests = L.DESTINATIONS.filter((d) => d.talkTo !== p.id);
    const dest = dests[Math.floor(random() * dests.length)];
    const path = bfsPath(walkable, { col: p.col, row: p.row }, dest);
    if (!path) return;
    p.state = "walking"; p.path = path; p.dest = dest; p.stepTick = 0; p.returning = false;
    walker = p;
  }
  function stepWalker(t) {
    const p = walker;
    if (!p) return;
    if (p.state === "walking") {
      if (!p.path.length) {
        if (p.returning) { p.state = "seated"; p.face = "down"; p.x = p.col * T; p.y = p.row * T; walker = null; nextExcursionAt = t + 30000 + random() * 20000; return; }
        p.state = "away"; p.face = p.dest.face; p.waitUntil = t + p.dest.wait;
        if (p.dest.talkTo) { p.talk = { until: p.waitUntil }; const other = byId[p.dest.talkTo]; if (other.state === "seated") other.talk = { until: p.waitUntil }; }
        return;
      }
      const next = p.path[0];
      const from = { col: p.col, row: p.row };
      if (p.stepTick === 0) p.face = faceFrom(from, next);
      p.stepTick++;
      const u = p.stepTick / WALK_TICKS_PER_TILE;
      p.x = (from.col + (next.col - from.col) * u) * T;
      p.y = (from.row + (next.row - from.row) * u) * T;
      p.walkFrame = (p.walkFrame + 1) % 6;
      if (p.stepTick >= WALK_TICKS_PER_TILE) { p.col = next.col; p.row = next.row; p.x = p.col * T; p.y = p.row * T; p.path.shift(); p.stepTick = 0; }
      return;
    }
    if (p.state === "away" && t >= p.waitUntil) {
      const path = bfsPath(walkable, { col: p.col, row: p.row }, p.desk.seat);
      if (!path) { p.state = "seated"; p.col = p.desk.seat.col; p.row = p.desk.seat.row; p.x = p.col * T; p.y = p.row * T; walker = null; return; }
      p.state = "walking"; p.path = path; p.returning = true; p.stepTick = 0;
    }
  }

  // ---- frame
  function drawWorld(t) {
    wctx.drawImage(bg, 0, 0);
    // window lights change over time; redraw panes only every few seconds
    if (Math.floor(t / 2400) !== drawWorld.lastSky) {
      drawWorld.lastSky = Math.floor(t / 2400);
      paintWindows(bg.getContext("2d"), t);
    }
    people.forEach((p) => { p.work = workState(p.desk.work, t + PHASE_OFFSET[p.id]); });
    const items = furniture.filter((f) => !f.wall && !f.flat).map((f) => ({ y: f.sortY, draw: () => {
      // soft contact shadow under free-standing furniture
      if (!f.onDesk && !f.seat) { wctx.fillStyle = C.shadow; wctx.fillRect(f.x + 2 * K, (f.row + f.s.fh) * T - 2 * K, f.s.w - 4 * K, 2 * K); }
      drawSprite(wctx, f.role === "pc" ? spriteOf("pc", Math.floor(t / 400)) : f.s, f.x, f.y);
    } }));
    people.forEach((p) => items.push({ y: p.y + T, draw: () => drawPerson(wctx, p, t) }));
    partitions.forEach((q) => items.push({ y: q.sortY, draw: () => wctx.drawImage(q.cv, q.x, q.y) }));
    if (!hasRole("lamp")) L.DESKS.forEach((d) => items.push({ y: d.light.y + 12, draw: () => drawLamp(wctx, d, d.live) }));
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    wctx.globalCompositeOperation = "screen"; wctx.drawImage(light, 0, 0); wctx.globalCompositeOperation = "source-over";
    // screens are emissive: after the light
    L.DESKS.forEach((d) => {
      const pc = pcs[d.id]; if (!pc) return;
      const screens = pc.s.screens || [];
      screens.forEach((r, i) => drawScreen(wctx, { x: pc.x + r.x, y: pc.y + r.y, w: r.w, h: r.h }, d, byId[d.id].work, t, i > 0));
    });
  }

  // ---- camera
  const view = { cw: 0, ch: 0, dpr: 1, scale: 1, base: 1, cx: W / 2, cy: H / 2, focus: null };
  let anim = null;
  function fitBase() {
    // whole CSS pixels per art pixel, so the grid stays even on every screen
    const cssW = view.cw / view.dpr;
    const ratio = cssW / W;
    let baseCss = Math.floor(ratio);
    if (ratio - baseCss >= 0.7) baseCss += 1;
    view.base = Math.max(1, baseCss) * view.dpr;
  }
  function targetFor(focus) {
    // the stage is a little shorter than the world: keep the wall, crop the lounge
    if (!focus) return { scale: view.base, cx: W / 2, cy: Math.min(H / 2, view.ch / view.base / 2) };
    const z = focus.zone;
    const zw = z.cols * T, zh = z.rows * T;
    const s = Math.round(view.base * 1.5);
    // the zone sits in the upper part of the stage; the page puts the label below it
    return { scale: s, cx: z.col * T + zw / 2, cy: z.row * T + zh / 2 + zh * 0.45 };
  }
  function setFocus(deskId) {
    const desk = L.DESKS.find((d) => d.id === deskId) || null;
    view.focus = desk;
    const to = targetFor(desk);
    anim = { from: { scale: view.scale, cx: view.cx, cy: view.cy }, to, start: performance.now(), ms: reducedMotion ? 0 : 420 };
  }
  function applyAnim(now) {
    if (!anim) return false;
    const u = anim.ms ? Math.min(1, (now - anim.start) / anim.ms) : 1;
    const e = 1 - Math.pow(1 - u, 3);
    view.scale = anim.from.scale + (anim.to.scale - anim.from.scale) * e;
    view.cx = anim.from.cx + (anim.to.cx - anim.from.cx) * e;
    view.cy = anim.from.cy + (anim.to.cy - anim.from.cy) * e;
    if (u >= 1) { view.scale = anim.to.scale; anim = null; }
    return true;
  }
  function blit() {
    const s = view.scale;
    const vw = view.cw / s, vh = view.ch / s;
    let cx = view.cx, cy = view.cy;
    if (vw < W) cx = Math.min(W - vw / 2, Math.max(vw / 2, cx)); else cx = W / 2;
    if (vh < H) cy = Math.min(H - vh / 2, Math.max(vh / 2, cy)); else cy = H / 2;
    const ox = Math.round(view.cw / 2 - cx * s), oy = Math.round(view.ch / 2 - cy * s);
    sctx.fillStyle = "#050A18"; sctx.fillRect(0, 0, view.cw, view.ch);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(world, 0, 0, W, H, ox, oy, Math.round(W * s), Math.round(H * s));
    view.ox = ox; view.oy = oy; view.effScale = s;
    if (onView) onView({ ox, oy, scale: s, cw: view.cw, ch: view.ch, T, W, H });
  }

  // ---- loop
  let raf = 0, running = false, visible = true, lastTick = -1, start = 0, destroyed = false;
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = now - start;
    const tick = Math.floor(t / TICK_MS);
    const moved = applyAnim(now);
    if (tick !== lastTick) {
      lastTick = tick;
      if (t >= nextExcursionAt && !walker) planExcursion(t);
      stepWalker(t);
      drawWorld(t);
      blit();
    } else if (moved) blit();
  }

  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0.02 });
  io.observe(canvas);

  buildStatic();

  return {
    setViewport(cw, ch, dpr = 1) {
      view.cw = Math.max(1, Math.round(cw)); view.ch = Math.max(1, Math.round(ch)); view.dpr = dpr;
      canvas.width = view.cw; canvas.height = view.ch;
      fitBase();
      const to = targetFor(view.focus);
      view.scale = to.scale; view.cx = to.cx; view.cy = to.cy; anim = null;
      drawWorld(lastTick < 0 ? 0 : lastTick * TICK_MS); blit();
    },
    setFocus,
    start() {
      if (running) return; running = true; start = performance.now();
      if (reducedMotion) { drawWorld(4200); blit(); return; }
      raf = requestAnimationFrame(frame);
    },
    // canvas pixel -> desk id, or null
    hitTest(px, py) {
      const s = view.effScale || view.scale;
      const wx = (px - (view.ox || 0)) / s, wy = (py - (view.oy || 0)) / s;
      const col = wx / T, row = wy / T;
      const d = L.DESKS.find((k) => col >= k.zone.col && col < k.zone.col + k.zone.cols && row >= k.zone.row && row < k.zone.row + k.zone.rows);
      return d ? d.id : null;
    },
    destroy() { destroyed = true; cancelAnimationFrame(raf); io.disconnect(); },
    // read-only snapshot for tests
    debug() { return { people: people.map((p) => ({ id: p.id, state: p.state, col: p.col, row: p.row, face: p.face, work: p.work && { typing: p.work.typing, talking: p.work.talking, reading: p.work.reading } })), walker: walker && walker.id, view: { ...view } }; },
    size: { W, H, T },
  };
}
