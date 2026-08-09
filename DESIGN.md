---
name: Patidar Doors
description: A cream-and-brass timber catalogue where every surface behaves like a door.
colors:
  cream-raised: "#fbf7ef"
  cream: "#f5f0e6"
  panel: "#efe7d6"
  panel-floor: "#e8dec7"
  line: "#e6dcc6"
  line-strong: "#d9cdb2"
  line-control: "#c9bb9c"
  night-raised: "#2b2218"
  night: "#241c13"
  deep: "#1c1610"
  deep-portal: "#17110b"
  deep-corridor: "#16110b"
  frame: "#3b2e1f"
  frame-quiet: "#33281c"
  ink: "#211a12"
  muted: "#5f5342"
  muted-light: "#70624c"
  lamp-hot: "#fdf6e4"
  cream-on-dark: "#f0e3c2"
  lamp-2: "#c3b394"
  lamp-3: "#968771"
  brass: "#a98b4f"
  brass-deep: "#8c6f3f"
  brass-ink: "#7d6234"
  gold: "#c9a964"
  gold-light: "#d9b873"
  clay: "#a8442a"
  clay-ink: "#9c3d24"
  clay-surface: "#f7e6df"
  teak: "#c9903f"
  teak-ink: "#8a5a15"
  slate: "#1f6156"
  slate-lit: "#5cb3a3"
  slate-surface: "#e2efeb"
  error: "#a8442a"
  whatsapp: "#1fa855"
  whatsapp-on: "#ffffff"
  cast-deep: "#0a0602"
  world-timbers: "#d29a45"
  world-timbers-bg: "#221c13"
  world-doors: "#a98b4f"
  world-doors-bg: "#f5f0e6"
  world-ply: "#a8603f"
  world-ply-bg: "#ece2cf"
  world-wpc: "#1c675c"
  world-wpc-bg: "#dfe9e5"
  lamp-room-hot: "#f6dfac"
  lamp-room-mid: "#ddb371"
  lamp-room-far: "#9a7440"
  corridor-lit: "#3a2e1e"
  portal-wash: "#78582a"
  room-groove: "#3c280f"
  ply-face: "#e2cda8"
  ply-face-warm: "#c9ae85"
  ply-core: "#8a7355"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(54px, 8vw, 112px)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(40px, 5vw, 68px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "normal"
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.22em"
  kicker:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.34em"
rounded:
  none: "0"
  arch: "50% 50% 3px 3px / 33% 33% 3px 3px"
  swatch: "2px"
  track: "3px"
  soft: "10px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "28px"
  xl: "48px"
  section: "110px"
  section-tall: "140px"
  gutter: "6vw"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "13px 24px"
  button-dark-hover:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.deep}"
  button-night:
    backgroundColor: "{colors.night}"
    textColor: "{colors.cream-on-dark}"
    rounded: "{rounded.none}"
    padding: "14px 26px"
  card:
    backgroundColor: "{colors.cream-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "22px 26px 26px"
  card-stage:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.none}"
    padding: "44px 0 38px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  input:
    backgroundColor: "{colors.cream-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
    height: "48px"
  nav-cart:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "44px"
  badge:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.deep}"
    rounded: "{rounded.soft}"
    padding: "0 6px"
    height: "20px"
---

# Design System: Patidar Doors

## Overview

**Creative North Star: "The Threshold"**

Every surface behaves like a door. The site is not a page you scroll but a
sequence of openings you pass through — the hero door swings and you are pushed
through it into a corridor of four more; a product card's leaf falls ajar as you
approach; a world page is an arched opening with the material full-bleed behind
it. The reward for moving is always something opening. Nothing here is a
container with content inside it; everything is a frame with something beyond it.

The ground is warm paper — a cream family from `#f5f0e6` up to `#fbf7ef` — ruled
with hairlines and set in a Cormorant Garamond that reads like a printed
catalogue rather than a web headline. Against that paper, the only colour that
belongs to the interface is brass: never a fill, always an edge. Everything with
actual chroma in it is the material itself — teak, golden-teak, birch ply,
slate-green WPC, and the client's own door photography. The system is
deliberately drained so the wood is the loudest thing on screen.

