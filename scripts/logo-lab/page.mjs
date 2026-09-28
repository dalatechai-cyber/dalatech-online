// Writes the SVG files and the preview page from built.json.
// usage: node page.mjs <outDir>   -> <outDir>/index.html, <outDir>/svg/**, ./artifact.html
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2];
const B = JSON.parse(fs.readFileSync('built.json', 'utf8'));
const photo = 'data:image/jpeg;base64,' + fs.readFileSync('coffee.jpg').toString('base64');
const grass = 'data:image/jpeg;base64,' + fs.readFileSync('grass-small.jpg').toString('base64');

const NAVY = '#060E24', SKY = '#60C8FF', DEEP = '#0B73C2', WHITE = '#F5F8FF', BRAND = '#2563EB';

const C = [
  { k: 'c1', slug: '01-crest', name: 'Crest', type: 'Refinement',
    idea: 'The current wave-D rebuilt on a grid: the counter sits dead-centre in the bowl, and the wave opening is widened so it still reads at 16 px.',
    check: 'Checked against DigitalOcean (a blue round mark with an opening). Different letter, different opening, no pixel squares. Not too close.' },
  { k: 'c2', slug: '02-drop', name: 'Drop', type: 'Refinement',
    idea: 'Same D, but the wave becomes one drop of water (Дала, the sea) held inside a closed, sturdier letter.',
    check: 'No well-known tech logo is a D with a drop-shaped counter. Clear. Keep the drop pointing up-left: pointing down it reads as a tear.' },
  { k: 'c3', slug: '03-line', name: 'Line', type: 'Refinement',
    idea: 'The D and its wave drawn as one continuous line that curls inward at the stem. Lighter and calmer, same idea.',
    check: 'No close tech logo. At a glance the curl can pass for a script letter, so test it with a few customers before choosing.' },
  { k: 'c4', slug: '04-night', name: 'Night shift', type: 'New direction',
    idea: 'A crescent moon in the D’s counter: staff who answer customers at 2 a.m. while the owner sleeps.',
    check: 'No well-known tech logo pairs a D with a crescent. Moon icons are common in sleep and dark-mode apps, so it says “night” loudly.' },
  { k: 'c5', slug: '05-sky-and-sea', name: 'Sky and sea', type: 'New direction', two: true,
    idea: 'A disc cut by a low horizon: light-blue sky over dark-blue sea. Дала is the open sea; Mongolia is the land of the blue sky.',
    check: 'No close tech logo. Split-disc marks are common in travel and energy brands, so it is calm but harder to own on its own.' },
  { k: 'c6', slug: '06-dialogue', name: 'Dialogue', type: 'New direction', two: true,
    idea: 'Two speech bubbles that close into one circle: the customer asks in light blue, DalaTech’s staff answers in dark blue.',
    check: 'Not close to a known tech logo, but two-bubble shapes are a common chat icon, so it reads “messaging app” more than “company”.' },
  { k: 'c7', slug: '07-current', name: 'Current', type: 'New direction', two: true,
    idea: 'One wave line with round ends: the crest in light blue, the trough in dark blue. The sea (Дала) and steady, calm motion.',
    check: 'Nothing close in tech. Wave marks are widespread in water and audio brands, so it needs the wordmark beside it to be ownable.' },
  { k: 'c8', slug: '08-crest-wordmark', name: 'Crest wordmark', type: 'Wordmark',
    idea: 'DalaTech in Manrope ExtraBold, the site’s display face, with the capital D swapped for the wave-D. The name carries the old mark inside it.',
    check: 'Manrope is an open-source (OFL) face that many startups use. The wave-D is what makes this ownable. Favicon: the wave-D alone.' },
  { k: 'c9', slug: '09-horizon-wordmark', name: 'Horizon wordmark', type: 'Wordmark',
    idea: 'Lowercase dalatech cut by one thin horizon; the strip of each letter below it turns sea-blue.',
    check: 'One cut is clear. Two or more lines would start to echo IBM’s striped logo. Favicon: the cut “d”.' },
  { k: 'c10', slug: '10-line-wordmark', name: 'Line wordmark', type: 'Wordmark',
    idea: 'Hand-built monoline letters. The l runs along the baseline straight into the next a, one unbroken line through “ala”.',
    check: 'Geometric monoline type recalls 1970s logotypes such as Avant Garde. The l-to-a join is the ownable part. Clear. Weak spot: its favicon, a plain monoline D, carries none of that detail.' },
];
C.forEach((c, i) => { c.n = String(i + 1).padStart(2, '0'); c.b = B[c.k]; });

