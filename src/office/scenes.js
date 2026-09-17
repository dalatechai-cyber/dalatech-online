// The scenes on the /office page and the landing page, drawn in art pixels on
// the stage from pixel.js. Every scene is a plain function of (ctx, atlas,
// view) so the stage can redraw it at any size, time and scroll progress.
//
// The room is one office, seen from the front: four desks along a wall of
// glass, each set up for the job its person does. What makes the four read
// as four is not the pose — the character generator has no front-facing
// seated pose, so everyone behind a desk shares the idle frames — but what
// each one is visibly doing: Дали answering a message that just arrived, Вира
// holding the report her screens are building, Эхо on a call, Нова sending.
import {
  sprite, stripFrame, charFrame, sky, windowFrame, room, screenSpill,
  lampGlow, grade, sunPatch, ringing, mapRange, nightAmount, rect, focusDim, noise, SPRITES,
} from "./pixel";

// Order on the hero row and the hour each chapter is set at.
export const STAFF = ["dali", "vira", "eho", "nova"];
// Дали deep in the night, Вира at first light, Эхо in the golden hour, Нова
// in the blue hour: four moods that all sit inside the dark page.
export const CHAPTER_HOUR = { dali: 2.25, vira: 6.75, eho: 18.4, nova: 19.6 };
// The hero is set in the evening: lamps lit, screens glowing, the four still
// at work. The people animate; the hour does not move.
export const HERO_HOUR = 21;

// Station widths in art pixels. Вира's is wider: two screens and a printer.
const STATION_W = { dali: 66, vira: 92, eho: 66, nova: 68 };
const ROW_W = STAFF.reduce((w, id) => w + STATION_W[id], 0);
// Art pixels the four desks need side by side, with a margin each end.
export const HERO_MIN_W = 8 + ROW_W;

// Where the floor starts and where the desks stand, for any stage height.
// Heads sit against the wall band under the windows, not over the glass.
const FLOOR_Y = 58;
const DESK_Y = 82;

