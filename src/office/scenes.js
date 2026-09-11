// The scenes on the /office page, drawn in art pixels on the stage from
// pixel.js. Every scene is a plain function of (ctx, atlas, view) so the
// stage can redraw it at any size, time and scroll progress.
import {
  sprite, stripFrame, charFrame, sky, windowFrame, room, screenActivity, screenChart,
  lampGlow, grade, sunPatch, screenLight, ringing, mapRange, nightAmount, rect, SPRITES,
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
  const kit = KIT[id];
  const deskW = pieces.reduce((w, p) => w + SPRITES[p].w, 0);
  const cx = x + (o.personX ?? Math.floor((deskW - 32) / 2));
  // head and shoulders clear the desk; the desk hides the rest
  const cy = y - 58;
  sprite(ctx, img, "CHAIR", cx, cy + 26);
  charFrame(ctx, img, id, kit.anim, frameIndex(kit, t, seed), cx, cy);
  let px = x;
  for (const p of pieces) {
    sprite(ctx, img, p, px, y);
    px += SPRITES[p].w;
  }
  for (const p of props) {
    const [pid, dx, dy] = p;
    sprite(ctx, img, pid, x + dx, y + dy);
    if (SPRITES[pid].screens) {
      lights.push(() => {
        screenLight(ctx, pid, x + dx, y + dy, night);
        screenActivity(ctx, pid, x + dx, y + dy, t, seed + 5);
        // the report on Веда's first screen grows bar by bar
        if (id === "veda") screenChart(ctx, pid, 0, x + dx, y + dy, REPORT, chartGrow);
      });
    }
    if (pid === "DESK_PHONE" && id === "eho" && (t + seed) % 5 < 1.6) lights.push(() => ringing(ctx, x + dx + 20, y + dy + 6, t));
  }
  // what floats over their head: Ара's typing dots, Нова's heart
  const cycle = (t + seed * 1.7) % (id === "ara" ? 4 : 6);
  // frames 0-3 grow the bubble; the strips' last frame is LimeZu's sample, not used
  if (id === "ara" && cycle < 1.6) {
    lights.push(() => {
      const frame = Math.min(3, Math.floor(cycle * 8));
      stripFrame(ctx, img, "BUBBLE", frame, cx + 18, cy - 4);
      // LimeZu leaves the grown bubble empty for you to fill: three typing dots, one lifted at a time
      if (frame === 3) {
        const lifted = Math.floor(t * 6) % 3;
        for (let d = 0; d < 3; d++) rect(ctx, cx + 18 + 10 + d * 5, cy - 4 + 18 - (d === lifted ? 1 : 0), 2, 2, "#3A3A50");
      }
    });
  }
  if (id === "nova" && cycle < 1.8) lights.push(() => stripFrame(ctx, img, "HEART", Math.min(3, Math.floor(cycle * 7)), cx + 18, cy - 4));
  return { cx, cy, deskW };
}

// ---------------------------------------------------------------- hero
// Four desks along one wall of glass.
export function drawHero(ctx, img, { W, H, t }) {
  const hour = HERO_HOUR;
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
      chartGrow: mapRange(hour, 6.5, 9.5, 0, 1),
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
