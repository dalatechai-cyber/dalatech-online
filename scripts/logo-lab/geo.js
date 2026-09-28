// Runs inside Chromium with paper.js loaded. Every mark is built from
// circles, rectangles, arcs and a few cubic curves, then flattened into one
// compound path with boolean operations, so each SVG is a single clean fill.
/* global paper */
const P = paper;
P.setup(document.createElement('canvas'));

const pt = (x, y) => new P.Point(x, y);
const rect = (x, y, w, h, r = 0) => new P.Path.Rectangle({ rectangle: new P.Rectangle(x, y, w, h), radius: r });
const circ = (x, y, r) => new P.Path.Circle(pt(x, y), r);
const U = (...a) => a.reduce((s, x) => s.unite(x));
const SUB = (a, ...b) => b.reduce((s, x) => s.subtract(x), a);
const rad = (d) => (d * Math.PI) / 180;
const polar = (cx, cy, r, a) => pt(cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a)));

// Filled pie slice between two screen angles (degrees, clockwise-positive
// because SVG y points down). Span must stay under 360.
function sector(cx, cy, R, a0, a1) {
  const p = new P.Path();
  p.moveTo(pt(cx, cy));
  p.lineTo(polar(cx, cy, R, a0));
  p.arcTo(polar(cx, cy, R, (a0 + a1) / 2), polar(cx, cy, R, a1));
  p.closePath();
  return p;
}
// A stroked arc of width w, outlined as a fill (annular sector).
function band(cx, cy, r, w, a0, a1) {
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  if (hi - lo >= 359.9) return SUB(circ(cx, cy, r + w / 2), circ(cx, cy, r - w / 2));
  return SUB(sector(cx, cy, r + w / 2, lo, hi), circ(cx, cy, r - w / 2));
}
// A straight stroke of width w with optional round caps, outlined as a fill.
function line(x0, y0, x1, y1, w, caps = false) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const r = new P.Path.Rectangle(new P.Rectangle(0, -w / 2, len, w));
  r.rotate((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, pt(0, 0));
  r.translate(pt(x0, y0));
  return caps ? U(r, circ(x0, y0, w / 2), circ(x1, y1, w / 2)) : r;
}
// D silhouette: stem with rounded left corners + a half-disc bowl.
function dShape(x0, y0, H, rl) {
  const R = H / 2, cx = x0 + R;
  return U(rect(x0, y0, R + 1, H, rl), rect(x0 + rl, y0, R - rl, H), circ(cx, y0 + R, R));
}

// ---- 01 / 08: the current wave-D, rebuilt. H = height, t = bowl weight.
function crestD(x0, y0, H, t, rl) {
  const s = H / 64, R = H / 2, cx = x0 + R, cy = y0 + R, rc = R - t;
  const peakY = y0 + t * 0.66, peakX = cx - 10 * s;
  const crestY = peakY + 10.5 * s, crestX = x0 + 0.58 * (cx - rc - x0);
  const n = new P.Path();
  n.moveTo(pt(x0 - 3 * s, peakY + 5 * s));
  n.cubicCurveTo(pt(x0 + 4 * s, peakY + 2 * s), pt(peakX - 8 * s, peakY), pt(peakX, peakY));
  n.cubicCurveTo(pt(peakX + 0.5523 * (cx + rc - peakX), peakY), pt(cx + rc, cy - 0.5523 * (cy - peakY)), pt(cx + rc, cy));
  n.arcTo(pt(cx, cy + rc), pt(cx - rc, cy));
  n.cubicCurveTo(pt(cx - rc, cy - 5 * s), pt(crestX + 0.56 * (cx - rc - crestX), crestY), pt(crestX, crestY));
  n.cubicCurveTo(pt(crestX - 6 * s, crestY), pt(x0 + 1 * s, crestY + 2.5 * s), pt(x0 - 3 * s, crestY + 7 * s));
  n.closePath();
  return SUB(dShape(x0, y0, H, rl), n);
}

const M = {};

M.c1 = () => crestD(16, 16, 64, 19, 5);

// ---- 02: same D, counter becomes a single water drop pointing up-left.
M.c2 = () => {
  const outer = dShape(16, 14, 68, 7);
  const cx = 51, cy = 51, r = 14.5;
  const tip = pt(26, 30); // stays inside the stem: a closed, sturdy counter
  const d = pt(cx, cy).subtract(tip), L = d.length, a = Math.asin(r / L);
  const base = Math.atan2(d.y, d.x);
  const t1 = pt(cx, cy).add(new P.Point({ angle: ((base + Math.PI / 2 + a) * 180) / Math.PI, length: -r }));
  const t2 = pt(cx, cy).add(new P.Point({ angle: ((base - Math.PI / 2 - a) * 180) / Math.PI, length: -r }));
  const tri = new P.Path([tip, t1, pt(cx, cy), t2]);
  tri.closed = true;
  return SUB(outer, U(circ(cx, cy, r), tri));
};