// ---------- standalone SVG files (real fills, no CSS) ----------
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${body}</svg>\n`;
const p = (d, fill) => (d ? `<path fill="${fill}" d="${d}"/>` : '');
function symBody(c, fill, fill2 = fill) { return p(c.b.sym, fill) + p(c.b.symB, fill) + p(c.b.sym2, fill2); }
function glyph(c, which, fill, fill2 = fill) { return p(c.b[which], fill) + p(c.b[which + 'B'], fill) + p(c.b[which + '2'], fill2); }
function lockBody(c, mark, text, mark2 = mark) { return p(c.b.lock.mark, mark) + p(c.b.lock.mark2, mark2) + p(c.b.lock.text, text); }

const files = {};
for (const c of C) {
  const dir = `svg/${c.slug}`;
  const L = c.b.lock.vb;
  // two-tone marks: light blue + navy on light grounds, light blue + brand blue on dark
  const onLight = c.two ? [SKY, NAVY] : [DEEP, DEEP];
  const onDark = c.two ? [SKY, BRAND] : [SKY, SKY];
  files[`${dir}/symbol-colour.svg`] = svg([0, 0, 96, 96], symBody(c, ...onLight));
  files[`${dir}/symbol-light.svg`] = svg([0, 0, 96, 96], symBody(c, ...onDark));
  files[`${dir}/symbol-white.svg`] = svg([0, 0, 96, 96], symBody(c, '#FFFFFF'));
  files[`${dir}/logo-colour.svg`] = svg(L, lockBody(c, onLight[0], NAVY, onLight[1]));
  files[`${dir}/logo-light.svg`] = svg(L, lockBody(c, onDark[0], WHITE, onDark[1]));
  files[`${dir}/logo-white.svg`] = svg(L, lockBody(c, '#FFFFFF', '#FFFFFF'));
  files[`${dir}/favicon.svg`] = svg([0, 0, 96, 96], `<rect width="96" height="96" rx="22" fill="${NAVY}"/>` + glyph(c, 'fav', ...onDark));
  files[`${dir}/apple-touch-icon.svg`] = svg([0, 0, 96, 96], `<rect width="96" height="96" fill="${NAVY}"/>` + glyph(c, 'fav', ...onDark));
  files[`${dir}/profile.svg`] = svg([0, 0, 96, 96], `<rect width="96" height="96" fill="${NAVY}"/>` + glyph(c, 'pro', ...onDark));
}

// ---------- sprite for the page: one definition per shape, coloured via CSS vars ----------
const vpath = (d, v) => (d ? `<path style="fill:var(${v})" d="${d}"/>` : '');
let sprite = '';
for (const c of C) {
  const L = c.b.lock.vb;
  sprite += `<symbol id="${c.k}-sym" viewBox="0 0 96 96">${vpath(c.b.sym, '--m')}${vpath(c.b.symB, '--m')}${vpath(c.b.sym2, '--m2')}</symbol>`;
  sprite += `<symbol id="${c.k}-lock" viewBox="${L.join(' ')}">${vpath(c.b.lock.mark, '--m')}${vpath(c.b.lock.mark2, '--m2')}${vpath(c.b.lock.text, '--t')}</symbol>`;
  sprite += `<symbol id="${c.k}-fav" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" style="fill:var(--tile)"/>${vpath(c.b.fav, '--g')}${vpath(c.b.favB, '--g')}${vpath(c.b.fav2, '--g2')}</symbol>`;
  sprite += `<symbol id="${c.k}-sq" viewBox="0 0 96 96"><rect width="96" height="96" style="fill:var(--tile)"/>${vpath(c.b.fav, '--g')}${vpath(c.b.favB, '--g')}${vpath(c.b.fav2, '--g2')}</symbol>`;
  sprite += `<symbol id="${c.k}-pro" viewBox="0 0 96 96"><rect width="96" height="96" style="fill:var(--tile)"/>${vpath(c.b.pro, '--g')}${vpath(c.b.proB, '--g')}${vpath(c.b.pro2, '--g2')}</symbol>`;
}
const use = (id, w, h, cls = '', label = '') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}><use href="#${id}" width="${w}" height="${h}"/></svg>`;
// lockup at a given rendered height, width follows its aspect ratio
const lock = (c, h, cls = '') => { const L = c.b.lock.vb; const w = +(h * L[2] / L[3]).toFixed(1); return `<svg class="${cls}" viewBox="0 0 ${L[2]} ${L[3]}" width="${w}" height="${h}" role="img" aria-label="DalaTech logo, concept ${c.n}"><use href="#${c.k}-lock" width="${L[2]}" height="${L[3]}"/></svg>`; };
// wordmarks carry more letter height, so they get less height to match the symbol lockups' optical size
const lockH = (c, base) => (c.type === 'Wordmark' ? (c.k === 'c10' ? base * 0.62 : base * 0.72) : base);

const navLinks = ['AI ажилтан', 'Вэбсайт', 'Процесс', 'Үнэ', 'Асуулт'];
const header = (c) => `<div class="site-hdr">
  <a class="site-logo" href="#${c.slug}" tabindex="-1">${lock(c, +lockH(c, 30).toFixed(1))}</a>
  <nav class="site-nav" aria-hidden="true">${navLinks.map((l) => `<span>${l}</span>`).join('')}</nav>
  <span class="site-cta">Хүсэлт илгээх</span>
  <span class="site-burger" aria-hidden="true"><i></i><i></i><i></i></span>
