// The office floor plan, in tiles. Everything the engine places comes from
// here; sprite ids are looked up through the pack manifest's `roles` table.
//
// Grid: 12 columns x 13 rows of 32px tiles (384 x 416 art pixels), which is
// exactly a 390px phone at one CSS pixel per art pixel and a desktop stage at
// two. Rows 0-3 are the back wall, standing up, with the windows in it; the
// floor starts at row 4. The view is the room-builder projection: the back
// wall faces the viewer, furniture shows its front, rows further back sit
// higher on screen.
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
export const ROWS = 13;
export const WALL_ROWS = 4;
// The stage shows this many rows: the last one is cropped, so the lounge
// runs off the bottom of the frame the way a foreground does.
export const VIEW_ROWS = 12.4;

// Windows in the back wall: `panes` copies of the pack's hollow frame side by
// side, with one continuous view of Ulaanbaatar painted through them. `dx/dy`
// place the first frame inside its tile, `landmark` picks what the city shows.
export const WINDOW = [
  { col: 0, row: 0, dx: 4, dy: 18, panes: 2, landmark: "tower" },
  { col: 8, row: 0, dx: 4, dy: 18, panes: 2, landmark: "statue" },
];

export const FURNITURE = [
  // ---- on the wall (rows 0-3)
  { role: "whiteboard", col: 5, row: 1, wall: true, offsetY: 8, offsetX: 2 },
  { role: "sticky", col: 4, row: 1, wall: true, offsetY: 10, offsetX: 2 },
  { role: "certificate", col: 7, row: 1, wall: true, offsetY: 8, offsetX: 2 },

  // ---- row 4: against the back wall, and the two live seats
  { role: "cabinet", col: 0, row: 4 },
  { role: "plantSmall2", col: 1, row: 4, offsetX: 2 },
  { role: "chair", col: 2, row: 4, seat: "ara", offsetY: -6 },
  { role: "cupboard", col: 5, row: 4 },
  { role: "chair", col: 10, row: 4, seat: "veda", offsetY: -6 },
  { role: "plantOffice3", col: 11, row: 4, offsetX: 2 },

  // ---- row 5: Ара's desk (cols 0-3), the shared printer, Веда's desk (cols 8-11)
  { role: "deskL", col: 0, row: 5 }, { role: "deskM", col: 1, row: 5 }, { role: "deskM", col: 2, row: 5 }, { role: "deskR", col: 3, row: 5 },
  { role: "fruitBowl", col: 0, row: 5, onDesk: true, offsetY: -22, offsetX: 2 },
  { role: "plantSmall", col: 0, row: 5, onDesk: true, offsetY: 0 },
  { role: "phone2", col: 1, row: 5, onDesk: true, offsetY: -26, offsetX: 6 },
  { role: "papers", col: 1, row: 5, onDesk: true, offsetY: 0 },
  { role: "monitor", col: 2, row: 5, onDesk: true, screenOf: "ara", offsetY: -22 },
  { role: "keyboard", col: 2, row: 5, onDesk: true, offsetY: -6 },
  { role: "lamp", col: 3, row: 5, onDesk: true, offsetY: -28, offsetX: -4, lampOf: "ara" },
  { role: "mug", col: 3, row: 5, onDesk: true, offsetY: -2, offsetX: 2 },
  { role: "printer", col: 5, row: 5 },
    { role: "deskL", col: 8, row: 5 }, { role: "deskM", col: 9, row: 5 }, { role: "deskM", col: 10, row: 5 }, { role: "deskR", col: 11, row: 5 },
  { role: "lamp", col: 8, row: 5, onDesk: true, offsetY: -28, lampOf: "veda" },
  { role: "papers", col: 8, row: 5, onDesk: true, offsetY: -2, offsetX: -6 },
  { role: "cups", col: 8, row: 5, onDesk: true, offsetY: -22, offsetX: 4 },
  { role: "dualMonitor", col: 9, row: 5, onDesk: true, screenOf: "veda", offsetY: -12 },
  { role: "paperPile", col: 11, row: 5, onDesk: true, offsetY: -26, offsetX: -6 },
  { role: "papers", col: 11, row: 5, onDesk: true, offsetY: 0, offsetX: -8 },
  { role: "mug2", col: 11, row: 5, onDesk: true, offsetY: -2, offsetX: -2 },
  { role: "cups", col: 10, row: 5, onDesk: true, offsetY: -2, offsetX: 18 },

  // ---- row 6: the walkway between the rows (nameplates hang here)
  { role: "box2", col: 5, row: 6, offsetX: 2 },
  { role: "extinguisher", col: 6, row: 6, offsetX: 4 },

  // ---- rows 7-8: Нова (cols 0-3) and Эхо (cols 8-11), not built yet
  { role: "drawers2", col: 0, row: 7 },
  { role: "chair", col: 2, row: 7, seat: "nova", offsetY: -6 },
  { role: "crates", col: 5, row: 7 },
  { role: "chair", col: 10, row: 7, seat: "eho", offsetY: -6 },
  { role: "plantOffice2", col: 11, row: 7 },
  { role: "deskL", col: 0, row: 8 }, { role: "deskM", col: 1, row: 8 }, { role: "deskM", col: 2, row: 8 }, { role: "deskR", col: 3, row: 8 },
  { role: "lampOff", col: 0, row: 8, onDesk: true, offsetY: -28 },
  { role: "mug", col: 0, row: 8, onDesk: true, offsetY: -2, offsetX: 4 },
  { role: "phone2", col: 1, row: 8, onDesk: true, offsetY: -24, offsetX: 6 },
  { role: "papers", col: 1, row: 8, onDesk: true, offsetY: 0 },
  { role: "laptop", col: 2, row: 8, onDesk: true, screenOf: "nova", offsetY: -18 },
  { role: "paperStack", col: 3, row: 8, onDesk: true, offsetY: -24, offsetX: -4 },
  { role: "plantSmall", col: 3, row: 8, onDesk: true, offsetY: 0, offsetX: -6 },
  { role: "rackWood", col: 5, row: 8 },
  { role: "deskL", col: 8, row: 8 }, { role: "deskM", col: 9, row: 8 }, { role: "deskM", col: 10, row: 8 }, { role: "deskR", col: 11, row: 8 },
  { role: "phone", col: 8, row: 8, onDesk: true, offsetY: -28, offsetX: -2 },
  { role: "papers", col: 8, row: 8, onDesk: true, offsetY: 0, offsetX: -2 },
  { role: "paperStack", col: 9, row: 8, onDesk: true, offsetY: -24 },
  { role: "cups", col: 9, row: 8, onDesk: true, offsetY: -2, offsetX: 6 },
  { role: "monitor2", col: 10, row: 8, onDesk: true, screenOf: "eho", offsetY: -22 },
  { role: "keyboard", col: 10, row: 8, onDesk: true, offsetY: -6 },
  { role: "lampOff", col: 11, row: 8, onDesk: true, offsetY: -28, offsetX: -6 },
  { role: "fax", col: 11, row: 8, onDesk: true, offsetY: 0, offsetX: -8 },

  // ---- row 9: the walkway in front of the partitions
  { role: "plantOffice", col: 5, row: 9, offsetX: 4 },
  { role: "binGrey", col: 6, row: 9, offsetX: 2 },

  // ---- rows 10-12: the lounge, the tall pieces cropped by the bottom of the frame
  { role: "rugCheck", col: 0, row: 11, flat: true, offsetX: 14 },
  { role: "armchairBlue", col: 0, row: 11, offsetX: -10 },
  { role: "armchairWhite", col: 1, row: 11, offsetX: -6 },
  { role: "tableSmall", col: 2, row: 11, offsetX: -8 },
  { role: "fruitBowl", col: 2, row: 11, onDesk: true, offsetY: -6, offsetX: 4 },
  { role: "plantPalm", col: 3, row: 12, offsetX: 8 },
  { role: "coffeeCounter", col: 5, row: 12 },
  { role: "waterCooler", col: 7, row: 12 },
  { role: "copier", col: 8, row: 11 },
  { role: "crate", col: 9, row: 10, offsetX: 2 },
  { role: "locker", col: 11, row: 10 },
  { role: "bin", col: 9, row: 12, offsetX: -2 },
  { role: "vending", col: 10, row: 12 },
];

