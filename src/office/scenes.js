// The scenes on the /office page and the landing page, drawn in art pixels on
// the stage from pixel.js. Every scene is a plain function of (ctx, atlas,
// view) so the stage can redraw it at any size, time and scroll progress.
//
// One office, seen from the front the way LimeZu draws rooms: a wall band
// across the top with a run of glass in it, carpet below, the desks along the
// glass. Four people, four jobs you can tell apart from across the room:
//
//   Ара   seated at a laptop under her desk lamp, answering a message that
//         just arrived — the typing bubble, then the reply on her screen
//   Веда  seated between two monitors that build the month's chart, reading
//         the pages her printer keeps putting out
//   Эхо   seated with a headset, the desk phone ringing, the call running as
//         a waveform on his monitor
//   Нова  the one on her feet: standing beside her desk, messages leaving
//         through the glass, a heart coming back
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

// ------------------------------------------------------------- geometry
// The wall band ends at the floor line; desks stand with their top edge a
// little below it, so a seated person's head sits against the glass.
const FLOOR_Y = 72;
const DESK_Y = 84;
const GLASS = { y: 6, h: 48 };

// Station widths in art pixels: each is its desk plus what stands beside it
// (Веда's printer, the floor Нова stands on).
const STATION_W = { ara: 78, veda: 114, eho: 82, nova: 106 };
// Where the desk starts inside its station.
const DESK_X = { ara: 12, veda: 10, eho: 12, nova: 10 };
const ROW_W = STAFF.reduce((w, id) => w + STATION_W[id], 0);
// Art pixels the four desks need side by side, with a margin each end.
export const HERO_MIN_W = 8 + ROW_W;
// The landing hero on a phone draws the room this wide and pans across it.
export const HERO_PAN_W = ROW_W + 72;

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
// A desk with its chair and, unless `standing`, its person seated behind it.
// `pieces` are desk sprites laid left to right; props sit relative to the
// desk's top-left corner and are drawn after it, so a lamp or a mug stands on
// the surface. Anything that gives off light (screens, emotes, the lamp) is
// pushed to `lights` and drawn after the room is graded, so it stays bright
// at night.
function desk(ctx, img, o) {
  const { id, x, y, t, pieces, props, lights, seed = 0, night = 0 } = o;
  const occupied = o.occupied !== false;
  const seated = occupied && !o.standing;
  const kit = KIT[id];
  const deskW = pieces.reduce((w, p) => w + SPRITES[p].w, 0);
  const cx = x + Math.floor((deskW - 32) / 2);
  const cy = y - 56;
  sprite(ctx, img, "CHAIR", cx, cy + 12);
  if (seated) charFrame(ctx, img, id, kit.anim, frameIndex(kit, t, seed), cx, cy);
  let px = x;
  for (const p of pieces) {
    sprite(ctx, img, p, px, y);
    px += SPRITES[p].w;
  }
  for (const [pid, dx, dy] of props) {
    if (pid === "LAMP") { deskLamp(ctx, img, x + dx, y + dy, night && occupied ? night : 0, lights); continue; }
    if (pid === "MUG") { mug(ctx, x + dx, y + dy, t, lights); continue; }
    sprite(ctx, img, pid, x + dx, y + dy);
    if (SPRITES[pid].screens && occupied) {
      lights.push(() => {
        screenLight(ctx, pid, x + dx, y + dy, night);
        screenActivity(ctx, pid, x + dx, y + dy, t, seed + 5);
      });
    }
  }
  return { cx, cy, deskW, deskX: x, deskY: y };
}

// A desk lamp standing on the desk. Lit once the light goes; the glow is
// drawn after the grade so it reads as light, not as a yellow sprite.
function deskLamp(ctx, img, x, y, night, lights) {
  const on = night > 0.35;
  if (!on) { sprite(ctx, img, "LAMP_OFF", x, y); return; }
  lights.push(() => {
    lampGlow(ctx, x + 18, y + 14, night);
    sprite(ctx, img, "LAMP", x, y);
  });
}

