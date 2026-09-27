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
| 11 | Sales copy for headlines and every staff description (drafts) | done (drafts, for approval) |
| 12 | Privacy policy: deletion within 30 days after the contract ends; 72-hour breach notice | done |
| 13 | «1 гэж коммент» — Facebook only | done |
| 14 | /office: Вира «маркетинг менежер», Нова «сануулга, SMS», sales descriptions, head icons | done |

## Next
- Run the code review over `git diff main...HEAD`, fix what it confirms, push, report.

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
(made by a 5-reader workflow plus a completeness critic, before round 2 changed anything)

Preview v1 = branch commit `bdaac15` (the full redesign). Live = `main` (`037731f`).

### Navigation and pages
- «Үнэ» and «Асуулт» in the navbar (desktop and phone menu) no longer opened their own pages. They jumped to sections on the homepage, and their active underline never showed.
- /pricing and /faq still loaded, but they showed the new homepage sections instead of the live pages. Footer links still went to /pricing and /faq.
- The homepage grew from 6 to 12 sections. The website case study ("Бидний хийсэн вэбсайт") moved off the homepage into a new website section.

### Homepage `/`
- **Hero**
  - Removed: the 24-hour clock ring (DayRing) with its 7 Дали moments, and the two-column layout. It became one centred column.
  - Changed: the headline became a rotating word (Facebook / Instagram / вэбсайт) + «дээрх зурваст 24/7 хариулах AI ажилтан.». It was set larger (40/56/70 px, live 36/48/58).
  - Changed: the lead was cut to its first sentence, dropping «Вира, Эхо, Нова, Ора удахгүй нэгдэнэ…» and «Нэмэлт орон тоо…».
  - Changed: the second link became «Үнийг харах». Live had «Ажилтнуудтай танилцах».
  - Changed: the background light became the Spotlight sweep.
  - Added: a chip «Дали · Идэвхтэй · Үнэ: 250,000₮/сар…» with a full-body Дали.
- **Pixel office + iPhone (WorkingDay)**
  - Removed entirely: the pixel room and the owner's phone feed with Дали, Вира's report, Ора, Эхо's call, Нова's discount and reminder cards, and the summary.
  - Replaced by a «ШӨНИЙН ЗУРВАС» section: a lock-screen phone with 3 cards (a customer, Дали, and a Telegram lead) and 3 check points.
- **Added «АЖИЛЛАХ ЗАРЧИМ»**
  - An animated beam from FB/IG/website to Дали to «Таны Telegram», plus 3 steps.
  - Telegram was named in the title, the diagram and step 3.
- **LiveDemo**: unchanged, moved to 4th place.
- **AI staff**
  - Removed: the live thin list (head icon, name, role, status, no prices).
  - Replaced by big Bento cards. Дали had a large card with a border beam, a full-body figure, the price and a button. The other four had prices and «Урьдчилан бүртгүүлэх».
- **Website**
  - The live Portfolio case study (browser mock, "Гүйцэтгэсэн ажил / Үр дүн" boxes) was replaced by a Safari frame, a 750,000₮ price card and an add-ons list.
  - A booking strip and a Дали bubble were added inside the salon mock, which /portfolio also shows.
- **Added on the homepage**
  - Full prices (monthly/yearly), the team discount and 3 term cards.
  - «ОНЦГОЙ САНАЛ»: gold «Вэбсайт + Дали» and «Анхны 10 бизнест» with a 10/10 counter.
  - «ЭХЛЭХ» 3 steps.
  - «МЭДЭЭЛЛИЙН ХАМГААЛАЛТ» with 72/30 counters.
  - A 12-question accordion FAQ.
- **Contact**
  - Removed: the orb background and the 40–80 px title.
  - Buttons changed to three tiles: Messenger, «1» comment, and demo. Live had request, demo and email.
  - The lead mentioned Facebook «1».
- **Animations**
  - Blur-fade on 18 blocks: content sat at opacity 0 until scrolled into view. This is the black gap you saw.
  - Endless word rotate, beams and border beam were added.
- **Staff pictures**: full-body figures (to the feet) in the hero chip, the how-it-works Дали node and the big Дали card. Live used face-and-shoulder crops only.
- **Type**: six text sizes live never used (7, 7.5, 16.5, 24, 52, 70 px), the hero set larger (40/56/70 px), and section labels in a new accent colour #60C8FF, uppercase and bolder.

