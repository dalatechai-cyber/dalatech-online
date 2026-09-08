// The office floor plan, in tiles. Everything the engine places comes from
// here; sprite ids are looked up through the pack manifest's `roles` table.
//
// Grid: 12 columns x 13 rows of 32px tiles (384 x 416 art pixels), which is
// exactly a 390px phone at one CSS pixel per art pixel and a desktop stage at
// two. Rows 0-2 are the back wall with the window; the floor starts at row 3.
//
// Placement rules the engine applies:
//   col,row     top-left tile of the footprint; sprites are bottom-aligned to
//               the footprint, so a tall sprite rises into the rows above
//   onDesk      stands on a surface, drawn right after the surface beneath it,
//               nearest-the-viewer last
//   seat        the chair a person sits on (drawn behind the person)
//   wall        hangs on the back wall, no footprint, drawn before everything
//   offsetX/Y   nudge in art pixels (Y is usually negative: raised onto a desk)

export const COLS = 12;
export const ROWS = 13;
export const WALL_ROWS = 3;

// Window on the back wall, in tiles. Two panes with the whiteboard between.
export const WINDOW = [
  { col: 1, cols: 4 },
  { col: 7, cols: 4 },
];

export const FURNITURE = [
  // ---- on the wall (rows 0-2)
  { role: "certificate", col: 0, row: 1, wall: true, offsetY: 8 },
  { role: "whiteboard", col: 5, row: 1, wall: true, offsetY: -2 },
  { role: "poster", col: 11, row: 1, wall: true, offsetY: 4 },

  // ---- standing against the back wall (row 3)
  { role: "cabinet", col: 0, row: 3 },
  { role: "bookcase", col: 5, row: 3, offsetX: -10 },
  { role: "plantSmall2", col: 11, row: 3 },

  // ---- back row, left: Ара. Chair on row 3, desk on row 4 (three pieces).
  { role: "chair", col: 2, row: 3, seat: "ara", offsetY: -6 },
  { role: "deskL", col: 1, row: 4 }, { role: "deskM", col: 2, row: 4 }, { role: "deskR", col: 3, row: 4 },
  { role: "lamp", col: 1, row: 4, onDesk: true, offsetY: -28, lampOf: "ara" },
  { role: "papers", col: 1, row: 4, onDesk: true, offsetY: -2 },
  { role: "monitor", col: 2, row: 4, onDesk: true, screenOf: "ara", offsetY: -24 },
  { role: "keyboard", col: 2, row: 4, onDesk: true, offsetY: -8 },
  { role: "phone", col: 3, row: 4, onDesk: true, offsetY: -30 },
  { role: "paperStack", col: 3, row: 4, onDesk: true, offsetY: -2, offsetX: -2 },

  // ---- back row, right: Веда. A wider desk with two screens.
  { role: "chair", col: 9, row: 3, seat: "veda", offsetY: -6 },
  { role: "deskL", col: 7, row: 4 }, { role: "deskM", col: 8, row: 4 }, { role: "deskM", col: 9, row: 4 }, { role: "deskR", col: 10, row: 4 },
  { role: "lamp", col: 7, row: 4, onDesk: true, offsetY: -28, lampOf: "veda" },
  { role: "fax", col: 7, row: 4, onDesk: true, offsetY: 0, offsetX: 2 },
  { role: "dualMonitor", col: 8, row: 4, onDesk: true, screenOf: "veda", offsetY: -12, offsetX: 8 },
  { role: "papers", col: 10, row: 4, onDesk: true, offsetY: -2, offsetX: -10 },

  // ---- front row: Нова (left), Эхо (right). Chair on row 6, desk on row 7.
  { role: "chair", col: 2, row: 6, seat: "nova", offsetY: -6 },
  { role: "deskL", col: 1, row: 7 }, { role: "deskM", col: 2, row: 7 }, { role: "deskR", col: 3, row: 7 },
  { role: "lampOff", col: 1, row: 7, onDesk: true, offsetY: -28 },
  { role: "laptop", col: 2, row: 7, onDesk: true, screenOf: "nova", offsetY: -20 },
  { role: "phone2", col: 3, row: 7, onDesk: true, offsetY: -24, offsetX: 4 },
  { role: "papers", col: 3, row: 7, onDesk: true, offsetY: -2, offsetX: -2 },
  { role: "plantOffice3", col: 4, row: 7 },

  { role: "chair", col: 9, row: 6, seat: "eho", offsetY: -6 },
  { role: "deskL", col: 7, row: 7 }, { role: "deskM", col: 8, row: 7 }, { role: "deskM", col: 9, row: 7 }, { role: "deskR", col: 10, row: 7 },
  { role: "plantOffice2", col: 6, row: 7 },
  { role: "phone", col: 7, row: 7, onDesk: true, offsetY: -26 },
  { role: "monitor2", col: 9, row: 7, onDesk: true, screenOf: "eho", offsetY: -24, offsetX: -8 },
  { role: "keyboard", col: 9, row: 7, onDesk: true, offsetY: -8, offsetX: -8 },
  { role: "lampOff", col: 10, row: 7, onDesk: true, offsetY: -28, offsetX: -6 },
  { role: "paperPile", col: 8, row: 7, onDesk: true, offsetY: -4, offsetX: -6 },
  { role: "extinguisher", col: 11, row: 7 },

  // ---- the lounge along the bottom (rows 10-12)
  { role: "plantPalm", col: 0, row: 10, offsetX: -6 },
  { role: "tableSmall", col: 1, row: 11, offsetX: -6 },
  { role: "armchair", col: 3, row: 11 },
  { role: "plantTall", col: 0, row: 12, offsetX: -12 },
  { role: "sofa", col: 1, row: 12, offsetX: 4 },
  { role: "coffeeCounter", col: 5, row: 12 },
  { role: "bin", col: 7, row: 12 },
  { role: "waterCooler", col: 8, row: 12 },
  { role: "vending", col: 10, row: 10 },
  { role: "printer", col: 9, row: 12 },
  { role: "plantOffice", col: 11, row: 12 },
];

