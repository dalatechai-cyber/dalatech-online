// The office room for /office: walls, windows onto Ulaanbaatar, furniture,
// lights, and the canvas-drawn textures (skyline, carpet, screens, posters).
// Metres throughout. x right, y up, z toward the viewer; the back wall with
// the windows is at z = 0.
import * as THREE from "three";

export const ROOM = { W: 8.6, D: 7.2, H: 3.0 };
const S = 1.45; // the Kenney furniture kit is authored small: this puts a desk at 0.7 m and a monitor at 0.57 m wide
export const CHAIR_SCALE = 1.35; // its chairs are small even so; this puts the seat at about 0.48 m

// the site's ink/sky/brand palette, in the room
export const P = {
  wall: 0x1c2750, wallDeep: 0x162043, ceiling: 0x182142, floor: 0x121a36,
  oak: 0x8a5a34, oakDark: 0x5c3b22, top: 0x8f9bb8, metalDark: 0x1c2438, metalMid: 0x2d3858, metalLight: 0xb7c2e0,
  seat: 0x2f4d8c, seatPale: 0xaab4cc, plant: 0x2f9c66, pot: 0xc7ccd8, lampShade: 0xffe2b0, glass: 0xaac4ff,
  brand: 0x2563eb, sky: 0x38bdf8, paper: 0xe6ecff,
};
// Kenney material name -> [colour, roughness]
const KENNEY_MAT = {
  wood: [P.oak, 0.62], woodDark: [P.oakDark, 0.65], metal: [P.top, 0.45], metalDark: [P.metalDark, 0.5], metalMedium: [P.metalMid, 0.5], metalLight: [P.metalLight, 0.4],
  carpet: [P.seat, 0.85], carpetWhite: [P.seatPale, 0.8], carpetBlue: [0x24407a, 0.85], carpetDarker: [P.metalMid, 0.8],
  glass: [P.glass, 0.1], plant: [P.plant, 0.7], _defaultMat: [P.pot, 0.5], fur: [P.oakDark, 0.9], lamp: [P.lampShade, 0.6],
};

// ---------------------------------------------------------------- furniture
// `gltf` is furniture.glb: one scene per piece, named after the Kenney file.
export function createFurniture(gltf) {
  const byName = new Map(gltf.scenes.map((s) => [s.name, s]));
  const recoloured = new Set();
  function recolour(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (recoloured.has(m)) return;
        recoloured.add(m);
        const key = (m.name || "").split(".")[0];
        const spec = KENNEY_MAT[key];
        if (spec) { m.color.setHex(spec[0]); m.roughness = spec[1]; m.metalness = 0; }
        if (key === "glass") { m.transparent = true; m.opacity = 0.35; }
      });
    });
  }
  // Place a piece with its footprint centred on (x, z), base on the floor (or at opts.y), turned by rot about Y.
  return function place(scene, name, x, z, rot = 0, opts = {}) {
    const src = byName.get(name);
    if (!src) throw new Error(`furniture.glb has no piece named ${name}`);
    const model = src.clone(true);
    model.scale.setScalar(S * (opts.scale || 1));
    recolour(model);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    const inner = new THREE.Group();
    model.position.set(-c.x, -box.min.y + (opts.y || 0), -c.z);
    inner.add(model);
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    pivot.rotation.y = rot;
    pivot.add(inner);
    pivot.userData.size = box.getSize(new THREE.Vector3());
    scene.add(pivot);
    return pivot;
  };
}

// The monitor's panel is thinner than its base: find its front face (largest local z) above the stand.
const _v = new THREE.Vector3();
export function panelFace(inner, aboveY) {
  inner.updateMatrixWorld(true);
  let best = -Infinity;
  inner.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i); o.localToWorld(_v); inner.worldToLocal(_v);
      if (_v.y > aboveY && _v.z > best) best = _v.z;
    }
  });
  return Number.isFinite(best) ? best : 0;
}

