// Runs in Chromium after geo.js. Builds every lockup, favicon glyph and
// wordmark from the marks plus Manrope outlines passed in from Node.
/* global paper, P_UTIL */
window.BUILD = (T) => {
  const P = paper;
  const { rect, crestD, mono, SUB } = P_UTIL;
  const marks = {};
  const M = window.__M;
  const cp = (d) => new P.CompoundPath(d);
  const pd = (item) => item.pathData;
  const vb = (b, pad = 0) => [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad].map((v) => +v.toFixed(2));
  // place an item so its bounds fill `box` (proportional, centred)
  const fit = (item, x, y, w, h) => { item.fitBounds(new P.Rectangle(x, y, w, h)); return item; };

  // symbol + "DalaTech": symbol 100 tall, cap height 44, gap 28
  function lockup(sym, textD) {
    const two = Array.isArray(sym);
    const s = two ? new P.Group([sym[0].clone(), sym[1].clone()]) : sym.clone();
    const b = s.bounds;
    s.scale(100 / b.height, b.topLeft);
    s.translate(new P.Point(-s.bounds.x, -s.bounds.y));
    const t = cp(textD);
    t.translate(new P.Point(s.bounds.width + 28 - t.bounds.x, 72));
    const all = s.bounds.unite(t.bounds);
    return two ? { mark: s.children[0].pathData, mark2: s.children[1].pathData, text: pd(t), vb: vb(all) } : { mark: pd(s), text: pd(t), vb: vb(all) };
  }

  for (const k of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']) {
    const sym = M[k]();
    const two = Array.isArray(sym);
    const grp = () => (two ? new P.Group([sym[0].clone(), sym[1].clone()]) : sym.clone());
    const favGlyph = fit(grp(), 17, 17, 62, 62);
    const proGlyph = fit(grp(), 24, 24, 48, 48);
    const parts = (g) => (two ? [g.children[0].pathData, g.children[1].pathData] : [pd(g), '']);
    const [f1, f2] = parts(favGlyph), [p1, p2] = parts(proGlyph);
    marks[k] = { sym: two ? pd(sym[0]) : pd(sym), sym2: two ? pd(sym[1]) : '', lock: lockup(sym, k === 'c3' ? T.text600 : T.text700), fav: f1, fav2: f2, pro: p1, pro2: p2 };
  }

  // 08 — Manrope 800 with the wave-D as its capital
  {
    const cap = 100, t = 21;
    const D = crestD(0, -cap, cap, t, 4);
    const rest = cp(T.rest800);
    rest.translate(new P.Point(cap + 9 - rest.bounds.x, 0));
    const all = D.bounds.unite(rest.bounds);
    const fav = fit(crestD(0, 0, 64, 15, 4), 17, 17, 62, 62);
    const pro = fit(crestD(0, 0, 64, 15, 4), 24, 24, 48, 48);
    marks.c8 = { sym: pd(fit(crestD(0, 0, 64, 15, 4), 16, 16, 64, 64)), lock: { mark: pd(D), text: pd(rest), vb: vb(all) }, fav: pd(fav), pro: pd(pro) };
  }

  // 09 — lowercase Manrope 700 cut by one horizon; below the cut turns blue
  {
    const word = cp(T.lower700);
    const xh = T.xh700;
    const cutY = -xh * 0.3, g = T.size700 * 0.05;
    const above = word.intersect(rect(-50, -500, 5000, 500 + cutY - g / 2));
    const below = word.intersect(rect(-50, cutY + g / 2, 5000, 500));
    const all = word.bounds;
    const d = cp(T.d700);
    const dAbove = d.intersect(rect(-50, -500, 5000, 500 + cutY - g / 2));
    const dBelow = d.intersect(rect(-50, cutY + g / 2, 5000, 500));
    const both = (x, y, w, h) => {
      const g2 = new P.Group([dAbove.clone(), dBelow.clone()]);
      g2.fitBounds(new P.Rectangle(x, y, w, h));
      return { a: g2.children[0].pathData, b: g2.children[1].pathData };
    };
    const f = both(17, 17, 62, 62), p = both(24, 24, 48, 48), s = both(16, 16, 64, 64);
    marks.c9 = { sym: s.a, symB: s.b, lock: { mark: pd(below), text: pd(above), vb: vb(all) }, fav: f.a, favB: f.b, pro: p.a, proB: p.b };
  }

  // 10 — custom monoline letters
  {
    const m = mono('DalaTech').path;
    const D = mono('D').path;
    const fav = fit(D.clone(), 17, 17, 62, 62);
    const pro = fit(D.clone(), 24, 24, 48, 48);
    marks.c10 = { sym: pd(fit(D.clone(), 16, 16, 64, 64)), lock: { mark: '', text: pd(m), vb: vb(m.bounds) }, fav: pd(fav), pro: pd(pro) };
  }
  return marks;
};