Corners are square as a rule (`border-radius: 0`, asserted even over iOS's
default input rounding). Controls are hardware, not software: thin metal rules,
wide-tracked uppercase micro-caps, plates that look screwed to a door rather
than tapped on a phone. The confirmed rejection is anything toy-like — the
glass-globe world cards were removed in August 2026 because a spinning specular
sweep and a bobbing float read as a toy against the rest of the site — and
anything that looks like default browser feedback.

**Key Characteristics:**

- Warm paper ground; all chroma comes from real material, not from the UI
- Square corners, hairline borders, no radius unless a shape demands it
- Brass as an edge and a rule; gold reserved for dark grounds only
- Serif names the thing, sans explains it
- Depth is light falling on an object, not elevation stacking
- Phone-first: 44px targets, 16px fields, safe-area padding, hover behind a query

## Colors

A drained warm-neutral system in which the interface owns no colour of its own
except brass, and the material supplies everything else.

The palette is declared in two tiers in `styles/global.css`. **Tier 1** is
primitives: physical names for pigments (`--cream`, `--night`, `--brass`), and
nothing in tier 1 encodes a role. **Tier 2** is roles — `--surface`,
`--surface-raised`, `--surface-sunk`, `--surface-band`, `--text`, `--text-2`,
`--text-3`, `--border`, `--border-strong`, `--border-control`, `--accent`,
`--accent-deep`, `--accent-text`, `--action`, `--action-text`,
`--action-hover`, `--action-hover-text`, `--focus`, `--focus-halo`, `--stage` —
and roles are what a component reaches for. Components never name a pigment.
That indirection is the whole reason a world page can re-skin every card,
button, chip and rule inside it by restating one token block.

Global chrome — nav, footer, cart drawer, toast, the WhatsApp float — reads
tier 1 directly and deliberately does *not* theme, because those are what hold
the four worlds together as one brand.

### Primary

- **Hinge Brass** (`#a98b4f`): the interface's only accent on light grounds, and
  it appears almost exclusively as an edge — the 1px underline beneath the active
  nav link, the 3px bar under a section title, the 9px rotated diamond. It fills
  only two things: the cart badge and a hovered dark button.
- **Brass Deep** (`#8c6f3f`): the heavier edge — the focus ring, a hovered or
  selected control's border. Anywhere brass has to be *seen* as a control rather
  than as decoration.
- **Brass Ink** (`#7d6234`): brass when it has to be *read*. Kickers, category
  micro-caps, inline links, the price-breakdown summary. Hinge Brass measures
  2.9:1 on cream and Brass Deep 4.1:1 — neither can legally carry 12px text, and
  for a long time both were doing exactly that across the site.

### Text ramps

Two three-step ramps, one per ground. Every step is measured against the
*darkest* surface it can land on, not against the canvas — a tertiary that
passes on the page but fails on the card stage is not passing.

- On paper: **Ink** `#211a12` (15.1:1) · **Muted** `#5f5342` (6.6:1) ·
  **Muted Light** `#70624c` (5.2:1).
- On night: **Cream on Dark** `#f0e3c2` (14.1:1) · **Lamp 2** `#c3b394` (8.7:1) ·
  **Lamp 3** `#968771` (4.8:1).

The dark ramp previously did not exist as tokens: seven near-duplicate literals
(`#b5a78e`, `#b8a988`, `#cbbb9d`, `#d9ccb2`, `#9b8c75`, `#6e604c`, `#5e503c`)
were doing three jobs across the dark bands, and the two darkest of them — the
footer's copyright bar at 2.9:1 and the economics chain's arrow at 2.2:1 — were
illegible.

### Secondary

