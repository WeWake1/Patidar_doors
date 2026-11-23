# Decisions log

Owner answers, newest first. Never re-ask anything answered here. The brief is
[`creative-reboot-brief.md`](creative-reboot-brief.md); every design round is written up in
[`prototypes/README.md`](prototypes/README.md). Facts Claude looked up go under "Research facts";
decisions are only ever the owner's.

## 2026-11-23 · session 1 · round 1 built, verdict asked

Round 1 is four hero concepts (two premium, two wild) at `/reboot/?variant=A|B|C|D` (`npm run reboot`; on a
phone over Wi-Fi: `npm run reboot:phone`), written up in [`prototypes/README.md`](prototypes/README.md).
Reference sites for Q7: [`references/README.md`](references/README.md).

### Open questions (round 2, asked 2026-11-23)

1. **Verdict** on A "The weight", B "Four materials, one roof", C "The first cut", D "Into the grain" [C
   is the hero, and the other three become the home page after it, in story order: the log is sawn (C),
   it becomes a door you can push (A), the four things on the counter (B), come and touch the grain (D)].
2. **Look**: which colour and typeface do you like, whatever the concept? (A oxblood + Gloock, B vermilion
   + Schibsted Grotesk, C safety yellow + Unbounded, D lilac + Syne) [round 2 shows the chosen page in two
   complete looks side by side: the hero's own and A's quieter one].
