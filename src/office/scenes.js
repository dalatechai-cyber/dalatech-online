// The scenes on the /office page, drawn in art pixels on the stage from
// pixel.js. Every scene is a plain function of (ctx, atlas, view) so the
// stage can redraw it at any size, time and scroll progress.
import {
  sprite, stripFrame, charFrame, sky, windowFrame, room, screenActivity, screenChart,
  lampGlow, grade, sunPatch, screenLight, ringing, mapRange, nightAmount, rect, focusDim, SPRITES,
} from "./pixel";

// Order on the hero row and the hour each chapter is set at.
export const STAFF = ["ara", "veda", "eho", "nova"];
// Art pixels the four hero desks need side by side (60 per station, 4 margin each side).
export const HERO_MIN_W = 8 + 4 * 60;
// Ара deep in the night, Веда at first light, Эхо in the golden hour, Нова
// in the blue hour: four moods that all sit inside the dark page.
export const CHAPTER_HOUR = { ara: 2.25, veda: 6.75, eho: 18.4, nova: 19.6 };
// The hero is set in the evening: lamps lit, screens glowing, the four
// still at work. The people animate; the hour does not move.
export const HERO_HOUR = 21;

// Four weeks of the sample report, the same bars the page shows in HTML.
const REPORT = [0.5, 0.62, 0.48, 0.9];

// Ара types (idle breathing behind the laptop), Веда reads the report, Эхо
// has the phone at his ear, Нова has hers in her hand.
const KIT = {
  ara: { anim: "idle", fps: 4 },
  veda: { anim: "read", fps: 5 },
  eho: { anim: "phone", fps: 8, loop: [4, 9] },
  nova: { anim: "phone", fps: 2, loop: [2, 3] },
};

function frameIndex(kit, t, seed) {
  const f = Math.floor((t + seed * 0.37) * kit.fps);
  if (kit.loop) return kit.loop[0] + (f % (kit.loop[1] - kit.loop[0] + 1));
  return f;
}

// A person seated behind a desk. `pieces` are desk sprites laid left to
// right; props are placed relative to the desk's top-left corner. Drawn in
// the order the eye expects: chair, person, desk, things on the desk.
// Anything that gives off light (screens, the emote over their head) is
// pushed to `lights` and drawn by the scene after the room is graded, so
// it stays bright at night.
function station(ctx, img, o) {
  const { id, x, y, t, pieces, props, lights, seed = 0, chartGrow = 0, night = 0 } = o;
  // An empty chair beside a dark monitor is the whole point of the 02:14
  // frame, and it costs one boolean: keep the desk and its props, drop the
  // person, the emote and everything that would light the screen.
  const occupied = o.occupied !== false;
  const kit = KIT[id];
  const deskW = pieces.reduce((w, p) => w + SPRITES[p].w, 0);
  const cx = x + (o.personX ?? Math.floor((deskW - 32) / 2));
  // head and shoulders clear the desk; the desk hides the rest
  const cy = y - 58;
  sprite(ctx, img, "CHAIR", cx, cy + 26);
  if (occupied) charFrame(ctx, img, id, kit.anim, frameIndex(kit, t, seed), cx, cy);
  let px = x;
  for (const p of pieces) {
    sprite(ctx, img, p, px, y);
    px += SPRITES[p].w;
  }
  for (const p of props) {
    const [pid, dx, dy] = p;
    sprite(ctx, img, pid, x + dx, y + dy);
    if (SPRITES[pid].screens && occupied) {
      lights.push(() => {
        screenLight(ctx, pid, x + dx, y + dy, night);
        screenActivity(ctx, pid, x + dx, y + dy, t, seed + 5);
        // the report on Веда's first screen grows bar by bar
        if (id === "veda") screenChart(ctx, pid, 0, x + dx, y + dy, REPORT, chartGrow);
      });
    }
    const ringOn = o.ring ?? ((t + seed) % 5 < 1.6);
    if (pid === "DESK_PHONE" && id === "eho" && ringOn) lights.push(() => ringing(ctx, x + dx + 20, y + dy + 6, t));
  }
  // what floats over their head: Ара's typing dots, Нова's heart
  const cycle = (t + seed * 1.7) % (id === "ara" ? 4 : 6);
  const bubbleOn = o.bubble ?? (cycle < 1.6);
  // frames 0-3 grow the bubble; the strips' last frame is LimeZu's sample, not used
  if (id === "ara" && occupied && bubbleOn) {
    lights.push(() => {
      // when the scene forces the bubble it stays grown, but the dots still
      // run off t so it reads as typing rather than as a frozen sprite
      const frame = o.bubble ? 3 : Math.min(3, Math.floor(cycle * 8));
      stripFrame(ctx, img, "BUBBLE", frame, cx + 18, cy - 4);
      // LimeZu leaves the grown bubble empty for you to fill: three typing dots, one lifted at a time
      if (frame === 3) {
        const lifted = Math.floor(t * 6) % 3;
        for (let d = 0; d < 3; d++) rect(ctx, cx + 18 + 10 + d * 5, cy - 4 + 18 - (d === lifted ? 1 : 0), 2, 2, "#3A3A50");
      }
    });
  }
  if (id === "nova" && occupied && cycle < 1.8) lights.push(() => stripFrame(ctx, img, "HEART", Math.min(3, Math.floor(cycle * 7)), cx + 18, cy - 4));
  return { cx, cy, deskW };
}

