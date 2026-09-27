# Homepage remake — progress log

Branch: `claude/fervent-ramanujan-q51g1a` (dalatech-online). **Preview only** — nothing
is merged to `main`, production (https://dalatech.online) is untouched.

If a session stops, read this file top to bottom and continue from "Next".

## Status

| # | Section | State |
|---|---------|-------|
| 0 | Setup: 21st components vendored into `src/components/ui/`, tokens, deps | in progress |
| 1 | Hero (Spotlight + Word Rotate) | todo |
| 2 | Problem: messages at night (Animated List) | todo |
| 3 | How it works (Animated Beam) + live Дали chat demo (kept) | todo |
| 4 | AI staff (Bento Grid + Border Beam) | todo |
| 5 | Website + add-ons (Safari frame around the salon showcase) | todo |
| 6 | Prices (Pricing Section, monthly / yearly) | todo |
| 7 | Offers (gold, Shimmer Button) | todo |
| 8 | 3 steps | todo |
| 9 | Data protection | todo |
| 10 | FAQ (Accordion) | todo |
| 11 | Final call to action | todo |
| 12 | Nav «Үнэ» / «Асуулт» go to the new sections; /pricing, /faq reuse them | todo |
| 13 | Full code review of every changed file, final verification | todo |

## Next
- Finish setup (section 0), then build sections in page order.

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

## New Mongolian copy waiting for approval (drafts)
(filled in as sections are written)

## Open questions for the founder
(filled in as they come up)
