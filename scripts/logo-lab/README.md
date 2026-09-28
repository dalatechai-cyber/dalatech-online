# Logo lab generator

Builds the hidden logo preview at `public/logo-lab/` (not linked from the site,
`noindex`). Not part of the Vite build.

Run from this folder after installing the tools it needs (kept out of
package.json on purpose):

    npm i --no-save opentype.js@1.3.4 paper@0.12.18 playwright-core @fontsource/manrope@5.1.0
    node gen.mjs                       # marks + lockups -> built.json (runs paper.js in Chromium)
    node page.mjs ../../public/logo-lab   # SVG files + index.html

`geo.js` holds every mark as geometry on a 96-unit grid; `compose.js` builds
lockups, favicons and the wordmarks. Photos: scikit-image samples
(coffee by Rachel Michetti, CC0; grass, public domain).
