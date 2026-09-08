// The office floor plan, in tiles. Everything the engine places comes from
// here; sprite ids are looked up through the pack manifest's `roles` table.
//
// Grid: 12 columns x 14 rows of 32px tiles (384 x 448 art pixels), which is
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
//   flat        lies on the floor (rugs), no footprint, drawn with the floor
//   offsetX/Y   nudge in art pixels (Y is usually negative: raised onto a desk)

export const COLS = 12;
export const ROWS = 14;
export const WALL_ROWS = 3;

// Window on the back wall, in tiles. Two panes over the two live desks; the
// wall between them carries the whiteboard, the pinboard and the certificate.
export const WINDOW = [
  { col: 0.25, cols: 3.5 },
  { col: 8.25, cols: 3.5 },
];

export const FURNITURE = [
  // ---- on the wall (rows 0-2)
  { role: "whiteboard", col: 4, row: 1, wall: true, offsetY: -12, offsetX: 2 },
  { role: "sticky", col: 6, row: 1, wall: true, offsetY: 6, offsetX: 8 },
  { role: "certificate", col: 7, row: 1, wall: true, offsetY: 6, offsetX: 8 },

  // ---- row 3: what stands against the back wall, and the two live seats
  { role: "cabinet", col: 0, row: 3 },
  { role: "plantSmall2", col: 1, row: 3, offsetX: 2 },
  { role: "chair", col: 2, row: 3, seat: "ara", offsetY: -6 },
  { role: "cupboard", col: 5, row: 3 },
  { role: "chair", col: 10, row: 3, seat: "veda", offsetY: -6 },
  { role: "plantOffice3", col: 11, row: 3, offsetX: 2 },

  // ---- row 4: Ара's desk (cols 0-3), the shared printer, Веда's desk (cols 8-11)
  { role: "deskL", col: 0, row: 4 }, { role: "deskM", col: 1, row: 4 }, { role: "deskM", col: 2, row: 4 }, { role: "deskR", col: 3, row: 4 },
  { role: "fruitBowl", col: 0, row: 4, onDesk: true, offsetY: -22, offsetX: 2 },
  { role: "plantSmall", col: 0, row: 4, onDesk: true, offsetY: 0 },
  { role: "phone2", col: 1, row: 4, onDesk: true, offsetY: -26, offsetX: 6 },
  { role: "papers", col: 1, row: 4, onDesk: true, offsetY: 0 },
  { role: "monitor", col: 2, row: 4, onDesk: true, screenOf: "ara", offsetY: -22 },
  { role: "keyboard", col: 2, row: 4, onDesk: true, offsetY: -6 },
  { role: "lamp", col: 3, row: 4, onDesk: true, offsetY: -28, offsetX: -4, lampOf: "ara" },
  { role: "mug", col: 3, row: 4, onDesk: true, offsetY: -2, offsetX: 2 },
  { role: "printer", col: 5, row: 4 },
  { role: "deskL", col: 8, row: 4 }, { role: "deskM", col: 9, row: 4 }, { role: "deskM", col: 10, row: 4 }, { role: "deskR", col: 11, row: 4 },
  { role: "lamp", col: 8, row: 4, onDesk: true, offsetY: -28, lampOf: "veda" },
  { role: "papers", col: 8, row: 4, onDesk: true, offsetY: -2, offsetX: -6 },
  { role: "cups", col: 8, row: 4, onDesk: true, offsetY: -22, offsetX: 4 },
  { role: "dualMonitor", col: 9, row: 4, onDesk: true, screenOf: "veda", offsetY: -12 },
  { role: "paperPile", col: 11, row: 4, onDesk: true, offsetY: -26, offsetX: -6 },
  { role: "papers", col: 11, row: 4, onDesk: true, offsetY: 0, offsetX: -8 },
  { role: "mug2", col: 11, row: 4, onDesk: true, offsetY: -2, offsetX: -2 },
  { role: "cups", col: 10, row: 4, onDesk: true, offsetY: -2, offsetX: 18 },

  // ---- row 5: the walkway under the live desks (nameplates hang here)
  { role: "box2", col: 0, row: 5 },
  { role: "extinguisher", col: 11, row: 5, offsetX: 2 },

  // ---- rows 6-7: Нова (cols 0-3) and Эхо (cols 8-11), behind the panel
  { role: "drawers2", col: 0, row: 6 },
  { role: "chair", col: 2, row: 6, seat: "nova", offsetY: -6 },
  { role: "crates", col: 5, row: 6 },
  { role: "chair", col: 10, row: 6, seat: "eho", offsetY: -6 },
  { role: "plantOffice2", col: 11, row: 6 },
  { role: "deskL", col: 0, row: 7 }, { role: "deskM", col: 1, row: 7 }, { role: "deskM", col: 2, row: 7 }, { role: "deskR", col: 3, row: 7 },
  { role: "lampOff", col: 0, row: 7, onDesk: true, offsetY: -28 },
  { role: "mug", col: 0, row: 7, onDesk: true, offsetY: -2, offsetX: 4 },
  { role: "phone2", col: 1, row: 7, onDesk: true, offsetY: -24, offsetX: 6 },
  { role: "papers", col: 1, row: 7, onDesk: true, offsetY: 0 },
  { role: "laptop", col: 2, row: 7, onDesk: true, screenOf: "nova", offsetY: -18 },
  { role: "paperStack", col: 3, row: 7, onDesk: true, offsetY: -24, offsetX: -4 },
  { role: "plantSmall", col: 3, row: 7, onDesk: true, offsetY: 0, offsetX: -6 },
  { role: "rackWood", col: 5, row: 7 },
  { role: "deskL", col: 8, row: 7 }, { role: "deskM", col: 9, row: 7 }, { role: "deskM", col: 10, row: 7 }, { role: "deskR", col: 11, row: 7 },
  { role: "phone", col: 8, row: 7, onDesk: true, offsetY: -28, offsetX: -2 },
  { role: "papers", col: 8, row: 7, onDesk: true, offsetY: 0, offsetX: -2 },
  { role: "paperStack", col: 9, row: 7, onDesk: true, offsetY: -24 },
  { role: "cups", col: 9, row: 7, onDesk: true, offsetY: -2, offsetX: 6 },
  { role: "monitor2", col: 10, row: 7, onDesk: true, screenOf: "eho", offsetY: -22 },
  { role: "keyboard", col: 10, row: 7, onDesk: true, offsetY: -6 },
  { role: "lampOff", col: 11, row: 7, onDesk: true, offsetY: -28, offsetX: -6 },
  { role: "fax", col: 11, row: 7, onDesk: true, offsetY: 0, offsetX: -8 },

  // ---- row 8: the walkway under the front desks
  { role: "plantOffice", col: 0, row: 8 },
  { role: "binGrey", col: 11, row: 8 },

  // ---- rows 9-10: storage along both walls, a meeting table in the middle
  { role: "rackWood", col: 0, row: 9 },
  { role: "rugRound", col: 5, row: 9, flat: true },
  { role: "rackLow", col: 2, row: 9 },
  { role: "tv", col: 7, row: 9 },
  { role: "box", col: 9, row: 9 },
  { role: "chair2", col: 5, row: 9 },
  { role: "chair2", col: 6, row: 9 },
  { role: "filing", col: 10, row: 9 },
  { role: "filing2", col: 0, row: 10 },
  { role: "plantBush", col: 2, row: 10 },
  { role: "tableLow", col: 5, row: 10, offsetX: -10 },
  { role: "mug2", col: 5, row: 10, onDesk: true, offsetY: -2, offsetX: 4 },
  { role: "plantOffice2", col: 7, row: 10 },
  { role: "crate", col: 9, row: 10, offsetY: -4 },
  { role: "rackWhite", col: 10, row: 10 },

  // ---- rows 11-13: the lounge, the copier, and the machines along the bottom wall
  { role: "rugCheck", col: 2, row: 11, flat: true },
  { role: "plantPalm", col: 0, row: 11 },
  { role: "armchairBlue", col: 2, row: 11, offsetX: -4 },
  { role: "armchairWhite", col: 3, row: 11, offsetX: -4 },
  { role: "copier", col: 8, row: 11 },
  { role: "crates", col: 10, row: 11 },
  { role: "tableSmall", col: 1, row: 12, offsetX: -8 },
  { role: "fruitBowl", col: 1, row: 12, onDesk: true, offsetY: -6, offsetX: 6 },
  { role: "plantOffice2", col: 3, row: 12 },
  { role: "bin", col: 4, row: 12 },
  { role: "box", col: 10, row: 12, offsetX: 2 },
  { role: "box2", col: 11, row: 12, offsetX: -2 },
  { role: "plantOffice3", col: 0, row: 13 },
  { role: "sofa", col: 1, row: 13 },
  { role: "plantSmall2", col: 3, row: 13 },
  { role: "coffeeCounter", col: 5, row: 13 },
  { role: "waterCooler", col: 7, row: 13 },
  { role: "vending", col: 8, row: 13 },
  { role: "locker", col: 10, row: 13 },
  { role: "cabinet2", col: 11, row: 13, offsetX: 4 },
];