- **Lamplit Gold** (`#c9a964`) and **Lamplit Gold Light** (`#d9b873`): the dark
  grounds' accent — the hero's light beams, the big economic number on the night
  band, gold kickers. This is light, not metal: it exists where something is
  being lit, and it never appears on cream.

### Status — the shop floor

Every colour this interface uses for *meaning* is a colour of a material
standing on Patidar's floor. The system never imports a signal palette it would
then have to justify against **The Material Owns the Colour Rule**, and none of
these is a hue the catalogue photography doesn't already contain.

- **Clay** (`#a8442a`, text `#9c3d24`, surface `#f7e6df`) — fault. The Ply
  world's material and the Terracotta Clay paint tone. A failed field takes the
  clay ground outright, not just a 1px border: on a phone, after the form has
  scrolled, a hairline is not findable.
- **Teak** (`#c9903f`, text `#8a5a15`) — caution, in-progress, hidden-from-site.
  The Timbers world's material.
- **Slate** (`#1f6156`, lit `#5cb3a3`, surface `#e2efeb`) — confirmed. The WPC
  world's material. It carries the cart toast's mark, the order-confirmed
  diamond and the admin's save notice.
- **WhatsApp green** (`#1fa855`) stays what it always was: a platform colour,
  borrowed under licence, on the float and the WhatsApp button and nowhere else.
  It is never repurposed as a generic success colour.

Every status also carries text and a shape (the rotated square), so nothing in
this system is communicated by colour alone — which matters here because clay
and teak converge under the common red-green deficiencies.

### Tertiary — the four worlds

Each world restates the *role* layer under `[data-world]`, so one component set
renders as four sub-brands. The `--w-*` names survive only as aliases of the
roles for the handful of rules written against them.

The signature is deliberately not just a hue: each world separates its content
by a different physical logic, because that is what the material does.

| World | Ground | Accent | Separates by |
|---|---|---|---|
| **Timbers** | `#221c13` — the only fully dark world | `#d29a45` | **Cut lines.** The section rule is a kerf: a full-width cut with the bright amber edge where the blade bites. |
| **Doors** | `#f5f0e6` — the house paper | `#a98b4f` | **Hairlines.** This world *is* the base system; its distinction is being the one the others depart from. |
| **Ply** | `#ece2cf` — a pallet of sheets, not a page | `#a8603f` | **Layered plies.** A five-ply strip rules the sections and runs along the foot of every card, so a row reads as a stack of sheets. |
| **WPC** | `#dfe9e5` — the one cool world | `#1c675c` | **Tonal steps.** Extruded stock has no arris, so this world has no hairlines at all: radii, tonal steps and a moulded top highlight. |

Timbers is composed as a dark theme rather than an inversion of the cream one:
its surfaces step *up* from the canvas toward the light. It is also the only
world whose primary action is the accent rather than ink — an ink plate on that
ground is invisible.

The ply edge is a **background strip, never `border-image`**: `border-image`
repaints every edge that has width, which turns a card's 1px hairline into
dashes on all four sides.

### Neutral

- **Cream** (`#f5f0e6`): the body ground, and the text colour on every dark fill.
- **Cream Raised** (`#fbf7ef`): cards, inputs, summary panels — the surface that
  sits *above* the page.
- **Panel** (`#efe7d6`): the card stage the product stands on, and the world
  surface band.
- **Line** (`#e6dcc6`) / **Line Strong** (`#d9cdb2`): hairline rules. Line for
  dividers inside cream, Line Strong for input and chip borders.
- **Ink** (`#211a12`): body text and every primary fill.
- **Night** (`#241c13`) / **Deep** (`#1c1610`): the dark bands and the footer.
- **Frame** (`#3b2e1f`): rules on dark grounds.
- **Cream on Dark** (`#f0e3c2`): the cream that reads correctly against Night and
  Deep — warmer and lighter than base Cream, and the colour of the cream logo.
- **Muted** (`#6f6354`) / **Muted Light** (`#8a7a62`): secondary and tertiary text.
- **Error** (`#a8442a`): field borders and error text. A burnt terracotta, not a
  signal red — it belongs to the palette rather than interrupting it.
