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
// Anything that gives off light (screens, the lamp) is pushed to
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
function deskLamp(ctx, img, x, y, night, lights, showSprite = true) {
  // Lit from dusk. The unlit sprite is a dark hook against a dark wall, so
  // the threshold sits below the dimmest hour any chapter is set at.
  //
  // `showSprite` exists because the lamp is 30 art pixels wide and the
  // landing row gives each person a 50-pixel desk they already share with a
  // laptop. There the sprite landed across the character's chest and read,
  // unmistakably, as a brass instrument being played. That row keeps the
  // pool of light and drops the object.
  const on = night > 0.25;
  if (!on) { if (showSprite) sprite(ctx, img, "LAMP_OFF", x, y); return; }
  lights.push(() => {
    lampGlow(ctx, x + 15, y + 12, night);
    if (showSprite) sprite(ctx, img, "LAMP", x, y);
  });
}

// ------------------------------------------------------- what each one does
// Each job is a small loop on `t`, seeded so the four never fire together.
// The phases are named so the chapters can pin one (see drawChapter).

// Ара: a message arrives and she answers it. It plays on her screen — the
// question in, her reply out — because that is where it really happens.
function actAra(ctx, img, s, t, lights, force) {
  const { x, y } = s;
  const lap = SPRITES.LAPTOP;
  const lx = x + 22, ly = y;
  const cycle = force ?? ((t + 1.3) % 5.2);
  lights.push(() => {
    // The thought bubble and the envelope that used to float over her head
    // are gone: the page shows the real conversation beside the scene, and a
    // cartoon emote over a person in a room reads as a game, not an office.
    // What is left is what a person at a desk actually does — the exchange
    // appears on her screen.
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
// waveform. Ringing is the sound rings around the desk phone.
function actEho(ctx, img, s, t, lights, ringForce) {
  const { x, y } = s;
  const cycle = (t + 2.1) % 6.5;
  const ring = ringForce ?? (cycle < 1.5);
  const mon = SPRITES.MONITOR_KB;
  const mx = x + 20, my = y;
  lights.push(() => {
    // the sound rings around the phone itself; the floating "!" is gone
    if (ring) ringing(ctx, x - 2 + 20, y + 8 + 6, t);
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

// Нова: reaching out. The thread on her screen advances a line at a time as
// each message goes out.
function actNova(ctx, img, s, t, lights) {
  const { x, y } = s;
  const lap = SPRITES.LAPTOP;
  const lx = x + 12, ly = y;
  lights.push(() => {
    const sc = lap.screens[0];
    const sx = lx + sc.x, sy = ly + sc.y;
    rect(ctx, sx, sy, sc.w, sc.h, "#1E3F8A");
    for (let r = 0; r < 3; r++) rect(ctx, sx + 1, sy + 1 + r * 3, 6 + ((Math.floor(t) + r) % 3) * 3, 2, "#5E9BFF");
    // a line on her screen lights as each message goes out; the envelopes
    // and the heart that used to drift over her head are gone
    const sent = Math.floor(t / 1.2) % 3;
    rect(ctx, sx + 1, sy + 1 + sent * 3, 10, 2, "#9CC5FF");
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
    // A real corner at each end. What used to stand here was a "bookshelf"
    // and a "clock" that were, on inspection of the source pack, two
    // top-down staircases — so a stairwell was being drawn on an office
    // wall. They are gone: the shelf unit and the wall chart are the real
    // office pieces, with a bin by the cooler.
    // The right-hand pieces are pushed in from the edge rather than drawn at
    // a fixed offset: the corner gate only guarantees room for the narrowest
    // of them, so a wide one used to be sheared off by the frame.
    const corner_x = (sid, dx) => Math.min(rx + dx, W - 2 - SPRITES[sid].w);
    sprite(ctx, img, "SHELF_UNIT", ox - 68, floorY - SPRITES.SHELF_UNIT.h + 6);
    sprite(ctx, img, "AC", corner_x("AC", 38), 4);
    sprite(ctx, img, "WHITEBOARD_CHART", corner_x("WHITEBOARD_CHART", 34), floorY + 4);
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
      deskLamp(ctx, img, base.x - 2, deskY - 14, night, lights, false);
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
// One person, close up, at the hour their chapter is set. The room around
// them has to read as an office at a glance, so it is built the way an
// office is: a long mullioned window across the top of the wall, a wall band
// under it with something hung on it, and a floor with the things an office
// keeps near the desks — a shelf of files, the printer, the water cooler, a
// plant, a spare chair for whoever comes over.
//
// The page floats this agent's real messages over the right of the frame,
// from just below the top to somewhere between half and nine tenths of the
// way down depending on the chapter and the width. So the room is furnished
// in the two places the panel never covers: the gap beside the desk, and the
// front row along the bottom.

// What each room keeps. Without this the four chapters ran one placement
// path and came out as the same photograph four times, differing only in the
// hour of the sky and the colour of the hair. The pack has few pieces short
// enough for the back wall — everything there has to clear the panel the
// page floats over it — so the character of each room is carried by its
// front row, which sits low in the frame and can hold the tall things.
const CHAPTER_KIT = {
  // reception: somewhere for whoever walks in to sit
  ara: { left: ["SHELF_UNIT", "stand"], front: ["CHAIR_ORANGE", "PLANT", "PLANT_3"] },
  // the analyst: the month on the wall, the printer, the files
  veda: { left: ["WHITEBOARD_CHART", "hang"], front: ["CABINET", "PLANT_3", "PLANT"] },
  // the phone desk: the corner people actually stand in between calls
  eho: { left: ["SHELF_UNIT", "stand"], front: ["COFFEE", "COOLER", "PLANT", "PLANT_3"] },
  // customer manager: a seat for whoever comes back, and something growing
  nova: { left: ["CABINET", "stand"], front: ["PLANT", "CHAIR_ORANGE", "PLANT_3", "COOLER"] },
};

// Where a sprite stands on a floor line: its feet sink four pixels into the
// carpet, which is what stops furniture looking like it floats.
function stand(ctx, img, id, x, lineY, lift = 0) {
  sprite(ctx, img, id, x, lineY - SPRITES[id].h + 4 - lift);
}

export function drawChapter(id) {
  const hour = CHAPTER_HOUR[id];
  const night = nightAmount(hour);
  return (ctx, img, { W, H, t, progress }) => {
    const floorY = H - Math.round(H * 0.34); // where the wall meets the carpet
    const deskY = floorY + 8;
    const frontY = deskY + SPRITES.DESK_L.h - 4; // the depth the desk stands at
    // Where the page's message panel starts. Measured across the four
    // chapters from 320 to 1920 pixels of viewport it always begins at 49-50%
    // of the frame's width, and ends anywhere between 47% and 89% of its
    // height — which is why only the horizontal half of it is a usable
    // contract. Furniture goes left of this line or below the panel, never
    // between.
    const panelX = Math.round(W * 0.49);

    room(ctx, img, W, H, floorY);

    // The window: one bay running the whole wall, mullioned about every 44
    // art pixels, from just under the ceiling down to head height. It is the
    // fastest thing in the frame to say "office".
    const glass = { x: 5, y: 7, w: W - 10, h: Math.max(30, floorY - 7 - 46) };
    sky(ctx, glass.x, glass.y, glass.w, glass.h, hour, STAFF.indexOf(id) + 11);
    const bays = Math.max(2, Math.round(glass.w / 44));
    const posts = [];
    for (let k = 1; k < bays; k += 1) posts.push(Math.round(glass.x + (k * glass.w) / bays) - 1);
    windowFrame(ctx, glass.x, glass.y, glass.w, glass.h, posts);

    const lights = [];
    const deskX = 6;
    const grow = mapRange(progress, 0.2, 0.62, 0, 1);
    const pieces = ["DESK_L", "DESK_M", "DESK_R"];
    const base = { id, x: deskX, y: deskY, t, seed: 2, lights, night, pieces };
    let s;
    let frontLeft = 0; // the left edge of the front row, once the desk knows it
    let printer = null; // Веда's, deferred so the wall is painted behind it

    if (id === "ara") {
      s = desk(ctx, img, { ...base, personX: 10, props: [["DESK_PHONE", 4, 10], ["LAPTOP", 50, 0]] });
      // Light, not object: see deskLamp. The chapter desk is 82 art px and
      // already carries a phone and a laptop, so the lamp had nowhere on the
      // surface to stand and was drawn above it — reading as a brass shape
      // hanging in the gap between the desk and the back wall.
      deskLamp(ctx, img, deskX + s.deskW - 32, deskY - 36, night, lights, false);
      actAra(ctx, img, { ...s, x: deskX + 28, y: deskY }, t, lights, null);
    } else if (id === "veda") {
      s = desk(ctx, img, { ...base, personX: 8, props: [["PAPER_STACK", 0, 6], ["DUAL", 18, -4]] });
      // Her printer stands beside the desk at the desk's own depth. Against
      // the back wall it would be under the page's report card. It is drawn
      // after the wall piece, below, so the wall cannot paint over it.
      const px = deskX + s.deskW + 8;
      const py = frontY - SPRITES.PRINTER_STAND.h + 4 - 22;
      printer = { x: px, y: py };
      frontLeft = px + SPRITES.PRINTER_STAND.w + 8;
      actVeda(ctx, img, { ...s, x: deskX + 8, y: deskY, printerX: px + 10, printerY: py }, t, lights, grow);
    } else if (id === "eho") {
      s = desk(ctx, img, { ...base, personX: 10, props: [["DESK_PHONE", 4, 10], ["MONITOR_KB", 48, 0]] });
      deskLamp(ctx, img, deskX + s.deskW - 32, deskY - 36, night, lights, false);
      actEho(ctx, img, { ...s, x: deskX + 24, y: deskY }, t, lights, null);
    } else {
      s = desk(ctx, img, { ...base, personX: 10, props: [["MUG", 6, 12], ["LAPTOP", 50, 0]] });
      lights.push(() => stripFrame(ctx, img, "COFFEE_STEAM", Math.floor(t * 5) % 6, deskX + 2, deskY - 26));
      actNova(ctx, img, { ...s, x: deskX + 38, y: deskY }, t, lights);
    }

    const kit = CHAPTER_KIT[id];

    // ---- the back wall left of the panel, where height is unconstrained
    const gapX = deskX + s.deskW + 2;
    const gap = panelX - gapX;
    if (kit.left) {
      const [lid, mode] = kit.left;
      const lw = SPRITES[lid].w;
      if (gap >= lw) {
        if (mode === "stand") stand(ctx, img, lid, gapX, floorY);
        else sprite(ctx, img, lid, gapX, floorY - SPRITES[lid].h - 6);
      }
    }

    // Nothing goes on the wall to the right of the desk. Measured across the
    // four chapters at every width from 320 to 1920, the page's message panel
    // ends between 0.47 and 0.89 of the frame's height, so that whole band is
    // behind it — a cork board or a plant placed there is never once seen.
    // The room's character is carried by the piece beside the desk, which the
    // panel never reaches, and by the front row, which sits below it.

    // Веда's printer, now that the wall behind it is painted
    if (printer) {
      stand(ctx, img, "PRINTER_STAND", printer.x, frontY);
      sprite(ctx, img, "PRINTER", printer.x + 10, printer.y);
    }

    // ---- the front of the room, at the depth the desk stands at
    // The floor would otherwise be a bare expanse, and this row is low in
    // the frame, so it carries the tall pieces the back wall cannot.
    let fx = W - 6;
    const frontStop = Math.max(deskX + s.deskW + 2, frontLeft);
    for (const tall of kit.front) {
      const w = SPRITES[tall].w;
      // `continue`, not `break`: one wide piece that will not fit used to end
      // the row, which left the narrowest frames with two things in the room
      if (fx - w < frontStop) continue;
      fx -= w;
      stand(ctx, img, tall, fx, frontY);
      fx -= 8;
    }
    // and the bin by the desk, so the near floor is not a bare expanse
    const binX = Math.max(deskX + s.deskW + 14, frontLeft);
    if (binX + SPRITES.BIN.w < fx - 6) stand(ctx, img, "BIN", binX, frontY);

    grade(ctx, W, H, hour, [glass]);
    sunPatch(ctx, glass, floorY, H, hour);
    for (const draw of lights) draw();
  };
}

// ------------------------------------------------------------ a working day
// Scroll progress maps to an hour; the light and the cast are pure functions
// of that hour. Kept for the landing scene, which runs the room from night
// to day and back behind the phone.
// The hour holds while a group of notifications is being read and moves in
// the gap between groups. It is keyed to PHONE_FEED in App.jsx: change one
// and the room and the phone stop agreeing about what time it is.
const DAY_KEYS = [
  [0.0, 2.23], [0.05, 2.25], [0.27, 2.3], [0.31, 8.6],
  [0.52, 9.1], [0.56, 17.9], [0.74, 18.2], [0.76, 19.5],
  [0.91, 20.5], [1.0, 21.0],
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
  { id: "ara", time: "02:14", from: 0.06, to: 0.26 },
  { id: "veda", time: "09:00", from: 0.32, to: 0.51 },
  { id: "eho", time: "18:05", from: 0.57, to: 0.73 },
];

// which desk the room keeps lit, following the same group boundaries
const focusDeskAt = (p) => (p < 0.29 ? 0 : p < 0.54 ? 1 : p < 0.75 ? 2 : 3);

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
    chartGrow: mapRange(p, 0.32, 0.50, 0, 1),
    focus: p < 0.91 ? focusDeskAt(p) : null,
    focusAmount: focusAmountAt(p),
    // the phone stops ringing as the "answered" card lands, not after it
    ring: p >= 0.56 && p < 0.60 ? true : p >= 0.60 && p < 0.74 ? false : null,
    araPhase: p > 0.06 && p < 0.21 ? 1.8 : null,
  });
}
