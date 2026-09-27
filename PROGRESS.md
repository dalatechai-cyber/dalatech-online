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
- Founder approved the copy (2026-09-27) with fixes, now applied: Дали sends the booking link and does not
  register bookings (hero, pixel office title, bundle, Дали's /office chat, privacy §2/§6); «секундын дотор»
  is «хэдхэн секундэд» everywhere; FAQ «AI-ийн ашиглалт». Legal pages: Вира «маркетинг менежер», Нова
  «сануулга, SMS», «Вира зөвхөн өөр ажилтантай хамт» removed; Telegram/Gmail stay in the privacy processor
  list; Вира's weekly report stays; yearly totals confirmed. Still preview only.

## Code review (round 2)
A review workflow over `git diff main...HEAD`: 4 reviewers (runtime, visitor UX, content truth,
consistency with live), each finding checked by 2 skeptics. 18 findings, 12 survived; fixed:
- Phone clock could step back a minute and jump 70 minutes in one frame: it now shows the newest card's time.
- Reduced motion / no pixel room: the phone at rest showed only the last 3 of 11 cards; it now shows the whole day.
- «АЖИЛЛАХ ЗАРЧИМ» under reduced motion: the still beams lit only the left strip, the Дали → «Танд» beam was dark.
- The in-phone «Хүсэлт илгээх» opened the form without Дали preselected, unlike the button under it.
- /office team builder: Эхо alone showed «0₮/сар»; it shows «—» now.
- Нова's 1,000 SMS read as per year under the yearly price: now «Сард 1,000 SMS…».
- /portfolio listed «7–10 ажлын өдөрт хүлээлгэн өгнө» twice.
- Privacy/terms: download window and deletion now read the same in MN and EN (30 days to download, deleted at the end).
- Dead locale keys removed (`hero.title`, `contact.emailCta`, `office.chapters.vira.report`).
Not changed, on purpose: the legal pages' old staff roles and «Вира зөвхөн өөр ажилтантай хамт» (open question 2);
the `accent` colour #60C8FF (the founder's round-1 rule: the logo's light blue).

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
Every Mongolian line that is new or changed against `main` (live), by where it appears. All are drafts.

**Homepage `/` — hero**
- `hero.badge` — Монгол хэлээр, орон тоо нэмэхгүйгээр
- `hero.description` — Шөнө ч, амралтын өдөр ч харилцагч тань хариугүй үлдэхгүй. Дали танай Facebook хуудас, Instagram, вэбсайтад ирсэн асуултад монгол хэлээр, секундын дотор хариулж, захиалгыг бүртгэнэ — зөвхөн таны өгсөн үнэ, цаг, үйлчилгээний мэдээллээр. Нэмэлт орон тоо, ээлж, амралтын зардал гарахгүй. Вира, Эхо, Нова, Ора удахгүй нэгдэнэ; одоо урьдчилан бүртгүүлж болно.
- `hero.buttons.seeWork` — Танай AI багтай танилцах
- `hero.channels[2]` — вэбсайт
- `hero.channelsStatic` — Facebook, Instagram, вэбсайт
- `hero.titleAfter` — дээрх зурваст 24/7 хариулах AI ажилтан.
- `hero.titleA11y` — Facebook, Instagram, вэбсайт дээрх зурваст 24/7 хариулах AI ажилтан.

**Homepage `/` — pixel office + owner's phone**
- `day.title` — Та унтаж байхад ч захиалга бүртгэгдэнэ.
- `day.lead` — Өглөөнөөс шөнө хүртэл Дали харилцагчдад хариулж, зөвхөн хэрэгтэй нь танд ирнэ.
- `day.closing` — Өнөөдөр хүсэлт илгээвэл Дали 1–2 долоо хоногийн дотор танай харилцагчдад хариулж эхэлнэ.
- `day.sceneAlt` — Оффисын өрөө шөнөөс орой хүртэл: Дали ширээндээ сууж, ирсэн зурвас бүрт хариулна. Бусад ширээ удахгүй нэгдэх ажилтнуудад бэлэн.
- `day.phone.alt` — Таны утас: Далигийн нэг өдөр
- `day.feed.nightAsk.from` — Болд · Messenger
- `day.feed.nightAsk.body` — Сайн байна уу, маргааш цаг авч болох уу?
- `day.feed.nightReply.from` — Дали · Болдод
- `day.feed.nightReply.body` — Сайн байна уу. Энэ холбоосоор өөрт тохирох цагаа сонгож захиална уу.
- `day.feed.nightBooked.from` — DalaTech · Танд
- `day.feed.nightBooked.title` — Захиалах сонирхолтой харилцагч
- `day.feed.nightBooked.body` — Болд маргааш цаг авахыг хүссэн. Дали захиалгын холбоосыг шөнийн 02:14-т илгээсэн.
- `day.feed.priceAsk.from` — Сараа · Instagram
- `day.feed.priceAsk.body` — Үнийн мэдээлэл авч болох уу?
- `day.feed.priceReply.from` — Дали · Сараад
- `day.feed.priceReply.body` — Мэдээж. Үнийн жагсаалтыг илгээлээ.
- `day.feed.discountAsk.from` — Номин · Messenger
- `day.feed.discountAsk.body` — 30% хямдруулж болох уу?
- `day.feed.discountReply.from` — Дали · Номинд
- `day.feed.discountReply.body` — Энэ асуултад манай ажилтан тантай холбогдож хариулна.
- `day.feed.discountHandoff.from` — DalaTech · Танд
- `day.feed.discountHandoff.title` — Танд шилжүүлсэн асуулт
- `day.feed.discountHandoff.body` — Номин: «30% хямдруулж болох уу?» Дали хөнгөлөлт өөрөө амлахгүй — шийдвэрийг та гаргана.
- `day.feed.lateAsk.from` — Тэмүүлэн · Вэбсайт
- `day.feed.lateAsk.body` — Маргааш ажиллах уу?
- `day.feed.lateReply.from` — Дали · Тэмүүлэнд
- `day.feed.lateReply.body` — Сайн байна уу. Бид маргааш 10:00–20:00 цагт ажиллана.
- `day.feed.summary.title` — Өнөөдөр Дали
- `day.feed.summary.rows[0]` — 4 харилцагчид хариулсан
- `day.feed.summary.rows[1]` — 1 захиалгын холбоос илгээсэн
- `day.feed.summary.rows[2]` — 1 асуултыг танд шилжүүлсэн

**Homepage `/` — «АЖИЛЛАХ ЗАРЧИМ»**
- `how.section` — АЖИЛЛАХ ЗАРЧИМ
- `how.title` — Гурван суваг. Нэг Дали.
- `how.description` — Харилцагч аль сувгаар бичсэн ч Дали хариулна. Facebook, Instagram, вэбсайт нэг үнэд багтана.
- `how.diagramLabel` — Facebook, Instagram, вэбсайтын зурвас Далид ирж, харилцагчийн мэдээлэл танд очно
- `how.website` — Вэбсайт
- `how.owner` — Танд
- `how.steps[0].title` — Харилцагч бичнэ
- `how.steps[0].body` — Facebook, Instagram, вэбсайтаар, шөнө дунд ч, амралтын өдөр ч.
- `how.steps[1].title` — Дали шууд хариулна
- `how.steps[1].body` — Таны өгсөн үнэ, цаг, үйлчилгээний мэдээллээр секундын дотор хариулж, захиалгын холбоосыг илгээнэ. Мэдэхгүй зүйлээ таамаглахгүй.
- `how.steps[2].title` — Захиалагчийн мэдээлэл танд ирнэ
- `how.steps[2].body` — Захиалах гэсэн харилцагчийн мэдээлэл, шийдвэр шаардсан асуулт таны гарт шууд ирнэ.

**Homepage `/` — AI staff list (roles also show on /pricing cards and the /office board)**
- `theFour.title` — Өнөөдөр Дали. Удахгүй бүтэн баг.
- `theFour.lead` — Дали өнөөдрөөс танай харилцагчдад хариулна. Удахгүй маркетингийг Вира, дуудлагыг Эхо, сануулгыг Нова хариуцаж, Ора зөвхөн тантай ажиллана.
- `office.agents.nova.role` — Сануулга, SMS
- `office.agents.vira.role` — Маркетинг менежер

**Homepage `/` — chat demo**
- `liveDemo.title` — Харилцагч асуумагц Дали хариулна.
- `liveDemo.description` — Салоны Messenger ярианы жишээ. Дали таны өгсөн мэдээллээр хариулж, цаг авах холбоосыг илгээнэ. Таамаглахгүй, хөнгөлөлтийг өөрөө амлахгүй: шийдвэрийг танд шилжүүлнэ. Танай бизнест тохируулсан Далиг бид үзүүлнэ.

**Homepage `/` and `/portfolio` — website**
- `portfolio.title` — Захиалга авдаг вэбсайт
- `portfolio.description` — Гоо сайхны салонд хийсэн вэбсайт. Харилцагч цагаа онлайнаар захиалж, QPay-ээр төлж, асуултад нь Дали шууд хариулна.

**Homepage `/` — «МЭДЭЭЛЛИЙН ХАМГААЛАЛТ»**
- `dataProtection.section` — МЭДЭЭЛЛИЙН ХАМГААЛАЛТ
- `dataProtection.title` — Танай мэдээлэл зөвхөн танд үйлчилнэ.
- `dataProtection.description` — Харилцагчид тань танд итгэдэг. Бид тэр итгэлийг дараах зарчмаар хамгаална.
- `dataProtection.items[0].title` — Зөвхөн үйлчилгээнд
- `dataProtection.items[0].body` — Танай болон харилцагчдын мэдээллийг зөвхөн танд үйлчлэхэд ашиглана.
- `dataProtection.items[1].title` — Худалдахгүй
- `dataProtection.items[1].body` — Мэдээллийг хэзээ ч худалдахгүй, өөр AI сургахад ашиглахгүй.
- `dataProtection.items[2].title` — Бизнес бүр тусдаа
- `dataProtection.items[2].body` — Бизнес бүрийн мэдээлэл бусдаас тусдаа хадгалагдана.
- `dataProtection.items[3].title` — Шифрлэгдсэн түлхүүр
- `dataProtection.items[3].body` — Танай хуудас, сувагт нэвтрэх түлхүүрүүд шифрлэгдсэн байна.
- `dataProtection.items[4].title` — 72 цагийн дотор мэдэгдэнэ
- `dataProtection.items[4].body` — Мэдээлэл алдагдсан тохиолдолд 72 цагийн дотор танд мэдэгдэнэ.
- `dataProtection.items[5].title` — 30 хоногийн дотор устгана
- `dataProtection.items[5].body` — Гэрээ дууссанаас хойш 30 хоногийн дотор танай мэдээллийг устгана.
- `dataProtection.policy` — Нууцлалын бодлого

**Homepage `/` — contact (bottom of the page)**
- `contact.title` — Харилцагч бүр хариугаа шууд авна
- `contact.description` — Хүсэлтээ үлдээнэ үү. Бид утсаар холбогдож, AI ажилтан танай бизнест хэрхэн ажиллахыг танилцуулна. Вэбсайт сонирхож байвал үнэгүй демо тань 24 цагийн дотор бэлэн болно.
- `contact.messengerCta` — Messenger-ээр бичих
- `contact.commentLine` — DalaTech-ийн Facebook хуудасны аль ч постын доор «1» гэж коммент бичвэл бид тантай холбогдоно.
- `contact.facebookLink` — Facebook хуудас

**«Хүсэлт илгээх» form (every page) — service choices**
- `demoForm.serviceCards.dali.line` — Зурвас бүрт 24/7 хариулна
- `demoForm.serviceCards.vira.line` — Видео, пост, сурталчилгаа
- `demoForm.serviceCards.eho.line` — Дуудлага алдахгүй
- `demoForm.serviceCards.nova.line` — Цагийг SMS-ээр сануулна
- `demoForm.serviceCards.website.line` — 7–10 ажлын өдөрт бэлэн
- `demoForm.serviceCards.unsure.line` — Тохирохыг хамт сонгоно
- `demoForm.serviceCards.ora.line` — Бичиг баримт, хугацаа, шийдвэр

**`/pricing`**
- `pricing.title` — Ил тод үнэ. Далд төлбөргүй.
- `pricing.description` — Орон тоо, ээлж, амралтын зардалгүй. AI ажилтан бүр сарын тогтмол төлбөр, нэг удаагийн суурилуулалттай; вэбсайт нэг удаагийн төлбөртэй.
- `pricing.cards.website.subLine` — Хостинг 150,000₮/жил. Нэмэлтээр: QPay төлбөр 200,000₮, онлайн цаг захиалга 300,000₮.
- `pricing.cards.website.description` — Гар утсанд тохирсон 5 хуудас. Мэдээллээ админ самбараас өөрөө шинэчилнэ.
- `pricing.cards.website.bullets[4]` — 7–10 ажлын өдөрт хүлээлгэн өгнө
- `pricing.cards.bundle.badge` — 125,000₮ хөнгөлөлт
- `pricing.cards.bundle.subLine` — Вэбсайт, Далигийн суурилуулалт, Далигийн эхний сарын төлбөрийн 50% хөнгөлөлт багтана. Хоёр дахь сараас Дали 250,000₮/сар.
- `pricing.cards.bundle.description` — Шинэ вэбсайт тань нээгдэх өдрөөс Дали харилцагч бүрт хариулж, захиалгыг бүртгэнэ.
- `pricing.cards.bundle.bullets[0]` — Ухаалаг вэбсайт — 750,000₮
- `pricing.cards.bundle.bullets[1]` — Далигийн суурилуулалт — 50,000₮
- `pricing.cards.bundle.bullets[2]` — Далигийн эхний сар 50% хөнгөлөлттэй — 125,000₮
- `pricing.paymentTerms.terms[0]` — Вэбсайтын төлбөрийн 50%-ийг гэрээ байгуулахад, үлдсэн 50%-ийг хүлээлгэн өгөхөд төлнө; хостингийн төлбөрийг жил бүр төлдөг.
- `pricing.paymentTerms.terms[1]` — AI ажилтны суурилуулалтыг гэрээ байгуулахад нэг удаа, сарын төлбөрийг сар бүрийн 5-ны дотор QPay эсвэл дансаар төлнө.
- `pricing.paymentTerms.terms[2]` — Гэрээний доод хугацаа 3 сар байдаг. Үүний дараа сар бүр үргэлжлүүлэх, эсвэл 30 хоногийн өмнө мэдэгдэж цуцлах боломжтой.
- `pricing.paymentTerms.note` — Үнэд НӨАТ нэмж тооцогдохгүй тул таны төлөх дүн яг үнийн дүнтэй адил байна. Тусгай үнийн саналыг бизнесийн чиглэл, автоматжуулах ажлын хүрээнд үндэслэн гаргана.
- `pricing.staff.title` — Танай AI ажилтнууд
- `pricing.staff.description` — 2 AI ажилтан авбал сарын төлбөрт 10%-ийн хөнгөлөлт эдэлнэ. 3 ажилтанд 15%, 4-өөс дээш бол 20%. Хөнгөлөлтүүд хоорондоо нэмэгдэхгүй.
- `pricing.staff.preorder` — Урьдчилан бүртгүүлэх
- `pricing.staff.ownerDescription` — Эхлээд Далиг ажиллуулж, бусдыг нь нээгдэх үед нэмнэ үү. Вира, Эхо, Нова удахгүй танай харилцагчдад үйлчилж эхэлнэ. Удахгүй нэгдэх Ора зөвхөн танд нээгддэг чатаар бичиг баримт, танилцуулга, хугацаа, шийдвэрт туслана.
- `pricing.staff.extras.vira[0]` — Сурталчилгааны төсөв ороогүй.
- `pricing.staff.extras.nova[0]` — Сард 1,000 SMS багтсан, нэмэлт SMS тутам 50₮
- `pricing.staff.extras.ora[0]` — Сард 1,500 мессеж багтсан; нэмэлт 500 мессеж 49,000₮
- `pricing.staff.extras.ora[1]` — Нэмэлт хэрэглэгч бүр өөрийн 1,500 мессежтэй: 2 дахь хэрэглэгч 200,000₮, 3 дахь 175,000₮, 4 дэхээс эхлэн тус бүр 150,000₮ сар бүр
- `pricing.period.label` — Төлбөрийн хугацаа
- `pricing.period.monthly` — Сараар
- `pricing.period.yearly` — Жилээр
- `pricing.period.note` — Жилийн төлбөрөө урьдчилан төлбөл 2 сар үнэгүй — 10 сарын төлбөрөөр 12 сар ажиллуулна.
- `pricing.period.yearlyHint` — 10 сарын төлбөрөөр 12 сар
- `pricing.featured` — Онцлох

**`/pricing` cards and `/office` — AI staff one-line descriptions**
- `office.agents.dali.job` — Facebook, Instagram, вэбсайтын зурвас бүрт өдөр шөнөгүй, секундын дотор хариулж, захиалгын холбоосыг илгээнэ.
- `office.agents.nova.job` — Цагийн сануулгыг танай дугаараас SMS-ээр автоматаар илгээж, ирэхээ мартах харилцагчийг цөөлнө.
- `office.agents.vira.job` — Пост бодох ажлаас таныг чөлөөлнө: сар бүр 3 богино видео, 8 пост, сурталчилгаа (boost) удирдлага.
- `office.agents.eho.job` — Хаах цагийн дараа ч, ачаалалтай үед ч дуудлага бүрт хариулж, захиалгыг бүртгэнэ.
- `office.agents.ora.job` — Таны ширээн дээр хуримтлагддаг ажлыг хариуцна: гэрээ, албан бичиг боловсруулж, танилцуулга бэлтгэж, хугацааг сануулж, англи бичгийг орчуулж, шийдвэрийг хамт тунгаана. Зөвхөн тантай ажиллана.

**`/faq` (answers are Дали's approved lines, reused word for word)**
- `faq.description` — Эхлэхээс өмнө ихэвчлэн асуудаг асуултууд. Хариултаа олоогүй бол бидэнд бичнэ үү.
- `faq.items[0].q` — Энэ үйлчилгээ ямар бизнест тохиромжтой вэ?
- `faq.items[0].a` — Харилцагчаас байнга асуулт ирдэг жижиг, дунд бизнест тохиромжтой: дэлгүүр, салон, эмнэлэг, ресторан, авто үйлчилгээ, сургалтын төв гэх мэт.
- `faq.items[1].q` — Техникийн мэдлэг шаардлагатай юу?
- `faq.items[1].a` — Техникийн мэдлэг огт шаардлагагүй. Тохиргоо, нэвтрүүлэлтийг бүгдийг нь бид хийж өгнө.
- `faq.items[2].q` — Сарын төлбөрт юу багтдаг вэ?
- `faq.items[2].a` — Сарын төлбөрт сервер, загварын ашиглалт, хяналт, мэдээллийн шинэчлэлт, дэмжлэг багтана.
- `faq.items[3].q` — AI ажилтан хүний ажлыг орлох уу?
- `faq.items[3].a` — Хүний ажилтныг орлохгүй, харин тэдэнд туслах болно. Давтан асуулт, захиалга, сануулга, тайлан зэрэг өдөр тутмын ачааллыг хариуцаж, шийдвэр шаардсан асуудлыг танай багт шилжүүлдэг.
- `faq.items[4].q` — Дали ямар мэдээлэлд тулгуурлан хариулдаг вэ?
- `faq.items[4].a` — Дали зөвхөн танай өгсөн мэдээлэлд тулгуурлан хариулна: үнэ, цаг, үйлчилгээ, нөхцөл. Энэ хүрээнээс гадуурх асуултыг таамаглахгүй, танай багт шилжүүлнэ.
- `faq.items[5].q` — Нэвтрүүлэх хугацаа хэд вэ?
- `faq.items[5].a` — AI ажилтан ихэвчлэн 1–2 долоо хоногийн дотор ажиллаж эхэлдэг. Вэбсайт 7–10 ажлын өдөрт бэлэн болно.
- `faq.items[6].q` — Олон ажилтан авбал хөнгөлөлт бий юу?
- `faq.items[6].a` — Тийм ээ, 2 AI ажилтан авбал сарын төлбөрт 10%-ийн хөнгөлөлт эдэлнэ. 3 ажилтанд 15%, 4-өөс дээш бол 20%.
- `faq.items[7].q` — Жилээр төлбөл хөнгөлөлттэй юу?
- `faq.items[7].a` — Жилийн төлбөрөө урьдчилан төлбөл 2 сар үнэгүй — 10 сарын төлбөрөөр 12 сар ажиллуулна. Энэ хөнгөлөлтийг бусад хөнгөлөлттэй хамт тооцохгүй.
- `faq.items[8].q` — Гэрээний доод хугацаа хэд вэ?
- `faq.items[8].a` — Гэрээний доод хугацаа 3 сар байдаг. Үүний дараа сар бүр үргэлжлүүлэх, эсвэл 30 хоногийн өмнө мэдэгдэж цуцлах боломжтой.
- `faq.items[9].q` — НӨАТ-ын баримт (И-баримт) өгөх үү?
- `faq.items[9].a` — Уучлаарай, манайх одоогоор НӨАТ-ын баримт (И-баримт) өгөх боломжгүй байгаа. Үнэд НӨАТ нэмж тооцогдохгүй тул таны төлөх дүн яг үнийн дүнтэй адил байна.
- `faq.items[10].q` — Төлбөрөө хэрхэн төлөх вэ?
- `faq.items[10].a` — Вэбсайтын төлбөрийн 50%-ийг гэрээ байгуулахад, үлдсэн 50%-ийг хүлээлгэн өгөхөд төлнө; хостингийн төлбөрийг жил бүр төлдөг. AI ажилтны суурилуулалтыг гэрээ байгуулахад нэг удаа, сарын төлбөрийг сар бүрийн 5-ны дотор QPay эсвэл дансаар төлнө.
- `faq.items[11].q` — Үнэгүй демо үзэж болох уу?
- `faq.items[11].a` — Үнэгүй демо үзэх бол app.dalatech.online руу орж бизнесийнхээ мэдээллийг оруулаарай — танай вэбсайтын демо 24 цагт бэлэн болно. Энэ хэрэгсэл зөвхөн вэбсайтын демонд зориулагдсан. AI ажилтны талаар хүсэлт илгээвэл манай ажилтан тантай нэн даруй холбогдож танилцуулна.

**`/office`**
- `office.hero.title` — Орон тоо нэмэхгүй AI баг: Дали өнөөдрөөс, дөрвөн ажилтан удахгүй.
- `office.hero.lead` — Зурвас, дуудлага, пост, сануулгыг өөрөө хийх шаардлагагүй болно. Дали өнөөдрөөс зурвас бүрт хариулна. Удахгүй Эхо дуудлагад хариулж, Вира контент, сурталчилгааг хариуцаж, Нова цагийн сануулгыг танай дугаараас SMS-ээр илгээнэ. Ора удахгүй зөвхөн танд: бичиг баримт, хугацаа, шийдвэр.
- `office.price.notAnnounced` — Үнийг хараахан зарлаагүй.
- `office.price.perYear` — /жил
- `office.chapters.dali.eyebrow` — Дали · AI хүлээн авагч
- `office.chapters.dali.title` — Нэг ч зурвас хариугүй үлдэхгүй.
- `office.chapters.dali.body` — Хариу хүлээсэн харилцагч олонтаа өрсөлдөгч рүү шилждэг. Дали Facebook, Instagram, вэбсайтын зурваст секундын дотор хариулж, таны өгсөн үнэ, цаг, үйлчилгээг хэлж, захиалгын холбоосыг илгээнэ. Хөнгөлөлтийг өөрөө амлахгүй, шийдвэрийг танд үлдээнэ.
- `office.chapters.vira.eyebrow` — Вира · маркетинг менежер
- `office.chapters.vira.title` — Ямар пост хийхээ дахин бодох шаардлагагүй болно.
- `office.chapters.vira.body` — Хуудсаа идэвхтэй байлгах цаг олддоггүй бол Вира үүнийг хариуцна: богино видео, пост, сурталчилгаа (boost).
- `office.chapters.vira.sceneAlt` — Вира өглөө хоёр дэлгэцийн ард сарын контент төлөвлөгөө бэлтгэж байна.
- `office.chapters.vira.plan.tag` — Сар бүр
- `office.chapters.vira.plan.title` — Вирагийн багц
- `office.chapters.vira.plan.items[0]` — 3 богино видео
- `office.chapters.vira.plan.items[1]` — 8 пост
- `office.chapters.vira.plan.items[2]` — Контент төлөвлөгөө
- `office.chapters.vira.plan.items[3]` — Сурталчилгаа (boost) удирдлага
- `office.chapters.vira.plan.items[4]` — 7 хоног тутмын тайлан
- `office.chapters.eho.eyebrow` — Эхо · утасны оператор
- `office.chapters.eho.title` — Хаах цагийн дараа ч утас авна.
- `office.chapters.eho.body` — Алдсан дуудлага олонтаа алдсан захиалга байдаг. Эхо утсаар хүнтэй адил ярьж, асуултад хариулан захиалгыг бүртгэнэ. Ажлын бус цагт ч, ачаалалтай үед ч дуудлага хариугүй үлдэхгүй.
- `office.chapters.nova.eyebrow` — Нова · сануулга, SMS
- `office.chapters.nova.title` — Ирэхээ мартах харилцагч цөөрнө.
- `office.chapters.nova.body` — Цагаа мартсан харилцагч хоосон цаг, алдсан орлого үлдээдэг. Нова товлосон цаг бүрийг танай өөрийн дугаараас SMS-ээр автоматаар сануулна. Та нэг ч мессеж бичих шаардлагагүй.
- `office.chapters.nova.sceneAlt` — Нова үдээс хойш маргаашийн сануулгуудыг илгээж байна.
- `office.chapters.nova.chat[0].text` — Сайн байна уу, Болд. Маргааш 11:00 цагт таны цаг товлогдсон байна.
- `office.chapters.nova.chat[1].text` — Баярлалаа, мартсан байлаа.
- `office.chapters.nova.chat[2].text` — Өглөөний мэнд, Болд. Таныг өнөөдөр 11:00 цагт хүлээж байна.
- `office.chapters.ora.eyebrow` — Ора · хувийн туслах
- `office.chapters.ora.title` — Ширээн дээрх ажил тань хөнгөрнө.
- `office.chapters.ora.body` — Гэрээ, албан бичиг, тайлан, танилцуулга таны цагийг авдаг. Ора уншиж, албан хэлээр боловсруулж, хугацаа өнгөрөхөөс өмнө сануулна. Англи бичгийг монголоор хөрвүүлж, шийдвэрийг тантай хамт тунгаана. Харилцагч, багийнхан тань түүнтэй харьцахгүй: зөвхөн танд нээгддэг чатаар ажиллана. Хуулийн зөвлөгөө өгөхгүй.
- `office.chapters.oraIntro.title` — Дөрөв нь харилцагчдад. Нэг нь зөвхөн танд.
- `office.chapters.oraIntro.lead` — Дали өнөөдрөөс, Вира, Эхо, Нова удахгүй танай харилцагчдад ажиллана. Удахгүй нэгдэх Ора харилцагчидтай ярихгүй: таны ширээн дээрх ажлыг хариуцаж, цагийг тань чөлөөлнө.
- `office.team.title` — Ажилтан нэмэх тусам хөнгөлөлт нэмэгдэнэ.
- `office.team.soonNote` — Вира, Эхо, Нова, Ора удахгүй ажиллаж эхэлнэ. Одоо урьдчилан бүртгүүлбэл нээлтийн үед бид танд шууд мэдэгдэнэ.
- `office.team.ehoNoPrice` — Эхогийн үнийг хараахан зарлаагүй тул дүнд тооцоогүй.
- `office.board.caption` — Таны ганцаараа үүрдэг ажлыг таван ажилтан хуваана: дөрөв нь харилцагчийн талд, нэг нь зөвхөн таны талд. Өнөөдөр Дали ажиллаж байна; бусад нь удахгүй.
- `office.board.lanes.dali.end` — Зурвас бүр
- `office.board.lanes.eho.end` — Дуудлага бүр
- `office.board.lanes.vira.end` — Сарын контент
- `office.board.lanes.nova.end` — Товлосон цаг
- `office.board.lanes.nova.dir` — Сануулга явж, харилцагч ирнэ

**Link previews (Facebook/Google description)**
- `meta./.desc` — Та унтаж байхад ч харилцагч бүр хариугаа авна. Монголын бизнест зориулсан AI ажилтан, ухаалаг вэбсайт.
- `meta./office.desc` — Орон тоо нэмэхгүйгээр ажлаа хуваалцах AI баг. Дали өнөөдрөөс харилцагч бүрт хариулна; Вира, Эхо, Нова, Ора удахгүй.
- `meta./pricing.desc` — Орон тоо нэмэхгүй, сарын тогтмол төлбөр. AI ажилтан, вэбсайтын үнэ, багийн хөнгөлөлт, төлбөрийн нөхцөл.

**Launch offer — hidden; shows only when the switch is on**
- `launchOffer.title` — Анхны 10 бизнест онцгой санал
- `launchOffer.items[0]` — Суурилуулалт үнэгүй
- `launchOffer.items[1]` — Эхний сарын төлбөр 50% хөнгөлөлттэй
- `launchOffer.items[2]` — Үнэ 1 жилийн турш өөрчлөгдөхгүй
- `launchOffer.seats` — Үлдсэн суудал: {{left}} / {{total}}
- `launchOffer.cta` — Суудал авах
- `launchOffer.fine` — Гэрээний доод хугацаа 3 сар. Үнэд НӨАТ нэмж тооцогдохгүй. Хөнгөлөлтүүд хоорондоо нэмэгдэхгүй.

**`/privacy/` (Нууцлалын бодлого)**
- §7 — Гэрээ дууссанаас хойш 30 хоногийн турш та мэдээллээ буцааж авах боломжтой. Энэ хугацааны төгсгөлд буюу гэрээ дууссанаас хойш 30 хоногийн дотор бид ярианы түүх, сургалтын мэдээллийг өөрсдийн системээс устгана.
- §9 — Ямар ч систем бүрэн аюулгүй байж чадахгүй. Таны мэдээлэлд хамаарах зөрчил гарвал бид мэдсэнээс хойш 72 цагийн дотор холбогдох үйлчлүүлэгч болон хамаарах хүмүүст юу болсон, юу хийж байгаагаа мэдэгдэнэ.
- header — Сүүлд шинэчилсэн: 2026 оны 9 дүгээр сарын 27

**`/terms/` (Үйлчилгээний нөхцөл)**
- §16 — Гэрээ дууссанаас хойш 30 хоногийн турш та яриа болон бизнесийн мэдээллээ татаж авах боломжтой. Хүсвэл бид уг мэдээллийг файлаар гаргаж өгнө.
- §16 — Энэ хугацааны төгсгөлд буюу гэрээ дууссанаас хойш 30 хоногийн дотор бид танай мэдээллийг системээсээ устгана. Нэхэмжлэх, төлбөрийн бүртгэл хуулийн шаардлагын дагуу үлдэнэ.
- header — Сүүлд шинэчилсэн: 2026 оны 9 дүгээр сарын 27

## Open questions for the founder
1. **Telegram in the privacy policy.** "No Telegram anywhere a customer can see" is done on the site itself.
   Privacy §3 and §8 still name Telegram (and Gmail) as the services that carry a demo request to us. That is
   the processor list a privacy policy has to disclose, so it was left as is. Removing it would make the
   policy untrue. Say if you want it reworded, e.g. «мессенжер үйлчилгээ».
2. **Old role text in the legal pages.** Privacy §1–§2 and terms §3 still say Вира «бизнес аналитик» and Нова
   «харилцагчийн менежер». Terms §3 still has «Вира зөвхөн өөр ажилтантай хамт ажиллана». Privacy §8
   names Gemini as the AI provider. Legal wording was not rewritten without approval. The site itself no
   longer has the «Вира only with another» rule (the approved Дали prompt has none), so /office lets a
   visitor pick Вира alone while terms §3 says that is not possible.
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
