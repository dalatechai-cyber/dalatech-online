---
name: DalaTech
description: AI staff for Mongolian small businesses, told as one night-to-evening Messenger inbox on navy ink.
colors:
  accent: "#60C8FF"
  accent-hover: "#8AD6FF"
  ink-950: "#050A18"
  ink-900: "#0A1024"
  ink-800: "#0D1430"
  device-bezel: "#0B1022"
  fg: "#F0F4FF"
  fg-muted: "#8B9FC4"
  fg-dim: "#5A6E94"
  hairline: "rgba(255,255,255,0.07)"
  bubble-incoming: "rgba(255,255,255,0.08)"
  status-online: "#34D399"
typography:
  display:
    fontFamily: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "60px"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  display-close:
    fontFamily: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 6vw, 60px)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  clock:
    fontFamily: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  lead:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  bubble:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  tag: "4px"
  control: "12px"
  card: "16px"
  bubble: "20px"
  bubble-tail: "6px"
  thread: "28px"
  device-screen: "44px"
  device: "52px"
  pill: "9999px"
spacing:
  row: "16px"
  stack: "24px"
  action-gap: "36px"
  block: "48px"
  section: "96px"
  section-md: "128px"
  gutter: "20px"
  gutter-sm: "28px"
  gutter-lg: "40px"
  container: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-950}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.ink-950}"
  button-primary-compact:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-950}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  link-quiet:
    textColor: "{colors.fg-muted}"
    height: "44px"
    padding: "0 4px"
  link-quiet-hover:
    textColor: "{colors.fg}"
  link-accent:
    textColor: "{colors.accent}"
    height: "44px"
  chip-ask:
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "44px"
  bubble-incoming:
    backgroundColor: "{colors.bubble-incoming}"
    textColor: "{colors.fg}"
    typography: "{typography.bubble}"
    rounded: "{rounded.bubble}"
    padding: "8px 14px"
  bubble-outgoing:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink-950}"
    typography: "{typography.bubble}"
    rounded: "{rounded.bubble}"
    padding: "8px 14px"
  day-card:
    backgroundColor: "{colors.ink-900}"
    textColor: "{colors.fg}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  day-card-owner:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.fg}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  list-row:
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    padding: "16px 0"
  thread-frame:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.thread}"
---

# Design System: DalaTech

## Overview

**Creative North Star: "Inbox at 02:14"**

The landing page is one day of Дали's, told once. It opens on a Messenger thread answered in the middle of the night, carries one clock through the day as each real moment lands, and closes on the owner's summary with the thread to Дали left open. Everything visual is borrowed from the grammar the visitor already knows from their phone: bubbles, a composer with a caret, typing dots, a seen-avatar, notification cards, a status line reading "Онлайн". DalaTech's own pixel staff heads are the avatars. Nothing is decorated that a messaging app would not draw.

The ground is deep navy ink, never black and never a gradient. Text sits in three cool greys. One light blue, the blue of the wave-D in the wordmark, means exactly one thing: Дали, now, act. It fills the visitor's own outgoing bubble, the one action button, the clock's progress, and the live-staff dot; it never decorates. Density is calm: wide section breathing room, long hairline-ruled lists instead of grids of cards, and type that does the hierarchy work on its own.

Confirmed rejections, from the direction contract and the build: no split hero with stats, no rows of equal feature cards, no eyebrows or kickers above headings, no glow orbs, no gradients as decoration, no button in every section.

**Key Characteristics:**
- Messenger grammar as the whole visual vocabulary.
- Navy ink grounds, three cool text greys, one light-blue meaning.
- One filled light-blue action per moment; everything else is text.
- Hairline-ruled rows instead of cards; cards only where Messenger itself draws a card.
- Manrope display set tight, Inter body.
- One motion: a thing arrives the way a message arrives.

## Colors

A cool, low-chroma navy field with a single saturated light blue that carries meaning, not mood.