// A laptop built from boxes: the lid carries the screen on its inside and a lit logo on its back.
export function laptop(feed, live, lite) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2a3150, roughness: 0.45, metalness: 0.5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.24), body); base.position.y = 0.008; base.castShadow = true; g.add(base);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.1), new THREE.MeshStandardMaterial({ color: 0x151a30, roughness: 0.8 })); keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.0165, 0.02); g.add(keys);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.016, -0.12); hinge.rotation.x = THREE.MathUtils.degToRad(-15); g.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.225, 0.012), body); lid.position.y = 0.1125; lid.castShadow = true; hinge.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshStandardMaterial({ map: feed.texture, emissive: 0xffffff, emissiveMap: feed.texture, emissiveIntensity: live ? 0.9 : 0.3, roughness: 0.4 }));
  screen.position.set(0, 0.118, 0.0065); hinge.add(screen);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.02, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: live ? 1.4 : 0.3 }));
  logo.position.set(0, 0.125, -0.0065); logo.rotation.y = Math.PI; hinge.add(logo);
  // the screen's glow on the face
  if (live || !lite) { const glow = new THREE.PointLight(0xbfd8ff, live ? 0.7 : 0.25, 1.3, 2); glow.position.set(0, 0.2, 0.25); g.add(glow); }
  return g;
}

// ---------------------------------------------------------------- textures drawn in code
function canvasTexture(w, h, draw) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function prng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

