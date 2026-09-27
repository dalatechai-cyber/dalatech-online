# Homepage preview — progress log

Branch: `claude/fervent-ramanujan-q51g1a` (dalatech-online), draft PR #49. **Preview only** —
nothing is merged to `main`; production (https://dalatech.online) is untouched.

If a session stops, read this file top to bottom and continue from "Next".

## Round 2 brief (founder, 2026-09-27): keep the live site, bring over only a few things

The full redesign (preview v1, commit `bdaac15`) read as cheap. Round 2 restores the live
site's structure, pages and look, and brings over only what the founder listed.

| # | Item | State |
|---|------|-------|
| 0 | Inventory of what preview v1 removed/changed vs live (below) | done |
| 1 | Every navbar item has its own page again; homepage short like live | done |
| 2 | Hero = live hero + rotating word (Facebook / Instagram / вэбсайт) + spotlight; no Дали chip | done |
| 3 | No blur-fade anywhere; no block starts hidden while scrolling | done |
| 4 | Live pixel office + iPhone kept, Дали only, never-empty phone, smoother | done |
| 5 | «АЖИЛЛАХ ЗАРЧИМ» kept, no Telegram — details reach «танд» | done |
| 6 | Live small staff list (head icons, status, no prices); head-only pictures site-wide | done |
| 7 | Prices page: live layout + monthly/yearly toggle; bundle 925,000₮ crossed → 800,000₮; launch offer behind a switch (off) | done |
| 8 | «МЭДЭЭЛЛИЙН ХАМГААЛАЛТ» kept | done |
| 9 | FAQ page in the live two-column format, approved answers | done |
| 10 | Only live text sizes/weights | done (checked by script: no size outside the live set) |
| 11 | Sales copy for headlines and every staff description (drafts) | in progress |
| 12 | Privacy policy: deletion within 30 days after the contract ends; 72-hour breach notice | done |
| 13 | «1 гэж коммент» — Facebook only | done |
| 14 | /office: Вира «маркетинг менежер», Нова «сануулга, SMS», sales descriptions, head icons | in progress (with 11) |

## Next
- Apply the sales-copy workflow output (item 11/14), verify side by side with live at 390/1440,
  run the review workflow, push, report.

## Decisions (round 2)
- **Restored from `main`**: `src/App.jsx`, `src/index.css`, `src/locales/*.json`, then re-applied only the
  items above. The approved prices in `src/office/agents.js` stay (setup 50,000₮, Вира 350,000₮, Эхо not
  announced), because the live /office and /pricing still showed the old ones.
- **Entrance animations**: `Reveal`, `StaggerGroup`, `StaggerItem`, the footer and the location section
  no longer start at opacity 0; content is on screen as soon as it is scrolled to. Mount-time motion in
  the hero and the chat demo's timed messages stay.
- **Hero**: the live day ring stays (the brief said "live hero, plus only…"). If the ring should go,
  say so — it is one line.
- **Pixel office**: the room keeps its four desks but only Дали sits at one; a pixel bubble over her
  screen shows a message waiting (typing dots) and answered (tick). The phone is a stack of notifications
  on the room's clock (`DAY_CARDS` in `src/office/scenes.js`): first card from the first frame, newest on
  top, oldest slides out — it can never be empty. Story: 02:14 booking asked at night → link sent → owner
  told; 09:40 price question; 13:25 a 30% discount request Дали does not answer herself → passed to the
  owner; 21:30 website message after closing; 21:45 summary (4 answered, 1 link, 1 passed on — the
  numbers count what the phone just showed).
- **Head icons**: one `StaffHead` crop (atlas rows 15–45: hair to neck) replaces every staff portrait
  (staff list, pricing cards, board lanes, team builder, request form, phone icons, ring caption). The
  pixel *scenes* (the office room, the /office chapters) still show people at desks — those are scenes,
  not pictures.
- **Pricing toggle**: adapted from the 21st.dev Kokonut "Pricing Section" toggle
  (`src/components/ui/pricing-section.jsx`); the cards are the live cards. Yearly = monthly × 10
  («10 сарын төлбөрөөр 12 сар»): Дали 2,500,000₮, Вира 3,500,000₮, Нова 1,500,000₮, Ора 2,500,000₮;
  Эхо stays «Үнийг хараахан зарлаагүй.». Website and bundle are one-off and do not change.
- **Bundle**: 925,000₮ crossed out = website 750,000₮ + Дали setup 50,000₮ + half of Дали's first month
  125,000₮; badge «125,000₮ хөнгөлөлт».
- **Launch offer («Анхны 10 бизнест»)**: code kept in `LaunchOffer` (App.jsx), rendered only when the
  build has `VITE_LAUNCH_OFFER=on` (Vercel env var + redeploy). Off by default: nothing of it shows.
  Seats: `LAUNCH_SEATS_LEFT` constant, a real count. Tested both ways.
- **Contact**: live section kept; the email button became «Messenger-ээр бичих»; one line under the
  buttons: the Facebook «1» comment route and the email address.
- **Privacy / terms**: privacy §7 and terms §16 now say deletion within 30 days after the contract ends
  (terms §16 was aligned so the two pages agree); privacy §9 says breach notice within 72 hours. Other
  legal text was not rewritten (see open questions).
- **21st components kept**: Spotlight, Word Rotate, Animated Beam, Shimmer Button (launch offer only),
  the Pricing Section toggle. Removed: Blur Fade, Animated List, Bento Grid, Border Beam, Number Ticker,
  Safari, Accordion.

## Inventory — what preview v1 removed and changed vs live
(see the section below this line; kept for the record)

## New Mongolian copy waiting for approval
(filled in when item 11 lands)

## Open questions for the founder
(filled in at the end of round 2)