- **WhatsApp** (`#1fa855`): the float and its shadow only. This is a platform
  colour, borrowed under licence from the platform, and it appears nowhere else.

### Depiction

Five colours in the palette belong to the *artwork*, not the interface, and are
listed so they are documented rather than read as drift. The lamplit room
(`#f6dfac` → `#ddb371` → `#9a7440`) is what you see through an open door — the
hero aperture and every card's door scene share it. The corridor's lit ceiling
is `#3a2e1e`, and `#78582a` is the warm wash the hero's light beams sit in.
`#3c280f` is the groove between wall panels inside the doorway. The three ply
tones (`#e2cda8`, `#c9ae85`, `#8a7355`) are the face and core of a sheet, drawn
in the Ply world's edge strip.

The shadow, scrim and highlight alphas are governed by **Elevation & Depth**
below rather than listed here; they are opacities of a depiction, not palette
entries.

### Named Rules

**The Two Golds Rule.** Brass belongs to cream grounds; gold belongs to dark
grounds. They never swap. Brass on a dark band goes muddy and gold on cream goes
weak — the split is what keeps both of them looking like metal and light rather
than two yellows.

**The Brass Edge Rule.** On cream, brass is an edge, a rule, a ring or a
diamond — never a field. If a large area needs to be dark, it is Ink; if it
needs to be warm, it is Panel. A brass block is always wrong.

**The Material Owns the Colour Rule.** Saturation comes from teak, veneer, ply
and WPC — the actual product. The interface stays neutral so the material reads
as the only real thing on the page. A decorative colour with no material behind
it does not belong in this system. A colour with *meaning* behind it does, and
it takes its hue from the material that already means that thing — see **the
shop floor** above.

**The Read-It / Ring-It / Rule-It Rule.** Brass has three steps and picking the
wrong one is the single most common way this palette fails. `--accent` is
decoration you look at (a rule, a diamond, a badge). `--accent-deep` is a
control you have to see (focus ring, selected border, hover border).
`--accent-text` is anything you have to read. A 12px micro-cap never takes
`--accent`.

**The Measured-Against-the-Darkest-Surface Rule.** A text colour is checked
against the deepest surface it can land on — the card stage, not the canvas.
Three of the ramp's steps had to move because they passed on the page and
failed on the panel. The palette has a runnable check; extend it rather than
eyeballing a new value.

## Typography

**Display Font:** Cormorant Garamond (with Georgia, serif)
**Body Font:** Archivo (with system-ui, sans-serif)

Both stacks carry a Noto/Sangam tail in `global.css` for Devanagari and
Kannada. Neither Cormorant nor Archivo covers those scripts, and without an
explicit tail the browser picks its own fallback per glyph — which lands on a
face at a different optical size and drops the line off its baseline
mid-sentence. Nothing is downloaded for it: one of each pair ships with
Android, iOS and macOS.

**Character:** A high-contrast old-style serif doing the naming, and a
grotesque doing the work. Cormorant is set at 500 with tight leading (0.95–1.15)
so headlines read as a printed catalogue plate rather than a web hero; Archivo
appears almost entirely as small, wide-tracked uppercase, which is why the
interface reads as stamped hardware rather than typed UI.

### Hierarchy

- **Display** (500, `clamp(54px, 8vw, 112px)`, 0.95, `-0.015em`): the portal
  hero title and the closing CTA. One per page at most. Italic within it is set
  in Hinge Brass — the only place the accent carries a word.
- **Headline** (500, `clamp(40px, 5vw, 68px)`, 1.04): page and world titles.
- **Title** (500, 26px/1.15): section heads, card names (25px/1.1), drawer and
  checkout heads. Always serif — a product's name is set the way a name is set.
- **Body** (400, 15px/1.6): base. Prose columns and long descriptions run to
  `clamp(20px, 2.6vw, 30px)` serif at 1.5 when they are the point of the section
  rather than support.