### Primary
- **Wave-D Light Blue** (`accent`): the logo's symbol blue. Fills the visitor's outgoing bubble, the Messenger button, the clock's elapsed track and needle halo, the composer's send disc while a draft exists, the caret, the live-staff dot and label, the ask chips' outline and text, and accent text links. Ink-950 text on it reads at 10.5:1.
- **Pressed Light Blue** (`accent-hover`): the hover state of every accent control and accent link. It is applied inline in the build rather than as a Tailwind token; treat it as the accent's only companion.

### Neutral
- **Night Ink** (`ink-950`): the page ground, the html background, the clock needle's border, and the ring offset of every focus ring.
- **Thread Ink** (`ink-900`): the Messenger thread surface (hero and close) and every resting day card.
- **Raised Ink** (`ink-800`): the one step up: the owner's own cards in the day (the summary, the handoff), the booking link card.
- **Bezel** (`device-bezel`): the desktop phone frame around the hero thread only.
- **Paper White** (`fg`): headlines, bubble text, row titles. Body copy inside rows uses it at 90%.
- **Mist** (`fg-muted`): leads, row bodies, roles, the quiet request link, status lines. 7.4:1 on ink-950.
- **Dusk** (`fg-dim`): timestamps, clock tick labels, not-yet-live staff, an empty composer's placeholder. 3.85:1 on ink-950, so it is for metadata a visitor can skip, never for a sentence they must read.
- **Hairline** (`hairline`): the 1px rules between list rows and around resting cards; the thread's inner dividers use 6% white, the thread frame 8%.
- **Incoming Bubble** (`bubble-incoming`): Дали's bubbles and typing bubble, the empty composer field at 6%.

### Status
- **Online Green** (`status-online`): only the 12px presence dot on Дали's avatar, and the salon's leaf glyph in the booking card. It never colours text or controls.

### Named Rules
**The One Meaning Rule.** Light blue means Дали, now, act. If an element is light blue, it is the visitor's own message, the action, the clock's present, or something live. Nothing else gets it, including headings, icons for decoration, and borders for emphasis.

**The No Gradient Rule.** Surfaces are flat ink steps. Depth comes from moving one ink step up (950 to 900 to 800), not from gradients, glows or orbs.

## Typography

**Display Font:** Manrope (fallback Inter, system-ui)
**Body Font:** Inter (fallback ui-sans-serif, system-ui), with `ss01` and `cv11` enabled
**Label/Mono Font:** none; times use Inter or Manrope with tabular numerals

**Character:** Manrope set tight and semibold gives the headings a confident, compact geometric voice that carries Cyrillic properly; Inter keeps the Messenger text exactly as plain as a chat app's.

### Hierarchy
- **Display** (600, 36px phone / 48px sm / 60px lg, line-height 1.06, -0.04em): the hero h1 only, held to 16ch so it breaks in two or three lines.
- **Display Close** (600, clamp(34px, 6vw, 60px), 1.04, -0.04em): the closing invitation, centred, max 20ch.
- **Clock** (600, 72px desktop / 26px phone bar, line-height 1, -0.025em, tabular numerals): the day clock's reading. Same face as the headings so it reads as an instrument, not a widget.
- **Headline** (600, 32px / 42px sm / 48px lg, 1.08, -0.04em): section h2s, 16 to 20ch.
- **Title** (600, 21px / 23px sm, 1.25, -0.025em): sub-blocks inside a section (the terms groups); staff names in the team list run 18px / 20px.
- **Lead** (400, 16.5px phone / 17 to 18px sm, 1.6, Mist): the one paragraph under a heading, max 34rem.
- **Body** (400, 15px, 1.55): row bodies; row titles 15.5px at 600.
- **Bubble** (400, 14.5px, 1.45): every chat bubble and card body in the day.
- **Label** (500, 12 to 13.5px, tabular numerals for times): senders, timestamps, status lines, the example disclaimers. Sentence case, never uppercase, never tracked out.

### Named Rules
**The No Eyebrow Rule.** A heading stands alone. No uppercase tracked kicker, numbered label or small pre-title sits above any h1 or h2.

**The Tight Display Rule.** Manrope at -0.04em is for h1 and h2 only; everything at title size and below relaxes to -0.025em or normal.

## Layout