</div>`;
const tab = (c, active, title = 'DalaTech · AI ажилтан') => `<div class="tab${active ? ' on' : ''}">${use(`${c.k}-fav`, 16, 16)}<span class="tab-t">${title}</span><span class="tab-x">×</span></div>`;

const section = (c) => `
<section class="concept${c.two ? ' two' : ''}" id="${c.slug}">
  <header class="c-head">
    <div class="c-num">${c.n}</div>
    <div>
      <p class="c-type">${c.type}</p>
      <h2>${c.name}</h2>
      <p class="c-idea">${c.idea}</p>
    </div>
  </header>

  <div class="bgs">
    <figure class="bg bg-navy">${lock(c, +lockH(c, 56).toFixed(1), 'lk')}<figcaption>Light version on navy ${NAVY}</figcaption></figure>
    <figure class="bg bg-white">${lock(c, +lockH(c, 56).toFixed(1), 'lk')}<figcaption>Colour version on white</figcaption></figure>
    <figure class="bg bg-photo">${lock(c, +lockH(c, 44).toFixed(1), 'lk')}<figcaption>Light version on a photo</figcaption></figure>
  </div>

  <div class="row2">
    <div class="panel sym-pair">
      <p class="lbl">${c.type === 'Wordmark' ? 'Favicon icon' : 'Symbol'}</p>
      <div class="sym-row">
        <span class="sym-box navy">${use(`${c.k}-sym`, 96, 96, 'sym')}</span>
        <span class="sym-box white">${use(`${c.k}-sym`, 96, 96, 'sym')}</span>
        <span class="sym-box photo">${use(`${c.k}-sym`, 96, 96, 'sym')}</span>
      </div>
    </div>
    <div class="panel prof">
      <p class="lbl">Facebook / Instagram profile</p>
      <div class="prof-row">
        <span class="pp-sq">${use(`${c.k}-pro`, 120, 120)}<small>upload, 1:1</small></span>
        <span class="pp-ci">${use(`${c.k}-pro`, 120, 120)}<small>shown as a circle</small></span>
        <span class="pp-post"><span class="pp-mini">${use(`${c.k}-pro`, 40, 40)}</span><span><b>DalaTech</b><small>Ивээн тэтгэсэн · 2 цаг</small></span></span>
      </div>
    </div>
  </div>

  <div class="panel">
    <p class="lbl">Website header, real size</p>
    ${header(c)}
  </div>

  <div class="panel">
    <p class="lbl">Favicon: 16 px in a browser tab, 32 px, and 180 px on a phone home screen</p>
    <div class="fav-row">
      <div class="tabs light">${tab(c, true)}${tab(C[(C.indexOf(c) + 1) % 10], false, 'Gmail')}</div>
      <div class="tabs dark">${tab(c, true)}${tab(C[(C.indexOf(c) + 1) % 10], false, 'Gmail')}</div>
      <div class="f32"><span class="f32-l">${use(`${c.k}-fav`, 32, 32)}</span><span class="f32-d">${use(`${c.k}-fav`, 32, 32)}</span><small>32 px</small></div>
      <div class="home"><span class="home-ic">${use(`${c.k}-sq`, 180, 180)}</span><small>180 px · DalaTech</small></div>
    </div>
  </div>

  <p class="check"><b>Resemblance check.</b> ${c.check}</p>
  <p class="files">Files: <code>public/logo-lab/svg/${c.slug}/</code> logo-colour, logo-light, logo-white, symbol-colour, symbol-light, symbol-white, favicon, apple-touch-icon, profile (.svg)</p>