// ------------------------------------------------------------------- room
// Four desks along one wall of glass. Everything that varies between the
// hero and the pinned day scene is an option; the geometry is not, so both
// draw the same room at the same art scale and a cut between them is
// invisible.
function officeRoom(ctx, img, { W, H, t }, {
  hour,
  cast = STAFF,          // who is at a desk; the rest get an empty chair and a dark monitor
  chartGrow = 0,
  focus = null,          // desk index 0..3 to keep lit
  focusAmount = 0,
  ring = null,           // null leaves station() on its own time-based gate
  bubble = null,
}) {
  const night = nightAmount(hour);
  const floorY = 52;
  room(ctx, img, W, H, floorY);

  const content = HERO_MIN_W;
  const ox = Math.floor((W - content) / 2);
  const deskY = 80;
  // On a phone the room is only as wide as the desks and each desk gets a
  // window. On a wider stage the back wall is one run of glass, with a
  // mullion on each desk boundary so the panes still line up with the team.
  const wide = ox >= 34;
  const panes = STAFF.map((id, i) => ({ x: ox + 4 + i * 60 - 1, y: 3, w: 52, h: 30 }));
  let holes = panes;
  if (wide) {
    const glass = { x: 8, y: 3, w: W - 16, h: 30 };
    const posts = [];
    for (let i = 0; i <= STAFF.length; i++) posts.push(ox + 4 + i * 60 - 6);
    sky(ctx, glass.x, glass.y, glass.w, glass.h, hour, 3);
    windowFrame(ctx, glass.x, glass.y, glass.w, glass.h, posts);
    holes = [glass];
    sprite(ctx, img, "PLANT", ox - 30, floorY - 14);
    sprite(ctx, img, "PLANT_3", W - ox + 4, floorY - 10);
  } else {
    panes.forEach((w, i) => {
      sky(ctx, w.x, w.y, w.w, w.h, hour, 3 + i);
      windowFrame(ctx, w.x, w.y, w.w, w.h);
    });
  }
  const lights = [];
  STAFF.forEach((id, i) => {
    const x = ox + 4 + i * 60;
    const props = {
      ara: [["DESK_PHONE", 0, 6], ["LAPTOP", 24, 0]],
      veda: [["MONITOR", 20, 2], ["PAPER_STACK", -2, 6], ["PAPERS", 4, 22]],
      eho: [["MONITOR_KB", 20, 2], ["DESK_PHONE", -2, 8]],
      nova: [["LAPTOP", 22, 2], ["MUG", 4, 12]],
    }[id];
    station(ctx, img, {
      id, x, y: deskY, t, seed: i, props, lights, night,
      pieces: ["DESK_L", "DESK_R"],
      chartGrow,
      occupied: cast.includes(id),
      ring: id === "eho" ? ring : null,
      bubble: id === "ara" ? bubble : null,
    });
  });
  // lamps at both ends of the row, lit once the light goes
  const lampOn = night > 0.35;
  const lamps = [{ x: ox - 8, y: deskY - 2 }, { x: ox + content - 22, y: deskY - 2 }];
  for (const l of lamps) sprite(ctx, img, lampOn ? "LAMP" : "LAMP_OFF", l.x, l.y);

  grade(ctx, W, H, hour, holes);
  for (const w of panes) sunPatch(ctx, w, floorY, H, hour);
  for (const draw of lights) draw();
  if (lampOn) for (const l of lamps) lampGlow(ctx, l.x + 14, l.y + 10, night);

  // last, so the focused desk keeps its screen and lamp glow
  if (focus !== null && focusAmount > 0) {
    const x0 = ox + 4 + focus * 60 - 6;
    focusDim(ctx, W, H, x0, x0 + 62, focusAmount);
  }
}

// ---------------------------------------------------------------- hero
// The hero is set in the evening: lamps lit, screens glowing, the four still
// at work. The people animate; the hour does not move.
export function drawHero(ctx, img, v) {
  officeRoom(ctx, img, v, {
    hour: HERO_HOUR,
    chartGrow: mapRange(HERO_HOUR, 6.5, 9.5, 0, 1),
  });
}