One centred container, max 1180px, with 20px / 28px / 40px side gutters (phone / sm / lg); the fixed nav runs wider at max 1280px. Sections breathe at 96px top and bottom on phones and 128px from md. Inside a section the rhythm is: heading, 20 to 24px to the lead, 36px to the actions, 48 to 64px to the body. Rows are 16px tall in padding (20px on the team list at sm), separated by hairlines rather than gaps.

The hero is a two-column grid on lg: copy left, the 380px phone frame right, 80 to 112px apart; on phones it stacks with the copy first, a full-width Messenger button, and the top of the thread already under the fold. The day section is copy plus a sticky clock on the left (sticky at 128px from the top, from lg) and the ordered moments on the right, each a 44px / 56px time gutter plus its cards, 48px between moments. On phones the clock becomes a sticky bar under the nav (56px from the top, ink-950 at 90% with a 12px backdrop blur and a hairline under it). Lists hold a 760px measure; the terms run as two CSS columns from md. Every interactive target is at least 44px tall.

## Elevation & Depth

Flat by default, with tonal layering. Depth is one ink step, not a shadow: resting surfaces are ink-900 on ink-950, the owner's moments step up to ink-800. Shadows appear only on the two framed objects that represent physical things, and on the clock's needle.

### Shadow Vocabulary
- **Device drop** (`box-shadow: 0 40px 100px -30px rgba(0,0,0,0.75)`): the desktop phone frame around the hero thread.
- **Browser drop** (`filter: drop-shadow(0 40px 60px rgba(2,6,23,0.6))`): the browser frame around the website case.
- **Needle halo** (`box-shadow: 0 0 0 4px rgba(96,200,255,0.25)`): the day clock's position marker.

### Named Rules
**The Object-Only Shadow Rule.** Only an object that stands for a physical device casts a shadow. Cards, rows, bubbles and buttons are flat.

## Shapes

Corners follow Messenger. Bubbles are 20px round with the corner nearest the speaker cut to 6px (bottom-right for the visitor, bottom-left for Дали). Cards that Messenger would draw (day notifications, the booking link, the handoff) are 16px. Controls are 12px. The thread frame is 28px; on desktop it sits inside a 52px bezel with a 44px screen and a pill-shaped camera notch. Chips, the composer field, the send disc and status dots are full pills. Avatar-adjacent tags are 4px. Borders are always 1px white at 6 to 8%, or the accent at 30 to 35% where the owner or a choice is meant. Nothing is clipped to an unusual silhouette; the pixel staff heads are the only non-geometric shapes.

## Components

### Buttons
Calm, solid, unmistakable: there is one.
- **Shape:** gently rounded (12px).
- **Primary (Messenger):** light-blue fill, ink-950 label in Inter 600 at 15.5px with -0.025em tracking, a Messenger glyph at 18px, 52px tall with 24px side padding; full width on phones. The compact variant in the nav is 40px tall, 16px padding, 13.5px label.
- **Hover / Focus / Active:** hover moves the fill to Pressed Light Blue over 200ms; focus shows a 2px accent ring offset 2px from ink-950; press scales to 0.97 over 160ms (ease-out-quart), and does nothing under reduced motion.
- **Secondary:** there is no second filled or outlined button on the landing page. The alternative path is a text button (the request link): Mist, Inter 500 at 15.5px, a trailing `›`, 44px tall, turning Paper White on hover. Destination links ("all staff", "privacy", the app) are accent text with `›`, 44px tall, Pressed Light Blue on hover.

### Chips
- **Style:** the ask chips under the hero thread: transparent, 1px accent at 35%, accent text 13px, full pill, 44px tall, horizontally scrollable without a scrollbar.
- **State:** hover fills accent at 10%; while Дали is answering the others drop to 40% opacity.

### Cards / Containers
- **Corner Style:** 16px (day cards, link card, handoff); 28px for a thread frame.
- **Background:** ink-900 at rest; ink-800 with an accent 30% border for the owner's moments.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px white at 7%, or accent at 30%.
- **Internal Padding:** 14px by 16px; sender line, then a 15px title, then 14.5px body.