// The four workstations. `seat` is where the person sits (facing the viewer,
// the desk in front of them), `zone` is the tap target and zoom frame, `tag`
// is where the nameplate hangs (tile units), `light` is the lamp's bulb in
// art pixels, `partition` is the low frosted panel across an unbuilt desk.
export const DESKS = [
  { id: "ara", seat: { col: 2, row: 4 }, zone: { col: 0, row: 2.5, cols: 4.5, rows: 3.6 }, tag: { col: 2, row: 6.4 }, light: { x: 104, y: 140 }, live: true, work: "chat" },
  { id: "veda", seat: { col: 10, row: 4 }, zone: { col: 7.5, row: 2.5, cols: 4.5, rows: 3.6 }, tag: { col: 10, row: 6.4 }, light: { x: 270, y: 140 }, live: true, work: "chart" },
  { id: "nova", seat: { col: 2, row: 7 }, zone: { col: 0, row: 6, cols: 4.5, rows: 3.5 }, tag: { col: 2, row: 9.45 }, light: { x: 20, y: 234 }, live: false, work: "outreach", partition: { col: 0, row: 9, cols: 4 } },
  { id: "eho", seat: { col: 10, row: 7 }, zone: { col: 7.5, row: 6, cols: 4.5, rows: 3.5 }, tag: { col: 10, row: 9.45 }, light: { x: 364, y: 234 }, live: false, work: "call", partition: { col: 8, row: 9, cols: 4 } },
];

// Where people go when they get up. `face` is the direction they turn to
// once they arrive. `wait` is how long they stay, in ms.
export const DESTINATIONS = [
  { id: "printer", col: 4, row: 6, face: "right", wait: 2400 },
  { id: "coffee", col: 5, row: 11, face: "down", wait: 3200 },
  { id: "water", col: 7, row: 11, face: "down", wait: 2600 },
  { id: "copier", col: 8, row: 10, face: "down", wait: 2400 },
  { id: "visit-ara", col: 3, row: 4, face: "left", wait: 2800, talkTo: "ara" },
  { id: "visit-veda", col: 9, row: 4, face: "right", wait: 2800, talkTo: "veda" },
];

// Rugs drawn by the engine, in tiles (the pack's rugs are `flat` furniture).
export const RUGS = [];