// A mug on the desk, 8x7, with three wisps of steam rising off it. Drawn
// rather than taken from the pack: the kitchen mugs are 22px across, which
// is a jug next to a laptop.
function mug(ctx, x, y, t, lights) {
  rect(ctx, x, y, 7, 7, "#3A3A50");
  rect(ctx, x + 1, y + 1, 5, 5, "#E6ECFF");
  rect(ctx, x + 1, y + 3, 5, 1, "#3B82F6");
  rect(ctx, x + 7, y + 2, 2, 3, "#3A3A50");
  rect(ctx, x + 8, y + 3, 1, 1, "#E6ECFF");
  rect(ctx, x + 1, y + 6, 5, 1, "#B7C2E0");
  lights.push(() => {
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.55 + k * 0.33) % 1;
      const sx = x + 2 + k * 2 + Math.round(Math.sin((p + k) * 6) * 1);
      const sy = y - 2 - Math.round(p * 9);
      ctx.globalAlpha = (1 - p) * 0.7;
      rect(ctx, sx, sy, 1, 2, "#DDE4F5");
    }
    ctx.globalAlpha = 1;
  });
}

// A message, small enough to sit in a scene at art scale: a 9x6 envelope.
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

// A chat screen: their bubble on the left, hers on the right.
function chatScreen(ctx, sc, sx, sy, replied) {
  rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
  rect(ctx, sx + 1, sy + 1, Math.min(9, sc.w - 4), 3, "#5E9BFF");
  if (replied) rect(ctx, sx + sc.w - 11, sy + sc.h - 4, 10, 3, "#9CC5FF");
}

// ------------------------------------------------------- what each one does
// Each job is a small loop on `t`, seeded so the four never fire together.

// Ара: a message arrives, she types, the reply lands on her laptop.
//   0.0–1.0 s  the message flies in over the glass to her laptop
//   1.0–2.6 s  the typing bubble over her head
//   2.6–5.2 s  the reply is the last bubble on her screen
function actAra(ctx, img, s, t, lights, force) {
  const { cx, cy, lap } = s;
  const sc = SPRITES.LAPTOP.screens[0];
  const cycle = force ?? ((t + 1.3) % 5.2);
  lights.push(() => {
    if (cycle < 1.0) {
      const k = cycle / 1.0;
      envelope(ctx, Math.round(cx + 44 - k * 26), Math.round(cy - 6 + Math.sin(k * Math.PI) * -8 + k * 18), Math.min(1, k * 3));
    } else if (cycle < 2.6) {
      stripFrame(ctx, img, "BUBBLE", 3, cx + 16, cy - 10);
      const lifted = Math.floor(t * 6) % 3;
      for (let d = 0; d < 3; d++) rect(ctx, cx + 26 + d * 5, cy + 8 - (d === lifted ? 1 : 0), 2, 2, "#3A3A50");
    }
    chatScreen(ctx, sc, lap.x + sc.x, lap.y + sc.y, cycle >= 2.4);
  });
}

// Веда: the report. Her two screens build the chart bar by bar, she reads
// the printed pages, and the printer beside her puts out the next one.
function actVeda(ctx, img, s, t, lights, chartGrow) {
  const { dual, printer } = s;
  const grow = chartGrow ?? ((t % 7) / 5.2);
  lights.push(() => {
    screenChart(ctx, "DUAL", 0, dual.x, dual.y, REPORT, Math.min(1, grow));
    const sc = SPRITES.DUAL.screens[1];
    const sx = dual.x + sc.x, sy = dual.y + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    const rows = Math.floor(Math.min(1, grow) * 4);
    for (let r = 0; r < rows; r++) rect(ctx, sx + 1, sy + 1 + r * 3, sc.w - 2 - (r % 2) * 5, 2, r === rows - 1 ? "#9CC5FF" : "#5E9BFF");
  });
  // a page comes out of the printer as the chart finishes
  if (printer && grow > 0.9 && grow < 1.3) sprite(ctx, img, "PAPERS", printer.x + 3, printer.y + 26);
}