</section>`;

const css = `
:root{--bg:#EEF1F6;--surface:#FFFFFF;--ink:#0A1024;--muted:#4F6286;--line:#D6DDEA;--accent:${DEEP};--chip:#E3EAF6;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#050A18;--surface:#0D1430;--ink:#F0F4FF;--muted:#8B9FC4;--line:#1A2557;--accent:${SKY};--chip:#131C45;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#050A18;--surface:#0D1430;--ink:#F0F4FF;--muted:#8B9FC4;--line:#1A2557;--accent:${SKY};--chip:#131C45;color-scheme:dark}
*{box-sizing:border-box}
body{--m2:${BRAND};--g2:${BRAND};--tile:${NAVY};--g:${SKY};margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding-inline:16px}
.wrap{max-width:1180px;margin:0 auto;padding-block:40px 80px;display:grid;gap:56px}
h1,h2,h3{font-family:Manrope,Inter,system-ui,sans-serif;text-wrap:balance;margin:0;letter-spacing:-0.01em}
h1{font-size:clamp(28px,4vw,40px);font-weight:800}
h2{font-size:26px;font-weight:800}
h3{font-size:18px;font-weight:700}
p{margin:0}
.intro{display:grid;gap:14px;max-width:70ch}
.intro .eyebrow,.c-type,.lbl{font:600 11px/1.3 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.intro p{color:var(--muted)}
.pal{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.sw{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:6px 10px 6px 6px;font-size:13px}
.sw i{width:22px;height:22px;border-radius:6px;display:block;border:1px solid rgba(128,140,170,.35)}
.sw code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
/* overview */
.grid10{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
@media (max-width:760px){.grid10{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ov{display:grid;gap:8px;text-decoration:none;color:inherit}
.ov-tile{background:${NAVY};border-radius:14px;aspect-ratio:1;display:grid;place-items:center;max-width:100%;--m:${SKY};--t:${WHITE};transition:transform .2s}
.ov-tile svg{width:62%;height:auto}
.ov:hover .ov-tile,.ov:focus-visible .ov-tile{transform:translateY(-2px)}
.ov:focus-visible{outline:2px solid var(--accent);outline-offset:4px;border-radius:14px}
.ov span{font-size:13px;display:flex;gap:8px;align-items:baseline}
.ov b{font:800 13px Manrope,Inter,sans-serif;color:var(--accent);font-variant-numeric:tabular-nums}
.ov em{font-style:normal;color:var(--muted);font-size:12px;margin-left:auto}
.group{display:grid;gap:14px}
.group>header{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline}
.group>header p{color:var(--muted);font-size:14px}
.scroll{overflow-x:auto;border-radius:14px}
.stack{display:grid;gap:1px;background:#1A2557;border-radius:14px;overflow:hidden;min-width:0}
.stack .row{display:grid;grid-template-columns:44px 1fr;align-items:center;background:#050A18}
.stack .row>b{font:800 12px Manrope,sans-serif;color:#5A6E94;text-align:center;font-variant-numeric:tabular-nums}
.stack .site-hdr{border-radius:0;border:0}
.tabwall{display:grid;gap:10px}
.pp-wall{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:10px}
@media (max-width:760px){.pp-wall{grid-template-columns:repeat(5,minmax(0,1fr))}}
.pp-wall figure{margin:0;display:grid;gap:6px;justify-items:center;font:800 12px Manrope,sans-serif;color:var(--muted)}
.pp-wall svg{width:100%;height:auto;border-radius:50%;max-width:96px}
/* concept */
.concept{display:grid;gap:16px;padding-top:28px;border-top:1px solid var(--line);scroll-margin-top:16px}
.c-head{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}
.c-num{font:800 44px/1 Manrope,Inter,sans-serif;color:var(--accent);font-variant-numeric:tabular-nums;letter-spacing:-.03em}
.c-idea{max-width:68ch;margin-top:6px}
.bgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:860px){.bgs{grid-template-columns:1fr}}
.bg{margin:0;border-radius:14px;min-height:200px;display:grid;place-items:center;position:relative;padding:28px 20px 40px;overflow:hidden}
.bg figcaption{position:absolute;left:14px;bottom:10px;font-size:11px;letter-spacing:.04em}
.bg svg.lk{max-width:100%;height:auto}
.bg-navy{background:${NAVY};--m:${SKY};--t:${WHITE}}
.bg-navy figcaption{color:#8B9FC4}
.bg-white{background:#FFFFFF;--m:${DEEP};--t:${NAVY};box-shadow:inset 0 0 0 1px #D6DDEA}
.bg-white figcaption{color:#5A6E94}
.bg-photo{background:url(${photo}) 0 0/230% auto;--m:${SKY};--m2:#FFFFFF;--t:#FFFFFF;place-items:start}
.two .bg-white,.two .sym-box.white{--m:${SKY};--m2:${NAVY}}
.bg-photo figcaption{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:12px}
@media (max-width:860px){.row2{grid-template-columns:1fr}}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;display:grid;gap:12px;min-width:0}
.sym-row{display:flex;flex-wrap:wrap;gap:10px}
.sym-box{width:112px;height:112px;border-radius:12px;display:grid;place-items:center}
.sym-box.navy{background:${NAVY};--m:${SKY}}
.sym-box.white{background:#fff;--m:${DEEP};box-shadow:inset 0 0 0 1px #D6DDEA}
.sym-box.photo{background:url(${photo}) 8% 12%/340px auto;--m:#FFFFFF;--m2:#FFFFFF}
.prof-row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;--tile:${NAVY};--g:${SKY}}
.prof-row small,.f32 small,.home small{display:block;font-size:11px;color:var(--muted);margin-top:6px;text-align:center}
.pp-sq svg{border-radius:4px;display:block}
.pp-ci svg{border-radius:50%;display:block}
.pp-post{display:flex;gap:10px;align-items:center;background:#fff;color:#050505;border-radius:10px;padding:10px 14px 10px 10px;box-shadow:inset 0 0 0 1px #E4E6EB;font:13px/1.3 system-ui,sans-serif}
.pp-post small{color:#65676B;margin:2px 0 0;text-align:left}
.pp-mini svg{border-radius:50%;display:block}
/* site header mock (the live site's navbar: ink-950, 64 px) */
.site-hdr{--m:${SKY};--t:${WHITE};background:#050A18;border:1px solid #131C45;border-radius:12px;height:64px;display:flex;align-items:center;gap:28px;padding:0 20px;font:500 14px Inter,system-ui,sans-serif;color:#8B9FC4;min-width:0}
.site-logo{display:flex;flex:none}
.site-nav{display:flex;gap:22px;margin-left:auto;white-space:nowrap}
.site-cta{background:${SKY};color:#050A18;font-weight:600;border-radius:999px;padding:8px 16px;white-space:nowrap}
.site-burger{display:none;width:22px;gap:4px;flex-direction:column;margin-left:auto}
.site-burger i{display:block;height:2px;background:#8B9FC4;border-radius:2px}
@media (max-width:900px){.site-nav{display:none}.site-cta{margin-left:auto}}
@media (max-width:520px){.site-cta{display:none}.site-burger{display:flex}.site-hdr{padding:0 16px}}
/* browser tabs */
.fav-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto auto;gap:14px;align-items:center;--tile:${NAVY};--g:${SKY}}
@media (max-width:980px){.fav-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
@media (max-width:560px){.fav-row{grid-template-columns:1fr}}
.tabs{display:flex;gap:2px;padding:8px 8px 0;border-radius:10px 10px 0 0;overflow:hidden;min-width:0}
.tabs.light{background:#DEE1E6;color:#1F1F1F}
.tabs.dark{background:#1F1F1F;color:#E3E3E3}
.tab{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border-radius:8px 8px 0 0;font:12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;min-width:0;flex:1 1 0;max-width:220px}
.tab svg{flex:none}
.tabs.light .tab.on{background:#fff}
.tabs.dark .tab.on{background:#3C3C3C}
.tab-t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.tab-x{opacity:.6}
.f32{display:grid;grid-template-columns:auto auto;gap:6px}
.f32 small{grid-column:1/-1}
.f32-l,.f32-d{width:52px;height:52px;border-radius:10px;display:grid;place-items:center}
.f32-l{background:#F1F3F4}.f32-d{background:#202124}
.home{display:grid;justify-items:center}
.home-ic{width:92px;height:92px;border-radius:22px;overflow:hidden;display:block;box-shadow:0 0 0 6px transparent}
.home-ic svg{width:100%;height:100%;display:block}
.home{background:url(${grass}) center/cover;padding:14px 18px 8px;border-radius:14px}
.home small{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}
.big180{display:flex;flex-wrap:wrap;gap:12px}
.check{font-size:14px;color:var(--muted);max-width:90ch}
.check b{color:var(--ink)}
.files{font-size:12px;color:var(--muted)}
.files code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);background:var(--chip);padding:1px 6px;border-radius:5px}
.notes{display:grid;gap:10px;max-width:75ch;color:var(--muted);font-size:14px}
.notes b{color:var(--ink)}
@media (prefers-reduced-motion:reduce){.ov-tile{transition:none}}
`;

const overview = `<div class="grid10">${C.map((c) => `<a class="ov" href="#${c.slug}"><div class="ov-tile">${use(`${c.k}-sym`, 96, 96, '', `Concept ${c.n}: ${c.name}`)}</div><span><b>${c.n}</b>${c.name}<em>${c.type === 'New direction' ? 'New' : c.type}</em></span></a>`).join('')}</div>`;

const headersWall = `<div class="scroll"><div class="stack">${C.map((c) => `<div class="row"><b>${c.n}</b>${header(c)}</div>`).join('')}</div></div>`;
const tabsWall = `<div class="tabwall">
  <div class="scroll"><div class="tabs light" style="min-width:880px">${C.map((c, i) => tab(c, i === 0, c.n + ' · DalaTech')).join('')}</div></div>
  <div class="scroll"><div class="tabs dark" style="min-width:880px">${C.map((c, i) => tab(c, i === 0, c.n + ' · DalaTech')).join('')}</div></div>
</div>`;
const ppWall = `<div class="pp-wall" style="--tile:${NAVY};--g:${SKY}">${C.map((c) => `<figure>${use(`${c.k}-pro`, 96, 96, '', `Concept ${c.n} profile picture`)}<figcaption>${c.n}</figcaption></figure>`).join('')}</div>`;

const body = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${sprite}</defs></svg>
<main class="wrap">
  <section class="intro">
    <p class="eyebrow">DalaTech · logo exploration · preview only</p>
    <h1>Ten logo concepts, side by side</h1>
    <p>Three refinements of the current wave-D (01–03), four new directions (04–07, three of them not letters at all) and three wordmarks (08–10). Every mark is hand-built geometry exported as a single flat SVG fill, so each one sits cleanly on any background. Nothing here is on the live site.</p>
    <div class="pal">
      <span class="sw"><i style="background:${NAVY}"></i>Navy <code>${NAVY}</code></span>
      <span class="sw"><i style="background:${SKY}"></i>Sky <code>${SKY}</code> on dark</span>
      <span class="sw"><i style="background:${DEEP}"></i>Deep sky <code>${DEEP}</code> on light</span>
      <span class="sw"><i style="background:${BRAND}"></i>Brand blue <code>${BRAND}</code> 2nd tone on dark</span>
      <span class="sw"><i style="background:${WHITE}"></i>Mist <code>${WHITE}</code> text on dark</span>
    </div>
    <p><b>Colour rules.</b> Light blue ${SKY} and dark blue ${NAVY} carry every concept. One-colour marks switch to Deep sky ${DEEP} on white, because ${SKY} alone reaches only 1.9:1 contrast there and washes out; Deep sky is the same hue at 5:1. Two-tone marks (05–07) pair light blue with navy on light grounds, and with brand blue ${BRAND} on dark grounds, where navy would vanish.</p>
  </section>

  <section class="group" aria-labelledby="g1">
    <header><h3 id="g1">All ten symbols</h3><p>Tap one to jump to its sheet.</p></header>
    ${overview}
  </section>

  <section class="group" aria-labelledby="g2">
    <header><h3 id="g2">In the website header</h3><p>The live navbar at real size: 64 px tall, ink-950 background.</p></header>
    ${headersWall}
  </section>

  <section class="group" aria-labelledby="g3">
    <header><h3 id="g3">As favicons in a row of tabs</h3><p>Actual 16 px, the size people really see.</p></header>
    ${tabsWall}
  </section>

  <section class="group" aria-labelledby="g4">
    <header><h3 id="g4">As profile pictures</h3><p>Facebook and Instagram crop to a circle.</p></header>
    ${ppWall}
  </section>

  ${C.map(section).join('\n')}

  <section class="notes">
    <h3>Notes</h3>
    <p><b>How the marks are made.</b> Circles, rectangles, arcs and a few Bézier curves on a 96-unit grid, merged with boolean operations into one path per colour. No traced raster, gradients, shadows or effects. Wordmark type is outlined from Manrope (SIL Open Font License, which allows logo use); the 10 letters are drawn from scratch.</p>
    <p><b>Resemblance checks</b> were done by eye against well-known tech and finance marks, not a trademark search. Run a proper search in Mongolia (and wherever you register) on the finalist before committing.</p>
    <p><b>Photo:</b> “coffee” by Rachel Michetti, CC0, from the scikit-image sample set. <b>Home-screen wallpaper:</b> the scikit-image grass sample, public domain.</p>
  </section>
</main>`;

const head = `<title>DalaTech Logo Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@700;800&display=swap">
<style>${css}</style>`;

// artifact (the host wraps it in its own document) and the full page for the repo
fs.writeFileSync('artifact.html', head + body);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
${head}
</head>
<body>${body}
</body>
</html>
`);
for (const [f, s] of Object.entries(files)) {
  fs.mkdirSync(path.join(OUT, path.dirname(f)), { recursive: true });
  fs.writeFileSync(path.join(OUT, f), s);
}
console.log('ok', Object.keys(files).length, 'svg files;', (fs.statSync('artifact.html').size / 1024).toFixed(0), 'KB page');