- **Label** (500, 11–13px, `0.18em`–`0.26em`, uppercase): every button, nav link,
  field label and meta line. The tracking widens as the size drops.
- **Kicker** (600, 12px, `0.34em`–`0.38em`, uppercase, Brass Deep): the eyebrow
  above a headline. The widest tracking in the system.

### Named Rules

**The Serif Names, The Sans Explains Rule.** Cormorant carries names, titles and
prose that wants to be read slowly. Archivo carries everything functional —
controls, labels, prices, specs, meta. A serif inside a button is wrong; so is a
sans product name outside the Ply world, which deliberately runs its titles in
uppercase sans because a spec sheet should not be lyrical.

**The Micro-Caps Rule.** Functional text is uppercase Archivo at 11–13px with at
least `0.18em` tracking, and it never grows. Emphasis in this system comes from
scale in the serif, never from a bigger label.

## Layout

The page is a single centred column: `6vw` gutters with a `1280–1320px` max
width, and vertical sections at `110–140px` of padding that compress to roughly
`70–88px` under 760px. Interior pages open at `148px` of top padding to clear the
fixed nav. Grids are `repeat(auto-fill, minmax(280px, 1fr))` at a 28px gap, so
the catalogue reflows by itself rather than by breakpoint.

Full-bleed dark bands interrupt the cream at intervals — the marquee, the
economics band, the quotes band, the footer, and the Door Wall at the top of
`/shop`. These are the system's punctuation: they break the paper, reset the
eye, and are the only places gold appears. A band always runs edge to edge; a
dark section inside a gutter would read as a box, not a break.

Breakpoints are `900px` (the desktop/mobile split for nav and the Door Wall's
two-up viewer), `760px` and `620px` (section compression), and `380px` (the
smallest phone adjustments). Fixed chrome — nav, drawer, toast, WhatsApp float,
footer — pads itself with `env(safe-area-inset-*)`, because `index.html` sets
`viewport-fit=cover`. The nav publishes its measured height as `--nav-h` and
anything positioning against it reads that variable instead of a hardcoded
offset.

### Named Rules

**The 44px Rule.** Every interactive target is at least 44px in its smallest
dimension inside the phone breakpoints, and every form control is at least 16px
of type — below that iOS Safari zooms the page on focus and never zooms back.

**The Centred-Without-Translate Rule.** Absolutely positioned centred elements
use `left: 0; right: 0` with `width: fit-content; margin: 0 auto`, never
`left: 50%` plus `translateX(-50%)`. The latter shrink-to-fits inside half the
available width and wraps the text.

## Elevation & Depth

Depth in this system is **light falling on a physical object**, not elevation
stacking. A door leaf casts an offset directional shadow (`6px 8px 26px
rgba(28, 20, 10, 0.3)`) because it is a slab being lit from one side; the
aperture behind it carries a deep inset (`inset 0 0 0 3px rgba(22, 14, 5, 0.55)`,
`inset 0 0 24px`) because you are looking into a dark room. Those shadows are
depiction, and they belong to the artwork.

Interface chrome is flat. Cards sit on the page with a 1px `Line` border and no
shadow at rest, and lift only on hover — and only on pointer devices. The one
exception is fixed chrome, which floats over content and earns a real cast.

### Shadow Vocabulary

- **Object cast** (`box-shadow: 6px 8px 26px rgba(28, 20, 10, 0.3)`): a door leaf
  or any depicted physical slab. Offset on x as well as y — the light has a
  direction.
- **Card lift** (`box-shadow: 0 26px 50px rgba(35, 25, 12, 0.12)` with
  `translateY(-5px)`): hover only, pointer only. On dark worlds the same lift
  deepens to `rgba(0, 0, 0, 0.45)`.
- **Aperture inset** (`inset 0 0 0 2px rgba(245, 240, 230, 0.08)`,
  `0 26px 60px rgba(35, 25, 12, 0.24)`): the framed opening in the hero and the
  world cards.
