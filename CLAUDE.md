# Dalatech.ai — website

## What this is
The Dalatech.ai company website. Dalatech builds websites, AI chatbots,
and business automation for Mongolian SMBs.

## Stack
Vite 5 + React 18 SPA. **Not Next.js.** Plain JSX — there is no TypeScript
in this repo and no build step that would typecheck it.

- Routing: `react-router-dom` v6 (`BrowserRouter`, client-side only)
- Styling: Tailwind CSS 3 (`tailwind.config.js`), plus `src/index.css`
- Animation: `framer-motion`
- 3D: `three` (the globe on the location section)
- Pixel art: a plain 2D canvas on `/` and `/office` (`src/office/pixel.js`)
- i18n: `i18next` + `react-i18next`
- Deploy: Vercel, framework preset `vite`, output `dist/`

## Commands
    npm ci          # install
    npm run dev     # vite dev server
    npm run lint    # eslint src (runs as part of build)
    npm run build   # npm run lint && vite build -> dist/
    npm run preview # serve the built output

There is no test or typecheck script. `npm run build` is the gate — run it
before committing and treat a failure as blocking. It runs `npm run lint`
first, so a lint error fails the build and the Vercel deploy.

**Why the lint step exists.** Vite/Rollup will happily bundle code that
throws the moment a browser runs it, and both failures below reached
production:

- `App.jsx` imported `heroHour` from `./office/scenes`, which has never
  exported it. Rollup emits a warning and carries on; the dev server
  resolves the same import strictly and threw, so `npm run dev` was dead
  while `npm run build` stayed green.
- `TECH_STACK` was deleted along with the component above it but was still
  referenced. Rollup treats an unknown identifier as a global and says
  nothing at all, so `/technology` threw `ReferenceError` at render, the
  `ErrorBoundary` swallowed it, and the route shipped as a bare shell.

So there are two independent layers, and either alone stops both:

- `vite.config.js` turns `MISSING_EXPORT`, `UNRESOLVED_IMPORT`,
  `MISSING_GLOBAL_NAME` and `CIRCULAR_DEPENDENCY` from warnings into build
  errors.
- `eslint.config.js` runs `no-undef`, `react/jsx-no-undef` (a JSX element
  name is a `JSXIdentifier`, which plain `no-undef` does not resolve) and
  `no-unused-vars`.

The rule set is deliberately semantic, not stylistic: it sits inside the
build, so a rule that fires on formatting would block a deploy for no
safety gain. Keep it that way when adding rules.

## Layout
    index.html            document head: title, OG/Twitter tags, chatbot widget
    src/main.jsx          entry; mounts <App> in StrictMode
    src/App.jsx           ~3.4k lines: every component, page and the router
    src/Globe.jsx         three.js globe, lazy-loaded
    src/office/           the pixel office: pixel.js (atlas, stage, sprite
                          helpers), scenes.js (the office room, the four pixel /office
                          chapters, and the landing page's working-day timeline
                          that runs behind the owner's phone), agents.js (prices),
                          staff.json (atlas manifest)
    src/Setup.jsx         Facebook SDK page-connect flow, lazy-loaded at /setup
    eslint.config.js      the build's lint gate (see Commands)
    src/i18n.js           i18next init
    src/locales/          en.json, mn.json
    public/               static assets, plus standalone pages (below)
    scripts/              one-off maintenance scripts, not part of the build
                          (scripts/build-staff-pack.py rebuilds public/office/staff.png
                          and src/office/staff.json from the licensed LimeZu packs in
                          assets-src/office/limezu, which are not committed)

`src/App.jsx` holds the whole UI. Page components (`LandingPage`,
`ProductsPage`, …) live near the bottom and compose the section components
defined above them. Keep new sections in the same file unless something
genuinely stands alone, like `Globe.jsx`.

## Routing — read before adding a route
Routes are client-side: `/`, `/office`, `/process`, `/location`,
`/portfolio` (the website page), `/pricing`, `/faq`, `/setup`, two
redirects kept for old links (`/products` to `/office`, `/technology` to
`/`), and a `*` fallback that renders the not-found page.

`vercel.json` rewrites everything to `/index.html` so direct hits and
refreshes reach the app. **Do not remove it** — without it every route
except `/` returns a Vercel 404 on a direct hit, which is invisible during
normal browsing because client-side navigation still works.

Rewrites run after the filesystem check, so real files always win. The
standalone static pages under `public/` — `/privacy/`, `/terms/`,
`/data-deletion/` — are plain HTML, unrelated to the React app, and are
served directly. They are linked from Meta's app review, so keep their URLs
stable.

## Language
Code, comments, commits: English.
Anything a visitor reads: Mongolian (Cyrillic).

The UI ships two locales — `mn` (default), `en` — switched from
the navbar and persisted to `localStorage` under `language`. New
visitor-facing copy belongs in both locale files, not hardcoded in JSX.
Some sections still have hardcoded English; see `TRANSLATION_GUIDE.md`.

## Brand
Dark, premium, professional. Must not look AI-generated.

Palette lives in `tailwind.config.js` — use the tokens, not raw hex:

- `ink-950 #050A18` … `ink-600 #1A2557` — backgrounds, deepest first
- `sky-400 #38BDF8` — primary accent (glow, highlights)
- `brand-500 #2563EB`, `brand-400 #3B82F6` — secondary accent
- `fg #F0F4FF`, `fg-muted #8B9FC4`, `fg-dim #5A6E94` — text

Type: `Manrope` for display, `Inter` for body. Both cover Cyrillic; a display
face without Cyrillic (Outfit was one) silently renders every heading in Inter.

## Standards
- Mobile-first responsive. Most visitors arrive from Facebook on a phone,
  so check narrow viewports first.
- Tailwind for styling. No CSS modules, no styled-components.
- Handle errors explicitly. No silent failures, no empty catch blocks.
  Risky subtrees are wrapped in the `ErrorBoundary` in `src/App.jsx`; use it
  for anything that can throw at render, and give it a `fallback`.
- Respect `prefers-reduced-motion` — the existing animation helpers already
  do, so follow their pattern rather than adding raw transitions.
- Comment non-obvious logic.

## Deployment
Vercel project `dalatech-online`, live at **https://dalatech.online**
(`www.dalatech.online` also attached). Pushes to `main` deploy to production.

Preview deployments are covered by Vercel Authentication
(`all_except_custom_domains`), so every `*.vercel.app` URL redirects to SSO
and cannot be fetched anonymously — verify previews while logged in, or
verify on the custom domain after merging.

## Working agreement
- Investigate before changing anything: read the code, reproduce the
  behaviour on the live site, check the Vercel deployment.
- After each change, verify against the live deployment. If the goal isn't
  met, diagnose the new state and fix again.
- Review every changed file before committing — silent error paths, timeout
  risks, any failure that leaves the system stuck.
- Commit and push only when verified.