### Navigation
- **Style:** fixed, transparent over the hero at 80px tall; once scrolled it shrinks to 56px, fills ink-950 at 94% with a 20px backdrop blur and an 8% hairline beneath. Wordmark at 19px / 20px high from `brand/`, links in Inter 500 at 13.5px Mist, active Paper White with a 1px underline, the compact Messenger button on the right, a 44px menu button on phones.

### Lists (signature)
The page's answer to cards. A list is a 1px hairline above every row and one beneath the last, 16px row padding, a title in Paper White and a body in Mist. Numbered lists put a tabular Manrope numeral in Dusk in a 16px gutter. The team list adds the 40px pixel head, a Manrope name, the role in Mist, and a right-aligned state: a 6px dot plus label, accent when live, Dusk when not.

### The Messenger Thread (signature)
The hero and the close are a real thread, not an illustration of one. Header: back chevron in accent, the pixel avatar with an Online Green presence dot, name at 15px 600, "Онлайн" in Mist. A centred 02:14 timestamp opens the scroll area. Bubbles group by speaker with 8px between runs; the typing bubble carries three 6px dots that breathe in turn (1.1s, 0.15s stagger); a seen-avatar at 70% scale marks the read. The composer is a pill field at 6% white with a blinking accent caret while the customer types, and a 40px send disc that fills accent only while a draft exists. A "this is an example" line in Dusk sits under every example thread.

### The Day Clock (signature)
One reading shared by two clocks: the 72px numeral on desktop (sticky) or the 26px phone bar, and a 6px track: accent at 20% for the night, white at 20% for opening hours, accent at 70% filling to the present, and a 14px Paper White needle with its halo. The clock is bound to scroll through a damped read (it eases 18% of the remaining distance per frame, never jumps, never hijacks the scroll) and snaps to a message's own written time as it reaches it.

### Motion language
- **Arrive:** every message and every arrival on the page uses one spring, stiffness 420, damping 34, mass 0.7, from opacity 0, 10px down and 98% scale to rest. Quick, settled, no bounce. Only things that genuinely arrive (a message, the ask row, a reply) move.
- **Armed dim / lit:** once the clock is running, the list is armed and a moment the clock has not reached waits in place at 32% opacity, 8px low; it lights to full over 420ms (opacity) and 520ms (transform) on ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`. If the script never arms, every moment shows at full strength.
- **Reduced motion:** the thread renders finished with its questions, the dots and caret stop, armed cards show at full opacity with no transform or transition, and press scaling is off. Everything is simply there.

## Do's and Don'ts

### Do:
- **Do** keep light blue (#60C8FF) to its one meaning: the visitor's message, the action, the clock's present, something live.
- **Do** give each moment exactly one filled light-blue control, the Messenger button, with the request form as a quiet Mist text link beside it.
- **Do** separate list items with 1px hairlines at 7% white and 16px of padding instead of wrapping them in cards.
- **Do** draw a card only where Messenger itself would: a notification, a link preview, a handoff; 16px radius, ink-900 or ink-800, no shadow.
- **Do** animate arrivals with the ARRIVE spring (stiffness 420, damping 34, mass 0.7) and nothing else, and render the finished state under prefers-reduced-motion.
- **Do** set h1 and h2 in Manrope 600 at -0.04em, and use tabular numerals for every time.
- **Do** keep every target at 44px or taller and every focus ring a 2px accent ring offset from ink-950.
- **Do** use the wordmark paths from `brand/` exactly; never re-trace.

### Don't:
- **Don't** put an eyebrow, kicker or uppercase tracked label above a heading.
- **Don't** build rows of equal feature cards, a split hero with stats, or a button in every section.
- **Don't** use gradients, glow orbs or blurred colour blobs as decoration.
- **Don't** add a second filled or outlined button next to the Messenger action.
- **Don't** use Dusk (#5A6E94) for anything a visitor needs to read; it is below 4.5:1 on ink.
- **Don't** cast shadows from cards, rows or buttons; only device frames and the clock needle carry one.
- **Don't** bind motion to scroll in a way that holds or hijacks it; the clock follows the reader.