// Эхо: the phone rings, he answers, the call runs on his screen as a
// waveform. Ringing is the "!" over him plus sound rings off the handset.
function actEho(ctx, img, s, t, lights, ringForce) {
  const { cx, cy, phone, mon } = s;
  const cycle = (t + 2.1) % 6.5;
  const ring = ringForce ?? (cycle < 1.5);
  const sc = SPRITES.MONITOR_KB.screens[0];
  lights.push(() => {
    if (ring) {
      ringing(ctx, phone.x + 18, phone.y + 4, t);
      stripFrame(ctx, img, "ALERT", Math.floor(t * 4) % 2, cx + 16, cy - 12);
    }
    const sx = mon.x + sc.x, sy = mon.y + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    if (!ring) {
      for (let i = 0; i < 10; i++) {
        const h = 1 + Math.round(noise(i * 13 + Math.floor(t * 8)) * (sc.h - 4));
        rect(ctx, sx + 2 + i * 2, sy + sc.h - 1 - h, 1, h, i % 3 === 0 ? "#9CC5FF" : "#5E9BFF");
      }
    } else {
      rect(ctx, sx + 2, sy + sc.h / 2 - 1, sc.w - 4, 1, "#5E9BFF");
    }
  });
}

// Нова: on her feet beside the desk, holding an offer out. Messages leave
// her hands and rise through the glass; now and then a heart comes back.
function actNova(ctx, img, s, t, lights) {
  const { sx: px, sy: py, lap } = s;
  const sc = SPRITES.LAPTOP.screens[0];
  lights.push(() => {
    rect(ctx, lap.x + sc.x, lap.y + sc.y, sc.w, sc.h, "#1E3F8A");
    for (let r = 0; r < 3; r++) rect(ctx, lap.x + sc.x + 1, lap.y + sc.y + 1 + r * 3, 5 + ((Math.floor(t) + r) % 3) * 3, 2, "#5E9BFF");
    // three messages in flight at once, each on its own 3.6 s arc
    for (let k = 0; k < 3; k++) {
      const p = ((t + k * 1.2) % 3.6) / 3.6;
      if (p > 0.85) continue;
      const mx = Math.round(px + 22 + p * 18);
      const my = Math.round(py + 30 - p * 62);
      envelope(ctx, mx, my, p < 0.1 ? p * 10 : 1 - Math.max(0, (p - 0.6) / 0.25));
    }
    const hc = (t + 4) % 10;
    if (hc < 1.6) stripFrame(ctx, img, "HEART", Math.min(4, Math.floor(hc * 4)), px + 2, py - 30);
  });
}

// ----------------------------------------------------------- one station
// Draws one person's station at (x, deskY) and returns where things ended
// up, so the action loops know where the laptop, the phone or the printer
// is without repeating the layout.
function station(ctx, img, id, x, deskY, t, lights, night, occupied, seed) {
  const base = { id, x, y: deskY, t, seed, lights, night, occupied, pieces: ["DESK_L", "DESK_R"] };
  let s;
  if (id === "ara") {
    s = desk(ctx, img, { ...base, props: [["LAMP", -8, -18], ["LAPTOP", 22, -8]] });
    s.lap = { x: x + 22, y: deskY - 8 };
  } else if (id === "veda") {
    s = desk(ctx, img, { ...base, pieces: ["DESK_L", "DESK_M", "DESK_R"], props: [["MUG", 4, 8], ["DUAL", 20, -14]] });
    s.dual = { x: x + 20, y: deskY - 14 };
    s.printer = { x: x + s.deskW + 4, y: deskY + 2 };
    sprite(ctx, img, "PRINTER", s.printer.x, s.printer.y);
  } else if (id === "eho") {
    s = desk(ctx, img, { ...base, props: [["DESK_PHONE", -2, 2], ["MONITOR_KB", 18, -10]] });
    s.phone = { x: x - 2, y: deskY + 2 };
    s.mon = { x: x + 18, y: deskY - 10 };
  } else {
    s = desk(ctx, img, { ...base, standing: true, props: [["LAMP", -8, -18], ["LAPTOP", 24, -8]] });
    s.lap = { x: x + 24, y: deskY - 8 };
    // standing to the right of her desk, a step nearer the camera
    s.sx = x + s.deskW + 6;
    s.sy = deskY + 46 - 66;
    if (occupied) charFrame(ctx, img, "nova", KIT.nova.anim, frameIndex(KIT.nova, t, seed), s.sx, s.sy);
  }
  return s;
}