// The four workstations. `seat` is where the person sits (facing down at the
// desk below), `zone` is the tap target and zoom frame, `tag` is where the
// nameplate hangs (tile units), `light` is the lamp's bulb in art pixels.
export const DESKS = [
  { id: "ara", seat: { col: 2, row: 3 }, zone: { col: 0, row: 2, cols: 5, rows: 3.5 }, tag: { col: 2.5, row: 5 }, light: { x: 52, y: 106 }, live: true, work: "chat" },
  { id: "veda", seat: { col: 9, row: 3 }, zone: { col: 6, row: 2, cols: 6, rows: 3.5 }, tag: { col: 9, row: 5 }, light: { x: 248, y: 106 }, live: true, work: "chart" },
  { id: "nova", seat: { col: 2, row: 6 }, zone: { col: 0, row: 5, cols: 5, rows: 3.5 }, tag: { col: 2.5, row: 8 }, light: { x: 52, y: 202 }, live: false, work: "outreach" },
  { id: "eho", seat: { col: 9, row: 6 }, zone: { col: 6, row: 5, cols: 6, rows: 3.5 }, tag: { col: 9, row: 8 }, light: { x: 340, y: 202 }, live: false, work: "call" },
];

// Where people go when they get up. `face` is the direction they turn to
// once they arrive. `wait` is how long they stay, in ms.
export const DESTINATIONS = [
  { id: "coffee", col: 5, row: 11, face: "down", wait: 3200 },
  { id: "water", col: 8, row: 11, face: "down", wait: 2600 },
  { id: "printer", col: 9, row: 11, face: "down", wait: 2400 },
  { id: "visit-ara", col: 3, row: 3, face: "left", wait: 2800, talkTo: "ara" },
  { id: "visit-veda", col: 8, row: 3, face: "right", wait: 2800, talkTo: "veda" },
];

// The frosted "in progress" panel over the front row, in tiles.
export const PROGRESS_PANEL = { col: 0, row: 5.4, cols: 12, rows: 3.35 };

// Rugs drawn by the engine, in tiles.
export const RUGS = [
  { col: 1, row: 10, cols: 3, rows: 3, kind: "rug" },
];
