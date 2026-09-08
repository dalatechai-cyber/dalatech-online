// The office floor plan, in tiles. Everything the engine places comes from
// here; sprite ids are looked up through the pack manifest's `roles` table,
// so swapping the art pack does not touch this file.
//
// Grid: 13 columns x 14 rows of 16px tiles (208 x 224 art pixels).
// `offsetY` nudges a sprite down in art pixels; the monitors use it to rest on
// the desk top so the person behind the desk keeps their face.
// Rows 0-2 are the back wall with the window. Rows 3-12 are floor.

export const COLS = 13;
export const ROWS = 14;
export const WALL_ROWS = 3;

// Window on the back wall: two panes with a pillar between them for the clock.
export const WINDOW = [
  { col: 1, cols: 5 },
  { col: 7, cols: 5 },
];

// Furniture placed on the floor grid. `col,row` is the top-left tile of the
// footprint. Order matters only for items that overlap the same tiles.
export const FURNITURE = [
  { role: "clock", col: 6, row: 1, wall: true },
  { role: "plant", col: 0, row: 3 },
  { role: "plant", col: 12, row: 3 },
  // back row: Ара (left), Веда (right)
  { role: "chair", col: 2, row: 3, seat: "ara" },
  { role: "desk", col: 1, row: 4 },
  { role: "pc", col: 2, row: 4, onDesk: true, offsetY: 8, screenOf: "ara" },
  { role: "chair", col: 9, row: 3, seat: "veda" },
  { role: "desk", col: 8, row: 4 },
  { role: "pc", col: 9, row: 4, onDesk: true, offsetY: 8, screenOf: "veda" },
  // front row: Нова (left), Эхо (right)
  { role: "chair", col: 2, row: 7, seat: "nova" },
  { role: "desk", col: 1, row: 8 },
  { role: "pc", col: 2, row: 8, onDesk: true, offsetY: 8, screenOf: "nova" },
  { role: "chair", col: 9, row: 7, seat: "eho" },
  { role: "desk", col: 8, row: 8 },
  { role: "pc", col: 9, row: 8, onDesk: true, offsetY: 8, screenOf: "eho" },
  // shared corner along the bottom
  { role: "largePlant", col: 0, row: 10 },
  { role: "sofa", col: 3, row: 12 },
  { role: "coffeeTable", col: 5, row: 11 },
  { role: "smallTable", col: 8, row: 11 },
  { role: "coffee", col: 8, row: 11, onDesk: true },
  { role: "bin", col: 10, row: 12 },
  { role: "cactus", col: 12, row: 11 },
  { role: "doubleBookshelf", col: 11, row: 11 },
];

// The four workstations. `seat` is where the person sits (facing down at the
// desk below), `zone` is the tap target and zoom frame, `lamp` the desk lamp
// position in art pixels, `screen` the rectangle inside the PC sprite where
// the engine draws what they are working on.
export const DESKS = [
  { id: "ara", seat: { col: 2, row: 3 }, zone: { col: 0, row: 2, cols: 5, rows: 4 }, lamp: { col: 3, row: 4, side: "right" }, live: true, work: "chat" },
  { id: "veda", seat: { col: 9, row: 3 }, zone: { col: 7, row: 2, cols: 5, rows: 4 }, lamp: { col: 8, row: 4, side: "left" }, live: true, work: "chart" },
  { id: "nova", seat: { col: 2, row: 7 }, zone: { col: 0, row: 6, cols: 5, rows: 4 }, lamp: { col: 3, row: 8, side: "right" }, live: false, work: "outreach" },
  { id: "eho", seat: { col: 9, row: 7 }, zone: { col: 7, row: 6, cols: 5, rows: 4 }, lamp: { col: 8, row: 8, side: "left" }, live: false, work: "call" },
];

// Rectangle inside the PC sprite (art pixels) that is the screen.
export const PC_SCREEN = { x: 2, y: 2, w: 12, h: 9 };

// Where people go when they get up. `face` is the direction they turn to
// once they arrive. `wait` is how long they stay, in ms.
export const DESTINATIONS = [
  { id: "coffee", col: 8, row: 10, face: "down", wait: 2600 },
  { id: "sofa", col: 3, row: 11, face: "down", wait: 3200 },
  { id: "shelf", col: 11, row: 10, face: "down", wait: 2200 },
  { id: "visit-ara", col: 4, row: 3, face: "left", wait: 2800, talkTo: "ara" },
  { id: "visit-veda", col: 7, row: 3, face: "right", wait: 2800, talkTo: "veda" },
];

// The frosted "in progress" panel over the front row, in tiles.
export const PROGRESS_PANEL = { col: 0, row: 6, cols: 13, rows: 4.5 };

// Rugs drawn by the engine (no pack dependency), in tiles.
export const RUGS = [
  { col: 5, row: 3, cols: 3, rows: 8, kind: "runner" },
];