function act(ctx, img, id, s, t, lights, o) {
  if (id === "ara") actAra(ctx, img, s, t, lights, o.araPhase ?? null);
  else if (id === "veda") actVeda(ctx, img, s, t, lights, o.chartGrow);
  else if (id === "eho") actEho(ctx, img, s, t, lights, o.ring ?? null);
  else actNova(ctx, img, s, t, lights);
}

// ----------------------------------------------------------------- the room
// The whole office. Everything that varies between the hero, the chapters
// and the landing scene is an option; the geometry is not. `panW` draws the
// room wider than the stage and pans across it, for a phone that cannot
// show four desks at a readable scale.
function officeRoom(ctx, img, { W, H, t }, {
  hour,
  cast = STAFF,          // who is at a desk; the rest get an empty chair and a dark screen
  chartGrow,             // Веда's chart, when the scene drives it; else her own loop
  focus = null,          // desk index 0..3 to keep lit
  focusAmount = 0,
  ring = null,
  araPhase = null,
  panW = 0,
}) {
  const night = nightAmount(hour);
  const Wv = Math.max(W, panW);
  // a slow drift, out and back over 26 s, eased at the turns
  let camX = 0;
  if (Wv > W) {
    const p = (t / 26) % 1;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    camX = Math.round((tri * tri * (3 - 2 * tri)) * (Wv - W));
  }
  ctx.save();
  ctx.translate(-camX, 0);

  room(ctx, img, Wv, H, FLOOR_Y);
  const ox = Math.floor((Wv - ROW_W) / 2);
  const rx = ox + ROW_W;
  const wide = ox >= 26;
  // The glass runs the length of the desks and a little past; on a narrow
  // stage it is the whole wall.
  const glass = { x: Math.max(6, ox - 22), y: GLASS.y, w: 0, h: GLASS.h };
  glass.w = Math.min(Wv - 6, rx + 22) - glass.x;
  const posts = [];
  for (let px = glass.x + 40; px < glass.x + glass.w - 8; px += 40) posts.push(px);
  sky(ctx, glass.x, glass.y, glass.w, glass.h, hour, 3);
  windowFrame(ctx, glass.x, glass.y, glass.w, glass.h, posts);

  const lights = [];
  if (wide) {
    sprite(ctx, img, "PLANT", ox - 22, FLOOR_Y - 6);
    sprite(ctx, img, "COOLER", rx - 4, FLOOR_Y - 12);
  }
  if (Wv - rx >= 62) sprite(ctx, img, "BIN", rx + 28, FLOOR_Y + 30);
  if (ox >= 62) sprite(ctx, img, "BOOKSHELF", ox - 60, FLOOR_Y - 46);

  let x = ox;
  const stations = {};
  for (const [i, id] of STAFF.entries()) {
    const occupied = cast.includes(id);
    const s = station(ctx, img, id, x + DESK_X[id], DESK_Y, t, lights, night, occupied, i);
    if (occupied) act(ctx, img, id, s, t, lights, { araPhase, chartGrow, ring });
    stations[id] = { ...s, i, left: x, width: STATION_W[id] };
    x += STATION_W[id];
  }

  grade(ctx, Wv, H, hour, [glass]);
  sunPatch(ctx, glass, FLOOR_Y, H, hour);
  for (const draw of lights) draw();

  // last, so the focused desk keeps its screen and lamp glow
  if (focus !== null && focusAmount > 0) {
    const st = stations[STAFF[focus]];
    focusDim(ctx, Wv, H, st.left, st.left + st.width, focusAmount);
  }
  ctx.restore();
  return stations;
}

// Where each desk sits across a stage `W` art pixels wide, as fractions of
// the width, for the messages the landing page floats over the room. Null
// while the room is panning: the desks are moving then.
const DESK_W = { ara: 50, veda: 82, eho: 50, nova: 50 };
export function heroStations(W) {
  if (W < HERO_MIN_W) return null;
  const ox = Math.floor((W - ROW_W) / 2);
  const out = {};
  let x = ox;
  for (const id of STAFF) {
    out[id] = (x + DESK_X[id] + DESK_W[id] / 2) / W;
    x += STATION_W[id];
  }
  // Нова stands to the right of her desk
  out.nova = (ox + ROW_W - STATION_W.nova + DESK_X.nova + DESK_W.nova + 22) / W;
  return out;
}