// ---- 03: the D + wave as one continuous line that curls inward.
M.c3 = () => {
  const w = 11, sx = 21.5, top = 21.5, bot = 74.5, cr = 9;
  const cx = 48, cy = 48, R = 26.5, k = 9;
  return U(
    line(sx, 37, sx, top + cr, w),
    circ(sx, 37, w / 2),
    band(sx + cr, top + cr, cr, w, 180, 270),
    line(sx + cr, top, cx, top, w),
    band(cx, cy, R, w, -90, 90),
    line(cx, bot, sx + cr, bot, w),
    band(sx + cr, bot - cr, cr, w, 90, 180),
    line(sx, bot - cr, sx, 60, w),
    band(sx + k, 60, k, w, 180, 330),
    circ(sx + k + k * Math.cos(rad(330)), 60 + k * Math.sin(rad(330)), w / 2),
  );
};

// ---- 04: the D's counter is a crescent moon: staff that answer at 2 a.m.
M.c4 = () => {
  const D = dShape(16, 16, 64, 7);
  const moon = SUB(circ(48, 49, 19), circ(56.5, 43.5, 15.5));
  return SUB(D, moon);
};

// Two-tone marks return [light-blue part, dark-blue part].

// ---- 05: sky over sea — a disc cut by a low horizon.
M.c5 = () => {
  const disc = circ(48, 48, 32), cut = 55, g = 5;
  const sky = disc.intersect(rect(0, 0, 96, cut - g / 2));
  const sea = disc.intersect(rect(0, cut + g / 2, 96, 96));
  return [sky, sea];
};

// ---- 06: two speech bubbles that complete one circle — the question and the answer.
M.c6 = () => {
  const r = 32, g = 5.5;
  const bubble = (corner) => U(circ(48, 48, r), rect(corner[0], corner[1], r, r));
  // split along the top-left / bottom-right diagonal
  const half = (lower) => {
    const p = new paper.Path(lower ? [pt(-20, -20), pt(-20, 116), pt(116, 116)] : [pt(-20, -20), pt(116, -20), pt(116, 116)]);
    p.closed = true; return p;
  };
  const gapBand = line(-20, -20, 116, 116, g);
  const ask = SUB(bubble([16, 48]).intersect(half(true)), gapBand);   // tail bottom-left
  const answer = SUB(bubble([48, 16]).intersect(half(false)), gapBand); // tail top-right
  return [ask, answer];
};

// ---- 07: the current — one wave line, crest in light blue, trough in dark blue.
M.c7 = () => {
  const w = 13, r = 15, y = 48;
  const crest = U(band(33, y, r, w, 180, 360), circ(18, y, w / 2));
  const trough = U(band(63, y, r, w, 0, 180), circ(78, y, w / 2));
  return [crest, trough];
};

// ---- 10: custom monoline letters. Units: cap height 56, x-height 40, stroke 8.
const MW = 8;
function mono(text) {
  const cap = 56, xh = 40, base = 56, w = MW, h = w / 2;
  const parts = [];
  let x = 0;
  const bowlR = (xh - w) / 2; // centerline radius of round lowercase
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === 'D') {
      const bx = x + 16;
      parts.push(rect(x, 0, w, cap), rect(x, 0, bx - x + 1, w), rect(x, cap - w, bx - x + 1, w), band(bx, cap / 2, cap / 2 - h, w, -90, 90));
      x = bx + cap / 2 + 9;
    } else if (ch === 'a') {
      const cx = x + bowlR + h, cy = base - xh / 2;
      parts.push(band(cx, cy, bowlR, w, 0, 360), rect(cx + bowlR - h, base - xh, w, xh));
      x = cx + bowlR + h + 7;
    } else if (ch === 'l') {
      // hooked l: its foot runs along the baseline into the next letter's bowl
      const lx = x + h, hr = 10;
      const nextCx = lx + 2 + bowlR + h + 3;
      parts.push(rect(lx - h, 0, w, base - h - hr), band(lx + hr, base - h - hr, hr, w, 90, 180), rect(lx + hr, base - w, nextCx - lx - hr + 1, w));
      x = nextCx - bowlR - h;
    } else if (ch === 'T') {
      const tw = 40;
      parts.push(rect(x, 0, tw, w), rect(x + tw / 2 - h, 0, w, cap));
      x = x + tw + 2;
    } else if (ch === 'e') {
      const cx = x + bowlR + h, cy = base - xh / 2;
      parts.push(band(cx, cy, bowlR, w, 40, 360), rect(cx - bowlR - h, cy - h, 2 * bowlR + w, w));
      x = cx + bowlR + h + 6;
    } else if (ch === 'c') {
      const cx = x + bowlR + h, cy = base - xh / 2;
      parts.push(band(cx, cy, bowlR, w, 40, 320));
      x = cx + bowlR + h + 5;
    } else if (ch === 'h') {
      const r = 13;
      parts.push(rect(x, 0, w, cap), band(x + h + r, base - xh + h + r, r, w, 180, 360), rect(x + 2 * r, base - xh + h + r, w, xh - h - r));
      x = x + 2 * r + w;
    }
  }
  return { path: U(...parts), width: x };
}

// ---- helpers used from Node
window.MARKS = () => {
  const out = {};
  for (const k of Object.keys(M)) {
    const item = M[k]();
    const bb = item.bounds; out[k] = { d: item.pathData, b: [bb.x, bb.y, bb.width, bb.height].map((v) => +v.toFixed(2)) };
  }
  return out;
};
window.P_UTIL = { rect, circ, U, SUB, crestD, mono, band, line };
window.__M = M;
