# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Owners of small Mongolian businesses (salons, shops, cafés, service businesses) who sell through
Facebook, Instagram and a website. Most arrive from a Facebook ad on a phone, often mid-day between
customers. Their job: stop losing customers whose messages go unanswered after hours, without hiring.

## Product Purpose
DalaTech gives these businesses AI staff. Дали, the first and today the only live one, answers
customer messages on Facebook, Instagram and the website 24/7 in Mongolian, using only the facts the
owner gave, sends the booking link, and hands anything that needs a decision to the owner. Success:
an owner understands this in seconds, trusts it, and starts a conversation with Дали.

## Positioning
Дали is a member of staff, not a bot builder: DalaTech sets it up for the owner in 1–2 weeks, it never
invents answers, never grants discounts on its own, and hands decisions back. Further staff (Вира,
Эхо, Нова, Ора) join later; which are live is controlled in Dala AI, never hard-coded here.

## Operating Context
Visitors read on phones first, in Mongolian. The ads invite people to comment and then message;
talking to Дали on Messenger is the product demo itself. The demo-request form exists as a quieter
secondary path. Websites with booking + QPay are a second offer.

## Capabilities and Constraints
- Primary action on the landing page: talk to Дали on Messenger (`DEMO_MESSENGER` in src/App.jsx).
  The «Хүсэлт илгээх» form is secondary. (Confirmed by the founder, 2026-10-02.)
- Staff live states come from `src/office/launch.js`; any outage shows only Дали live.
- Prices live in `src/office/agents.js` + `pricing.staff.*` and must match Дали's data in Dala AI and
  the dalatech-chatbot fallback. Never change one without the others.
- /privacy, /terms, /data-deletion are static pages under Meta review: never touch.
- Every visitor-facing line is Mongolian, in both locale files. Approved wording is used exactly; any
  new or changed Mongolian line goes to the founder for approval before it ships.

## Brand Commitments
Dark, premium, calm, confident; must not look AI-generated. Navy grounds (`ink-*`), light blue
#60C8FF (the wordmark symbol), the wave-D wordmark from `brand/` used exactly. Manrope display,
Inter body (both cover Cyrillic). The pixel-art office and staff avatars are DalaTech's own.

## Evidence on Hand
- No named clients, numbers or testimonials exist yet. Never invent any. Conversations on the page
  are labelled examples.
- One unnamed salon website case (SalonPreview mock). A testimonial slot may exist but stays hidden
  until a real one is supplied (Tara Salon, pending the owner's consent).

## Product Principles
1. Show Дали working; do not describe it.
2. Honest limits are a selling point: what Дали needs, does, won't do, and what happens to money and data.
3. One action, stated once per moment; never a wall of competing buttons.
4. Never claim a staff member works before their launch switch is on.

## Accessibility & Inclusion
Phone-first, WCAG 2.2 AA contrast, 44px targets, visible focus, full stillness under
prefers-reduced-motion with every message still readable.