// ------------------------------------------------------------------- hero
export function drawHero(ctx, img, v) {
  officeRoom(ctx, img, v, { hour: HERO_HOUR });
}

// The landing hero: the same room, panning on a stage narrower than the row.
export function drawHeroPan(ctx, img, v) {
  officeRoom(ctx, img, v, { hour: HERO_HOUR, panW: v.W < HERO_MIN_W ? HERO_PAN_W : 0 });
}

// --------------------------------------------------------------- chapters
// One person, close up, at the hour their chapter is set, doing the same
// job they do in the room. The glass fills the wall; the desk is centred.
export function drawChapter(id) {
  const hour = CHAPTER_HOUR[id];
  const night = nightAmount(hour);
  return (ctx, img, { W, H, t, progress }) => {
    room(ctx, img, W, H, FLOOR_Y);
    const glass = { x: 8, y: GLASS.y, w: W - 16, h: GLASS.h };
    const posts = [];
    for (let px = glass.x + Math.floor(glass.w / 3); px < glass.x + glass.w - 8; px += Math.floor(glass.w / 3)) posts.push(px);
    sky(ctx, glass.x, glass.y, glass.w, glass.h, hour, STAFF.indexOf(id) + 11);
    windowFrame(ctx, glass.x, glass.y, glass.w, glass.h, posts);

    const lights = [];
    const grow = mapRange(progress, 0.2, 0.62, 0, 1);
    // centre the station, its side pieces included
    const sw = STATION_W[id];
    const left = Math.floor((W - sw) / 2);
    if (id === "veda") {
      sprite(ctx, img, "PLANT", Math.max(2, left - 30), FLOOR_Y - 6);
    } else if (id === "nova") {
      sprite(ctx, img, "PLANT", Math.max(2, left - 30), FLOOR_Y - 6);
      if (W - (left + sw) >= 30) sprite(ctx, img, "BIN", left + sw + 4, FLOOR_Y + 30);
    } else {
      sprite(ctx, img, "PLANT", Math.max(2, left - 34), FLOOR_Y - 6);
      if (W - (left + sw) >= 40) {
        sprite(ctx, img, "CABINET", left + sw + 6, FLOOR_Y - 10);
        sprite(ctx, img, "PAPERS", left + sw + 10, FLOOR_Y - 20);
      }
    }
    const s = station(ctx, img, id, left + DESK_X[id], DESK_Y, t, lights, night, true, 2);
    act(ctx, img, id, s, t, lights, { chartGrow: id === "veda" ? grow : undefined });

    grade(ctx, W, H, hour, [glass]);
    sunPatch(ctx, glass, FLOOR_Y, H, hour);
    for (const draw of lights) draw();
  };
}

// ------------------------------------------------------------ a working day
// Scroll progress maps to an hour; the light and the cast are pure functions
// of that hour. The landing scene runs the room from night to day and back
// behind the phone.
const DAY_KEYS = [
  [0.0, 2.23], [0.06, 2.25], [0.28, 2.3], [0.42, 8.6],
  [0.6, 9.1], [0.72, 17.9], [0.84, 18.2], [0.87, 19.5],
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
  { id: "eho", time: "18:05", from: 0.72, to: 0.84 },
  { id: "nova", time: "19:41", from: 0.87, to: 0.95 },
];

const focusDeskAt = (p) => (p < 0.35 ? 0 : p < 0.66 ? 1 : p < 0.855 ? 2 : 3);

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
    focus: p < 0.95 ? focusDeskAt(p) : null,
    focusAmount: focusAmountAt(p),
    ring: p >= 0.72 && p < 0.77 ? true : p >= 0.77 && p < 0.84 ? false : null,
    araPhase: p > 0.07 && p < 0.2 ? 1.8 : null,
  });
}
