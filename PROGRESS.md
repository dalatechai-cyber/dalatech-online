# Homepage remake — progress log

Branch: `claude/fervent-ramanujan-q51g1a` (dalatech-online). **Preview only** — nothing
is merged to `main`, production (https://dalatech.online) is untouched.

If a session stops, read this file top to bottom and continue from "Next".

## Status

| # | Section | State |
|---|---------|-------|
| 0 | Setup: 21st components vendored into `src/components/ui/`, tokens, deps | done |
| 1 | Hero (Spotlight + Word Rotate) | done, checked 390 / 1440 |
| 2 | Problem: messages at night (Animated List in a phone) | done, checked |
| 3 | How it works (Animated Beam) + live Дали chat demo (kept, unchanged) | done, checked |
| 4 | AI staff (Bento Grid + Border Beam on Дали) | done, checked |
| 5 | Website + add-ons (Safari frame around the salon showcase) | done, checked |
| 6 | Prices (Pricing Section, monthly / yearly) + team discount + terms | done, checked |
| 7 | Offers (gold, Shimmer Button) | done, checked |
| 8 | 3 steps | done, checked |
| 9 | Data protection (Number Ticker 72 / 30) | done, checked |
| 10 | FAQ (Accordion) | done, checked |
| 11 | Final call to action (Messenger, «1», free demo, request) | done, checked |
| 12 | Nav «Үнэ» / «Асуулт» scroll to the homepage sections; /pricing and /faq render the new sections | done |
| 13 | Vercel preview check (phone + desktop) | done: renders, Manrope/Inter load, no console errors, no horizontal scroll |
| 14 | /office prices brought to the approved list (`src/office/agents.js`); Эхо shows «Үнийг хараахан зарлаагүй.» and is left out of totals | done |
| 15 | Full code review of every changed file | todo |

## Next
- Full review pass of every changed file, clean dead CSS, then the final report.

## Decisions
- **Source of truth for prices and approved wording** is Дали's own prompt in
  `dalatech-chatbot/dalatech-messenger/api/chat.js` and `lib/facts.js` (founder-approved
  lines, 2026-09-27). Every price line and FAQ answer on the new page is copied from
  there word for word.
- **21st.dev install.** The 21st CLI / shadcn registry (`https://21st.dev/r/<author>/<slug>`)
  answers `403 {"error":"Authentication required"}` without a signed-in session, and the
  upstream registries (magicui.design, ui.aceternity.com, kokonutui.com,
  motion-primitives.com) are blocked by this environment's egress policy. The exact
  component sources are public on the 21st CDN (`cdn.21st.dev/<user>/<slug>.tsx`, the files
  the component pages render), so each one was downloaded from there and converted to
  plain JSX (this repo has no TypeScript). Each file in `src/components/ui/` names its
  source URL at the top.
- **Brand over the skill's light-first default.** The apple-design skill says light-first;
  the brief and CLAUDE.md say brand navy. Navy wins; the skill's restraint rules (one
  accent, type + space carry hierarchy, no effect stacking) are followed.
- New homepage sections live in `src/App.jsx` like the rest of the UI (CLAUDE.md), because
  they reuse App-level pieces (buttons, request dialog, pixel avatars, the live chat demo);
  a separate module would import App.jsx back, which the build treats as a fatal circular
  dependency. Vendored 21st components are standalone, so they live in `src/components/ui/`.

- **Component changes.** Each vendored file lists what was changed and why. The main
  ones: Animated List plays once and stops on the last card (the original loops back to
  one card — the "blank phone"); Safari frames live HTML (the original frames an image
  only); Pricing Section takes tugrik strings, per-tier fine print and a no-price state;
  Bento Grid takes children; Number Ticker renders its number from the first paint;
  every component honours reduced motion.
- **Kept, not replaced:** the live Дали chat demo (`LiveDemo`) sits right after "how it
  works"; the salon showcase (`SalonPreview`) is inside the Safari frame (with a booking
  strip and a Дали bubble added so the wider frame is not half empty); pixel avatars;
  /office; the chat widget in `index.html`.
- **Removed from the homepage** (and deleted, since nothing else used them): the day
  ring hero, the pinned "working day" phone, the plain staff list, the old contact block.
  /pricing and /faq now render the new pricing + offers and FAQ sections, so the old
  price cards (which still said Дали setup 150,000₮) are gone.
- **Yearly prices are derived**, not separately approved: monthly × 10 (the approved rule
  "10 сарын төлбөрөөр 12 сар"). Дали 2,500,000₮/жил, Нова 1,500,000₮, Вира 3,500,000₮,
  Ора 2,500,000₮.
- **Phones:** the four «Удахгүй» tiles are compact two-up tiles on phones (name, role,
  status, price); their full description and pre-register button are in the price list.
- **Number Ticker** is used only on true numbers: 10 / 15 / 20 % team discount, 10 seats
  left, 72 hours, 30 days.
- **Seats counter** is a constant `FIRST_TEN_SEATS_LEFT = 10` in `src/App.jsx`; change it by
  hand when a business signs.
