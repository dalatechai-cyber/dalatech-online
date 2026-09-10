// Where things are on the /office floor, in metres. The back wall with the
// windows is z = 0; the camera looks in from +z. `dir` is the way the person
// faces: the facing vector is (sin dir, 0, cos dir), so 0 faces the camera.
// Everyone sits behind their desk facing the room, turned a little toward
// its centre line, so faces and hands read from the camera; the side monitor
// on each desk is angled so both the person and the camera can see it.
export const DESKS = [
  { id: "ara", live: true, kind: "chat", variant: "read", x: -1.9, z: 4.4, dir: 0.5 },
  { id: "veda", live: true, kind: "chart", variant: "chart", x: 1.9, z: 4.4, dir: -0.5 },
  { id: "nova", live: false, kind: "outreach", variant: "type", x: -3.05, z: 2.3, dir: 0.42 },
  { id: "eho", live: false, kind: "call", variant: "phone", x: 3.05, z: 2.3, dir: -0.42 },
];