- **Floating chrome** (`box-shadow: 0 16px 40px rgba(24, 17, 9, 0.3)` for the
  toast, `-30px 0 70px rgba(24, 17, 9, 0.25)` for the cart drawer): the only
  shadows that exist purely to say "this is above the page".
- **Focus ring** (`0 0 0 3px rgba(169, 139, 79, 0.18)` on fields; `2px solid
  var(--brass)` with 2px offset globally): brass, always.

### Named Rules

**The Warm Cast Rule.** No shadow in this system is neutral black. Casts run
`rgba(28, 20, 10, …)` on paper and bottom out at **Cast Deep** (`#0a0602`) for
the near-black grounds — the door wall, the tap-to-zoom scrim, the corridor
arches. A pure `rgba(0, 0, 0, …)` next to a warm ground reads as a hole punched
in the page rather than as light falling short, and it was doing exactly that in
five places.

**The Offset Cast Rule.** Any shadow depicting a real object is offset on both
axes. A centred, evenly-diffused shadow says "CSS box"; an offset one says "there
is a lamp in this room". Interface shadows may be centred; object shadows may not.

**The Flat Chrome Rule.** Buttons, inputs, chips, nav and cards carry no shadow
at rest. If a surface needs separating, it gets a hairline rule or a tonal step
in the cream family, not a shadow.

## Shapes

Square by default. `border-radius: 0` is the resting state of every control, and
it is asserted explicitly on inputs because iOS rounds them by default and that
alone breaks the language. Separation is done with 1px hairlines in `Line` or
`Line Strong`, not with corners.

Four sanctioned curves exist, each for a reason:

- **The arch** (`border-radius: 50% 50% 3px 3px / 33% 33% 3px 3px`): the world
  card's opening. This is the system's one piece of real geometry — a doorway —
  and it should not be reused as decoration on things that are not openings.
- **The pill** (`999px`): quick-pick size chips only, where the shape signals
  "tap me, I'm a shortcut" against the square controls around it.
- **The circle** (`50%`): the WhatsApp float, slider thumbs, and the cart badge's
  10px capsule.
- **WPC's soft card** (`10px`): the one world permitted to round its cards,
  because moulded WPC has no sharp arris and the material would be misdescribed
  by a knife edge.

The recurring silhouette across the whole system is the door leaf itself: a tall
3:8 rectangle. Product art is drawn to it, `MaterialArt` slices to fill it, and
photographs are cropped to it rather than letterboxed inside it.

### Named Rules

**The Square Corner Rule.** A new control starts at radius 0. Rounding is a
decision that must name which of the four sanctioned curves it is using and why;
"it looked softer" is not a reason.

## Components

### Buttons

- **Shape:** Square (`0`), 1px border, uppercase Archivo at `0.22em`.
- **Default:** Transparent on cream with an Ink border and Ink text, `13px 24px`.
  Inverts to Ink-on-Cream on hover.
- **Primary (dark):** Ink fill, Cream text. Hovers to **Hinge Brass** — the fill
  warms rather than darkens, which is the system's one moment of brass as a
  field — and the label turns to Deep with it. Cream on brass measures 2.8:1 and
  ink on brass 5.5:1; a brass plate with dark stamped lettering is also the more
  hardware-like of the two.
- **Night:** For dark bands — Night fill, Cream-on-Dark text, `14px 26px`, hovers
  to brass.
- **Big / Ghost / Block:** the same plate at `17px 36px` / `10px 16px` / full width.
- **Hover / Focus:** every colour-changing hover is wrapped in
  `@media (hover: hover)`. Focus is a 2px brass outline at 2px offset, everywhere.

### Chips

- **Style:** Pill (`999px`), 1px Line Strong border, transparent, 12.5px Muted
  text — deliberately the softest control in the system so the quick-picks read
  as suggestions beneath the sliders that own the real decision.