// ---------------------------------------------------------------- chapters
// One person, close up, at the hour their chapter is set. The right side of
// the wall stays plain: the page floats the real messages over it.
export function drawChapter(id) {
  const hour = CHAPTER_HOUR[id];
  const night = nightAmount(hour);
  return (ctx, img, { W, H, t, progress }) => {
    // the floor takes the bottom 56 rows whatever the height; on phones the
    // stage is taller so the messages fit beside the person
    const floorY = H - 56;
    room(ctx, img, W, H, floorY);
    // a window that reads as one: about two fifths of the stage, as tall as
    // the wall allows, on the left so the messages keep the right half
    const win = { x: 8, y: 6, w: Math.max(70, Math.min(100, Math.floor(W * 0.42))), h: Math.min(56, floorY - 24) };
    sky(ctx, win.x, win.y, win.w, win.h, hour, STAFF.indexOf(id) + 11);
    windowFrame(ctx, win.x, win.y, win.w, win.h);
    const deskY = floorY + 6;
    const layout = {
      ara: { pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 12, props: [["DESK_PHONE", 2, 8], ["LAPTOP", 50, 0], ["MUG", 32, 18]] },
      veda: { pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 10, props: [["MONITOR", 48, 2], ["PAPER_STACK", 2, 6], ["KEYBOARD", 18, 22]] },
      eho: { pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 10, props: [["MONITOR_KB", 48, 2], ["DESK_PHONE", 4, 8]] },
      nova: { pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 12, props: [["LAPTOP", 50, 0], ["MUG", 6, 10], ["PAPERS", 28, 18]] },
    }[id];
    const x = 6;
    const grow = mapRange(progress, 0.2, 0.62, 0, 1);
    const lights = [];
    const st = station(ctx, img, { id, x, y: deskY, t, seed: 2, chartGrow: grow, lights, night, ...layout });
    // the rest of the room, kept quiet
    const right = x + st.deskW;
    if (id === "veda") {
      sprite(ctx, img, "PRINTER", right + 4, deskY + 2);
      // the printer wakes up as the report finishes
      if (grow > 0.85 && (t % 1) < 0.5) sprite(ctx, img, "PAPERS", right + 8, deskY + 36);
    } else if (id === "ara") {
      sprite(ctx, img, "CABINET", right + 6, deskY - 2);
    } else {
      sprite(ctx, img, "PLANT", right + 8, deskY - 16);
    }
    const lampOn = night > 0.35;
    // Ара's lamp on the cabinet beside her, the only warm light at night
    if (id === "ara") sprite(ctx, img, lampOn ? "LAMP" : "LAMP_OFF", right + 7, deskY - 36);

    grade(ctx, W, H, hour, [win]);
    sunPatch(ctx, win, floorY, H, hour);
    for (const draw of lights) draw();
    if (id === "ara" && lampOn) lampGlow(ctx, right + 22, deskY - 20, night);
  };
}

// ------------------------------------------------------------ a working day
// The pinned scene on the landing page. Scroll progress maps to an hour, and
// both the light and who is at a desk are pure functions of that hour — so
// the room at p = 0.35 is genuinely at 05:40, a state nobody drew and nobody
// will ever screenshot. The holds sit where the page has something to say.
const DAY_KEYS = [
  [0.0, 2.23], [0.06, 2.25], [0.28, 2.3], [0.42, 8.6],
  [0.6, 9.1], [0.74, 17.9], [0.9, 18.2], [1.0, 21.0],
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
const ARRIVE = { ara: -1, veda: 8.0, eho: 17.0, nova: 20.0 };

// The single source of truth for the three moments; the page reads this table
// rather than repeating the numbers in JSX.
export const DAY_MOMENTS = [
  { id: "ara", time: "02:14", from: 0.06, to: 0.28 },
  { id: "veda", time: "09:00", from: 0.42, to: 0.6 },
  { id: "eho", time: "18:05", from: 0.74, to: 0.9 },
];

const focusDeskAt = (p) => (p < 0.35 ? 0 : p < 0.67 ? 1 : 2);

// Fades the surrounding room down over the first 0.03 of a hold and back up
// over the last 0.03; zero while travelling between them.
export function focusAmountAt(p) {
  for (const m of DAY_MOMENTS) {
    if (p < m.from || p > m.to) continue;
    return Math.min(1, Math.min((p - m.from) / 0.03, (m.to - p) / 0.03));
  }
  return 0;
}

// Module-level so its identity is stable: PixelStage keys an effect on `draw`,
// and a new function each render would tear the stage down and rebuild it.
export function drawWorkingDay(ctx, img, view) {
  const p = view.progress ?? 0;
  const hour = dayHour(p);
  officeRoom(ctx, img, view, {
    hour,
    cast: STAFF.filter((id) => hour >= ARRIVE[id]),
    chartGrow: mapRange(p, 0.44, 0.56, 0, 1),
    focus: p < 0.9 ? focusDeskAt(p) : null,
    focusAmount: focusAmountAt(p),
    ring: p >= 0.74 && p < 0.79,
    bubble: p > 0.07 && p < 0.2 ? 1 : null,
  });
}
