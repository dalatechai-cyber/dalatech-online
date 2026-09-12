// The scenes on the /office page and the landing page, drawn in art pixels on
// the stage from pixel.js. Every scene is a plain function of (ctx, atlas,
// view) so the stage can redraw it at any size, time and scroll progress.
//
// The room is one office, seen from the front: four desks along a wall of
// glass, each set up for the job its person does. What makes the four read
// as four is not the pose — the character generator has no front-facing
// seated pose, so everyone behind a desk shares the idle frames — but what
// each one is visibly doing: Ара answering a message that just arrived, Веда
// holding the report her screens are building, Эхо on a call, Нова sending.
import {
  sprite, stripFrame, charFrame, sky, windowFrame, room, screenActivity, screenChart,
  lampGlow, grade, sunPatch, screenLight, ringing, mapRange, nightAmount, rect, focusDim, noise, SPRITES,
} from "./pixel";

// Order on the hero row and the hour each chapter is set at.
export const STAFF = ["ara", "veda", "eho", "nova"];
// Ара deep in the night, Веда at first light, Эхо in the golden hour, Нова
// in the blue hour: four moods that all sit inside the dark page.
export const CHAPTER_HOUR = { ara: 2.25, veda: 6.75, eho: 18.4, nova: 19.6 };
// The hero is set in the evening: lamps lit, screens glowing, the four still
// at work. The people animate; the hour does not move.
export const HERO_HOUR = 21;

// Station widths in art pixels. Веда's is wider: two screens and a printer.
const STATION_W = { ara: 66, veda: 92, eho: 66, nova: 68 };
const ROW_W = STAFF.reduce((w, id) => w + STATION_W[id], 0);
// Art pixels the four desks need side by side, with a margin each end.
export const HERO_MIN_W = 8 + ROW_W;

// Where the floor starts and where the desks stand, for any stage height.
// Heads sit against the wall band under the windows, not over the glass.
const FLOOR_Y = 58;
const DESK_Y = 82;

// Four weeks of the sample report, the same bars the page shows in HTML.
const REPORT = [0.5, 0.62, 0.48, 0.9];

const KIT = {
  ara: { anim: "idle", fps: 4 },
  veda: { anim: "read", fps: 5 },
  eho: { anim: "phone", fps: 8, loop: [4, 9] },
  nova: { anim: "idle", fps: 3 },
};

function frameIndex(kit, t, seed) {
  const f = Math.floor((t + seed * 0.37) * kit.fps);
  if (kit.loop) return kit.loop[0] + (f % (kit.loop[1] - kit.loop[0] + 1));
  return f;
}

// ------------------------------------------------------------ the desks
// A person seated behind a desk. `pieces` are desk sprites laid left to
// right; props are placed relative to the desk's top-left corner. Drawn in
// the order the eye expects: chair, person, desk, things on the desk.
// Anything that gives off light (screens, emotes, the lamp) is pushed to
// `lights` and drawn by the scene after the room is graded, so it stays
// bright at night.
function desk(ctx, img, o) {
  const { id, x, y, t, pieces, props, lights, seed = 0, night = 0 } = o;
  const occupied = o.occupied !== false;
  const kit = KIT[id];
  const deskW = pieces.reduce((w, p) => w + SPRITES[p].w, 0);
  const cx = x + (o.personX ?? Math.floor((deskW - 32) / 2));
  // head and shoulders clear the desk; the desk hides the rest
  const cy = y - 58;
  sprite(ctx, img, "CHAIR", cx, cy + 10);
  if (occupied) charFrame(ctx, img, id, kit.anim, frameIndex(kit, t, seed), cx, cy);
  let px = x;
  for (const p of pieces) {
    sprite(ctx, img, p, px, y);
    px += SPRITES[p].w;
  }
  for (const [pid, dx, dy] of props) {
    sprite(ctx, img, pid, x + dx, y + dy);
    if (SPRITES[pid].screens && occupied) {
      lights.push(() => {
        screenLight(ctx, pid, x + dx, y + dy, night);
        screenActivity(ctx, pid, x + dx, y + dy, t, seed + 5);
      });
    }
  }
  return { cx, cy, deskW };
}