// Ulaanbaatar at night from a high floor: Bogd Khan Uul behind the city, the Blue Sky tower's
// sail on the left, Sükhbaatar on his horse before the Government Palace on the right.
function skylineTexture() {
  return canvasTexture(2048, 768, (c, w, h) => {
    const horizon = h * 0.62;
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#0a1024"); sky.addColorStop(0.55, "#162252"); sky.addColorStop(1, "#3a4f96");
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    const rnd = prng(11);
    for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * horizon * 0.8; c.fillStyle = `rgba(200,215,255,${0.35 + rnd() * 0.6})`; c.fillRect(x, y, rnd() < 0.2 ? 3 : 2, 2); }
    c.fillStyle = "#e8eeff"; c.beginPath(); c.arc(w * 0.16, h * 0.14, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#0a1130"; c.beginPath(); c.arc(w * 0.16 + 12, h * 0.14 - 6, 22, 0, Math.PI * 2); c.fill();
    // mountain ridge
    c.fillStyle = "#0a1030"; c.beginPath(); c.moveTo(0, horizon);
    for (let x = 0; x <= w; x += 16) { const y = horizon - 70 - 40 * Math.sin(x / 260) - 25 * Math.sin(x / 90 + 1.3) - 12 * Math.sin(x / 37); c.lineTo(x, y); }
    c.lineTo(w, horizon); c.closePath(); c.fill();
    const glow = c.createLinearGradient(0, horizon - 60, 0, horizon + 30);
    glow.addColorStop(0, "rgba(90,120,220,0)"); glow.addColorStop(1, "rgba(90,120,220,0.35)");
    c.fillStyle = glow; c.fillRect(0, horizon - 60, w, 90);
    // blocks along the horizon with lit windows
    let x = 0;
    while (x < w) {
      const bw = 40 + rnd() * 90, bh = 40 + rnd() * 120;
      c.fillStyle = rnd() < 0.5 ? "#070b1c" : "#0a1024"; c.fillRect(x, horizon - bh, bw, bh + 40);
      for (let wy = horizon - bh + 8; wy < horizon - 6; wy += 14) for (let wx = x + 6; wx < x + bw - 8; wx += 12) if (rnd() < 0.5) { c.fillStyle = rnd() < 0.7 ? "#f2d38a" : "#9fb6ff"; c.fillRect(wx, wy, 5, 7); }
      x += bw + 4 + rnd() * 20;
    }
    // Blue Sky tower: a straight spine and a sail curving down
    const tx = w * 0.3, tw = 150, base = horizon + 20, top = horizon - 330;
    c.fillStyle = "#04081a"; c.beginPath(); c.moveTo(tx, base); c.lineTo(tx, top);
    c.quadraticCurveTo(tx + tw * 0.75, top + 10, tx + tw, top + 190); c.lineTo(tx + tw, base); c.closePath(); c.fill();
    c.strokeStyle = "rgba(120,170,255,0.55)"; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, top); c.quadraticCurveTo(tx + tw * 0.75, top + 10, tx + tw, top + 190); c.stroke();
    for (let wy = top + 30; wy < base - 10; wy += 18) for (let wx = tx + 10; wx < tx + tw - 10; wx += 16) { const lim = top + 10 + 190 * Math.pow((wx - tx) / tw, 1.6); if (wy > lim + 12 && rnd() < 0.45) { c.fillStyle = rnd() < 0.6 ? "#8fb3ff" : "#dbe6ff"; c.fillRect(wx, wy, 6, 9); } }
    // Government Palace: a long colonnade, Sükhbaatar on the square in front
    const px = w * 0.6, pw = 520, ph = 95, pb = horizon + 10;
    c.fillStyle = "#05091c"; c.fillRect(px, pb - ph, pw, ph + 30);
    c.fillRect(px + pw / 2 - 90, pb - ph - 45, 180, 45);
    c.fillStyle = "#0d1430";
    for (let cx = px + 14; cx < px + pw - 10; cx += 26) c.fillRect(cx, pb - ph + 18, 10, ph - 26);
    c.fillStyle = "#e9d59a"; for (let cx = px + 20; cx < px + pw - 10; cx += 26) c.fillRect(cx + 2, pb - ph + 30, 4, 6);
    const sx = px + pw / 2, sb = pb + 40;
    c.fillStyle = "#03060f";
    c.fillRect(sx - 34, sb - 60, 68, 60); c.fillRect(sx - 26, sb - 78, 52, 18);
    c.beginPath();
    c.moveTo(sx - 30, sb - 78); c.lineTo(sx - 30, sb - 112); c.lineTo(sx - 14, sb - 118); c.lineTo(sx + 6, sb - 116); c.lineTo(sx + 22, sb - 124); c.lineTo(sx + 34, sb - 146);
    c.lineTo(sx + 44, sb - 142); c.lineTo(sx + 40, sb - 124); c.lineTo(sx + 30, sb - 110); c.lineTo(sx + 28, sb - 78); c.closePath(); c.fill();
    c.fillRect(sx - 26, sb - 100, 8, 24); c.fillRect(sx + 14, sb - 100, 8, 24);
    c.beginPath(); c.moveTo(sx - 30, sb - 96); c.lineTo(sx - 42, sb - 78); c.lineTo(sx - 34, sb - 78); c.closePath(); c.fill();
    c.fillRect(sx - 6, sb - 150, 14, 36); c.beginPath(); c.arc(sx + 1, sb - 156, 8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(sx + 8, sb - 140); c.lineTo(sx + 26, sb - 168); c.lineTo(sx + 29, sb - 164); c.lineTo(sx + 12, sb - 138); c.closePath(); c.fill();
    const sq = c.createLinearGradient(0, pb + 20, 0, h);
    sq.addColorStop(0, "rgba(245,200,120,0.25)"); sq.addColorStop(1, "rgba(245,200,120,0)");
    c.fillStyle = sq; c.fillRect(px - 100, pb + 20, pw + 200, h - pb - 20);
    for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(245,210,140,${0.3 + rnd() * 0.5})`; c.fillRect(rnd() * w, horizon + 30 + rnd() * (h - horizon - 30), 3, 2); }
  });
}

function carpetTexture() {
  const t = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = "#141c3a"; c.fillRect(0, 0, w, h);
    const rnd = prng(3);
    for (let i = 0; i < 14000; i++) { c.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
    c.strokeStyle = "rgba(255,255,255,0.04)"; c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 11);
  return t;
}

function textTexture(text) {
  return canvasTexture(1024, 256, (c, w) => {
    c.clearRect(0, 0, w, 256);
    c.fillStyle = "#eef2ff"; c.font = "700 118px Outfit, system-ui, sans-serif"; c.textAlign = "center"; c.fillText(text, w / 2, 160);
  });
}

// A framed poster: an abstract of the site's mesh gradient.
function posterTexture(seed) {
  return canvasTexture(512, 640, (c, w, h) => {
    c.fillStyle = "#0b1230"; c.fillRect(0, 0, w, h);
    const rnd = prng(seed);
    for (let i = 0; i < 5; i++) {
      const g = c.createRadialGradient(rnd() * w, rnd() * h, 10, rnd() * w, rnd() * h, 200 + rnd() * 200);
      const col = ["56,189,248", "37,99,235", "245,158,11", "139,159,196"][i % 4];
      g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 3; c.strokeRect(40, 40, w - 80, h - 80);
    c.fillStyle = "rgba(255,255,255,0.9)"; c.font = "600 30px Outfit, system-ui, sans-serif"; c.textAlign = "center";
    c.fillText(seed % 2 ? "Улаанбаатар" : "Dala AI", w / 2, h - 80);
  });
}

// A whiteboard with this month's plan sketched on it.
function whiteboardTexture() {
  return canvasTexture(1024, 640, (c, w, h) => {
    c.fillStyle = "#e9edf7"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#1e2a55"; c.font = "700 44px Outfit, system-ui, sans-serif"; c.fillText("9-р сарын төлөвлөгөө", 48, 84);
    c.strokeStyle = "#2563eb"; c.lineWidth = 6; c.beginPath(); c.moveTo(48, 104); c.lineTo(560, 104); c.stroke();
    const items = ["Шинэ хэрэглэгч +120", "Хариу өгөх хугацаа < 1 мин", "Дуудлагын AI — туршилт", "Сарын тайлан 1-нд"];
    c.font = "500 34px Inter, system-ui, sans-serif";
    items.forEach((s, i) => { c.fillStyle = "#2a3558"; c.fillText(s, 90, 170 + i * 62); c.strokeStyle = i < 2 ? "#16a34a" : "#8b9fc4"; c.lineWidth = 5; c.strokeRect(48, 144 + i * 62, 26, 26); if (i < 2) { c.beginPath(); c.moveTo(52, 156 + i * 62); c.lineTo(60, 166 + i * 62); c.lineTo(72, 148 + i * 62); c.stroke(); } });
    // a sketched growth curve
    c.strokeStyle = "#f59e0b"; c.lineWidth = 6; c.beginPath();
    for (let x = 0; x <= 360; x += 12) c.lineTo(620 + x, 520 - 300 * Math.pow(x / 360, 1.8) - 12 * Math.sin(x / 23));
    c.stroke();
    c.strokeStyle = "#8b9fc4"; c.lineWidth = 3; c.beginPath(); c.moveTo(620, 520); c.lineTo(990, 520); c.moveTo(620, 520); c.lineTo(620, 180); c.stroke();
    c.fillStyle = "#1e2a55"; c.font = "600 26px Inter, system-ui, sans-serif"; c.fillText("борлуулалт", 780, 560);
  });
}

// ---------------------------------------------------------------- what is on the screens
// One feed per screen: it owns a canvas texture and redraws itself when its content changes.
export function createScreenFeed(kind, live) {
  const W = 512, H = 320;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const rnd = prng(kind.length * 7 + 5);
  const state = { chat: [[1, 240], [0, 300], [1, 180]], typing: false, bars: [0.4, 0.55, 0.5, 0.7, 0.62, 0.85, 0.78, 0.95], barsTarget: null, callSec: 42, done: 3, cursor: 0 };
  let last = -1;
  const header = { chat: "Inbox — Facebook, Instagram, вэб", chart: "Сарын тайлан — 9-р сар", call: "Дуудлага — ", outreach: "Сануулга — өнөөдөр 18" }[kind];

  function draw(t) {
    c.fillStyle = "#0a1226"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#121c3a"; c.fillRect(0, 0, W, 36);
    c.fillStyle = "#8b9fc4"; c.font = "600 18px Inter, system-ui, sans-serif"; c.textAlign = "left";
    c.fillText(kind === "call" ? header + `${String(Math.floor(state.callSec / 60)).padStart(2, "0")}:${String(state.callSec % 60).padStart(2, "0")}` : header, 16, 25);
    if (kind === "chat") {
      let y = 56;
      state.chat.slice(-5).forEach(([inb, wdt]) => { c.fillStyle = inb ? "#38bdf8" : "#e6ecff"; const x = inb ? 16 : W - 16 - wdt; c.beginPath(); c.roundRect(x, y, wdt, 34, 12); c.fill(); c.fillStyle = inb ? "#0a1226" : "#2a3558"; c.fillRect(x + 14, y + 14, wdt - 28, 6); y += 46; });
      if (state.typing) { c.fillStyle = "#3a4a7a"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(W - 60 + i * 16, y + 10, 5, 0, 7); c.fill(); } }
    } else if (kind === "chart") {
      c.fillStyle = "#16203f"; for (let gy = 60; gy < H - 30; gy += 40) c.fillRect(24, gy, W - 48, 1);
      state.bars.forEach((b, i) => { c.fillStyle = i % 2 ? "#5e9bff" : "#38bdf8"; const bh = b * 210; c.fillRect(34 + i * 58, H - 30 - bh, 36, bh); });
      c.fillStyle = "#8b9fc4"; c.fillRect(24, H - 30, W - 48, 2);
      c.fillStyle = "#e6ecff"; c.font = "600 20px Inter, system-ui, sans-serif"; c.fillText(`+${Math.round(12 + state.bars[7] * 20)}%`, W - 90, 66);
    } else if (kind === "call") {
      c.strokeStyle = "#38bdf8"; c.lineWidth = 4; c.beginPath();
      for (let x = 30; x < W - 30; x += 6) { const a = (live ? 60 : 20) * Math.sin(x / 18 + t * 9) * Math.sin(x / 71 - t * 2) * Math.sin(x / 7.3); c.lineTo(x, H / 2 + 20 + a); } c.stroke();
      c.fillStyle = "#e6ecff"; c.font = "600 22px Inter, system-ui, sans-serif"; c.fillText("+976 9911 ····", 30, 80);
      c.fillStyle = "#2f9c66"; c.beginPath(); c.arc(W - 40, 72, 9, 0, 7); c.fill();
    } else {
      for (let i = 0; i < 6; i++) { c.fillStyle = "#131d3d"; c.fillRect(20, 52 + i * 42, W - 40, 32); c.fillStyle = i < state.done ? "#38bdf8" : "#3a4a7a"; c.beginPath(); c.arc(40, 68 + i * 42, 7, 0, 7); c.fill(); c.fillStyle = "#b7c2e0"; c.fillRect(60, 63 + i * 42, 160 + (i * 37) % 120, 8); c.fillStyle = i < state.done ? "#e6ecff" : "#3a4a7a"; c.fillRect(W - 110, 63 + i * 42, 70, 8); }
      if (state.done < 6) { c.fillStyle = "rgba(56,189,248,0.25)"; c.fillRect(20, 52 + state.done * 42, (W - 40) * state.cursor, 32); }
    }
    tex.needsUpdate = true;
  }
  // called every frame; decides whether anything changed
  function tick(t) {
    let dirty = last < 0;
    if (kind === "chat") { const phase = Math.floor(t / 2.6); if (phase !== state.phase) { state.phase = phase; if (phase % 2) state.typing = true; else { state.typing = false; state.chat.push([state.chat.length % 2, 160 + rnd() * 150]); } dirty = true; } }
    else if (kind === "chart") { const phase = Math.floor(t / 7); if (phase !== state.phase) { state.phase = phase; state.barsTarget = state.bars.map((b, i) => Math.min(1, Math.max(0.2, b + (rnd() - 0.45) * 0.3 + i * 0.01))); } if (state.barsTarget) { let moved = false; state.bars = state.bars.map((b, i) => { const d = state.barsTarget[i] - b; if (Math.abs(d) < 0.004) return b; moved = true; return b + d * 0.08; }); if (moved) dirty = true; else state.barsTarget = null; } }
    else if (kind === "call") { if (t - last > 0.2) dirty = true; const sec = 42 + Math.floor(t); if (sec !== state.callSec) { state.callSec = sec; dirty = true; } }
    else { const cur = (t % 5) / 5; if (Math.abs(cur - state.cursor) > 0.02) { state.cursor = cur; dirty = true; } const d = 3 + Math.floor(t / 5) % 4; if (d !== state.done) { state.done = d; dirty = true; } }
    if (dirty) { draw(t); last = t; }
  }
  return { texture: tex, tick };
}

// ---------------------------------------------------------------- the room shell
export function buildRoom(scene, place, lite) {
  const { W, D, H } = ROOM;
  const wallMat = new THREE.MeshStandardMaterial({ color: P.wall, roughness: 0.92 });
  const box = (w, h, d, x, y, z, mat = wallMat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };

  // the floor, ceiling and side walls run on past the room's front so the camera always stands inside
  const DD = D + 5;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, DD), new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, DD / 2); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, DD), new THREE.MeshStandardMaterial({ color: P.ceiling, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, DD / 2); scene.add(ceil);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 1.8 });
  // the ceiling only ever sees bounce light, so it carries a little of its own
  ceil.material.emissive = new THREE.Color(P.ceiling); ceil.material.emissiveIntensity = lite ? 0.5 : 0.3;
  const panels = [[-2.15, 2.0], [2.15, 2.0], [-2.15, 4.6], [2.15, 4.6]];
  panels.forEach(([x, z]) => { const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), panelMat); panel.rotation.x = Math.PI / 2; panel.position.set(x, H - 0.01, z); scene.add(panel); });

  const side = new THREE.MeshStandardMaterial({ color: P.wallDeep, roughness: 0.95 });
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(DD, H), side); lw.rotation.y = Math.PI / 2; lw.position.set(-W / 2, H / 2, DD / 2); lw.receiveShadow = true; scene.add(lw);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(DD, H), side); rw.rotation.y = -Math.PI / 2; rw.position.set(W / 2, H / 2, DD / 2); rw.receiveShadow = true; scene.add(rw);

  // back wall with two window openings: sill 0.95, head 2.5, each 2.6 wide, centred at ±2.15
  const th = 0.24, sill = 0.95, head = 2.5, ww = 2.6, cx = 2.15;
  const seg = (x0, x1) => box(x1 - x0, H, th, (x0 + x1) / 2, H / 2, -th / 2);
  seg(-W / 2, -cx - ww / 2); seg(-cx + ww / 2, cx - ww / 2); seg(cx + ww / 2, W / 2);
  const frame = new THREE.MeshStandardMaterial({ color: 0x0f1628, roughness: 0.5, metalness: 0.3 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: P.glass, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, side: THREE.DoubleSide });
  [-cx, cx].forEach((x) => {
    box(ww, sill, th, x, sill / 2, -th / 2);
    box(ww, H - head, th, x, head + (H - head) / 2, -th / 2);
    const fx = 0.06;
    box(ww + 0.1, fx, th + 0.02, x, sill, -th / 2, frame); box(ww + 0.1, fx, th + 0.02, x, head, -th / 2, frame);
    box(fx, head - sill, th + 0.02, x - ww / 2, (sill + head) / 2, -th / 2, frame); box(fx, head - sill, th + 0.02, x + ww / 2, (sill + head) / 2, -th / 2, frame);
    box(0.05, head - sill, th + 0.02, x, (sill + head) / 2, -th / 2, frame);
    box(ww + 0.3, 0.05, 0.22, x, sill - 0.02, 0.06, new THREE.MeshStandardMaterial({ color: P.metalLight, roughness: 0.4 }));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, head - sill), glassMat);
    glass.position.set(x, (sill + head) / 2, -th / 2); scene.add(glass);
  });
  // the city outside, a wide panel some way behind the glass so it moves in perspective
  const city = new THREE.Mesh(new THREE.PlaneGeometry(26, 9.75), new THREE.MeshBasicMaterial({ map: skylineTexture() }));
  city.position.set(0.5, 2.0, -5.2); city.scale.setScalar(0.8); scene.add(city);

  // the company sign between the windows, lit
  const signTex = textTexture("DalaTech");
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), new THREE.MeshStandardMaterial({ map: signTex, transparent: true, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.55 }));
  sign.position.set(0, 2.62, 0.012); scene.add(sign);
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshStandardMaterial({ color: 0x18224a, roughness: 0.6 }));
  signBack.position.set(0, 2.62, 0.005); scene.add(signBack);
  // skirting and a picture rail
  box(W, 0.1, 0.03, 0, 0.05, 0.015, new THREE.MeshStandardMaterial({ color: P.metalDark, roughness: 0.7 }));

  // posters on the left wall, the whiteboard and a clock on the right wall
  const poster = (x, y, z, ry, seed) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.04, 0.04), frame); g.add(fr);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.95), new THREE.MeshStandardMaterial({ map: posterTexture(seed), roughness: 0.8 })); art.position.z = 0.025; g.add(art);
    scene.add(g);
  };
  poster(-W / 2 + 0.03, 1.75, 2.4, Math.PI / 2, 4); poster(-W / 2 + 0.03, 1.75, 3.5, Math.PI / 2, 9);
  const wb = new THREE.Group(); wb.position.set(W / 2 - 0.03, 1.7, 3.2); wb.rotation.y = -Math.PI / 2;
  wb.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.04), new THREE.MeshStandardMaterial({ color: P.metalLight, roughness: 0.4 })));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.35 })); board.position.z = 0.025; wb.add(board);
  scene.add(wb);
  // wall clock: a ring with hands that follow the visitor's actual time
  const clock = new THREE.Group(); clock.position.set(W / 2 - 0.03, 2.45, 1.5); clock.rotation.y = -Math.PI / 2;
  clock.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf3f5ff, roughness: 0.5 })));
  clock.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 32), frame));
  const hand = (len, wdt) => { const m = new THREE.Mesh(new THREE.BoxGeometry(wdt, len, 0.006), new THREE.MeshStandardMaterial({ color: 0x1c2438 })); m.geometry.translate(0, len / 2, 0); m.position.z = 0.02; clock.add(m); return m; };
  const hourHand = hand(0.11, 0.018), minuteHand = hand(0.17, 0.012);
  scene.add(clock);

  // furniture around the walls: the bookcase and TV cabinet against the back wall on the left, the
  // kitchenette (coffee, fridge) in the back-right corner below and beside the right window, coats
  // and boxes at the front-right, the lounge at the front-left
  const bc = place(scene, "bookcaseOpen", -3.45, 0.3, 0);
  place(scene, "books", -3.55, 0.3, 0.2, { y: bc.userData.size.y }); // a stack on top
  place(scene, "cabinetTelevision", -1.6, 0.35, 0);
  place(scene, "pottedPlant", -0.55, 0.42, 0);
  const st = place(scene, "sideTable", 2.15, 0.4, 0);
  place(scene, "kitchenCoffeeMachine", 2.15, 0.4, 0, { y: st.userData.size.y });
  const fr = place(scene, "kitchenFridgeSmall", 0, -50, 0);
  const frD = fr.userData.size.z; scene.remove(fr);
  place(scene, "kitchenFridgeSmall", W / 2 - frD / 2 - 0.02, 1.0, -Math.PI / 2); // against the right wall, door to the room
  place(scene, "coatRackStanding", W / 2 - 0.35, 6.6, 0);
  place(scene, "cardboardBoxClosed", W / 2 - 0.5, 5.7, 0.3);
  place(scene, "pottedPlant", W / 2 - 0.4, 4.6, 0);
  place(scene, "loungeSofa", -2.9, 6.3, Math.PI / 2 + 0.15);
  place(scene, "tableCoffee", -1.9, 6.3, 0.15);
  place(scene, "rugRectangle", -2.4, 6.2, 0.15);
  place(scene, "lampRoundFloor", -3.9, 6.6, 0);
  place(scene, "trashcan", -3.8, 4.9, 0);

  return {
    update(now) {
      const d = new Date(now);
      minuteHand.rotation.z = -(d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2;
      hourHand.rotation.z = -((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2;
    },
  };
}

// ---------------------------------------------------------------- lights
// `lite` drops the shadowed spots for phones; the moon still casts the one shadow that sells the depth.
export function buildLights(scene, lamps, lite) {
  // night: a low, cool ambient so the warm lamp pools and the screens carry the room
  scene.add(new THREE.HemisphereLight(0x4a5f9e, 0x0e1430, 1.1));
  const amb = new THREE.AmbientLight(0x2a3a6e, 0.35); scene.add(amb);
  [[-2.15, 2.0], [2.15, 2.0], [-2.15, 4.6], [2.15, 4.6]].forEach(([x, z], i) => {
    const s = new THREE.SpotLight(0xfff1dc, 26, 10, Math.PI / 2.2, 0.8, 1.1);
    s.position.set(x, 2.95, z); s.target.position.set(x, 0, z + 0.3);
    if (!lite && i >= 2) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.normalBias = 0.03; s.shadow.radius = 4; }
    scene.add(s); scene.add(s.target);
    // the panel's spill onto the ceiling and the upper walls (phones make do with the ceiling's own glow)
    if (!lite) { const spill = new THREE.PointLight(0xfff1dc, 5, 5, 2); spill.position.set(x, 2.8, z); scene.add(spill); }
  });
  // a soft fill from the visitor's side, so faces turned to the room are lit
  const fill = new THREE.DirectionalLight(0xd6e0ff, 0.55);
  fill.position.set(1, 4, 12); fill.target.position.set(0, 1, 3); scene.add(fill); scene.add(fill.target);
  const moon = new THREE.DirectionalLight(0x9fb6ff, 1.2);
  moon.position.set(-3, 5, -6); moon.target.position.set(0.5, 0.6, 3.2);
  moon.castShadow = true; moon.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 20 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02; moon.shadow.radius = 3;
  scene.add(moon); scene.add(moon.target);
  const lampLights = lamps.map(([x, y, z]) => { const l = new THREE.PointLight(0xffb45a, 9, 5, 2); l.position.set(x, y, z); scene.add(l); return l; });
  return { lampLights };
}
