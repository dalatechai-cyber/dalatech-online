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
 * by their feet, then lamp light with a screen blend, then the frosted panel,
 * then screen contents). It is blitted to the visible canvas at an integer
 * scale through a camera that can ease onto one desk. Nothing runs while the
 * canvas is off screen, and reduced-motion gets one still frame.
 */
import * as L from "./layout";

const TICK_MS = 125; // 8 fps: pixel art reads better slow
const WALK_TICKS_PER_TILE = 3;
const GOLD = "#F59E0B";
const GOLD_LIGHT = [255, 200, 96];

// Screens, bubbles and signs use the same vocabulary as the rest of the site.
const C = {
  wall: "#141D38", wallTop: "#1B2545", wallBase: "#0B1222", wallShade: "#0F172A",
  frame: "#2A3358", frameHi: "#3A4478", sky: "#060C1C", skyLo: "#0C1430", horizon: "#101A3A",
  mountain: "#0A1228", bldg: "#080E20", bldgHi: "#0C1430", winLit: "#7B8CB0", winDim: "#2A3452", star: "#BFD3FF",
  floorA: "#171F3B", floorB: "#141C36", rug: "#1B2548", rugEdge: "#26325E", rugIn: "#1F2A52",
  screenBg: "#0A1226", bubbleIn: "#38BDF8", bubbleInTx: "#0A1226", bubbleOut: "#E6ECFF", bubbleOutTx: "#2A3558", dot: "#B7C2E0",
  chart: ["#38BDF8", "#5E9BFF", "#8B9FC4"], axis: "#8B9FC4", wave: "#38BDF8", waveAlt: "#5E9BFF",
  lampStem: "#3A3F55", lampBase: "#2A3358", lampShade: GOLD, lampShadeLo: "#B45309", lampShadeHi: "#FBBF24", bulb: "#FDE68A",
  lampOff: "#2A3358", lampOffLo: "#1F274A",
  frost: [17, 26, 51], frostEdge: "#38BDF8", talk: "#E6ECFF", talkTx: "#2A3558",
};

// ------------------------------------------------------------------ work loops
const SCRIPTS = {
  chat: [
    { k: "in", len: 5, ms: 1100 }, { k: "read", ms: 700 }, { k: "type", ms: 1600 }, { k: "out", len: 4, ms: 1000 },
    { k: "in", len: 3, ms: 1100 }, { k: "read", ms: 600 }, { k: "type", ms: 1400 }, { k: "out", len: 5, ms: 1500 },
    { k: "hold", ms: 1000 }, { k: "clear", ms: 300 },
  ],
  chart: [
    { k: "read", ms: 1400 }, { k: "type", ms: 1800 }, { k: "grow", ms: 2400 }, { k: "read", ms: 900 },
    { k: "type", ms: 1500 }, { k: "hold", ms: 1200 }, { k: "clear", ms: 300 },
  ],
  outreach: [
    { k: "type", ms: 1700 }, { k: "out", len: 5, ms: 1300 }, { k: "read", ms: 900 }, { k: "type", ms: 1500 },
    { k: "out", len: 4, ms: 1300 }, { k: "in", len: 3, ms: 1400 }, { k: "read", ms: 800 }, { k: "hold", ms: 800 }, { k: "clear", ms: 300 },
  ],
  call: [{ k: "ring", ms: 1200 }, { k: "talk", ms: 3200 }, { k: "type", ms: 1800 }, { k: "hold", ms: 1400 }],
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
    grown,
  };
}

