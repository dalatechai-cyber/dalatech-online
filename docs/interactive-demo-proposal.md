# Interactive demo for dalatech.online — proposal

Status: proposal, not built. Written 2026-09-12 for the site owner.

## The brief

Something a visitor moves through rather than reads: a clickable,
step-by-step experience nobody in Mongolia has built, that makes a
Mongolian business owner trust DalaTech.

## What exists globally

| Pattern | Who does it | What the visitor does | Cost to run |
| --- | --- | --- | --- |
| Click-through product tour | Navattic, Storylane, Arcade (SaaS everywhere) | Clicks hotspots through screenshots of the product | $40–$1,000 per month for the tool |
| "Try it on your site" | Intercom Fin, Ada, Sierra | Pastes their website URL; the bot answers as if trained on it | API calls per session |
| "Call me" voice demo | Bland, Synthflow, Goodcall, Retell | Types their number; the AI phones them within a minute | Telephony per minute |
| Savings calculator | Zendesk, most AI-support vendors | Enters call and message volumes; sees hours and money saved | Nothing |
| Scroll-driven story | Apple product pages | Scrolls; the product assembles itself | Nothing |

Mongolia, from what I could find by search (the sandbox cannot open
Mongolian sites directly): AI vendors show a chat widget, a feature list
and a contact form. Egune is a consumer app. None of the company sites I
could find lets a visitor walk through the product on their own business.
Treat "nobody has built this" as "I could not find one", not as a
guarantee.

## Four ideas, ranked

### 1. «Танай бизнесийн нэг өдөр» — a day at *your* business (recommended)

Four screens, each one tap:

1. **What do you run?** Six cards: салон, дэлгүүр, эмнэлэг, ресторан, авто
   үйлчилгээ, сургалт.
2. **Name and hours.** One text field and a two-thumb time range. Defaults
   are pre-filled so a tap on "Үргэлжлүүлэх" is enough.
3. **The day runs.** The office scene and the phone feed the site already
   has, re-rendered with their name, their hours and their kind of
   customer. A salon gets a 15:30 haircut booking at 02:14; a restaurant
   gets a table for four; a clinic gets an appointment. Every notification
   is tappable: tap the customer's message and choose what they ask next
   (price, hours, change of time) and Дали answers it.
4. **The tally.** "Өнөөдөр танай салонд: 3 захиалга, 1 тайлан, 1 дуудлага" and
   the request form, already filled with what they chose.

Why it builds trust: the owner sees their own business name in the
notifications before talking to anyone. The office, the timeline and the
phone are already parametric in the codebase, so what appears is the real
product's behaviour, not a video.

Cost: two to three developer days on the existing engine. No new service,
no new API, nothing per visit. The copy for six business types is the
largest part of the work.

Risk: none technical. The one judgment call is keeping the sample figures
plainly marked as samples.

### 2. Дали on your Facebook page (phase two)

The visitor pastes their public Facebook page link. A server job reads
the public About section, hours and recent posts, and Дали answers three
questions about *their* business inside the site's chat widget.

Why it builds trust: highest of the four. "It already knows my opening
hours" is the sentence that closes.

Cost: about a week. One Claude call per session, well under ₮100 each.
The real cost is access: reliable page data needs a Page token through
Meta's API, which needs the app-review work already started for
`/setup`. Public scraping without it is brittle and against Meta's terms.

### 3. Эхо calls you

Type a number, Эхо calls within thirty seconds and books a test
appointment. This is the global standard for voice products.

Blocked: Эхо is not built. Also telephony into Mongolian mobiles needs a
local carrier route; Twilio-style providers do not cover it well.

### 4. Savings calculator

Messages and calls per day in, hours and tugrik saved out, against the
cost of a hire.

Cheap, one day. Common everywhere, so it does not differentiate, and the
salary figures must come from a citable source (NSO average wage) or the
page invents a number, which is the opposite of trust.

## Recommendation

Build idea 1 now. It is the only one that is unique, needs nothing
external, and reuses what the site already renders. Plan idea 2 for when
the Meta app review clears, because it turns the same flow from a sample
into their real business.

## What I would need from you before building idea 1

- Sign-off on the six business types and one sample day for each.
- Whether the tally may show figures at all, or only the events.
- Where the flow lives: a section on the home page after the phone scene,
  or its own route `/demo`.