- Fonts: Manrope (display) + Inter (body), both Cyrillic, unchanged. The page uses the
  existing navy tokens; new tokens `accent` (#60C8FF, the logo blue) and `gold` (offers only).

## New Mongolian copy waiting for approval (drafts)
Everything not listed here is copied word for word from Дали's prompt or from copy
already on the site. Keys are in `src/locales/mn.json` under `home`.

1. Hero headline (rotating word): «[Facebook / Instagram / вэбсайт] дээрх зурваст 24/7
   хариулах AI ажилтан.» — built from the approved «Харилцагчийн зурваст 24/7 хариулах AI ажилтан.»
2. Hero link: «Үнийг харах»
3. Night section eyebrow: «ШӨНИЙН ЗУРВАС»; lead: «Харилцагч асуултаа өөрт завтай үедээ
   бичдэг, заримдаа шөнө дунд. Хариу удвал өөр газар руу бичнэ. Дали тэр дор нь хариулж,
   сонирхсон харилцагчийг таны Telegram-д мэдэгдэнэ.»
4. Night phone: «Шинэ харилцагч» / «Болд · Messenger · маргааш цаг авах сонирхолтой. Дали
   захиалгын холбоосыг илгээсэн.»; point «Шөнө, амралтын өдөр ч тэр дор нь хариулна.»;
   caption «Жишээ яриа.»
5. How it works title: «Гурван суваг. Нэг Дали. Таны Telegram.»; node «Таны Telegram»;
   steps «Харилцагч бичнэ — Facebook, Instagram эсвэл вэбсайтаар, өдөр шөнө хамаарахгүй.»,
   «Дали хариулна», «Та мэдэгдэл авна — Захиалах сонирхолтой харилцагчийн мэдээлэл таны
   Telegram-д ирнэ.»
6. Staff button: «Урьдчилан бүртгүүлэх»
7. Website: «Нэмэлтээр» list layout (prices are the approved ones); button «Үнэгүй демо вэбсайт»
8. Pricing toggle: «Сараар» / «Жилээр»; «10 сарын төлбөрөөр 12 сар» under a yearly price;
   discount labels «2 ажилтан / 3 ажилтан / 4+ ажилтан»; «Хөнгөлөлтүүд хоорондоо
   давхцахгүй: жилийн, багийн, онцгой санал гурвын аль нэг нь хамаарна.»
9. Offers: eyebrow «ОНЦГОЙ САНАЛ»; title «Эхлэхэд хамгийн ашигтай хоёр санал.»; first-10
   items «Суурилуулалт үнэгүй», «Эхний сарын төлбөр 50% хөнгөлөлттэй», «Үнэ 1 жилийн турш
   өөрчлөгдөхгүй»; «Үлдсэн суудал»; buttons «Санал авах», «Суудал авах»; fine print
   «Гэрээний доод хугацаа 3 сар. Үнэд НӨАТ нэмж тооцогдохгүй. Хөнгөлөлтүүд хоорондоо давхцахгүй.»
10. 3 steps eyebrow «ЭХЛЭХ»
11. Data protection: eyebrow «МЭДЭЭЛЛИЙН ХАМГААЛАЛТ»; title «Танай мэдээлэл зөвхөн танай
    ажилд.»; all six items (Зөвхөн үйлчилгээнд / Худалдахгүй / Бизнес бүр тусдаа /
    Шифрлэгдсэн түлхүүр / 72 цаг / 30 хоног) — see `home.data`
12. FAQ: the questions for the six answers that came from Дали's prompt (discount, yearly,
    contract, VAT, payment, demo); side note «Өөр асуулт байвал баруун доод булан дахь
    Далигаас асуугаарай.»
13. Final CTA: lead «Messenger-ээр бичих, Facebook пост дээр «1» гэж коммент үлдээх, эсвэл
    үнэгүй демо вэбсайтаа өөрөө үүсгэх — аль нь ч болно.»; «Messenger-ээр бичих / Бид
    тантай тэнд нь холбогдоно.»; ««1» гэж коммент үлдээх / Манай Facebook хуудасны аль ч
    пост дээр «1» гэж бичвэл бид тантай холбогдоно.»; «Үнэгүй демо вэбсайт /
    app.dalatech.online — демо 24 цагт бэлэн болно.»; «Эсвэл хүсэлт илгээх»
14. The emoji 😊 was dropped from the approved demo sentence on the page (kept in the chat).

## Open questions for the founder
0. **/office text is still the old roles.** Prices there now match, but its chapters still
   describe Вира as «Бизнес аналитик» (monthly reports) and Нова as «Харилцагчийн менежер»
   (win-back messages). Rewriting /office was outside this brief ("keep /office"); it
   needs its own pass with approved wording. Вира is no longer "only with another staff
   member" (Дали's prompt sells her alone at 350,000₮), so that rule was removed.
1. **Дали does not know the «Анхны 10 бизнест» offer.** It is not in Дали's prompt
   (dalatech-chatbot `api/chat.js`) or its price guard (`lib/facts.js`). Before this page
   goes live the offer has to be added there, or Дали will contradict the page. I did not
   change the chatbot (it would affect production). Which staff does the offer cover —
   only Дали (the only live one), or any staff member?
2. **Data deletion: 30 or 60 days?** The brief says deletion within 30 days after the
   contract ends; the published privacy policy (`/privacy/`, linked from Meta's app
   review) says a 30-day window to take the data back, then deletion within 60 days. The
   homepage follows the brief; the privacy page was not touched. One of them should change.
   The 72-hour breach notice is also not in the privacy policy yet.
3. Yearly prices (monthly × 10) are shown on the price toggle — Дали's prompt only says
   "2 сар үнэгүй" and never quotes a yearly total. OK to show the totals?
4. Does «1 гэж коммент» really work on any post (someone watches comments), or only on
   specific posts?