// ------------------------------------------------------------------ helpers
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

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

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// ------------------------------------------------------------------ engine
export function createOffice({ canvas, manifest, atlas, onView, reducedMotion = false, seed = 7 }) {
  const T = manifest.tile;
  const K = T / 16; // 1 at 16px tiles, 2 at 32px: scales the hand-drawn bits
  const W = L.COLS * T, H = L.ROWS * T;
  const world = document.createElement("canvas");
  world.width = W; world.height = H;
  const wctx = world.getContext("2d");
  const sctx = canvas.getContext("2d");
  sctx.imageSmoothingEnabled = false;

  // deterministic randomness, so the office looks the same on every visit
  let rnd = seed >>> 0;
  const random = () => { rnd += 0x6D2B79F5; let t = rnd; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

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
    const x = f.col * T;
    // a sprite taller than its footprint rises above the top-left tile
    const y = (f.row + s.fh) * T - s.h + (f.offsetY || 0);
    const item = { ...f, s, x, y, sortY: (f.row + s.fh) * T };
    if (f.onDesk) {
      // sits on a surface: drawn right after the surface it stands on
      const under = furniture.find((o) => !o.onDesk && !o.seat && !o.wall && f.col >= o.col && f.col < o.col + o.s.fw && f.row >= o.row && f.row < o.row + o.s.fh);
      item.sortY = (under ? under.sortY : (f.row + 1) * T) + 0.5;
    }
    if (f.seat) item.sortY = f.row * T + T - 1; // chair back: behind the person on it
    furniture.push(item);
    if (f.screenOf) pcs[f.screenOf] = item;
    if (f.wall || f.onDesk || f.seat) return;
    for (let r = f.row; r < f.row + s.fh; r++) for (let c = f.col; c < f.col + s.fw; c++) if (walkable[r]) walkable[r][c] = false;
  });
  // seats are walkable for their owner only; nobody paths through them
  L.DESKS.forEach((d) => { walkable[d.seat.row][d.seat.col] = false; });

  // ---- people
  const people = L.DESKS.map((d) => ({
    id: d.id, desk: d, char: manifest.characters[d.id],
    col: d.seat.col, row: d.seat.row, x: d.seat.col * T, y: d.seat.row * T,
    face: "down", state: "seated", path: [], stepTick: 0, walkFrame: 0,
    waitUntil: 0, dest: null, talk: null,
  }));
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  // ---- static layers
  const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
  const light = document.createElement("canvas"); light.width = W; light.height = H;
  const frost = document.createElement("canvas"); frost.width = W; frost.height = H;
  let skylineSeed = [];

  function drawSkyline(ctx, x, y, w, h, t) {
    ctx.fillStyle = C.sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.skyLo; ctx.fillRect(x, y + h - 6, w, 6);
    ctx.fillStyle = C.horizon; ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillStyle = C.star;
    skylineSeed.stars.forEach(([sx, sy]) => { if (sx < w && sy < h - 8) ctx.fillRect(x + sx, y + sy, 1, 1); });
    // Bogd Khan Uul behind the city
    ctx.fillStyle = C.mountain;
    for (let i = 0; i < w; i++) { const m = 4 + Math.round(2.4 * Math.sin((x + i) / 13) + 1.8 * Math.sin((x + i) / 6 + 1)); ctx.fillRect(x + i, y + h - m - 5, 1, m + 5); }
    // buildings, with a few lit windows that switch over time
    skylineSeed.bldgs.forEach((b, i) => {
      if (b.x >= w) return;
      const bw = Math.min(b.w, w - b.x);
      ctx.fillStyle = i % 3 === 0 ? C.bldgHi : C.bldg; ctx.fillRect(x + b.x, y + h - b.h, bw, b.h);
      b.lit.forEach(([lx, ly], k) => { if (lx >= bw) return; const on = ((i * 7 + k * 13 + Math.floor(t / 2400)) % 5) !== 0; ctx.fillStyle = on ? C.winLit : C.winDim; ctx.fillRect(x + b.x + lx, y + h - b.h + ly, 1, 1); });
    });
  }

  function buildStatic() {
    // skyline is generated once per engine so it is stable across frames
    const stars = []; for (let i = 0; i < 26; i++) stars.push([Math.floor(random() * 80), Math.floor(random() * 20)]);
    const bldgs = []; let bx = 0;
    while (bx < 80) { const w = 3 + Math.floor(random() * 6), h = 3 + Math.floor(random() * 9); const lit = []; for (let k = 0; k < Math.max(1, Math.floor(w * h / 14)); k++) lit.push([Math.floor(random() * w), Math.floor(random() * h)]); bldgs.push({ x: bx, w, h, lit }); bx += w + (random() < 0.3 ? 1 : 0); }
    skylineSeed = { stars, bldgs };

    const ctx = bg.getContext("2d");
    // wall
    ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, L.WALL_ROWS * T);
    ctx.fillStyle = C.wallTop; ctx.fillRect(0, 0, W, 1);
    ctx.fillStyle = C.wallBase; ctx.fillRect(0, L.WALL_ROWS * T - 3, W, 3);
    ctx.fillStyle = C.wallShade; ctx.fillRect(0, L.WALL_ROWS * T - 4, W, 1);
    // window panes
    L.WINDOW.forEach((win) => {
      const x = win.col * T, w = win.cols * T, y = 4, h = L.WALL_ROWS * T - 12;
      ctx.fillStyle = C.frame; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      drawSkyline(ctx, x, y, w, h, 0);
      ctx.fillStyle = C.frame; for (let mx = x + T * 2 - 1; mx < x + w - 2; mx += T * 2) ctx.fillRect(mx, y, 1, h);
      ctx.fillStyle = C.frameHi; ctx.fillRect(x - 1, y + h + 1, w + 2, 1);
    });
    // floor
    for (let r = L.WALL_ROWS; r < L.ROWS; r++) for (let c = 0; c < L.COLS; c++) {
      ctx.fillStyle = ((c + r) & 1) ? C.floorA : C.floorB; ctx.fillRect(c * T, r * T, T, T);
    }
    // rugs
    L.RUGS.forEach((rg) => {
      const x = rg.col * T + 2, y = rg.row * T + 2, w = rg.cols * T - 4, h = rg.rows * T - 4;
      ctx.fillStyle = C.rugEdge; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.rug; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = C.rugEdge; for (let yy = y + 6; yy < y + h - 4; yy += 10) ctx.fillRect(x + 3, yy, w - 6, 1);
    });

    // lamp light: gold pools on the desk and floor around each lit lamp, dithered on the grid
    const lctx = light.getContext("2d");
    const img = lctx.createImageData(W, H), d = img.data;
    const lamps = L.DESKS.filter((k) => k.live).map((k) => lampPos(k));
    const TINTS = [0, 0.12, 0.24, 0.38];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let a = 0;
      for (const lp of lamps) { const dx = x - lp.x, dy = (y - lp.y - 6 * K) * 1.3; const dist = Math.sqrt(dx * dx + dy * dy); const v = Math.max(0, 1 - dist / (30 * K)); a = Math.max(a, v * v * 3.4); }
      if (a <= 0) continue;
      const th = (BAYER[(y / K | 0) & 3][(x / K | 0) & 3] + 0.5) / 16, tt = TINTS[Math.min(3, Math.floor(a + th))];
      if (!tt) continue;
      const k = (y * W + x) * 4;
      d[k] = GOLD_LIGHT[0] * tt; d[k + 1] = GOLD_LIGHT[1] * tt; d[k + 2] = GOLD_LIGHT[2] * tt; d[k + 3] = 255;
    }
    lctx.putImageData(img, 0, 0);

    // frosted panel over the front row
    const fctx = frost.getContext("2d");
    const p = L.PROGRESS_PANEL, px = p.col * T + 1, py = p.row * T, pw = p.cols * T - 2, ph = Math.round(p.rows * T);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const al = (((x / K | 0) + (y / K | 0)) & 1) ? 0.52 : 0.40;
      fctx.fillStyle = `rgba(${C.frost[0]},${C.frost[1]},${C.frost[2]},${al})`; fctx.fillRect(px + x, py + y, 1, 1);
    }
    fctx.fillStyle = C.frostEdge;
    for (let x = px; x < px + pw; x += 4) { fctx.fillRect(x, py, 2, 1); fctx.fillRect(x, py + ph - 1, 2, 1); }
    for (let y = py; y < py + ph; y += 4) { fctx.fillRect(px, y, 1, 2); fctx.fillRect(px + pw - 1, y, 1, 2); }
  }

  // small things on each desk: paper, a mug, a phone, a sticky note. Positions
  // are fixed per desk so the office looks the same on every visit.
  function drawClutter(ctx, desk) {
    const s = spriteOf("desk");
    const dx = (desk.lamp.side === "right" ? desk.lamp.col - 2 : desk.lamp.col) * T;
    const top = (desk.lamp.row + s.fh) * T - s.h + 2;
    const left = desk.lamp.side === "right";
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(dx + x, top + y, w, h); };
    if (left) { // lamp on the right: paper and phone on the left third
      px(3, 4, 6, 4, "#B7C2E0"); px(4, 3, 6, 4, "#E6ECFF"); px(5, 4, 3, 1, "#B7C2E0");
      px(12, 2, 3, 5, "#0A1020"); px(12, 2, 3, 1, "#1A2140");
      px(28, 8, 3, 3, "#E6ECFF"); px(28, 10, 3, 1, "#B7C2E0"); px(31, 9, 1, 1, "#B7C2E0");
    } else {
      px(38, 4, 6, 4, "#B7C2E0"); px(39, 3, 6, 4, "#E6ECFF"); px(40, 4, 3, 1, "#B7C2E0");
      px(34, 3, 3, 5, "#0A1020"); px(34, 3, 3, 1, "#1A2140");
      px(18, 8, 3, 3, "#E6ECFF"); px(18, 10, 3, 1, "#B7C2E0"); px(21, 9, 1, 1, "#B7C2E0");
      px(44, 9, 3, 3, "#38BDF8");
    }
    if (left) px(2, 9, 3, 3, "#38BDF8");
  }

  function lampPos(desk) {
    const s = spriteOf("desk");
    const deskTop = (desk.lamp.row + s.fh) * T - s.h; // top edge of the desk sprite
    const x = desk.lamp.side === "right" ? desk.lamp.col * T + T - 6 : desk.lamp.col * T + 5;
    return { x, y: deskTop + 3 };
  }

  function drawLamp(ctx, desk, on) {
    const { x, y } = lampPos(desk);
    ctx.fillStyle = C.lampBase; ctx.fillRect(x - 2, y + 8, 5, 2);
    ctx.fillStyle = C.lampStem; ctx.fillRect(x, y + 1, 1, 7);
    ctx.fillStyle = on ? C.lampShadeLo : C.lampOffLo; ctx.fillRect(x - 4, y + 2, 9, 1);
    ctx.fillStyle = on ? C.lampShade : C.lampOff; ctx.fillRect(x - 4, y - 1, 9, 3);
    ctx.fillStyle = on ? C.lampShadeHi : C.lampStem; ctx.fillRect(x - 3, y - 2, 7, 1);
    if (on) { ctx.fillStyle = C.bulb; ctx.fillRect(x - 1, y + 2, 3, 1); }
  }

  // ---- screens, drawn in 1px units inside each PC sprite
  function drawScreen(ctx, pc, desk, st, t) {
    const r = manifest.pcScreen, x0 = pc.x + r.x, y0 = pc.y + r.y;
    ctx.fillStyle = C.screenBg; ctx.fillRect(x0, y0, r.w, r.h);
    if (desk.work === "chart") {
      const bars = [3, 6, 4, 7, 5];
      bars.forEach((h, i) => { const reveal = Math.min(1, Math.max(0, st.grown * bars.length - i)); if (reveal <= 0) return; const hh = Math.max(1, Math.round(h * reveal)); ctx.fillStyle = C.chart[i % 3]; ctx.fillRect(x0 + 1 + i * 2, y0 + r.h - 1 - hh, 1, hh); });
      ctx.fillStyle = C.axis; ctx.fillRect(x0 + 1, y0 + r.h - 1, r.w - 2, 1);
      return;
    }
    if (desk.work === "call") {
      if (st.talking) { for (let i = 1; i < r.w - 1; i++) { const h = 1 + Math.round(3 * (0.5 + 0.5 * Math.sin(t / 90 + i * 1.1))); ctx.fillStyle = i % 2 ? C.wave : C.waveAlt; ctx.fillRect(x0 + i, y0 + 4 - Math.floor(h / 2), 1, h); } }
      else if (st.ringing) { if (Math.floor(t / 250) % 2) { ctx.fillStyle = C.bubbleIn; ctx.fillRect(x0 + 5, y0 + 3, 2, 2); } }
      else { ctx.fillStyle = C.axis; ctx.fillRect(x0 + 1, y0 + 2, 9, 1); ctx.fillRect(x0 + 1, y0 + 4, 6, 1); ctx.fillRect(x0 + 1, y0 + 6, 8, 1); }
      return;
    }
    const n = st.bubbles.length + (st.typing ? 1 : 0);
    let yy = y0 + r.h - 1 - n * 3 + 1;
    st.bubbles.forEach((b) => {
      const w = Math.min(r.w - 2, b.len + 2), bx = b.side === "in" ? x0 + 1 : x0 + r.w - 1 - w, lift = b.fresh ? 1 : 0;
      ctx.fillStyle = b.side === "in" ? C.bubbleIn : C.bubbleOut; ctx.fillRect(bx, yy - lift, w, 2);
      ctx.fillStyle = b.side === "in" ? C.bubbleInTx : C.bubbleOutTx; ctx.fillRect(bx + 1, yy - lift + 1, w - 2, 1);
      yy += 3;
    });
    if (st.typing) { const w = 5, bx = x0 + r.w - 1 - w; ctx.fillStyle = C.bubbleOut; ctx.fillRect(bx, yy, w, 2); const on = Math.floor(t / 200) % 3; for (let i = 0; i < 3; i++) { ctx.fillStyle = i === on ? C.bubbleOutTx : C.dot; ctx.fillRect(bx + 1 + i, yy + 1, 1, 1); } }
  }

  // ---- character frames
  function frameRect(p, anim, face, index) {
    let spec = p.char.anims[anim][face];
    let flip = false;
    if (typeof spec === "string" && spec.startsWith("flip:")) { spec = p.char.anims[anim][spec.slice(5)]; flip = true; }
    const sheet = manifest.sheets[spec.sheet];
    const col = spec.frames[index % spec.frames.length];
    return { sx: sheet.x + col * p.char.frameW, sy: sheet.y + spec.row * p.char.frameH, flip };
  }
  function drawPerson(ctx, p, t) {
    let anim = "idle", index = 0;
    if (p.state === "walking") { anim = "walk"; index = p.walkFrame; }
    else if (p.state === "seated") { anim = p.work.typing ? "type" : "read"; index = Math.floor(t / (p.work.typing ? 250 : 600)) % 2; }
    else if (p.state === "away") { anim = "idle"; }
    const f = frameRect(p, anim, p.face, index);
    const fw = p.char.frameW, fh = p.char.frameH;
    const dx = Math.round(p.x), dy = Math.round(p.y) + T - fh; // feet on the tile
    if (f.flip) { ctx.save(); ctx.translate(dx + fw, dy); ctx.scale(-1, 1); ctx.drawImage(atlas, f.sx, f.sy, fw, fh, 0, 0, fw, fh); ctx.restore(); }
    else ctx.drawImage(atlas, f.sx, f.sy, fw, fh, dx, dy, fw, fh);
    if (p.talk && t < p.talk.until) {
      const bx = dx + fw / 2 - 5, by = dy - 8;
      ctx.fillStyle = C.talk; ctx.fillRect(bx, by, 11, 6); ctx.fillRect(bx + 4, by + 6, 2, 1);
      const on = Math.floor(t / 220) % 3; for (let i = 0; i < 3; i++) { ctx.fillStyle = i === on ? C.talkTx : C.dot; ctx.fillRect(bx + 2 + i * 3, by + 3, 1, 1); }
    }
  }

  // ---- excursions: one person at a time gets up and goes somewhere
  let nextExcursionAt = 12000;
  let walker = null;
  function planExcursion(t) {
    const candidates = people.filter((p) => p.state === "seated");
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
      p.walkFrame = (p.walkFrame + 1) % 4;
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
      const bctx = bg.getContext("2d");
      L.WINDOW.forEach((win) => drawSkyline(bctx, win.col * T, 4, win.cols * T, L.WALL_ROWS * T - 12, t));
    }
    people.forEach((p) => { p.work = workState(p.desk.work, t + PHASE_OFFSET[p.id]); });
    const items = furniture.map((f) => ({ y: f.sortY, draw: () => drawSprite(wctx, f.role === "pc" ? spriteOf("pc", Math.floor(t / 400)) : f.s, f.x, f.y) }));
    people.forEach((p) => items.push({ y: p.y + T, draw: () => drawPerson(wctx, p, t) }));
    L.DESKS.forEach((d) => items.push({ y: (d.lamp.row + 2) * T + 0.25, draw: () => { drawClutter(wctx, d); drawLamp(wctx, d, d.live); } }));
    items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    wctx.globalCompositeOperation = "screen"; wctx.drawImage(light, 0, 0); wctx.globalCompositeOperation = "source-over";
    wctx.drawImage(frost, 0, 0);
    // scan line on the frost, so it reads as a live panel
    const p = L.PROGRESS_PANEL, sy = p.row * T + 1 + Math.floor((t / 60) % (Math.round(p.rows * T) - 2));
    wctx.fillStyle = "rgba(56,189,248,0.14)"; wctx.fillRect(p.col * T + 2, sy, p.cols * T - 4, 1);
    // screens are emissive: after the light, after the frost
    L.DESKS.forEach((d) => { const pc = pcs[d.id]; if (pc) drawScreen(wctx, pc, d, byId[d.id].work, t); });
  }

  // ---- camera
  const view = { cw: 0, ch: 0, dpr: 1, scale: 1, base: 1, cx: W / 2, cy: H / 2, focus: null };
  let anim = null;
  function fitBase() {
    // whole CSS pixels per art pixel, so the grid stays even on every screen.
    // A phone at 390 CSS px gets 2 (the world is 208 wide, so ~7% is cropped
    // at the sides); a desktop stage at 832 gets 4.
    const cssW = view.cw / view.dpr;
    const ratio = cssW / W;
    let baseCss = Math.floor(ratio);
    if (ratio - baseCss >= 0.7) baseCss += 1;
    view.base = Math.max(1, baseCss) * view.dpr;
  }
  function targetFor(focus) {
    if (!focus) return { scale: view.base, cx: W / 2, cy: H / 2 };
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
    // keep the camera inside the world when the world is bigger than the view
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
    debug() { return { people: people.map((p) => ({ id: p.id, state: p.state, col: p.col, row: p.row, face: p.face })), walker: walker && walker.id, view: { ...view } }; },
    size: { W, H, T },
  };
}