- **State:** Selected fills Ink with Cream text. Hover (pointer only) moves the
  border to brass and the text to Ink.

### Cards / Containers

- **Corner Style:** Square (`0`); WPC alone rounds to `10px`.
- **Background:** Cream Raised, on a Panel-gradient stage (`44px 0 38px`) where
  the product stands. The product occupies 44% of the stage width.
- **Shadow Strategy:** none at rest; the card lift on hover, pointer only.
- **Border:** 1px Line.
- **Internal Padding:** `22px 26px 26px`, 6px between lines.
- The category is a brass micro-cap, the name is serif at 25px, the tag is 13.5px
  Muted sans, and the price row sits 14px below on its own baseline.

### Inputs / Fields

- **Style:** Cream Raised fill, 1px Line Strong border, square, 48px minimum
  height, 16px Archivo. `-webkit-appearance: none` throughout; the select's arrow
  is redrawn as two 6px gradient triangles because removing the appearance
  removes the native one.
- **Focus:** border moves to brass with a `3px rgba(169,139,79,0.18)` halo, and
  the native outline is suppressed in favour of it.
- **Error:** border and message in Error terracotta at 12.5px.

### Navigation

- Fixed, `rgba(245,240,230,0.86)` with a 14px backdrop blur and a 1px Line rule
  beneath. The PP monogram at 30px sits beside a wordmark tracked at `0.32em`
  over a 9px uppercase sub-line.
- Links are 13px uppercase Muted Light at `0.18em`; active adds a brass
  underline and Ink text. Hover is pointer-only.
- The cart is an Ink plate, 44px minimum height, with a brass badge.
- Under 900px the links collapse to a 44px square burger whose bars cross into an
  X; the sheet positions itself off `--nav-h`.

### The Door Scene (signature)

The system's defining component. A product's leaf is hinged on its left edge and
swings open in 3D — `rotateY(-26deg)` for SVG art, `-18deg` for photographs,
over a warm aperture with an edge-shade gradient that fades in as it opens. On
pointer devices this is the one hover permitted to live outside
`@media (hover: hover)`; touch devices get the equivalent through an
`--ajar` class applied by a shared IntersectionObserver as the card crosses
mid-viewport, so a phone visitor sees the doors open as they scroll rather than
never seeing them open at all.

Everything else in the system is downstream of this: the portal hero is the same
gesture at full-screen scale, the world cards are the aperture without the leaf,
and the Door Wall is the leaf without the frame.

## Failure states

Every surface in this system has a state where its content is missing, wrong or
unreachable, and each of those is designed rather than left to the browser.
The governing idea: **a failure is an unlit room, not a torn page.** The site's
job is footfall, so a broken surface still has to hand over a phone number.

- **The crash screen** (`.crash`): a hinge plate drawn in brass, hung seven
  degrees out of true with two of its three screws sheared. Same stroke weight
  as the rest of the drawn artwork; it is the only illustration in the system
  that depicts something failing. Headline in the display serif, the two ways
  out as the standard plates, and the store's number underneath as a link.
- **A stale chunk reads differently from a crash.** A hashed lazy chunk that
  404s means the site was redeployed under an open tab — the honest word is
  "reload", not "sorry", and the screen says so instead of apologising for a
  bug that isn't one.
- **A missing photograph** (`.photo-missing`, `.doorwall__missing`) keeps the
  leaf's 3:8 box and takes the panel gradient with a faint sawn grain drawn in
  repeating gradients — no asset that could fail in turn. The label is a micro-
  cap at the foot. On the dark wall it goes to night, because an unphotographed
  door on an unlit wall is what it actually is.
- **An empty range** (`.empty-range`) sits on the card stage's own ground with
  a hairline, so a range with nothing in it still reads as part of the
  catalogue rather than as a hole in the page. It always ends in a way to ask.
- **A form's failures are counted once, then named individually.** One live
  region above the form says how many (`.checkout__alert`, clay ground and the
  rotated square); each field says which, and takes the clay ground outright.
  Six simultaneous `role="alert"`s announced nothing usable.