### /pricing
- Removed:
  - the live layout: «AI ажилтнууд» header with the discount text, 4 staff cards, Ора's own row «Зөвхөн танд», the «Вэбсайт» block with the 750,000₮ card, the bundle card with the price crossed out, and the payment-terms box with its button and note.
  - the «Featured» chip.
- Replaced by 5 big tier cards with a toggle, a discount box, 3 term cards and the gold offers section. The bundle lost its crossed-out price, and the website had no price card on /pricing.
- Prices changed to the approved list: setup 50,000₮ (live 150,000₮/200,000₮), Вира 350,000₮ (live 150,000₮), Эхо «Үнийг хараахан зарлаагүй.» (live 250,000₮ + per minute). The ₮ sign moved after the number.

### /faq
- The live two-column card grid and the «Нэмэлт асуулт» box were removed.
- Replaced by a sticky left header and a 12-item accordion. Six answers were reworded to Дали's approved lines, and six questions were added.

### /office
- Unchanged except the prices:
  - agents.js prices changed: setup 50,000₮, Вира 350,000₮, Эхо not announced.
  - The «Вира зөвхөн өөр ажилтантай хамт» rule and the Эхо per-minute note were removed.
  - Totals now skip Эхо.
- Still old in preview v1:
  - roles (Вира «Бизнес аналитик», Нова «Харилцагчийн менежер») and job lines
  - the hero lead
  - the board lanes («Сарын тоо», «Алга болсон харилцагч»)
  - the Вира chapter (a sales report chart)
  - the Нова chapter (feedback / win-back chat)
  - the Ора intro
  - the demo-form service lines («Сарын тайлан», «Харилцагчтай эргэн холбогдоно»)
- The staff head icons were unchanged.

### Also found by the checker
- Two classes in preview v1 (`bg-accent/12`, `ring-white/12`) produced no CSS: the Дали «Идэвхтэй» pill and the tile buttons lost their tint and ring.
- The number counters showed «0 цаг», «0 хоног» and «−0%» until they were scrolled into view.
- The salon mock's new booking strip was hardcoded Mongolian, not in the locale files.

### Other
- New packages clsx and tailwind-merge. New colour tokens accent and gold. Keyframes for spotlight, border beam and shimmer.
- 12 vendored 21st components.
- CSS for the ring, the working day and the contact orbs was deleted.
- Dead copy: hero.*, day.*, theFour.*, contact.* and most pricing.* / faq.* were left unused. pricing.cards.bundle was deleted.
- No change to index.html, vercel.json, the privacy / terms / data-deletion pages, or the chatbot.
- Measured cost: JS +19 KB gzip. Phone LCP ~1.2 s against ~1.05 s on live.

## New Mongolian copy waiting for approval
(filled in when item 11 lands)

## Open questions for the founder
1. **Telegram in the privacy policy.** "No Telegram anywhere a customer can see" is done on the site itself.
   Privacy §3 and §8 still name Telegram (and Gmail) as the services that carry a demo request to us. That is
   the processor list a privacy policy has to disclose, so it was left as is. Removing it would make the
   policy untrue. Say if you want it reworded, e.g. «мессенжер үйлчилгээ».
2. **Old role text in the legal pages.** Privacy §1–§2 and terms §3 still say Вира «бизнес аналитик» and Нова
   «харилцагчийн менежер». Terms §3 still has «Вира зөвхөн өөр ажилтантай хамт ажиллана». Privacy §8
   names Gemini as the AI provider. Legal wording was not rewritten without approval.
3. **Hero day ring.** The live 24-hour ring stays next to the headline ("live hero, plus only…"). It can
   be removed in one line.
4. **Yearly prices.** Yearly = 10 months for 12. Дали 2,500,000₮, Вира 3,500,000₮, Нова 1,500,000₮,
   Ора 2,500,000₮. Эхо has no price. Please confirm these totals.
5. **Prices differ from live.** The preview uses the approved list (`facts.js`): setup 50,000₮ and
   Вира 350,000₮. The live site still shows setup 150,000₮/200,000₮ and Вира 150,000₮.
6. **Pixel scenes.** Every *picture* of a staff member is now a head icon. The pixel office scenes on
   `/` and `/office` still show the characters at their desks, because they are rooms, not portraits.
7. **Launch offer and Дали.** When `VITE_LAUNCH_OFFER=on`, the site shows «Анхны 10 бизнест». Дали's
   Messenger prompt in dalatech-chatbot does not know about the offer, so she cannot answer questions
   about it on launch day.
8. **«1» comment.** The site says it works on any DalaTech Facebook post, Facebook only (not Instagram).