// The four workstations. `seat` is where the person sits (facing down at the
// desk below), `zone` is the tap target and zoom frame, `tag` is where the
// nameplate hangs (tile units), `light` is the lamp's bulb in art pixels.
export const DESKS = [
  { id: "ara", seat: { col: 2, row: 3 }, zone: { col: 0, row: 2, cols: 4.5, rows: 3.5 }, tag: { col: 2, row: 5.4 }, light: { x: 112, y: 106 }, live: true, work: "chat" },
  { id: "veda", seat: { col: 10, row: 3 }, zone: { col: 7.5, row: 2, cols: 4.5, rows: 3.5 }, tag: { col: 10, row: 5.4 }, light: { x: 276, y: 106 }, live: true, work: "chart" },
  { id: "nova", seat: { col: 2, row: 6 }, zone: { col: 0, row: 5, cols: 4.5, rows: 3.5 }, tag: { col: 2, row: 8.4 }, light: { x: 20, y: 202 }, live: false, work: "outreach" },
  { id: "eho", seat: { col: 10, row: 6 }, zone: { col: 7.5, row: 5, cols: 4.5, rows: 3.5 }, tag: { col: 10, row: 8.4 }, light: { x: 364, y: 202 }, live: false, work: "call" },
];

// Where people go when they get up. `face` is the direction they turn to
// once they arrive. `wait` is how long they stay, in ms.
export const DESTINATIONS = [
  { id: "printer", col: 5, row: 5, face: "up", wait: 2400 },
  { id: "meeting", col: 4, row: 10, face: "right", wait: 3000 },
  { id: "copier", col: 8, row: 10, face: "down", wait: 2400 },
  { id: "coffee", col: 5, row: 12, face: "down", wait: 3200 },
  { id: "water", col: 7, row: 12, face: "down", wait: 2600 },
  { id: "visit-ara", col: 3, row: 3, face: "left", wait: 2800, talkTo: "ara" },
  { id: "visit-veda", col: 9, row: 3, face: "right", wait: 2800, talkTo: "veda" },
];

// The frosted "in progress" panel over the front row, in tiles.
export const PROGRESS_PANEL = { col: 0, row: 5.4, cols: 12, rows: 3.35 };

// Rugs drawn by the engine, in tiles (the pack's rugs are `flat` furniture).
export const RUGS = [];
