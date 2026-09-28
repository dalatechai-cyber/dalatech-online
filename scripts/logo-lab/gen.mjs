// Node side: outlines Manrope text, runs geo.js + compose.js in Chromium, writes marks-built.json.
import opentype from 'opentype.js';
import fs from 'fs';
import { chromium } from 'playwright-core';
const load = (w) => { const b = fs.readFileSync(`node_modules/@fontsource/manrope/files/manrope-latin-${w}-normal.woff`); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const F = { 600: load(600), 700: load(700), 800: load(800) };
// cap height `cap`, baseline y=0, tracking in em
function setText(w, str, cap, track = 0) {
  const f = F[w], size = cap / (f.tables.os2.sCapHeight / f.unitsPerEm), u = size / f.unitsPerEm;
  const gl = f.stringToGlyphs(str); let x = 0; let d = '';
  gl.forEach((g, i) => { d += g.getPath(x, 0, size).toPathData(2); x += g.advanceWidth * u; if (i < gl.length - 1) x += f.getKerningValue(g, gl[i + 1]) * u + track * size; });
  return { d, size, xh: (f.tables.os2.sxHeight / f.unitsPerEm) * size };
}
const t600 = setText(600, 'DalaTech', 44, -0.005);
const t700 = setText(700, 'DalaTech', 44, -0.01);
const rest = setText(800, 'alaTech', 100, -0.015);
const low = setText(700, 'dalatech', 100 * (1440 / 1080) * 0.75, -0.012); // x-height 75
const dOnly = setText(700, 'd', 100 * (1440 / 1080) * 0.75, 0);
const T = { text600: t600.d, text700: t700.d, rest800: rest.d, lower700: low.d, xh700: low.xh, size700: low.size, d700: dOnly.d };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
await p.setContent('<body></body>');
await p.addScriptTag({ path: 'node_modules/paper/dist/paper-core.min.js' });
await p.addScriptTag({ path: 'geo.js' });
await p.addScriptTag({ path: 'compose.js' });
const out = await p.evaluate((T) => window.BUILD(T), T);
await b.close();
fs.writeFileSync('built.json', JSON.stringify(out));
console.log(Object.entries(out).map(([k, v]) => `${k} lock.vb=${v.lock.vb} sym=${v.sym.length}`).join('\n'));