3. **Wildness**: are C and D the right amount of crazy? [yes, about right].
4. **References**: which of the nine move you? [steer by two: Oryzo's deadpan seriousness about a humble
   object, and Apple's one true fact per screen; nothing as game-like as Bruno Simon].
5. **Copy**: every line in round 1 is Claude's draft built only on confirmed facts. Any line you love or
   hate? [keep refining them; flag anything that sounds off].
6. **Sound**: should the saw or the door make a sound, off until tapped? [no sound for now].
7. **Round 2** [the whole home page around the verdict, in three different page structures, with the
   chosen hero rendered at full quality (about 168 frames on computers, 84 on phones)].
8. **Render assets in git**: the downloaded CC0 scans and HDRIs in `tools/render/` are about 112 MB; the
   round-1 frames about 10 MB [ignore the scans and HDRIs (re-downloadable from
   `tools/render/textures/README.md`), commit the frames and the scripts].

## 2026-11-23 · session 1 · round 1 answered

| # | Question | Answer |
|---|---|---|
| 1 | What to keep | **Yes to all.** Keep the substance list below (Q1 of round 1); redesign everything else, the hero included. One brand, the materials carry the difference between sections; the "walk through a door into the store" idea is retired. |
| 2 | The client's view, and `/lab` | The five `/lab` directions are **"not good at all, and no one likes them"**: rejected (see below). |
| 3 | How far to go | **The whole site.** |
| 4 | How wild | **Both.** Prototypes and demos of premium-and-bold concepts *and* of wild ones. |
| 5 | Who the hero speaks to | **Homeowners first, then architects and interior designers, then the rest** (trade). |
| 6 | Theme, colour, type | The owner **hates the current theme: everything brown and cream** (rejected, see below). **Go lighter.** Colour and typeface are both open: try new ones in the prototypes. |
| 7 | Reference sites | The owner has found **no door, timber or furniture site good enough** to want to be mistaken for. Claude to find **"crazy" ones**. **Apple's product pages are among the best** they know. |
| 8 | Blender films | **Blender all the way** for the films on the hero, the home page and other pages. **Not** for the catalogue: the door designs number in the millions and keep changing, so products are shown by photographs. |
| 9 | Which facts to build on | All six are **true**: logs bought whole and sawn in Patidar's own yard; door leaves pressed and finished in its own factory; everything made to measure; **three generations of timber**; timber **seasoned to resist warping**; WPC doors **do not swell**. The rest of the product copy is still AI-drafted and unconfirmed. |
| 10 | Photos | Every photo on the current site is a **placeholder found online**; real product photos were never added. **Keep using the placeholders while building**; the real photos go in once the new site is built. (No fact sheet, no clean-up on `main` for now.) |
| 11 | Phones | **Yes** (Pallet Euro's four rules adopted: no scroll-driven or pinned motion on phones, no Lenis, no dot grids, Lighthouse mobile 99–100), and **the phone experience is the top priority**. |
| 12 | SEO and stack | **The stack is Claude's call**: whatever pulls off the vision. |
| 13 | Timeline | **No fixed date; quality first.** |
| 14 | Housekeeping | `.claude/skills/` is no longer gitignored. **The owner does all the committing**: Claude never commits, pushes, merges or deploys. |

### Round 1 as asked (2026-11-23)

Claude's recommended answer is in brackets; "yes" accepted it unless the table above says otherwise.

1. **What to keep from the current site** [keep the substance: the PP mark, the real contact details, WhatsApp and the order message the workshop cuts from, the live catalogue and `/admin`, the configurator, cart and WhatsApp checkout, try-at-home, the confirmed sales flow, the plain first-person voice, the four sections Timbers · Doors · Ply · WPC. Restart everything visual, including the Door Wall and the four colour skins: one brand, with the materials carrying the difference between sections (this reopens the standing decision in `DESIGN.md` that each world may be close to a sub-brand). Retire the "walk through a door into the store" hero idea (`DESIGN.md`'s north star, "The Threshold"); a door may still open in a new concept when the opening itself shows something true.]
2. **What the client thinks, and the `/lab` directions** [log the five `/lab` directions as "not chosen" (kept on the `redesign` branch) and carry forward only parts the owner names; if the client's view of the current site is unknown, assume "replace it".]
3. **How far to go** [the whole public site, in this order: hero → rest of the home page → product page → section pages → Visit → the rest; `/admin` and `/try` keep working and are re-skinned last; the current site stays live and untouched until the owner accepts the new one.]
4. **How wild** [two of the three round-1 concepts premium and bold, the third a deliberate wild swing that may be too much; all three built on a true fact.]
5. **Who the hero speaks to** [the homeowner choosing doors leads the hero and home page; trade gets a fast lane one tap from the top (grades and sizes in a dense list); architects get product pages that work as spec sheets. Note: `PRODUCT.md` records the three as co-primary, so this changes a past decision for the hero only.]
6. **Theme, colour, type** [(a) light, warm daylight ground, dark only inside a film whose scene is dark; (b) no invented brand colour: the logo's charcoal as ink plus accents taken from real materials, settled from the renders, never deep blue; (c) no typeface kept by default: each round-1 concept brings its own pairing, Urbanist excluded.]
7. **Reference sites** [if none: Claude researches about eight (door, timber and craft brands, plus scroll-film product pages) with screenshots for the owner to react to in round 2.]
8. **Photoreal Blender films, and the star** [yes, renders for everything visitors look at; no live 3D in round 1; the star is a solid teak main door, with the teak log as co-star.]
9. **Which facts round 1 may build on** [only the three `PRODUCT.md` records as the positioning: logs bought whole and sawn in Patidar's own yard; leaves pressed and finished in its own factory; everything made to measure. Everything else is a `{{placeholder}}` until the client confirms it.]
10. **Photos** [(a) the new site never shows a photo that is not Patidar's own; renders stand in until the client's photography exists; (b) Claude writes `docs/facts.md`, a fact sheet with placeholders and a shot list, for the owner to take to the client; (c) on `main`, stop shipping the 24 unreferenced photos that carry other companies' marks (delete from `public/`, drop from the manifest, exclude in `images:build`), leaving the 3 in use until the reboot replaces their pages.]
11. **Phones** [adopt Pallet Euro's rules: no scroll-driven or pinned motion on phones (films play once when mostly in view, hold the last frame, "Play again"); no Lenis anywhere; no dot-grid backgrounds; Lighthouse mobile 99–100 on every public page except the try-at-home tool.]
12. **SEO and stack** [every public page ships its text in static HTML, with LocalBusiness structured data; the stack (Astro + React islands, or prerendering this Vite app) is chosen in round 2 once scope and direction are settled; nothing migrates before a yes; meanwhile prototypes run in this repo on their own `/prototype` entry.]
13. **Timeline** [no fixed date, quality first; round 1 is built straight after these answers; stills first, full films once a still is approved.]
14. **Housekeeping** [un-ignore `.claude/skills/` only, so the skills travel with the repo; commit each round locally on `creative-reboot`; never push, merge or deploy without the owner's say-so.]

## Research facts (2026-11-23)

- **Rendering machine** (Windows 11): Ryzen 5 9600X, 32 GB RAM, Radeon RX 9060 XT. Blender 4.4, 4.5
  and 5.1.2 are installed in `C:\Program Files\Blender Foundation\`. Blender 5.1.2's Cycles renders on
  the RX 9060 XT through **HIP** (the brief's "Metal" is the Mac equivalent), and HIP RT is available.
  Select the RX 9060 XT alone, not the integrated "AMD Radeon(TM) Graphics" or the CPU. A simple
  1600×900 frame at 128 samples took about 8 s; expect roughly 1–2 hours per 168-frame film with real
  wood, glass and brass, and minutes for a `--test` pass.
- **Pallet Euro reference repo** is at `C:\Users\vivek\VSC\Pallet-Euro` on this machine (the brief's
  `/Users/wewake/...` paths are the Mac's). Its `.claude/skills/` is committed; here `.claude/` is
  gitignored, so the three copied skills exist on this machine only.
- **Photography on hand.** The raw folders (`Main Doors/`, `Room Doors/`, `/Hero/`) are not on this
  machine: only the 480/960 px web copies of 99 photos in `public/images/doors/` and 17 leaf cut-outs.
  At least **27 of the 99 visibly belong to someone else**: 22 carry another company's logo, catalogue
  code, web address or phone number (Pragyan Doors, darbmotaghed.com, Victoria CNC Models' VTD codes,
  N.SKY Luxury Doors, alibaba.com, Puertas Innova, WESTLINE, OPPEIN, @arteoluxury, Özbegim,
  vietduchome and others), and 5 are screenshots of social-media or app screens. `main-29` also shows
  a stranger's house nameplate (name and house number). Most of the 50 `room-*` photos are studio
  catalogue shots in the same style as the marked ones, and a few `main-*` images (e.g. `main-01`,
  `main-13`, `main-49`) look like renders rather than photographs. **Which photos, if any, are
  Patidar's own is unknown.**
  · On the live site: `room-03` and `room-20` (both watermarked) are the covers of Veneer Designer Doors
  and Laminate Designer Doors, and `main-36` (a phone screenshot) is in a gallery. The Door Wall,
  captioned "Every one of these is standing in the store", leads with `main-01`. The other 24 marked
  photos are referenced by no page but ship in `public/`, so each is downloadable from the live domain.
- **Logo:** monochrome charcoal with ® (`brand/patidar-logo.pdf`, `brand/patidar-logo-lockup.png`). It
  carries no brand colour; the current cream, deep brown and brass palette is a site choice.
- **Current type:** Cormorant (serif) and Archivo (sans), self-hosted.
- **SEO today:** a client-rendered SPA. The static HTML holds the title, description, Open Graph and
  Twitter tags and a `<noscript>` address block; no page or product text, no structured data.
- **An earlier redesign attempt** sits unmerged on branch `redesign` (commit `21e20e6`, 13 Nov 2026).
  Its notes say "the client asked for a from-scratch, phone-first redesign and for 4–5 directions to
  choose from". It built five at `/lab`: Pocket Showroom (an app with a tab bar), The Lookbook (an
  editorial magazine), Walkthrough (a full-screen swipe reel), The Stocklist (dense spec tables and a
  WhatsApp list) and The Counter (guided questions). No verdict is recorded anywhere.
- **Claims on the current site with no source:** "Three generations of timber" (home page,
  `src/pages/Home.tsx`), "Seasoned to resist warping", "zero swelling, ever" (WPC doors), and all
  product copy (AI-drafted, per `PRODUCT.md`).
- **Catalogue:** 37 products (17 doors: 15 under Doors, 2 under WPC; 11 timbers; 8 ply; 1 WPC sheet)
  plus 3 test rows saved in `/admin` (`sdfsdfa`, `trial`, `Test`). Every timber, ply and WPC-sheet
  picture is a generated swatch, not a photograph.

## Carried over (decided before the reboot, still in force)

- **Mobile-first:** when phone and desktop conflict, the phone wins; audit at 390 and 360 px with
  screenshots (owner, July 2026).
- **Product page:** the big door photo owns the first phone screen; no sticky buy bar (owner, July 2026).
- **Nothing is paid online.** Sales flow confirmed by the client 2026-08-14: WhatsApp order → callback
  within 24 hours → free measurement visit → customer approves → 50% to start, 50% after installation →
  10–14 working days.
- **Never invent facts.** The three testimonials in `src/data/content.ts` are fabricated: never use them
  or write more. Product copy is AI-drafted. Every price is a placeholder (client confirmed them as
  placeholders 2026-08-20). A warranty exists but its terms are unknown.
- **Names:** Patidar Doors (the D2C brand) of Patidar Timbers (the parent).

## Rejected, never repeat

What this project already tried and dropped (from `CLAUDE.md`), newest first.

| When | What was tried | Why it went |
|---|---|---|
| 23 Nov 2026 | **The current site's look**: deep brown and cream, brass, Cormorant + Archivo | The owner hates it ("everything which is brown and cream"). Wood is still brown in the renders; the interface must not be. |
| 13 Nov 2026 | **The `/lab` redesign** (branch `redesign`): Pocket Showroom, The Lookbook, Walkthrough, The Stocklist, The Counter | "Not good at all, and no one likes them." |
| Aug–Nov 2026 | A scroll-scrubbed hero on phones built from page elements: 3D-transformed door elements (21 Aug), a generated CSS scroll-timeline sheet (1 Sep), composited images at 10× (10 Sep) | Each measured clean in headless Chrome and tore apart on real phones (doors drawn in chunks, strips missing, worse scrolling back up). The 11 Nov canvas rebuild is still unconfirmed on a physical phone. |
| 20 Aug 2026 | Twelve drawn "Designer Studio" doors (original SVG art) sold as products | A showroom whose purpose is footfall cannot front designs the shop floor does not stock. |
| 13 Aug 2026 | A mid-page strip repeating the hero's four-world chooser | It duplicated the hero, under a scroll track nobody can skip. |
| 13 Aug 2026 | An FAQ accordion teaser on the home page | "The oldest furniture on a storefront"; the page had already answered the two questions that matter. |
| 3 Aug 2026 | World cards as glass globes (sphere, spinning highlight, bobbing float) | They read as a toy. |

## Off-limits without asking

- **Pallet Euro's concepts and look** (brief §5): pallets and EPAL, the jaali-sunlight room, the
  anamorphic gallery, the X-ray lens, the branding film, the shipping container, deep blue as the brand
  colour, the Urbanist typeface.
- **AI slop** (brief §2): glow, aurora or beam backgrounds (the current portal hero's gold Beams
  included), radial halos, gradient or shiny text, the 3-column icon-title-text grid, icons in coloured
  circles, bento grids, nested cards, logo marquees, hero eyebrow chips, three big numbers with tiny
  labels, frosted glass everywhere, one bubbly radius on everything, gradient buttons, stock-photo
  heroes, generic copy, fake testimonials, avatars, star ratings. On the current site, the kicker above
  "Walk right in.", the 01/02/03 band and the ₹0 / 50% / Balance band are examples; their facts can
  stay, their shapes cannot.
- **Live 3D** anywhere visitors look, until the owner says otherwise (brief §3).