- **Admin failure states are the store owner's, not Postgres's.** Every message
  names what to do next; an unrecognised error keeps its original text, because
  that is the one worth reading down the phone.

### Named Rules

**The Unlit Room Rule.** A failure state is drawn in the system's own materials
and holds the box the content would have held. It never renders as a browser
default — no broken-image glyph, no blank rectangle, no white screen — and it
never occupies space before there is anything wrong.

**The Caseless Script Rule.** The functional voice is wide-tracked uppercase
Archivo, and both halves of that are wrong outside Latin. Under a Kannada or
Devanagari `lang`, tracking and `text-transform` are dropped: uppercase is a
no-op in a caseless script, and letter-spacing separates a consonant from the
matra bound to it, so the akshara stops reading as one unit. Latin runs inside
a non-Latin page keep the system's voice by carrying `lang="en"`.

## Do's and Don'ts

### Do:

- **Do** start every control at `border-radius: 0` and justify any curve against
  one of the four sanctioned shapes.
- **Do** keep brass on cream and gold on dark (**The Two Golds Rule**).
- **Do** use brass as an edge — rule, ring, underline, diamond — not as a field.
- **Do** set names and headlines in Cormorant and everything functional in
  uppercase Archivo at `0.18em` or wider.
- **Do** wrap every colour-changing `:hover` in `@media (hover: hover)`. Touch
  latches `:hover` on the last thing tapped, so an "Add to cart" you just pressed
  would sit lit until you tapped elsewhere.
- **Do** give a touch equivalent to anything that only reveals itself on hover —
  the door swing's `--ajar` class is the pattern to copy.
- **Do** keep form controls at 16px or larger and interactive targets at 44px or
  larger inside the phone breakpoints.
- **Do** pad fixed chrome with `env(safe-area-inset-*)`.
- **Do** offset object shadows on both axes and leave interface chrome flat.
- **Do** let the material carry the saturation; keep the interface neutral.

### Don't:

- **Don't** add toy-like or glossy 3D — spheres, specular sweeps, bobbing floats,
  glass. The glass-globe world cards were removed for exactly this, and the
  replacement is flat material under an arch.
- **Don't** ship default browser feedback. The grey tap-highlight is killed
  globally because it reads as cheap; every component owns its pressed and hover
  state, and focus is the brass ring, never the UA outline.
- **Don't** let iOS restyle a control — inputs are explicitly de-rounded and
  de-appearanced, and a new control must do the same.
- **Don't** put a serif inside a button, or grow a label to create emphasis.
- **Don't** introduce a colour that no material on the floor actually has.
- **Don't** use `left: 50%` + `translateX(-50%)` to centre absolutely positioned
  content (**The Centred-Without-Translate Rule**).
- **Don't** reuse the arch on anything that is not an opening.
- **Don't** let a failure render as a browser default — a broken-image glyph, an
  empty grid, a blank page (**The Unlit Room Rule**).
- **Don't** track or uppercase text in a caseless script (**The Caseless Script
  Rule**).

### On the four worlds

The user's standing decision is that a world may depart from the base system
almost completely — close to a sub-brand, with only the nav, footer and logo
holding the four together. **That latitude has now been taken on the colour and
separation axes**: each world restates the whole role layer (surfaces, both text
ramps, borders, accent trio, action pair, focus) and carries its own physical
logic of separation — kerf, hairline, ply edge, tonal step. Ply also runs its
titles in uppercase sans and WPC rounds its cards to 10px.

What is *not* yet taken is type scale, layout rhythm and shape language beyond
those two exceptions; the four still share one grid and one type ramp. That
remains available.

Adding a world is now a token block plus a signature, not a list of overrides
per component — if you find yourself writing `[data-world='x'] .card__name`,
the role layer is missing a token. A world that takes the freedom still owes
the system its mobile-first rules, its focus treatment, and its 44px/16px
floors — those are not stylistic.