// A desk lamp standing on a desk. Lit once the light goes; the glow is
// drawn after the grade so it reads as light, not as a yellow sprite.
function deskLamp(ctx, img, x, y, night, lights) {
  const on = night > 0.35;
  if (!on) { sprite(ctx, img, "LAMP_OFF", x, y); return; }
  lights.push(() => {
    lampGlow(ctx, x + 15, y + 12, night);
    sprite(ctx, img, "LAMP", x, y);
  });
}

// A message, small enough to sit in a scene at art scale: a 9x6 envelope.
// The 32px emote reads as a cloud at this size.
function envelope(ctx, x, y, alpha = 1) {
  ctx.globalAlpha = alpha;
  rect(ctx, x, y, 9, 6, "#F0F4FF");
  rect(ctx, x, y, 9, 1, "#8B9FC4");
  rect(ctx, x, y + 5, 9, 1, "#8B9FC4");
  rect(ctx, x, y, 1, 6, "#8B9FC4");
  rect(ctx, x + 8, y, 1, 6, "#8B9FC4");
  rect(ctx, x + 1, y + 1, 1, 1, "#3B82F6"); rect(ctx, x + 2, y + 2, 1, 1, "#3B82F6");
  rect(ctx, x + 3, y + 3, 3, 1, "#3B82F6");
  rect(ctx, x + 6, y + 2, 1, 1, "#3B82F6"); rect(ctx, x + 7, y + 1, 1, 1, "#3B82F6");
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------- what each one does
// Each job is a small loop on `t`, seeded so the four never fire together.
// The phases are named so the chapters can pin one (see drawChapter).

// Ара: a message arrives, she types, the reply lands on her laptop.
//   0.0–1.0 s  a message box slides in over the laptop
//   1.0–2.6 s  the typing dots over her head
//   2.6–4.4 s  her laptop shows the exchange; the reply is the last bubble
function actAra(ctx, img, s, t, lights, force) {
  const { x, y, cx, cy } = s;
  const lap = SPRITES.LAPTOP;
  const lx = x + 22, ly = y;
  const cycle = force ?? ((t + 1.3) % 5.2);
  lights.push(() => {
    if (cycle < 1.0) {
      const k = cycle / 1.0;
      const mx = Math.round(cx - 26 + k * 40);
      envelope(ctx, mx, cy - 2 - Math.round(Math.sin(k * Math.PI) * 6), Math.min(1, k * 3));
    } else if (cycle < 2.6) {
      stripFrame(ctx, img, "BUBBLE", 3, cx + 18, cy - 6);
      const lifted = Math.floor(t * 6) % 3;
      for (let d = 0; d < 3; d++) rect(ctx, cx + 18 + 10 + d * 5, cy - 6 + 18 - (d === lifted ? 1 : 0), 2, 2, "#3A3A50");
    }
    // the laptop screen: two bubbles, theirs then hers, the reply arriving
    // as the typing ends
    const sc = lap.screens[0];
    const sx = lx + sc.x, sy = ly + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    rect(ctx, sx + 1, sy + 1, 9, 3, "#5E9BFF");
    if (cycle >= 2.4) rect(ctx, sx + sc.w - 11, sy + 5, 10, 3, "#9CC5FF");
  });
}

// Веда: the report. Her two screens build the chart bar by bar, she reads
// the printed pages, and the printer beside her puts out the next one.
function actVeda(ctx, img, s, t, lights, chartGrow) {
  const { x, y } = s;
  const dual = SPRITES.DUAL;
  const dx = x + 10, dy = y - 4;
  const grow = chartGrow ?? ((t % 7) / 5.2);
  lights.push(() => {
    screenChart(ctx, "DUAL", 0, dx, dy, REPORT, Math.min(1, grow));
    // the second screen: rows of a sheet filling top to bottom
    const sc = dual.screens[1];
    const sx = dx + sc.x, sy = dy + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    const rows = Math.floor(Math.min(1, grow) * 4);
    for (let r = 0; r < rows; r++) rect(ctx, sx + 1, sy + 1 + r * 3, sc.w - 2 - (r % 2) * 5, 2, r === rows - 1 ? "#9CC5FF" : "#5E9BFF");
  });
  // a page comes out of the printer as the chart finishes
  if (grow > 0.9 && grow < 1.3) sprite(ctx, img, "PAPERS", s.printerX + 3, s.printerY + 30);
}

// Эхо: the phone rings, he answers, the call runs on his screen as a
// waveform. Ringing is the "!" over the desk phone plus the sound rings.
function actEho(ctx, img, s, t, lights, ringForce) {
  const { x, y, cx, cy } = s;
  const cycle = (t + 2.1) % 6.5;
  const ring = ringForce ?? (cycle < 1.5);
  const mon = SPRITES.MONITOR_KB;
  const mx = x + 20, my = y;
  lights.push(() => {
    if (ring) {
      ringing(ctx, x - 2 + 20, y + 8 + 6, t);
      stripFrame(ctx, img, "ALERT", Math.floor(t * 4) % 2, cx + 18, cy - 8);
    }
    const sc = mon.screens[0];
    const sx = mx + sc.x, sy = my + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    if (!ring) {
      // the waveform: bars that pulse while the call is on
      for (let i = 0; i < 10; i++) {
        const h = 1 + Math.round(noise(i * 13 + Math.floor(t * 8)) * (sc.h - 4));
        rect(ctx, sx + 2 + i * 2, sy + sc.h - 1 - h, 1, h, i % 3 === 0 ? "#9CC5FF" : "#5E9BFF");
      }
    } else {
      rect(ctx, sx + 2, sy + sc.h / 2 - 1, sc.w - 4, 1, "#5E9BFF");
    }
  });
}

// Нова: reaching out. Messages leave her laptop and drift up and away;
// now and then a heart comes back from the customer.
function actNova(ctx, img, s, t, lights) {
  const { x, y, cx, cy } = s;
  const lap = SPRITES.LAPTOP;
  const lx = x + 12, ly = y;
  lights.push(() => {
    const sc = lap.screens[0];
    const sx = lx + sc.x, sy = ly + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    for (let r = 0; r < 3; r++) rect(ctx, sx + 1, sy + 1 + r * 3, 6 + ((Math.floor(t) + r) % 3) * 3, 2, "#5E9BFF");
    // three messages in flight at once, each on its own 3.6 s arc
    for (let k = 0; k < 3; k++) {
      const p = ((t + k * 1.2) % 3.6) / 3.6;
      if (p > 0.85) continue;
      const mx = Math.round(cx + 28 + p * 22);
      const my = Math.round(cy + 6 - p * 30);
      envelope(ctx, mx, my, p < 0.1 ? p * 10 : 1 - Math.max(0, (p - 0.6) / 0.25));
    }
    // a heart back, once every ten seconds
    const hc = (t + 4) % 10;
    if (hc < 1.6) stripFrame(ctx, img, "HEART", Math.min(4, Math.floor(hc * 4)), cx + 20, cy - 20);
  });
}

// ----------------------------------------------------------------- the room
// The whole office. Everything that varies between the hero, the chapters
// and the landing scene is an option; the geometry is not.
function officeRoom(ctx, img, { W, H, t }, {
  hour,
  cast = STAFF,          // who is at a desk; the rest get an empty chair and a dark screen
  chartGrow,             // Веда's chart, when the scene drives it; else her own loop
  focus = null,          // desk index 0..3 to keep lit
  focusAmount = 0,
  ring = null,
  araPhase = null,
}) {
  const night = nightAmount(hour);
  const floorY = FLOOR_Y;
  room(ctx, img, W, H, floorY);

  const ox = Math.floor((W - ROW_W) / 2);
  const deskY = DESK_Y;
  // The glass runs over the desks. On a wide stage the wall continues past
  // the row at both ends, and that is where the office furniture lives.
  const wide = ox >= 28;
  const corner = ox >= 76;
  const glass = corner ? { x: ox - 6, y: 3, w: ROW_W + 12, h: 27 } : { x: 6, y: 3, w: W - 12, h: 27 };
  const posts = [];
  let px = ox;
  for (const id of STAFF) { posts.push(px - 2); px += STATION_W[id]; }
  posts.push(px - 2);
  sky(ctx, glass.x, glass.y, glass.w, glass.h, hour, 3);
  windowFrame(ctx, glass.x, glass.y, glass.w, glass.h, posts.filter((p) => p > glass.x + 2 && p < glass.x + glass.w - 2));

  const lights = [];
  const rx = ox + ROW_W;
  if (wide) {
    sprite(ctx, img, "PLANT", ox - 30, floorY + 2);
    sprite(ctx, img, "COOLER", rx + 4, floorY - 8);
  }
  if (corner) {
    // a real corner each end: bookshelf and clock on the wall, the standing
    // whiteboard with the month's chart, a bin by the cooler
    sprite(ctx, img, "BOOKSHELF", ox - 66, floorY - 50);
    sprite(ctx, img, "CLOCK", rx + 40, 4);
    sprite(ctx, img, "WHITEBOARD_CHART", rx + 34, floorY + 4);
    sprite(ctx, img, "BIN", rx + 8, floorY + 36);
  }

  let x = ox;
  const stations = {};
  for (const [i, id] of STAFF.entries()) {
    const occupied = cast.includes(id);
    const base = { id, x: x + 6, y: deskY, t, seed: i, lights, night, occupied, pieces: ["DESK_L", "DESK_R"] };
    let s;
    if (id === "ara") {
      s = desk(ctx, img, { ...base, props: [["LAPTOP", 22, 0]] });
      deskLamp(ctx, img, base.x - 2, deskY - 14, night, lights);
      if (occupied) actAra(ctx, img, { ...s, x: base.x, y: deskY }, t, lights, araPhase);
    } else if (id === "veda") {
      s = desk(ctx, img, { ...base, pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 24, props: [["PAPER_STACK", -2, 4], ["DUAL", 10, -4]] });
      // the printer on its stand beside her desk, in the gap before Эхо
      const printerX = base.x + s.deskW - 6, printerY = deskY + 6;
      sprite(ctx, img, "PRINTER", printerX, printerY);
      if (occupied) actVeda(ctx, img, { ...s, x: base.x, y: deskY, printerX, printerY }, t, lights, chartGrow);
    } else if (id === "eho") {
      s = desk(ctx, img, { ...base, props: [["DESK_PHONE", -2, 8], ["MONITOR_KB", 20, 0]] });
      if (occupied) actEho(ctx, img, { ...s, x: base.x, y: deskY }, t, lights, ring);
    } else {
      s = desk(ctx, img, { ...base, props: [["LAPTOP", 12, 0]] });
      // her coffee, steaming
      lights.push(() => stripFrame(ctx, img, "COFFEE_STEAM", Math.floor(t * 5) % 6, base.x + 34, deskY - 26));
      if (occupied) actNova(ctx, img, { ...s, x: base.x, y: deskY }, t, lights);
    }
    stations[id] = { ...s, x: base.x, i, left: x, width: STATION_W[id] };
    x += STATION_W[id];
  }

  grade(ctx, W, H, hour, [glass]);
  sunPatch(ctx, glass, floorY, H, hour);
  for (const draw of lights) draw();

  // last, so the focused desk keeps its screen and lamp glow
  if (focus !== null && focusAmount > 0) {
    const st = stations[STAFF[focus]];
    focusDim(ctx, W, H, st.left, st.left + st.width, focusAmount);
  }
  return stations;
}

// ------------------------------------------------------------------- hero
export function drawHero(ctx, img, v) {
  officeRoom(ctx, img, v, { hour: HERO_HOUR });
}

// --------------------------------------------------------------- chapters
// One person, close up, at the hour their chapter is set, doing the same
// job they do in the room. The right side of the wall stays plain: the page
// floats the real messages over it.
export function drawChapter(id) {
  const hour = CHAPTER_HOUR[id];
  const night = nightAmount(hour);
  return (ctx, img, { W, H, t, progress }) => {
    const floorY = H - 56;
    room(ctx, img, W, H, floorY);
    const win = { x: 8, y: 6, w: Math.max(70, Math.min(100, Math.floor(W * 0.42))), h: Math.min(50, floorY - 24) };
    sky(ctx, win.x, win.y, win.w, win.h, hour, STAFF.indexOf(id) + 11);
    windowFrame(ctx, win.x, win.y, win.w, win.h);
    const deskY = floorY + 6;
    const lights = [];
    const x = 8;
    const grow = mapRange(progress, 0.2, 0.62, 0, 1);
    const base = { id, x, y: deskY, t, seed: 2, lights, night, pieces: ["DESK_L", "DESK_M", "DESK_R"] };
    if (id === "ara") {
      const s = desk(ctx, img, { ...base, personX: 12, props: [["DESK_PHONE", 2, 8], ["LAPTOP", 50, 0]] });
      sprite(ctx, img, "CABINET", x + s.deskW + 8, deskY - 2);
      deskLamp(ctx, img, x + s.deskW + 9, deskY - 36, night, lights);
      actAra(ctx, img, { ...s, x: x + 36, y: deskY }, t, lights, null);
    } else if (id === "veda") {
      const s = desk(ctx, img, { ...base, personX: 10, props: [["PAPER_STACK", 2, 6], ["DUAL", 30, -4]] });
      const printerX = x + s.deskW + 4, printerY = deskY + 2;
      sprite(ctx, img, "PRINTER", printerX, printerY);
      actVeda(ctx, img, { ...s, x: x + 20, y: deskY, printerX, printerY }, t, lights, grow);
    } else if (id === "eho") {
      const s = desk(ctx, img, { ...base, personX: 10, props: [["DESK_PHONE", 4, 8], ["MONITOR_KB", 50, 0]] });
      sprite(ctx, img, "PLANT", x + s.deskW + 8, deskY - 16);
      actEho(ctx, img, { ...s, x: x + 36, y: deskY }, t, lights, null);
    } else {
      const s = desk(ctx, img, { ...base, personX: 12, props: [["LAPTOP", 50, 0]] });
      sprite(ctx, img, "PLANT", x + s.deskW + 8, deskY - 16);
      lights.push(() => stripFrame(ctx, img, "COFFEE_STEAM", Math.floor(t * 5) % 6, x + 8, deskY - 26));
      actNova(ctx, img, { ...s, x: x + 38, y: deskY }, t, lights);
    }
    // On a wide frame the far right is otherwise bare wall; the overlay the
    // page floats there covers the top half only.
    if (W >= 250) {
      sprite(ctx, img, "COOLER", W - 30, deskY - 30);
      sprite(ctx, img, "BIN", W - 44, deskY + 8);
    }
    grade(ctx, W, H, hour, [win]);
    sunPatch(ctx, win, floorY, H, hour);
    for (const draw of lights) draw();
  };
}

// ------------------------------------------------------------ a working day
// Scroll progress maps to an hour; the light and the cast are pure functions
// of that hour. Kept for the landing scene, which runs the room from night
// to day and back behind the phone.
const DAY_KEYS = [
  [0.0, 2.23], [0.06, 2.25], [0.28, 2.3], [0.42, 8.6],
  [0.6, 9.1], [0.74, 17.9], [0.86, 18.2], [0.905, 19.5],
  [0.95, 21.0], [1.0, 21.0],
];
const smoothstep = (t) => t * t * (3 - 2 * t);

export function dayHour(p) {
  const x = Math.min(1, Math.max(0, p));
  for (let i = 1; i < DAY_KEYS.length; i++) {
    const [p0, h0] = DAY_KEYS[i - 1];
    const [p1, h1] = DAY_KEYS[i];
    if (x <= p1) return h0 + (h1 - h0) * smoothstep((x - p0) / (p1 - p0));
  }
  return DAY_KEYS[DAY_KEYS.length - 1][1];
}

// Arrival is keyed to the HOUR, never to progress, so the cast can never
// drift out of step with the light if the timeline is retuned.
const ARRIVE = { ara: -1, veda: 8.0, eho: 17.0, nova: 19.0 };

export const DAY_MOMENTS = [
  { id: "ara", time: "02:14", from: 0.06, to: 0.28 },
  { id: "veda", time: "09:00", from: 0.42, to: 0.6 },
  { id: "eho", time: "18:05", from: 0.74, to: 0.86 },
];

const focusDeskAt = (p) => (p < 0.35 ? 0 : p < 0.67 ? 1 : 2);

export function focusAmountAt(p) {
  for (const m of DAY_MOMENTS) {
    if (p < m.from || p > m.to) continue;
    return Math.min(1, Math.min((p - m.from) / 0.03, (m.to - p) / 0.03));
  }
  return 0;
}

// Module-level so its identity is stable: PixelStage keys an effect on `draw`.
export function drawWorkingDay(ctx, img, view) {
  const p = view.progress ?? 0;
  const hour = dayHour(p);
  officeRoom(ctx, img, view, {
    hour,
    cast: STAFF.filter((id) => hour >= ARRIVE[id]),
    chartGrow: mapRange(p, 0.44, 0.56, 0, 1),
    focus: p < 0.88 ? focusDeskAt(p) : null,
    focusAmount: focusAmountAt(p),
    ring: p >= 0.74 && p < 0.79 ? true : p >= 0.79 && p < 0.86 ? false : null,
    araPhase: p > 0.07 && p < 0.2 ? 1.8 : null,
  });
}