const KIT = {
  dali: { anim: "idle", fps: 4 },
  vira: { anim: "read", fps: 5 },
  eho: { anim: "phone", fps: 8, loop: [4, 9] },
  nova: { anim: "idle", fps: 3 },
  // Ора is never in the shared room — STAFF does not list her — but desk()
  // falls back to this table when a scene hands in no kit of its own, and a
  // missing entry there would be a crash rather than a wrong pose.
  ora: { anim: "read", fps: 5 },
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
// Anything that gives off light (the lamp, the glow off a screen) is pushed
// to `lights` by the caller and drawn after the room is graded, so it stays
// bright at night. Everything solid is drawn here, before the grade, so it
// takes the room's light like the rest of the furniture.
function desk(ctx, img, o) {
  const { id, x, y, t, pieces, props, seed = 0 } = o;
  const occupied = o.occupied !== false;
  // A scene may hand in its own kit: Ора's room switches hers between reading
  // and her screen as the loop runs, which the fixed per-person kit cannot do.
  const kit = o.kit ?? KIT[id];
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
  // Where each prop landed, so the jobs below can light the right monitor and
  // ring the right phone instead of recomputing offsets the props list owns.
  // Those two copies drifted apart every time a desk was rearranged.
  const placed = {};
  for (const [pid, dx, dy] of props) {
    sprite(ctx, img, pid, x + dx, y + dy);
    placed[pid] = { x: x + dx, y: y + dy, w: SPRITES[pid].w, h: SPRITES[pid].h };
  }
  return { cx, cy, deskW, placed };
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

// Нова's coffee. The strip is a cup with its steam, not steam alone, so the
// desk must not also carry a MUG under it — that drew her two cups, one
// inside the other. The cup stands at rows 38..52 of a 64px cell, which is
// what the offset below puts on the desk's surface rather than the box.
//
// It is drawn here, with the furniture, and not pushed onto `lights`: that
// list runs after the grade, so the one object on the desk that took it read
// as bright white in a room every other object had been darkened into.
function coffee(ctx, img, x, deskY, t) {
  stripFrame(ctx, img, "COFFEE_STEAM", Math.floor(t * 5) % 6, x, deskY - 20);
}

// ------------------------------------------------------- what each one does
// Each job is a small loop on `t`, seeded so the four never fire together.
// The phases are named so the chapters can pin one (see drawChapter).

// Every screen in the building now has its back to the room, because a
// monitor someone is actually working at faces them and not us. That takes
// away the surface these four jobs used to be drawn on: the exchange on
// Дали's laptop, Вира's chart, Эхо's waveform, Нова's thread. None of it is
// lost to the page — each is on the card floated beside the room, at a size
// that can be read — so what is left here is the part a screen really shows
// across a room, which is its light, and the parts that were never on it:
// a phone that rings, a page that comes out of a printer.
//
// Each job keeps its own rhythm in that light, so the four rooms still differ
// with the sound off.

// The glow of whichever screen a desk has. Guarded because these closures run
// inside the draw: reaching through a missing prop would throw on every frame
// and leave the canvas blank. A desk that lost its monitor should lose its
// glow, not its room.
function spill(ctx, lights, s, night, amount) {
  const m = s.placed.MONITOR_BACK;
  if (!m) return;
  lights.push(() => screenSpill(ctx, m.x, m.y, m.w, m.h, night, amount));
}

// Дали: a message lands and she answers it. Two lifts to a cycle, the second
// the brighter, because the reply is the half with the work in it.
function actDali(ctx, img, s, t, lights, night, force) {
  const cycle = force ?? ((t + 1.3) % 5.2);
  const at = (c, w) => Math.max(0, 1 - Math.abs(cycle - c) / w);
  spill(ctx, lights, s, night, 0.4 + 0.3 * at(1.1, 0.9) + 0.6 * at(3.1, 1.1));
}

// Вира: the report. The light builds with it and flares as the page prints,
// which is also when the printer beside her puts one out.
function actVira(ctx, img, s, t, lights, night, chartGrow) {
  const grow = chartGrow ?? ((t % 7) / 5.2);
  const g = Math.min(1, grow);
  spill(ctx, lights, s, night, 0.35 + 0.45 * g + (g > 0.9 ? 0.35 : 0));
  if (grow > 0.9 && grow < 1.3) sprite(ctx, img, "PAPERS", s.printerX + 3, s.printerY + 30);
}

// Эхо: the phone rings, he answers, and the light moves the way a voice does
// for as long as the call runs. The ringing is still the sound around the
// phone itself, which was never on the screen.
function actEho(ctx, img, s, t, lights, night, ringForce) {
  const phone = s.placed.DESK_PHONE;
  const cycle = (t + 2.1) % 6.5;
  const ring = ringForce ?? (cycle < 1.5);
  if (ring && phone) lights.push(() => ringing(ctx, phone.x + phone.w, phone.y + 6, t));
  spill(ctx, lights, s, night, ring ? 0.35 : 0.55 + 0.35 * noise(Math.floor(t * 9)));
}

// Нова: reaching out. One lift per message, three to a round.
function actNova(ctx, img, s, t, lights, night) {
  const step = (t / 1.2) % 1;
  spill(ctx, lights, s, night, 0.45 + 0.45 * Math.max(0, 1 - step * 2.2));
}

// ----------------------------------------------------------------- the room
// The whole office. Everything that varies between the hero, the chapters
// and the landing scene is an option; the geometry is not.
function officeRoom(ctx, img, { W, H, t }, {
  hour,
  cast = STAFF,          // who is at a desk; the rest get an empty chair and a dark screen
  chartGrow,             // Вира's chart, when the scene drives it; else her own loop
  focus = null,          // desk index 0..3 to keep lit
  focusAmount = 0,
  ring = null,
  daliPhase = null,
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
    if (id === "dali") {
      s = desk(ctx, img, { ...base, props: [["MONITOR_BACK", 18, 0]] });
      // on the desk, not above it: the pool used to sit 14px clear of the
      // surface, which put the light on the wall behind the work
      deskLamp(ctx, img, base.x - 2, deskY, night, lights, false);
      if (occupied) actDali(ctx, img, s, t, lights, night, daliPhase);
    } else if (id === "vira") {
      s = desk(ctx, img, { ...base, pieces: ["DESK_L", "DESK_M", "DESK_R"], personX: 24, props: [["PAPER_STACK", -2, 4], ["MONITOR_BACK", 30, 0]] });
      // the printer on its stand beside her desk, in the gap before Эхо
      const printerX = base.x + s.deskW - 6, printerY = deskY + 6;
      sprite(ctx, img, "PRINTER", printerX, printerY);
      if (occupied) actVira(ctx, img, { ...s, printerX, printerY }, t, lights, night, chartGrow);
    } else if (id === "eho") {
      s = desk(ctx, img, { ...base, props: [["DESK_PHONE", -2, 8], ["MONITOR_BACK", 18, 0]] });
      if (occupied) actEho(ctx, img, s, t, lights, night, ring);
    } else {
      s = desk(ctx, img, { ...base, props: [["MONITOR_BACK", 18, 0]] });
      coffee(ctx, img, base.x - 6, deskY, t);
      if (occupied) actNova(ctx, img, s, t, lights, night);
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
  // reception: the folders whoever walks in gets handed, and a seat to wait in
  dali: { left: ["SHELF_FILES", "stand"], front: ["CHAIR_ORANGE", "PLANT", "PLANT_3"] },
  // the analyst: what she prints and what she shreds, either side of the desk.
  // Her printer stands at the front of this same gap and covers the lowest
  // twelve pixels of whatever is on the wall behind it, so hers has to be a
  // piece that still reads with its foot hidden. Every room's is, now.
  vira: { left: ["SHREDDER", "stand"], front: ["CABINET", "PLANT_3", "PLANT"] },
  // the phone desk: the corner people actually stand in between calls, and the
  // copier behind it. This was a board on a stand, which the pack draws as a
  // face, a rail and two legs all within a hair of one lightness — recoloured
  // for this room it came out a flat navy panel with no frame and no plinth.
  eho: { left: ["COPIER", "stand"], front: ["COFFEE", "COOLER", "PLANT", "PLANT_3"] },
  // customer manager: a seat for whoever comes back, and something growing
  nova: { left: ["CABINET", "stand"], front: ["PLANT", "CHAIR_ORANGE", "PLANT_3", "COOLER"] },
};

// All four rooms show their wall piece or none of them do. The four pieces
// differ by a few pixels of width, and testing each against its own width
// made them cross the threshold one at a time as the window widened: on a
// 1024px viewport Нова's 34px cabinet stood beside her desk while the other
// three rooms, whose pieces were wider, had bare wall. One threshold — the
// widest of the four — so the rooms always agree with each other. The filter
// matches the guard at the draw site: a kit is allowed to name no wall piece,
// and must not take the whole module down at import if it does.
const WALL_PIECE_W = Math.max(
  ...Object.values(CHAPTER_KIT)
    .filter((k) => k.left)
    .map((k) => SPRITES[k.left[0]].w),
);

// Where a sprite stands on a floor line: its feet sink four pixels into the
// carpet, and it lays a contact shadow before it draws. Without the shadow a
// bin or a plant is a cut-out pasted onto the carpet at a depth nothing else
// in the frame agrees with. Two rows, inset from the sprite's own box so it
// reads as the object's footprint rather than as a bar under it.
function stand(ctx, img, id, x, lineY, lift = 0) {
  const sp = SPRITES[id];
  const base = lineY + 4 - lift;
  const inset = Math.max(2, Math.round(sp.w * 0.16));
  rect(ctx, x + inset, base - 1, sp.w - inset * 2, 2, "rgba(6,9,26,0.32)");
  rect(ctx, x + inset + 2, base + 1, sp.w - inset * 2 - 4, 1, "rgba(6,9,26,0.17)");
  sprite(ctx, img, id, x, lineY - sp.h + 4 - lift);
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
    // Not 6. At 6 the desk's left end sits on the frame's own edge, and with
    // the canvas's rounded corner over it the desk reads as cut off by the
    // picture rather than as standing in the room.
    const deskX = 14;
    const grow = mapRange(progress, 0.2, 0.62, 0, 1);
    const pieces = ["DESK_L", "DESK_M", "DESK_R"];
    const base = { id, x: deskX, y: deskY, t, seed: 2, lights, night, pieces };
    let s;
    let frontLeft = 0; // the left edge of the front row, once the desk knows it
    let printer = null; // Вира's, deferred so the wall is painted behind it

    if (id === "dali") {
      s = desk(ctx, img, { ...base, personX: 44, props: [["DESK_PHONE", 4, 10], ["MONITOR_BACK", 46, 0]] });
      // Light, not object: see deskLamp. The chapter desk is 82 art px and
      // already carries a phone and a monitor, so the lamp has nowhere on the
      // surface to stand. The pool stays; it now falls on the free left end of
      // the desk at the depth a lamp standing there would light, instead of
      // 36px above the surface where it lit the back wall and nothing else.
      deskLamp(ctx, img, deskX + 2, deskY, night, lights, false);
      actDali(ctx, img, s, t, lights, night, null);
    } else if (id === "vira") {
      // The stack sat 2px past the desk's front edge, and her two screens 8px
      // past it — both hanging through the apron rather than standing on the
      // top. The surface ends 34px below the desk's back edge; everything on
      // it lands there now.
      s = desk(ctx, img, { ...base, personX: 44, props: [["PAPER_STACK", 2, 4], ["MONITOR_BACK", 46, 0]] });
      // Her printer stands beside the desk at the desk's own depth. Against
      // the back wall it would be under the page's report card. It is drawn
      // after the wall piece, below, so the wall cannot paint over it.
      const px = deskX + s.deskW + 8;
      const py = frontY - SPRITES.PRINTER_STAND.h + 4 - 22;
      printer = { x: px, y: py };
      frontLeft = px + SPRITES.PRINTER_STAND.w + 8;
      actVira(ctx, img, { ...s, printerX: px + 10, printerY: py }, t, lights, night, grow);
    } else if (id === "eho") {
      s = desk(ctx, img, { ...base, personX: 44, props: [["DESK_PHONE", 4, 10], ["MONITOR_BACK", 46, 0]] });
      deskLamp(ctx, img, deskX + 2, deskY, night, lights, false);
      actEho(ctx, img, s, t, lights, night, null);
    } else {
      s = desk(ctx, img, { ...base, personX: 44, props: [["MONITOR_BACK", 46, 0]] });
      coffee(ctx, img, deskX, deskY, t);
      actNova(ctx, img, s, t, lights, night);
    }

    const kit = CHAPTER_KIT[id];

    // ---- the back wall left of the panel, where height is unconstrained
    // The gap beside the desk is all the room a wall piece has, and it is
    // narrow: 43 art px on a 1024px viewport, 66 once the frame stops
    // growing and the stage is as wide as it will get. The
    // tolerance can reach a little past panelX because the panel's lower edge
    // sits above this piece's lower half — the most that can ever go behind
    // it is a corner a few pixels across.
    const gapX = deskX + s.deskW + 2;
    const gap = panelX + 12 - gapX;
    if (kit.left && gap >= WALL_PIECE_W) {
      const [lid, mode] = kit.left;
      if (mode === "stand") stand(ctx, img, lid, gapX, floorY);
      else sprite(ctx, img, lid, gapX, floorY - SPRITES[lid].h - 6);
    }

    // Nothing goes on the wall to the right of the desk. Measured across the
    // four chapters at every width from 320 to 1920, the page's message panel
    // ends between 0.47 and 0.89 of the frame's height, so that whole band is
    // behind it — a cork board or a plant placed there is never once seen.
    // The room's character is carried by the piece beside the desk, which the
    // panel never reaches, and by the front row, which sits below it.

    // Вира's printer, now that the wall behind it is painted
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

// -------------------------------------------------------------- Ора's room
// The fifth room, and deliberately not the room the other four share. They sit
// along a wall of glass on the customer floor; hers has no glass in it at all.
// That is the product difference drawn rather than claimed: what crosses her
// desk is the owner's, so the room it crosses is a closed one.
//
// Evening, one lamp. Late enough that the building is quiet, not so late that
// the room reads as abandoned.
export const ORA_HOUR = 20.6;

// Her loop in seconds. Long, because the room is quiet by design and a short
// cycle would make the one moving thing in it read as a twitch.
const ORA_LOOP = 16;
// Reading, then turned to her own screen. Both play behind the desk, which
// hides everything below the shoulders, so the switch reads as attention
// moving rather than as a pose change.
const ORA_READ = { anim: "read", fps: 5 };
const ORA_SCREEN = { anim: "idle", fps: 3 };

// A note going up on the cork board: the deadline she is holding for the
// owner. It is the one thing in the room that appears rather than moves, so
// it is what the eye finds on a second look.
function oraNote(ctx, x, y, show) {
  if (show <= 0) return;
  const h = Math.max(1, Math.round(10 * show));
  rect(ctx, x, y, 11, h, "rgba(199,214,247,0.92)");
  rect(ctx, x, y, 11, 1, "rgba(255,255,255,0.5)");
  if (h > 4) rect(ctx, x + 2, y + 3, 7, 1, "rgba(60,74,116,0.75)");
  if (h > 7) rect(ctx, x + 2, y + 6, 5, 1, "rgba(60,74,116,0.6)");
}

export function drawOraRoom() {
  const hour = ORA_HOUR;
  const night = nightAmount(hour);
  return (ctx, img, { W, H, t }) => {
    const floorY = H - Math.round(H * 0.34);
    const deskY = floorY + 8;
    const frontY = deskY + SPRITES.DESK_L.h - 4;
    // Same contract as the four chapters: the page's panel owns the right half
    // of the frame, so nothing that has to be seen is drawn past this line.
    const panelX = Math.round(W * 0.49);
    const phase = (t / ORA_LOOP) % 1;

    room(ctx, img, W, H, floorY);

    const lights = [];
    const deskX = 14;
    const pieces = ["DESK_L", "DESK_M", "DESK_R"];
    // The band of wall above her head. Her head starts at deskY - 58, so
    // anything hung here clears her however the stage is sized.
    const headY = deskY - 58;

    // On the wall: the board she is building tomorrow's presentation on, and
    // the notes she is holding dates on. Together they are the half of her
    // work that is not documents, said without a word of copy.
    const cork = SPRITES.CORK;
    const board = SPRITES.WHITEBOARD_CHART;
    const wallRight = panelX + 10;
    const corkX = 4;
    const boardX = corkX + cork.w + 8;
    const boardY = Math.max(4, headY - board.h - 6);
    const corkY = boardY + 8;
    const wallFits = boardX + board.w <= wallRight && boardY + board.h < headY;
    if (wallFits) {
      sprite(ctx, img, "WHITEBOARD_CHART", boardX, boardY);
      sprite(ctx, img, "CORK", corkX, corkY);
      // two notes already up, and a third that arrives late in the loop: the
      // one thing in the room that appears rather than repeats
      oraNote(ctx, corkX + 5, corkY + 7, 1);
      oraNote(ctx, corkX + 17, corkY + 9, 1);
      oraNote(ctx, corkX + 9, corkY + 20, mapRange(phase, 0.66, 0.74, 0, 1));
    }

    // She reads for most of the loop, then turns to her own screen. Her screen
    // is drawn from behind: she sits facing the camera, so a monitor she is
    // actually looking at has its back to us. The front view the other rooms
    // use sits beside their person, where the orientation does not read; here
    // it sat directly under her chin and pointed the wrong way.
    //
    // She takes the right-hand end of the desk so the lamp has the left end to
    // itself. The four chapters keep the pool of light and drop the lamp
    // sprite; in a room with this much bare wall that left a warm smear with
    // nothing making it, so here the lamp is an object. It stands at dy 0 like
    // every other prop, which is what puts it ON the desk — lifted clear of
    // the surface it read as hanging in the air, and its pool of light fell on
    // the wall instead of the work.
    const kit = phase < 0.58 ? ORA_READ : ORA_SCREEN;
    const s = desk(ctx, img, {
      id: "ora", x: deskX, y: deskY, t, seed: 3, lights, night, pieces, kit,
      personX: 44,
      props: [["MONITOR_BACK", 46, 0]],
    });
    deskLamp(ctx, img, deskX + 2, deskY, night, lights, true);

    // The door, shut. It is the whole argument for her in one sprite, so it
    // takes the gap beside the desk that the four give to a filing cabinet.
    const door = SPRITES.DOOR;
    const gapX = deskX + s.deskW + 6;
    if (gapX + door.w <= wallRight) sprite(ctx, img, "DOOR", gapX, floorY - door.h + 2);

    // The front of the room: what a room that keeps the owner's papers looks
    // like, and something growing, so the near floor is not a bare expanse.
    let fx = W - 6;
    const frontStop = deskX + s.deskW + 2;
    for (const tall of ["PLANT", "SHELF_UNIT", "PLANT_3"]) {
      const w = SPRITES[tall].w;
      if (fx - w < frontStop) continue;
      fx -= w;
      stand(ctx, img, tall, fx, frontY);
      fx -= 8;
    }

    // No window, so no hole in the grade and no patch of sun on the carpet.
    // What lights this room is what is in it.
    grade(ctx, W, H, hour);
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
  [0.0, 2.23], [0.04, 2.25], [0.22, 2.3], [0.25, 8.6],
  [0.42, 9.1], [0.45, 13.4], [0.56, 13.6], [0.59, 17.9],
  [0.74, 18.2], [0.76, 19.5], [0.90, 20.5], [1.0, 21.0],
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
const ARRIVE = { dali: -1, vira: 8.0, eho: 17.0, nova: 19.0 };

export const DAY_MOMENTS = [
  { id: "dali", time: "02:14", from: 0.05, to: 0.21 },
  { id: "vira", time: "09:00", from: 0.26, to: 0.41 },
  { id: "eho", time: "18:05", from: 0.60, to: 0.73 },
];

// Which desk the room keeps lit, following the same group boundaries. The
// gap between Вира's and Эхо's is the afternoon, when the card on the phone is
// Ора's — and she is not in this room. Nothing is lit for her; the room
// simply carries on at full light while the owner's own work gets done.
const focusDeskAt = (p) => (p < 0.235 ? 0 : p < 0.435 ? 1 : p < 0.575 ? null : p < 0.75 ? 2 : 3);

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
    chartGrow: mapRange(p, 0.26, 0.40, 0, 1),
    focus: p < 0.91 ? focusDeskAt(p) : null,
    focusAmount: focusAmountAt(p),
    // the phone stops ringing as the "answered" card lands, not after it
    ring: p >= 0.59 && p < 0.624 ? true : p >= 0.624 && p < 0.74 ? false : null,
    daliPhase: p > 0.05 && p < 0.17 ? 1.8 : null,
  });
}
