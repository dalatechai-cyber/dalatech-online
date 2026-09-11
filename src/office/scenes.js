// The scenes on the /office page, drawn in art pixels on the stage from
// pixel.js. Every scene is a plain function of (ctx, atlas, view) so the
// stage can redraw it at any size, time and scroll progress.
import {
  sprite, stripFrame, charFrame, sky, windowFrame, room, screenActivity, screenChart,
  lampGlow, nightTint, ringing, mapRange, nightAmount, SPRITES,
} from "./pixel";

// Order on the hero row and the hour each chapter is set at.
export const STAFF = ["ara", "veda", "eho", "nova"];
// Art pixels the four hero desks need side by side (60 per station, 4 margin each side).
export const HERO_MIN_W = 8 + 4 * 60;
export const CHAPTER_HOUR = { ara: 2.25, veda: 8.5, eho: 12.1, nova: 15.5 };

// What each person does and what sits on their desk.
// Four weeks of the sample report, the same bars the page shows in HTML.
const REPORT = [0.5, 0.62, 0.48, 0.9];

const KIT = {
  ara: { anim: "sit", fps: 3 },
  veda: { anim: "sit", fps: 3 },
  eho: { anim: "phone", fps: 8, loop: [4, 9] },
  nova: { anim: "sit", fps: 3 },
};

function frameIndex(kit, t, seed) {
  const f = Math.floor((t + seed * 0.37) * kit.fps);
  if (kit.loop) return kit.loop[0] + (f % (kit.loop[1] - kit.loop[0] + 1));
  return f;
}

// A person seated behind a desk. `pieces` are desk sprites laid left to
// right; props are placed relative to the desk's top-left corner. Drawn in
// the order the eye expects: chair, person, desk, things on the desk.
function station(ctx, img, o) {
  const { id, x, y, t, pieces, props, seed = 0, chartGrow = 0 } = o;
  const kit = KIT[id];
  const deskW = pieces.reduce((w, p) => w + SPRITES[p].w, 0);
  const cx = x + (o.personX ?? Math.floor((deskW - 32) / 2));
  // head and shoulders clear the desk; the desk hides the rest
  const cy = y - 44;
  sprite(ctx, img, "CHAIR", cx, cy + 20);
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
      screenActivity(ctx, pid, x + dx, y + dy, t, seed + 5);
      // the report on Веда's first screen grows bar by bar
      if (id === "veda") screenChart(ctx, pid, 0, x + dx, y + dy, REPORT, chartGrow);
    }
    if (pid === "DESK_PHONE" && id === "eho" && (t + seed) % 5 < 1.6) ringing(ctx, x + dx + 20, y + dy + 6, t);
  }
  // what floats over their head: Ара's typing dots, Нова's heart
  const cycle = (t + seed * 1.7) % (id === "ara" ? 4 : 6);
  // frames 0-3 grow the bubble; the strips' last frame is LimeZu's sample, not used
  if (id === "ara" && cycle < 1.6) stripFrame(ctx, img, "BUBBLE", Math.min(3, Math.floor(cycle * 8)), cx + 18, cy - 4);
  if (id === "nova" && cycle < 1.8) stripFrame(ctx, img, "HEART", Math.min(3, Math.floor(cycle * 7)), cx + 18, cy - 4);
  return { cx, cy, deskW };
}

// ---------------------------------------------------------------- hero
// Four desks under one long window. `progress` is the scroll through the
// pinned hero and drives the hour of the day; the people never stop.
export function drawHero(ctx, img, { W, H, t, progress }) {
  const hour = mapRange(progress, 0, 1, 0, 24);
  const night = nightAmount(hour);
  room(ctx, img, W, H, 64);
  const win = { x: 8, y: 6, w: W - 16, h: 30 };
  sky(ctx, win.x, win.y, win.w, win.h, hour, 3);
  windowFrame(ctx, win.x, win.y, win.w, win.h);

  const content = HERO_MIN_W;
  const ox = Math.floor((W - content) / 2);
  const deskY = 72;
  if (ox >= 34) {
    sprite(ctx, img, "PLANT", ox - 30, 46);
    sprite(ctx, img, "PLANT_3", W - ox + 4, 50);
  }
  const lampOn = night > 0.35;
  STAFF.forEach((id, i) => {
    const x = ox + 4 + i * 60;
    const props = {
      ara: [["DESK_PHONE", 0, 6], ["LAPTOP", 24, 0]],
      veda: [["MONITOR", 18, 2], ["PAPER_STACK", -2, 6]],
      eho: [["MONITOR_KB", 20, 2], ["DESK_PHONE", -2, 8]],
      nova: [["LAPTOP", 24, 0], ["MUG", 6, 12]],
    }[id];
    station(ctx, img, {
      id, x, y: deskY, t, hour, seed: i, props,
      pieces: ["DESK_L", "DESK_R"],
      chartGrow: mapRange(hour, 6.5, 9.5, 0, 1),
    });
  });
  // lamps at both ends of the row, lit when it is dark
  const lampL = { x: ox - 8, y: deskY - 2 };
  const lampR = { x: ox + content - 22, y: deskY - 2 };
  nightTint(ctx, W, H, night, win);
  for (const l of [lampL, lampR]) {
    if (lampOn) lampGlow(ctx, l.x + 14, l.y + 10, night);
    sprite(ctx, img, lampOn ? "LAMP" : "LAMP_OFF", l.x, l.y);
  }
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
    const win = { x: 10, y: 8, w: 62, h: 30 };
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
    const st = station(ctx, img, { id, x, y: deskY, t, hour, seed: 2, chartGrow: grow, ...layout });
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
    nightTint(ctx, W, H, night, win);
    // Ара's lamp on the cabinet beside her, the only warm light at night
    if (id === "ara") {
      if (lampOn) lampGlow(ctx, right + 22, deskY - 20, night);
      sprite(ctx, img, lampOn ? "LAMP" : "LAMP_OFF", right + 7, deskY - 36);
    }
  };
}
