# Patidar Doors project notes

Vite + React + TypeScript site for **Patidar Doors** (D2C brand of Patidar Timbers).
Showcase site — the goal is footfall to the physical store, not online selling (the cart/
WhatsApp checkout is kept for the 17 photographed doors, which are the only priced
products; timber, ply and WPC board are quoted in the store). `npm run dev` / `build` /
`preview` / `lint` / `images:build` / `fonts:build` / `leaves:build`.

- **Contact details are real** and live in `src/config.ts` (`whatsappNumber`, `phoneDisplay`,
  `email`, `storeAddress`, `mapsUrl`) — the Nagasandra store, its number and its maps link.
  They were placeholders until 2026-08-15; change them here and the whole site follows.
  Checkout/enquiries go via wa.me.
- **The site is served from `patidartimbers.com`**, and that origin is written in exactly
  two places: `index.html` (canonical, `og:url`, and the **absolute** `og:image`/
  `twitter:image`) and `ORIGIN` in `scripts/build-sitemap.mjs`. Change both together.
  ⚠️ `og:image` **must stay absolute**. A relative path is dropped by every scraper that
  matters — WhatsApp, Facebook, Twitter/X, LinkedIn — and a WhatsApp share is how most
  visitors meet this site; it shipped relative and rendered no card anywhere until
  2026-08-15.
  · `npm run sitemap:build` (also run by `npm run build`, before `vite build` so `public/`
  is copied) writes `public/robots.txt` + `public/sitemap.xml`. It gets the product list
  by **evaluating** `src/data/products.ts` through Vite's SSR loader, not by scraping it:
  the catalogue is a merge of local + `catalog.gen.ts` plus a price overlay on top, so
  a regex over one file misses most of the 37. robots disallows `/admin`, `/checkout` and
  `/order-confirmed`; the sitemap omits those plus the `/door/:id` legacy redirect.
- **Product copy is unverified draft** — tags/stories/specs across all four worlds were
  drafted by AI and must be confirmed with the client.
- ⚠️ **The 12 drawn "Designer Studio" doors were REMOVED 2026-08-20** (11 of them plus
  The Sentinel, which sat alone under "Safety Doors"). They were original SVG artwork
  drafted as placeholders while the client's photography was pending, and a showcase whose
  whole purpose is footfall cannot front designs the shop floor does not stock. Gone with
  them: their two subcategories in `worlds.ts`, the twelve `DoorArt` designs, the paint and
  steel tone ramps, `Product.motif` and `.pdp__motif`, and every carve-out that protected
  them (the CMS merge, `seed-supabase.mjs`). **Every product in the catalogue is now either
  a photograph of a real door or a generated material swatch** — 37 products, 15 factory
  doors among them.
  · The catalogue's *only* drawn leaf left is `classic`, and it is not a product: it is the
  hero corridor's Doors texture and the stand-in for a door not yet photographed.
  · **The cart survived the removal** — the 12 were the only priced products, so removing
  them would have left checkout with nothing to sell. The 17 photographed doors are priced
  instead, from `PLACEHOLDER_PRICES` in `products.ts`. ⚠️ **Every number in it is invented**
  (asked for and confirmed by the client 2026-08-20 as a placeholder), like the rates in
  `pricing.ts`. It is applied **after** the CMS merge, not written into the product
  literals, because `catalog:fetch` replaces a merged product wholesale and a locally-set
  price on an id Supabase also carries would vanish on the next fetch. Delete a door's line
  the day a real price is typed into `/admin`.
  · Photographed doors now get the configurator and the cart, which changed three things
  that were previously unreachable: the PDP falls back to `product.tag` where a factory
  door has no `story`; `ProductStage` takes `cfg` so the try-on link carries the size the
  sliders are actually set to; and the cart drawer draws the **leaf cut-out**, not an
  `ArtId` — every line was rendering the same generic `classic` leaf.
- **Four worlds IA**: `/timbers` `/doors` `/ply` `/wpc` render one `WorldPage` themed by
  `[data-world]` token scopes in `src/styles/worlds.css`. Worlds/subcategories defined in
  `src/data/worlds.ts`. The hero corridor's `.wcard`s carry `data-world` too, so they read
  the same block and can't drift from the page they open.
  ⚠️ **The four worlds are offered on `/` exactly once** — the hero corridor's "Choose your
  world" — plus the nav and the footer. A `.worldstrip` section ("Where do you want to
  start?") duplicated it until 2026-08-13: same `w.short` + `w.tagline`, same four routes,
  ~600px below a corridor that the 520vh sticky track makes *unskippable* on the way to any
  of the page. Removed rather than moved — the footer already lists the four worlds, so a
  strip at the bottom would have landed above another copy of itself. Don't re-add a
  mid-page world nav without a reason the corridor can't serve.
- **Colour tokens are two-tier** (`src/styles/global.css`). Tier 1 = primitives, physical
  names for pigments (`--cream --panel --night --brass --gold --lamp2/3 …`). Tier 2 =
  **roles** (`--surface[-raised|-sunk|-band] --text[-2|-3] --border[-strong|-control]
  --accent[-deep|-text] --action[-text|-hover|-hover-text] --focus --focus-halo --stage`)
  and **components only ever read roles**. Each `[data-world]` block restates the roles, so
  one component set renders as four sub-brands — if you catch yourself writing
  `[data-world='x'] .card__name`, a role is missing. `--w-*` survive only as aliases.
  Global chrome (nav, footer, drawer, toast, wa-float) reads tier 1 and deliberately does
  **not** theme — it's what holds the four worlds together as one brand.
  · ⚠️ **Vendor-prefixed properties go FIRST, the standard one LAST.** The build's CSS
  minifier collapses a prefix pair to whichever declaration is last, so
  `backdrop-filter` written before `-webkit-backdrop-filter` shipped as the *prefixed
  one alone* — which Chrome does not implement (`CSS.supports('-webkit-backdrop-filter')`
  is false there). `.nav` and `.nav__scrim` therefore had no blur at all in every
  Chromium browser and the page's own text read straight through the fixed nav on
  every route; it only ever looked right in `npm run dev`. Fixed 2026-08-11 by
  reordering. Verify after any CSS-toolchain change with
  `grep -o '\.nav{[^}]*}' dist/assets/index-*.css` — both declarations must be present.
  · **Measures are tokens too** (added 2026-08-11, same file, block "tier 1: measures").
  Type (`--type-*`, composite: size+leading+weight in one value, so `font: var(--type-title)`),
  tracking (`--track-*`, 8 steps named by amount), `--measure`/`--measure-px`,
  space (`--gutter --page-max --band-max --section{-sm,-lg,-phone} --nav-clear --grid-gap
  --touch`), curves (`--r-none --r-hair --r-soft --r-arch --r-pill --r-circle`),
  casts (`--cast-object --cast-aperture --cast-chrome{,-side} --cast-sheet --ring-focus`
  + `--cast-deep{,-rgb}`) and motion (`--dur{,-quick,-mid,-slow,-door} --ease-out --ease-door`).
  This replaced 13 serif clamps, 19 tracking values, 23 hand-mixed shadows and 8 durations.
  ⚠️ `--shadow-lift` is a **tier-2 role**, not a measure — the lift a card needs depends on
  its ground, so worlds restate it (Timbers does) and the home tiles pick up their own.
  ⚠️ Custom properties don't work in media queries — breakpoints stay literals. A migration
  pass rewrote `@media (max-width: 560px)` to `var(--measure-px)` and lightningcss caught it
  at build; if you batch-replace values, exclude `@media` lines.
  ⚠️ Figures (prices, totals, the slider readout) are deliberately **off** the type ramp —
  each is sized against what's beside it. Don't "fix" them into a step.
  ⚠️ `src/admin/admin.css` is out of scope by design: it declares itself "deliberately plain
  and utilitarian, separate from the storefront's design system" and keeps its `--ax-*` tier.
  Vendored `reactbits/*.css` is left alone to stay re-syncable.
  · **Status = the shop floor**: clay (Ply/terracotta) = fault, teak (Timbers) = caution,
  slate (WPC) = confirmed. Every status colour is a material on the floor, so nothing
  violates "don't introduce a colour no material has". WhatsApp green stays platform-only
  and is never reused as a generic success. Every status also carries text + the rotated
  square, so nothing is colour-only (clay and teak converge under deuteranopia).
  · **Brass has three steps and picking the wrong one is the usual failure**: `--accent`
  = decoration you look at (2.9:1, never text), `--accent-deep` = a control you must see
  (focus ring, selected border), `--accent-text` = anything you must read (5.0:1).
  · ⚠️ `npm run contrast` reads the hexes **out of** global.css/worlds.css and checks all
  74 text/surface pairs against WCAG AA. Text is checked against the *deepest* surface it
  can land on (the card stage, not the canvas) — three ramp steps had to move because they
  passed on the page and failed on the panel. Extend it when you add a role or a world;
  don't eyeball a new value. It exits non-zero on a failure.
  · ⚠️ the ply-edge stripe is a **background strip, never `border-image`** — border-image
  repaints every edge that has width, which turned the card's 1px hairline into dashes on
  all four sides.
- ⚠️⚠️ **"Is this a door?" is `isDoorProduct(world, sub)` — NEVER `visual.kind`**
  (`src/data/products.ts`, 2026-09-01). It reads the *catalogue position*, which is where
  the client already states the answer: `doors` always, `timbers`/`ply` never, and `wpc`
  **by section** — a section whose name ends in the word "Door"/"Doors" holds doors, which
  is what separates `wpc-cnc-door` from `wpc-sheets` inside one world. One owner, read by
  `leafOf`/`tryState`, by `buildCatalogue`'s `plain` overlay, by the admin editor and by
  `verify:geometry`.
  · **It replaced `visual.kind === 'photo'`, which was never a rule about doors** — it was
  a rule about *which products happen to have a picture*, and it held only while nothing
  but doors had been photographed. All 20 timber/ply/WPC-board products are generated
  swatches (`material`), so the line looked true for months. The day the client cropped a
  photo of teak logs into `/timbers`, that product stopped being `material` and every door
  behaviour switched on at once: the card became a 3:8 architrave that swings open, the
  editor offered swing/zoom/still, the cropper asked for four corners "on the door itself"
  plus a handle-side flip and a row of 6′6″–8′ stock door sizes, and the PDP started
  promising the doorway view. For a log pile. `verify:geometry` asserts both halves now
  (nothing outside the doors is placeable; no photograph of a non-door is *framed* as one).
  · ⚠️ The WPC rule reads a name the client can edit, so it is deliberately narrow — the
  **last word**, so "WPC Doors" and "Bathroom Doors" match while "WPC Sheets" and "Door
  Frames" do not. Renaming a section out of the pattern turns its cards into plain pictures
  and withdraws the doorway view, which is why `/admin` prints one line saying which way it
  read the section and how to change it. That line is the whole safety net for a
  name-driven rule; don't drop it.
  · **`presentation: 'plain'` is the fourth card treatment and is DERIVED, never stored.**
  `buildCatalogue` forces it onto every photograph of a non-door (overlay 3, alongside the
  price table and the leaf cut-outs), so both the snapshot and the live read get it.
  ⚠️ It is not a fourth CMS value on purpose: `products.presentation` is CHECK-constrained
  in Postgres, so a stored fourth value fails the client's *save* with a bare 23514 (see
  `widen_products_presentation_still`) — and it is not a choice anyone should have to make,
  since timber is not a door whoever is filling the form in. `StoredPresentation` (the
  three the column holds) and `PhotoPresentation` (those plus `plain`) are separate types
  so the admin cannot write it by accident.
  ⚠️ **The other three treatments all keep the architrave**, `still` included — that frame
  is the point of `still`. So "no animation" was never the fix for a log pile; `plain` is
  the swatch treatment instead: full-bleed 4:3, no frame, no motion, pixel-identical to the
  `MaterialArt` card beside it on `/timbers`. `isFullBleedVisual()` is what the card, the
  PDP and the admin preview pick their stage class from.
  ⚠️ `.photo-plain` puts the ratio on a **wrapper** and sizes the `<img>` 100%/100% inside
  it. `ProductPhoto` renders the CMS's real `width`/`height` attributes to reserve against
  CLS, and those are presentational hints on *both* properties — an explicit height beats
  `aspect-ratio`, which is how PDP thumbnails once rendered 1920px tall. The pair is the
  rule.
  · **In `/admin`, `ImageDropCrop` takes `isDoor`** and everything door-shaped hangs off
  it: the "corners on the door itself" copy, the handle-side flip, the stock-size chips,
  the "keep it a plain rectangle" tick (forced on, so it still writes `crop.mode: 'rect'`)
  and `guessDoorQuad`, which has nothing to say about a stack of logs and so does not run —
  the handles start on the **whole frame**, because off a door the crop is a trim, not a
  cut-out. The editor also hides the Card animation radios and the doorway-view status line.

- **Data model** (`src/data/products.ts`): `Product.visual` is a union —
  `art` (SVG door + tone group), `photo` (real image; `presentation: 'swing'`
  door-opens-animation vs `'showcase'` zoom/lift for in-situ shots vs `'still'`
  no animation at all, added 2026-08-31 for shots any motion misreads — a group
  of doors, a door already photographed ajar — vs `'plain'`, full-bleed and
  frameless for a photograph that isn't a door at all, derived not stored, see
  the doorness bullet above), `material`
  (generated swatch in `MaterialArt.tsx` for timber/ply/wpc). `ProductVisual.tsx` is the
  single map visual→component (cards, PDP, admin preview all use it). `PhotoShowcase.tsx`
  = the non-swinging photo treatment, and `still` is that same component with its
  motion off (`still` prop → `.photo-showcase--still`), **not** a bare `<img>`:
  the architrave frame is what keeps a still card in the grid's rhythm, so only
  the zoom goes. It also skips `useAjarInView` entirely rather than ignoring it.
  `purchasable` + `price` ⇒ size(+finish if art)
  configurator & cart; otherwise "Enquire on WhatsApp" PDP. Legacy `/door/:id` → `/product/:id`.
  ⚠️ `presentation` is CHECK-constrained in Postgres as well as typed in TS, and the
  DDL lives in the project (migrations applied via the Supabase MCP), not in
  `supabase/schema.sql`, which is only a summary. `still` needed
  `widen_products_presentation_still` (2026-08-31) — without it the storefront renders
  the new value fine and the client's *save* fails with a bare postgres 23514. A fourth
  value needs the same migration; `humanError()` does not map 23514.
  ⚠️ `art` survives in the union but **no product uses it** since 2026-08-20 — so
  `tonesFor()` returns `[]` for everything, and anything typed as `Tone` that came from
  `tones[0]` is actually `undefined`. That crashed `/try` on every door (`tone.id`, one
  screenful below a ⚠️ warning about exactly this in `pickTone`'s dep array). `tone` is now
  typed `Tone | undefined` and a separate `toneId` falls back to `defaultToneId`. If you
  add code that reads a finish, assume there isn't one.
  ⚠️ `MaterialArt` takes a **`seed`** (always the product id) and draws plank widths, kerf
  positions, end-grain placement, sheet count/thickness and WPC cell pitch off it. Without
  it the geometry is fixed, so every board of one species came out of the same mould —
  four teak cards in a row on `/timbers` and eleven down `/shop` were pixel-identical and
  read as a loading state. It is a hash, not `Math.random`, and each swatch opens a fresh
  stream per render, so a board looks the same on the card, on the PDP it opens and in the
  admin preview. Pass the seed at every call site (`ProductVisual`, `Product`, the hero
  world cards use `world-<id>`).
- **CMS = Supabase + custom `/admin`** (replaced Sanity 2026-07-22 — the generic studio
  gave no crop control, so door photos looked wrong swinging). Project `yevrjgmgbguwvluemtsw`.
  Tables `subcategories`/`products`(FK→subcategory)/`product_images`, `admins` allow-list;
  buckets `catalog`(public)/`originals`(private); RLS = anyone reads published, only
  allow-listed admins write. Admin app in `src/admin/` (lazy-loaded under `/admin`, off the
  public bundle; Supabase auth; product editor with the corner cropper → canvas webp 480/960
  → Storage; live `ProductVisual` preview).
  `npm run catalog:seed` writes `supabase/seed.sql`. Env: root `.env` (VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY = publishable key). Setup/security/webhook in `docs/admin-setup.md`.
  ⚠️ storage uploads must NOT pass `upsert:true` (hits the UPDATE policy → RLS 403; paths are
  unique uuids anyway). RLS uses `exists(admins…)`, not `auth.role()` (which can be null).
  Remaining: create the client's admin user + add to `admins`, disable public signup,
  Vercel build cmd + Supabase→Vercel deploy webhook (docs §"Auto-rebuild").
  · ⚠️ **The storefront reads the catalogue twice, and 2026-08-30 is when the second
  read was added.** Until then the site was a build-time snapshot only
  (`npm run catalog:fetch` → `catalog.gen.ts` → rebuild → redeploy), and the last
  hop — the Supabase→Vercel deploy hook — was documented and never wired up. So
  from the client's side the admin did not work at all: they added two doors and a
  section, re-cropped a photo, moved a door between sections, and the public site
  went on showing the catalogue as of the 2026-08-17 fetch. `src/data/liveCatalog.ts`
  now re-reads the published rows in the browser (plain `fetch` on PostgREST with the
  publishable key — **not** supabase-js, which is ~30 kB and stays in the admin chunk;
  5.7 kB gz for 40 products) and publishes them to a store in `products.ts`. The
  snapshot still ships and still paints first; the live read only ever replaces it.
  Entry bundle 93.8 → 95.3 kB gz.
  · **One merge, one mapper, both directions.** `buildCatalogue(cms)` in `products.ts`
  is the merge + the three overlays (`PLACEHOLDER_PRICES`, `leafImageFor`, and the
  `plain` presentation forced onto a non-door's photograph) and runs over
  the snapshot *and* the live rows; `src/data/cmsMap.ts` is the row→`Product`
  conversion and is shared with `scripts/fetch-catalog.mjs` (loaded through Vite's SSR
  loader, the way `build-sitemap.mjs` already loads `products.ts`). A second copy of
  either would drift on exactly the thing nobody notices — which rows count as products.
  · ⚠️ **`PRODUCTS` is now `CATALOGUE_SNAPSHOT`, and components must not read it.**
  It is what the bundle shipped with, not what the store is selling this morning.
  Build-time tools do read it (sitemap, `verify:geometry`, seed) because a build can
  only describe the catalogue it was given. Everything rendered goes through
  `useCatalog()` / `useCatalogStatus()` (`src/data/useCatalog.ts`, a `useSyncExternalStore`
  over the same store) or `getProduct()`/`productsIn()`, which read the live copy.
  · ⚠️ **`/product/:id` and `/try/:id` wait before they 404.** A door added since the
  last deploy is genuinely absent from the snapshot, so NotFound is only an answer
  once `useCatalogStatus()` is past `'loading'`; until then they hold the page with
  `.route-hold`. 404-ing a link the client has just sent a customer is the worst
  possible moment to be right about a stale copy.
  · ⚠️ **An empty live response is refused, not applied.** Every id the site sells also
  exists locally, so a wiped or mis-permissioned table would blank the shop — and
  "the CMS returned nothing" is indistinguishable from "the client deleted everything".
  Same rule for a failed read: the snapshot stands, silently. Re-read is capped at once
  a minute and re-runs on `visibilitychange`, because the owner edits in one tab and
  checks the site in another.
  · ⚠️ **A missing one-liner used to delete a product from the site.** `fetch-catalog`
  required `tag` and silently dropped any row without one — a door saved in a hurry
  vanished with nothing anywhere to say why. `mapCatalogue` now requires only what is
  needed to render and route (slug, name, a real world, a section); the editor asks
  for the one-liner on the way in instead.
  · ⚠️ **Sections are added on the dashboard now** (`+ New section` per world). The
  only way in was the Section dropdown *inside a product's editor*, which is the last
  place anyone looks for "add a category" — the client concluded, fairly, that the
  admin could not do it. Section order on a world page comes from the CMS
  (`sectionsIn()`) once the live read lands, `worlds.ts` before that; a section with no
  products in it is still not rendered.
- **Brand logo**: the official mark is the "PP" monogram + "DOORS • PLYWOODS • BOARDS"
  lockup. Vector master: `brand/patidar-logo.pdf` (source of truth for re-exports/print).
  Web derivatives in `public/images/logo/` — full lockup `patidar-logo{,-cream}-{1200,600}.png`
  and monogram `patidar-mark{,-cream}.png` (dark ink `--ink` for light bg, cream `#f0e3c2`
  for dark bg; transparent PNGs keyed white→alpha from the PDF). Used: nav brand mark
  (`.nav__mark`, dark) + wordmark text kept; footer brand (`.footer__mark`, cream);
  favicon `public/favicon-32.png` + `apple-touch-icon.png` (cream monogram on `--deep`
  rounded square); social `public/images/logo/og-image.png` (1200×630, wired in index.html
  og:image/twitter:image). Replaced the old hand-drawn `favicon.svg`.
  · ⚠️ **The four derivatives that contain the monogram alone are generated** —
  `npm run logo:build` (`scripts/build-logo.mjs`, sharp + poppler's `pdftoppm`, run only
  when the mark itself changes) cuts `patidar-mark{,-cream}.png`, `favicon-32.png` and
  `apple-touch-icon.png` out of the PDF. The two full lockups and `og-image.png` are
  hand exports and it does not touch them.
  ⚠️ **The monogram is not a separate artwork in the PDF, and cropping it to a
  rectangle is the trap.** The "PP" stem descends all the way to the wordmark's baseline,
  so "DOORS • PLYWOODS • BOARDS" sits *inside* the monogram's own bounding box — any
  rectangle either swallows the wordmark or cuts the stem. It shipped cut: from 2026-08-01
  to 2026-09-01 `patidar-mark.png` was 471×418, a bowl with no leg, and the favicon and
  the apple-touch icon were made from the same chopped crop. The script crops to the
  stem's full height and **erases the wordmark quadrant** instead; both cuts land in the
  empty gaps (stem→first letter, inner hook→cap line) and are measured off the render,
  not hardcoded, with an assertion that the two never overlap.
  ⚠️ The fix changed the mark's aspect **1.127 → 0.698** — it is tall and narrow now,
  not square-ish. `.nav__mark`/`.footer__mark` are sized by `height` in CSS, but the
  `<img>` `width`/`height` **attributes** are what reserve the box against CLS, so they
  are restated in `Nav.tsx` (21×30) and `Footer.tsx` (19×27). Re-derive them from the
  aspect the script prints if the mark is ever regenerated.
  · The favicon fills 78% of its tile against the apple-touch icon's 68%: height-fitting
  a narrow mark leaves wide side margins either way, and at 32px the three parallel
  strokes need the pixels to stay apart.
  · `brand/patidar-logo-lockup.png` is a client-supplied 11692×8267 raster of the same
  lockup, kept beside the PDF as a second reference. It arrived in
  `public/images/logo/` — where Vite would have shipped all 2 MB of it to every
  visitor, unreferenced. Source art goes in `brand/`.
- **Photo pipeline**: raw photos live in gitignored `Main Doors/` + `Room Doors/`;
  `npm run images:build` (sharp) emits 480/960 webp to `public/images/doors/` + manifest
  `src/data/images.gen.ts`. Curation lives in `src/data/photoMap.ts`; `/dev/gallery`
  (DEV builds) previews the manifest. The same script also encodes the two fixed hero
  shots from gitignored `/Hero/` (pattern is root-anchored — plain `Hero/` would also
  ignore `public/images/hero/` on case-insensitive macOS) → committed
  `public/images/hero/hero-{frame,leaf}.webp`; skips if the folder is absent.
  ⚠️ Several raw photos carry third-party watermarks (see photoMap.ts header) — they are
  unmapped; replace with client photography.
- **Locked-door hero** (`src/components/HeroKeyhole.tsx`, phase A rebuilt 2026-08-31):
  a real door stands close in a dark hall with a **drawn brass keyhole on its lock stile**
  and a key in it that nudges itself round; turn the key — or scroll — and it swings open
  and rushes past you, the four behind it do the same, and the last opens onto the Door
  Wall. Phases: gate opens 0.02–0.15, the field advances 0.13–0.7, wall fades 0.46–0.66,
  dwell after that; the lock lands you at p 0.86.
  ⚠️ **The click animates nothing.** `unlock()` scrolls the page (Lenis `scrollTo`, 3s,
  easeInOutSine) and every door follows because every door is already a function of
  scroll. So there is one flight, the scrolled one — the visitor lands with a real scroll
  position under them and can scroll back up and re-watch. Do not reimplement it as a
  local animation with a jump at the end; `verify:e2e` asserts the scroll actually moved.
  ⚠️ Judge any change to that easing on how much time it leaves the **middle** (p
  0.22–0.60), where all five fly-bys happen. It shipped as easeInOutCubic for an afternoon
  and a cubic spends its time at the ends: all five passes landed inside 555ms.
  · It replaced a full-screen keyhole plate (an opaque path with the hole punched out by
  `fill-rule: evenodd`, opening by re-projecting its own viewBox). That had no way in
  except scroll, and the payoff is three-quarters of a 380vh track away. `verify:e2e`
  asserts `.keyhole` is **absent**, the way it does for `/`'s FAQ accordion.
  ⚠️ **The gate is field index 0, not an object in front of the field.** Given its own z
  schedule it moves at its own speed, and since it is the nearest thing on screen anything
  slower lets door 2 overtake and fly *through* it. One field, one `advance`.
  ⚠️ `TUNNEL_IDS[0]` is the door the lock is drawn on, and the order is chosen for it:
  `architect-teak-door` leads because it is the one leaf that is a whole door, square on,
  with real hardware at lock height. Burma teak led until 2026-08-31 and cannot — its crop
  carries a slice of jamb down the left, invisible at 0.4 scale and unmissable at 0.88.
  ⚠️ The lock is in its **own flat layer** (`.kgate`), never inside `.ktun` — that subtree
  is `pointer-events: none` because Chrome resolves `elementFromPoint` wrongly inside
  preserve-3d (the DriftWall and `/try` scars). It repeats the gate's projection instead,
  and unmounts a few points into the scrub rather than tracking a moving 3D transform.
  ⚠️ Two CSS scars in that layer, both from the same shape of mistake — a box whose size
  is being decided by the thing inside it. (1) `.kgate__plate` needs an explicit
  width/height **pair and `max-width: none`**: the sheet's global `img, svg { max-width:
  100% }` resolves to zero inside a shrink-to-fit button, so the plate rendered 0×0 with
  its escutcheon spilling out — a keyhole hanging in mid-air with no plate behind it.
  (2) `.kgate__label` is **absolutely positioned**: in flow it was ~160px of the button's
  own width, and the button is what the plate's centring transform measures against, so
  the lock came to rest a third of the way across the leaf instead of on its stile.
  · `.ktun__copy` carries its own top-down scrim now. What sits behind the headline is no
  longer an opaque plate but the top third of a 0.85-scale photograph of a teak door, and
  cream 16px on figured walnut is not readable — the sub-line lost three words into the
  grain at 1440. The gradient ends on `transparent`, never on a colour.
  ⚠️⚠️ **Nothing in the tunnel may carry `will-change`** — not `.ktun__door`, not
  `.ktun__leaf`. Both did until 2026-08-31 and it tore the hero apart **in Chrome only**:
  fly to the wall, scroll back to the top, and the door up front came back rasterised in
  horizontal bands with the doors behind it showing through the gaps. A door's composited
  scale runs 0.08 → 4.5 across the flight, and `will-change: transform` makes Chrome pin
  a raster and reuse it rather than re-raster at each scale; over a 50× swing that leaves
  stale tiles nothing invalidates on the way back. Safari re-rasters and was fine, which
  is what made it look like someone else's bug. Removing it **costs nothing** — measured
  on a real GPU the layer count is identical (72 either way) because `translate3d` with a
  non-zero z already promotes every one of them; mean frame 8.5ms and one frame over 20ms
  in 195, before and after. Bisected: removing it from only one of the two still tears
  (25% of the gate's pixels wrong with the leaf's kept, 78% with the door's kept, 66% with
  both). `verify:e2e` asserts the declaration is **absent**, because headless Chrome
  rasterises in software and cannot photograph the tear.
  · ⚠️⚠️ **THE HERO IS SCRUBBED FROM A CSS SCROLL TIMELINE, NOT FROM JS, AND THAT IS
  THE FIX FOR MOBILE STUTTER.** `src/styles/hero-scrub.gen.css` (generated by
  `npm run scrub:build` from `src/lib/heroTunnel.ts`) drives every moving thing in this
  hero — door transforms, fog, the swings, the gap/shade/hall/rays/copy/wall/lock fades —
  off `view-timeline-name: --kt-track` on `.portal--keyhole`. `HeroKeyhole` asks
  `CSS.supports('animation-timeline','view()')` once (`scrubCss`) and **stops writing the
  same values as inline styles** when the answer is yes; where it is no, the React path
  runs exactly as it always did.
  · **Why.** The hero was smooth on a laptop and visibly stuttery on a flagship phone,
  and it was never a speed problem. On desktop Lenis owns wheel scrolling and drives the
  page from a main-thread rAF, so the scroll offset and the door positions are computed
  in the same frame, in lockstep. On a phone Lenis is off by design (`syncTouch: false`)
  and touch scrolling runs on the **compositor thread** — the page moves without waiting
  for the main thread, while the doors were repositioned from a `scroll` listener that
  the scroller does not wait for. Measured on a mobile profile with a real synthesized
  touch gesture: the page moved on 106 frames and **the doors froze on 66% of them** —
  *identically with and without a 4× CPU throttle*, which is what rules out throughput
  and is why the earlier pass below (which halved script time) barely helped. A 120Hz
  flagship shows it more clearly, not less: more presented frames for the doors to miss.
  On the scroll timeline the freeze rate is **6%**, and unchanged at 6× throttle.
  · ⚠️ It is also *cheaper*, measured under a real touch gesture rather than an
  rAF-driven `scrollTo` (which forces main-thread scrolling and flatters the JS path):
  task 745 vs 868ms, script 138 vs 168, **style recalc 52 vs 109**. If you benchmark this
  with `window.scrollTo` in a rAF loop you will measure the desktop path and conclude the
  CSS costs more. Use `Input.synthesizeScrollGesture` with `gestureSourceType: 'touch'`.
  · ⚠️ **`npm run verify:scrub` is what keeps the two paths honest** — it parks the real
  page at a grid of progress values on phone and desktop and compares every door's
  computed z, swing angle and three opacities against `heroTunnel.ts`'s own arithmetic,
  plus the six chrome fades — hall, rays, copy, cue, wall, lock — against theirs (624
  checks, tolerance 1px / 0.15° / 0.012). It exists because the failure that shipped
  in the first cut was invisible to `verify:e2e`: the `animation` shorthand resolved
  `animation-duration` to `0s`, so every animation was instantly `finished` and
  `fill: both` pinned the whole field at its END transform — a hero that still rendered
  five doors, just all of them parked past the camera. **Use the longhands** (see `bind()`
  in the generator) and never the shorthand.
  ⚠️ **The generated sheet is imported from `main.tsx` AFTER `global.css`, never from the
  component.** It overrides the static sheet by design and has to come after it to win a
  tie. Imported from `HeroKeyhole` it was emitted *first* — `main.tsx` imports `App`
  above its stylesheets, so anything the component graph reaches lands ahead of them —
  and `.portal .hero__scrollcue { animation: none }` (there to switch off the cue's
  entrance `fadein`; same specificity; later in the bundle) reset the cue's
  `animation-timeline` and left "Scroll — look inside" at full opacity through the whole
  flight. The door checks passed throughout, which is why the chrome fades are in
  `verify:scrub` now: anything bound in the generator's `chromeBindings` gets a line
  there. Check with `grep -o '\.portal[^{]*\.hero__scrollcue{[^}]*}' dist/assets/index-*.css`
  — the `--keyhole` rule must be the later of the two.
  · ⚠️ Keyframe stops land on the **phase edges**, not on a uniform grid. These curves are
  smooth within a phase and kinked at its edges (z is flat until the field starts moving
  at `TUNNEL[0]`), and a uniform grid interpolates straight across a corner — without
  `TUNNEL[0]` in the knot list the rearmost door's fog ramped from p=0 and was 0.20 too
  bright, i.e. lit up before anything had moved. Anything linear in p is emitted at its
  breakpoints *exactly* rather than sampled, which is also what keeps the file at 6.7 kB
  gz instead of 62 kB raw.
  · ⚠️⚠️ **`doorZ` CLAMPS AT `near`, and that clamp is what keeps the hero from tearing
  itself apart when you scroll back UP.** A door projects as `PERSPECTIVE / (PERSPECTIVE
  − z)`, so any z at or past 900 is *behind the viewer* and the divide inverts. Unclamped
  the field runs to z ≈ 5060 by the end of the track, so all five doors spend the whole
  dwell (p 0.7 → 1) past the camera on a degenerate transform — and on Android they came
  back stale: doors at the wrong size, the lock plate detached beside a shrunken door, the
  nav's own layer blank, differently wrong every time. Perfect on the way in, broken on the
  way out. **The React path never hit it** because it parked a faded door at
  `translate3d(0,0,-9999px)`; moving the transform into CSS keyframes dropped that guard
  silently, and neither `verify:e2e` nor the desktop nor headless (software raster) showed
  it. `near` costs nothing — `doorOpacity` is already 0 there.
  ⚠️ **It parks FAR (−9000), not at `near`.** The first cut returned
  `Math.min(z, near)`, which pins a spent door at its LARGEST projected scale for the rest
  of the track — five doors' worth of maximum-size composited layers at once. Parking far
  in front makes it project at ~0.09 and cost almost nothing, and it is what the React
  path always did. Invisible either way; `doorOpacity` is 0 from z = near.
  ⚠️ The clamp and the park make z piecewise-linear with a STEP, so the generator MUST emit
  `pAtZ(i, near, near)` ± 0.0005 as transform breakpoints — one either side. A stop landing
  exactly on the step evaluates to the parked value (floats put z a hair over `near`) and
  the door then interpolates from its rest depth straight back to −9000, sailing away from
  the camera instead of at it. Every curve derived from z (swing, gap, shade) needs the
  same pair in its knots.
  · ⚠️⚠️ **A PHONE GETS THREE DOORS (`TUNNEL_IDS_MOBILE`), DESKTOP KEEPS FIVE. Five is
  over Chrome Android's compositor budget, and that is the cause of the scroll-back
  corruption** — a chopped nav, blocks of stale background, doors at sizes they were never
  drawn at, differently wrong every time. Reproduced 2026-09-01 with
  `--enable-low-end-device-mode --force-gpu-mem-available-mb=96` and a real touch gesture,
  scoring the returning frame against the outgoing one at the same scroll position:
  **3 doors = 0.1% (clean, every run), 4 doors = ~8%, 5 doors = 3–14%.** Clean again at a
  192 MB budget, so it is purely how much the compositor will hold. It is the tunnel and
  nothing else: hiding `.ktun` is always clean, while removing the Door Wall's 62 layers
  changes nothing. It is **not** the scroll-timeline scrub — the React fallback corrupts
  the same or worse at every budget.
  ⚠️ **Three doors costs no smoothness, and the confusion on the way here is worth
  keeping.** The mobile hero ran a 3-door subset until 2026-08-31 and was stuttery *then*
  too, which made three doors look like no help at all — so five went in. That lag was the
  JS scroll listener, a different bug, since fixed by the scroll timeline. Measured over a
  window where a door is mid-flight in both fields, 3 and 5 doors are **both 0% frozen**.
  Three doors on the timeline is the first configuration that is smooth AND clean; before
  it the site only ever had three-with-lag or five-with-corruption.
  ⚠️ It is a genuinely different field, not the 5-door field with two hidden: `travelFor`
  and `doorZ` take the field's `count`. Hiding two would leave the 5-door spacing, so the
  remaining three would all fly past in the first half and the hero would sit empty for
  the rest — which is also what makes a CSS-hidden "3 doors" benchmark read as frozen.
  ⚠️ Things that were tried and do NOT fix it: halving the peak zoom (`NEAR_MOBILE`
  560→380, 8.9%→6.8%), shrinking the gap's bleed, dropping the shadows, flattening
  `.ktun__door` (the children stay composited anyway — layer count is unmoved at 63).
  The lever is the number of doors near the camera at once, which is what the door count
  buys. Still not clean at a 48 MB budget (~20%, against ~28% with five); 96 MB is clean
  on every run. If a device ever reports this again, the count is the lever.
  ⚠️ `verify:scrub` now asserts no door ever reaches `PERSPECTIVE` — 58 failures without
  the clamp. `verify.e2e`'s "flew past the camera" step had to stop reading React's inline
  `style.visibility` (which only the fallback path writes) and read the effective opacity
  instead; it was testing which code path was running, not whether the door had left.
  · ⚠️ **The jamb is box-shadows on `.ktun__door`, never a child element.** It was a
  `.ktun__jamb` span until 2026-09-01; every child of that preserve-3d box gets its own
  composited layer, so the element cost five more layers inside the 3D subtree for a ring
  and two shadows. `0 0 0 18px` is exactly the border it carried and an outer shadow paints
  behind the element's children, so the leaf still overhangs it correctly — the ordering
  that used to need a z-index is now free. Measured 9.1% → 3.0% on the corruption score.
  · ⚠️ **Never toggle a main-thread visual property on a box the compositor is animating.**
  That is the second half of the same bug. React was still writing `visibility` on the
  doors and on `.portal__rays` while the compositor animated their opacity — two threads
  writing one box. On the compositor path it writes neither now.
  · Only **motion** moved to CSS. State — `wallMounted`/`wallRunning`, `inert`,
  `pointer-events`, the lock's mount — stays in React, where being a frame late is
  harmless. The two `content-visibility` parks that remain are both on boxes the compositor
  is *not* animating and both land far from any transition: `.ktwall` at `p < WALL_IN −
  0.12` (it was −0.02, i.e. the toggle and the wall's first visible pixel in the same
  handful of frames), and `.ktun` at p > 0.74 with hysteresis, which hands back the
  tunnel's ~25 layers for the whole dwell — verified that nothing inside it paints from
  p 0.70 on, measuring **effective** opacity (the product up the tree; a gap at 0.28
  inside a door at 0 is invisible, and reading the two separately says otherwise).
  · ⚠️ **Change `heroTunnel.ts` and re-run `scrub:build`.** `npm run build` runs it, so a
  deploy cannot ship the CSS and the fallback out of step — a dev server can.
  · ⚠️ **This hero is still ~3× the portal hero's cost on a phone**, and an earlier pass on
  2026-08-31 took it from ~5× to that. Profiled at 390×844 DPR 3, 4× CPU throttle,
  scrubbing p 0.05→0.70: main-thread task 625→500ms, script 243→139ms, Commit 109→76ms,
  layers at p 0.15 65→55. `?hero=old` over the same scrub is 167ms task / 26ms script,
  which is the number to keep honest about — five full-screen photographs through a CSS
  3D perspective at DPR 3 is intrinsically expensive and no amount of tuning makes it
  free. The four things that were wrong, in order of what they cost:
  · **The Door Wall re-rendered through React on every scroll frame** — half of all
  script time. `useTrackProgress` setStates per scroll event, `HeroKeyhole` re-renders,
  and `DoorWall` was a plain function component, so React diffed 56 tiles and 28 `<img>`s
  60×/sec — **from the top of the page**, since the wall mounts on the first idle after
  `load`. `DoorWall` is `memo` now and its props are all quantised or constant; see the
  note on the component. Any new prop has to be quantised too or the memo stops being one.
  · **Layer explosion.** `Layerize` was the single biggest main-thread item in the trace
  (1010ms of 3650ms self time) and it runs once a frame over every composited layer —
  100 of them, 57–65 MB of layer memory on a phone. `.ktun__leaf` was `preserve-3d` for
  no reason (nothing inside it has a 3D transform), and every child of a preserve-3d box
  is promoted, so each door cost 6–7 layers. It is flat now; `.ktun__door` must stay
  preserve-3d for `.ktun__gap`'s `translateZ(-40px)`.
  · **`visibility: hidden` does not release composited layers.** `.ktwall` also sets
  `content-visibility: hidden` while the wall is parked, which does — Commit 103→77ms.
  ⚠️ It brings size containment, so DriftWall's ResizeObserver reads nothing until the
  reveal; that is safe only because `.doorwall__wall`'s height is pure CSS. Verified it
  causes no re-raster burst at p 0.46.
  · **Blurred box-shadows re-raster at every new scale.** A door's projected scale changes
  every frame, so its layers re-raster every frame, and `.ktun__jamb`/`.ktun__leaf img`
  carried 90px/70px blurs — 54% of all raster work. Radii halved; keep them small.
  ⚠️ **Do not flatten `.drift-wall__col`/`__track` to chase the wall's 56 tile layers.**
  It halves the layer count at p 0.5 (108→53) and **visibly blurs the wall** — 20 tiles
  merge into one very tall layer that is then perspective-stretched. Those 56 layers are
  the price of the wall's sharpness; the lever is when they are alive, not merging them.
  · Still on the table, both measured and neither applied: `Reveal.tsx` creates a fresh
  `IntersectionObserver` per instance (10 of the home page's 13, for 15 observed elements
  in total) and `computeIntersections` is 7% of the hero's main thread — `useAjarInView`
  already shares one observer via a `Map` and `Reveal` should copy it. And `wallRunning`
  starts at p > 0.42 while doors are still passing at 0.46/0.54/0.62, so the wall's rAF
  and 56 live layers overlap the last three fly-bys; moving it past ~0.63 clears the
  busiest stretch at the cost of a static wall through the first part of its fade-in.
  ⚠️ **The key must be turnable again.** `unlocking` is cleared on a timer, never latched:
  scrolling back up puts you in front of the same locked door and a second tap is the
  first thing anyone tries. Latched, the key stayed at −96° and the button refused every
  further tap. Don't reintroduce an `if (unlocking) return` guard — a second tap mid-flight
  only re-aims the same scroll at the same target.
  ⚠️ **A phone gets three doors** (`TUNNEL_IDS_MOBILE`: architect teak → microcoat →
  WPC, the tour of the floor with `burma-teak-door` and `veneer-cng-door` dropped), and
  the reason is the compositor-budget bullet above, not weight. It was five from
  2026-08-31 to 2026-09-01 — "show the whole floor" won an argument that had been about
  payload (59 kB against 131 kB) — and five is what corrupted the hero on the way back
  out. The track stays at 340vh: fly-bys are spaced in track *progress*, so three doors
  on the track that was grown for five simply get more scroll per pass (~310px against
  the 200 five had — the pass is 900 of a 3380 travel over 0.57 of a 2026px span), which
  is room, not waste. `verify:e2e` asserts exactly three at
  390px and exactly five at 1440, and both assertions are load-bearing in opposite
  directions.
  · The brass escutcheon sits **on** the leaf's own black lock strip (90–98% across,
  41–58% down), not on the bare stile below it — two locks on one door is what that read
  as. A second key hint (`?key=insert`, the key sliding in and turning) was built beside
  the nudge and dropped 2026-08-31: its loop leaves the plate a bare keyhole for a fifth
  of every cycle, and the key's job is to be there when someone looks.
- **Portal hero** (`src/components/HeroPortal.tsx`): 520vh (mobile 300vh) sticky track;
  phases: door opens (0–.25) → scale push-through (.25–.55, transform+opacity only) →
  corridor of 4 world-doors (.55–.9). The hero door is `HeroDoorPhoto.tsx`: two photos of
  the same real door — full framed unit + the leaf cropped from the identical shot —
  with the leaf overlaid on its own pixels (crop box template-matched, hardcoded %s in the
  component) and swung by rotateY over a warm aperture plane; `.pdoor` clips the swing
  inside the photograph. No finish chips (removed with the SVG hero door).
  ⚠️ `.portal__scene` sets an explicit width+height pair (via `--scene-h`), NOT
  `aspect-ratio`: stable Safari resolves the flex item's content min-height to the img's
  intrinsic 660px and squeezes the photo (Chrome/WebKit-trunk don't).
  Static fallback under `prefers-reduced-motion`. Progress helpers in `src/lib/useTrackProgress.ts`.
  · **Beams backdrop** (`.portal__rays` → `reactbits/Beams.tsx`): broad gold light beams
  behind the opening phase, fading out with the zoom (`zoomOpacity`). The upstream
  ReactBits component **vendored verbatim** (react-bits `src/ts-default/Backgrounds/
  Beams/`, three + @react-three/fiber + drei); the only edit is a split `import type`,
  because `verbatimModuleSyntax` rejects types mixed into a value import — keep it
  re-syncable. Replaced `LightRays` 2026-08-06 (that file is still in `reactbits/` but
  unimported, so it and `ogl` are tree-shaken out).
  ⚠️ `beamWidth`/`beamHeight` are **three.js world units** in front of a fov-30 camera at
  z=20, which sees ~17 units across — they are *not* a fraction of the viewport. So
  `beamWidth` alone decides how wide a beam reads (4 = broad slabs), while `beamNumber`
  and `beamHeight` only have to be big enough to keep the field's edges off-frame once
  `rotation` tilts it; too small a `beamHeight` lays a hard diagonal seam across a corner.
  Raising `beamNumber` does *not* thicken the field — it just extends it sideways.
  Colour is `--gold-l` `#f2d18a`, not the demo's orange, and `speed` (1.35) stays under
  the demo's 2 — faster and the noise crawling down the beams competes with the headline.
  ⚠️ It is **lazy-loaded** (`React.lazy` + `Suspense`) and must stay that way: three is
  ~238kB gz, twice the rest of the site, and this is a phone-first store. It gets its own
  chunk, `.portal__rays`' warm gradient stands in until it lands, and the canvas fades in
  (`@keyframes beams-in`) because its scene background is opaque black — without the fade
  the hero snaps from warm brown to black when the chunk arrives.
  ⚠️ `src/lib/useDecorativeChunk.ts` gates it on *capability*, not timing: false forever
  on Save-Data, 2g/slow-2g or `deviceMemory < 2`, true on mount otherwise. It deliberately
  does **not** gate on 3g or on core count — a mid-range Android on 3g is this site's
  typical visitor, not its edge case. ⚠️ **Do not reintroduce a delay here.** A version
  that waited for `window.load` + `requestIdleCallback` was tried and reverted: `load`
  waits on every image on the page, so the backdrop arrived well after the hero photo and
  copy had settled and read as a bug. It also bought nothing — the chunk can't start
  until the bundle has parsed and rendered the hero either way, and gated vs ungated
  finished within ~50ms on every connection tested. An HTML `<link rel=prefetch>` for the
  chunk was also tried: it pulled the canvas ~170ms earlier at 6–12 Mbps but cost ~490ms
  of LCP at 1.6 Mbps, which is the wrong trade for a phone-first store.
  ⚠️ `.portal__rays` is **drawn to look like the beams** — same `--beam-light`, same 30°
  rake, bands sized in `vh` because the fov-30 camera at z=20 always sees ~10.7 world
  units vertically, making a `beamWidth` of 4 a fixed ~37% of viewport *height* at any
  aspect (in `%` the bands stayed desktop-shaped and a phone got a dozen thin stripes
  where the canvas shows one broad slab). The canvas paints an opaque near-black scene,
  so before this the hero visibly changed colour when the chunk landed. Retune both or
  neither; `beams-in` is the 1100ms dissolve between them.
  ⚠️ It is also **conditionally mounted** (`beamsLive`, off above p=.62, back on below
  p=.5) and must stay that way. `visibility: hidden` on `.portal__rays` hides the canvas
  but does **not** stop @react-three/fiber's render loop — measured ~120 WebGL draw
  calls/sec still running through the corridor and all the way down the page, i.e. for
  the whole life of the home page. That was the single biggest cause of the hero
  stuttering on real phones (~25% of main-thread scripting, plus a full-screen shader at
  DPR 3 on the GPU). Hysteresis on the two thresholds so scrubbing across the edge can't
  thrash the WebGL context; remount costs a shader recompile, hidden by `beams-in`.
  · Console carries a `THREE.Clock … deprecated` warning from inside @react-three/fiber;
  upstream, not ours, and `verify.e2e.mjs` reports it as console noise.
- **Fonts are self-hosted** (`public/fonts/`, `src/styles/fonts.css`, both generated by
  `npm run fonts:build` — do not hand-edit the CSS). Google-hosted, the chain was
  `html → css2 on a third origin → woff2`, and because the site is client-rendered there
  is no text in the document to match a `@font-face` against, so the woff2 leg could not
  start until React had rendered: measured 1383ms to start, 2820ms to swap. Every visitor
  read the hero in Georgia and then watched it reflow.
  ⚠️ Both faces are **variable**, and Google declares one file per (style, subset) once
  per requested weight. Emitting those verbatim gives three identical `@font-face`s at
  400/500/600 where the last wins and every other weight is *synthesised* — the generator
  groups by file and writes a real `font-weight: 400 600` range instead.
  ⚠️ `index.html` preloads exactly two subsets (Cormorant roman latin, Archivo latin) and
  the list is measured, not reasoned. A preload is fetched ahead of the module script, so
  on a saturated link every preloaded byte is a byte the bundle waits for — and nothing
  paints until the bundle runs. Those two take CLS to 0; adding the italic cost 120ms of
  FCP at 1.6 Mbps and bought no further stability. latin-ext is left out on purpose: it
  carries ₹ (U+20AD-20C0), a subset is only fetched once a glyph needs it, and no price is
  above the fold. `fetchpriority="low"` on the preloads was tried and changes nothing.
- **Routes are code-split** (`src/App.tsx`); only `Home` and `NotFound` are eager. The
  first bundle is the time to first paint on a client-rendered site, and it was carrying
  the pricing table, the configurator, the Door Wall's 3D drift and the checkout
  serialiser — none of it reachable from the home page without a tap. 130 → 96 kB gz.
  (The Door Wall is on the home page since 2026-08-13 and still out of the entry bundle,
  via its own lazy boundary in `DoorWallSlot.tsx` — see that bullet.)
  The `Suspense` fallback is `.route-hold`, a `min-height: 100vh` blank: a route chunk
  usually beats it to the screen, and without the reserve `<main>` collapses and the
  footer jumps. Not a spinner — one that flashes for 80ms reads as a fault.
- **World cards** (`.wcard`, in the corridor): each world is an arched opening with its
  material full-bleed — `MaterialArt` slices to fill; the doors leaf is `DoorArt` (drawn
  `preserveAspectRatio="none"`) given its 3:8 ratio back in CSS so it overflows and crops
  like a photo instead of squashing. Colours are the *material* (teak, golden-teak leaf,
  birch ply, slate-green WPC), not the world accent — that stays on the frame/rule via
  `--wd`. Replaced the glass-globe treatment 2026-08-03: the sphere, its spinning
  specular sweep and the bobbing float read as a toy against the rest of the site.
  ⚠️ The doors card drew `meridian` until 2026-08-20 and draws `classic` now. It slices the
  leaf like a texture so any leaf would do, but it must stay a **drawn** one — a photo
  cannot survive `preserveAspectRatio="none"`.
  ⚠️ The card's contents are split into a memoised `WorldCardInner`. The corridor
  re-renders every frame of the reveal — that is the point of it — but only the Link's
  inline style differs; behind it sit ~180 static SVG nodes across the four cards, and
  React was reconciling all of them 60×/sec to move their grandparent. Same for
  `HeroKicker`/`HeroCopy` inside the scrubbed zoom block. Worth ~20-30% of the hero's
  scripting; keep new hero subtrees memoised.
  ⚠️ `.wcard__art` carries `will-change: transform` purely to force a compositor layer,
  and needs it. `.wcard` is scroll-scrubbed (transform+opacity per frame) while that box
  holds the expensive pixels — an feTurbulence/feDisplacementMap-filtered SVG under an
  elliptical clip, a 60px drop shadow and a 60px inset one. Unpromoted, Chrome
  re-rasterises all four on every frame of the reveal, which is exactly the phase that
  stuttered on a phone. Verify with CDP `LayerTree`: all 4 must have their own layer.
- **Door Wall** (`src/components/DoorWall.tsx`, on **`/`** between `.props` and
  `.featured`): full-bleed dark band — reactbits `DriftWall` of door photos drifting in
  3D. ≥900px (`useMediaQuery`) it is a
  two-up, wall right + clicked photo big on the left; below that the wall stays as-is and
  a tap opens a full-screen `.doorzoom` (through `useScrollLock`), because a viewer above
  or below the wall would update off-screen. Photos = `src/data/wallPhotos.ts`, a list of
  ids from `images.gen.ts` — ⚠️ **placeholders borrowed from the catalogue photography**,
  28 of them, hand-checked at full size for watermarks (the wall shows photos far bigger
  than a card, so marks photoMap only had to dodge on covers surface here). Swap by
  editing `WALL_IDS`; captions are opt-in via `CAPTIONS` and blank by default while copy
  is unconfirmed.
  · **Moved off `/shop` 2026-08-13.** It reads as proof, not as catalogue chrome:
  `.props` above it makes the claim ("see it, touch it, then decide") and the wall is the
  evidence — real doors standing in the real store — before `.featured` narrows to three
  with prices. It also keeps the page's dark-band rhythm even (hero, wall, econ, terms)
  with `.featured` as the light breather. `.shop` is one `.page-pad` again. (It landed
  under the `.worldstrip` first; that section was removed the same day — see the four
  worlds bullet — which is what put it against `.props`.)
  ⚠️ It carries **no "see the catalogue" link of its own**, though it is a teaser now —
  `.featured` closes with exactly that link and both are on screen at once at 900px; the
  pair read as a stutter. The hand-off is the next section's.
  ⚠️ The move also left `.featured` **opening flush against this band's border**:
  it carried `padding-top: 0` because `.props` used to sit above it and close with
  its own `--section` (two pads on one cream ground would have doubled the gap), and
  a band's bottom padding is dark — a colour change is not spacing, so "From the
  floor" sat on the hairline at every width until 2026-08-18. A light section that
  follows a dark band pays for its own opening.
  ⚠️ `.props` (the 01/02/03 band above the wall) is a **subgrid**: each column spans
  the same three parent rows, so the number, the heading and the body line up across
  all three whatever the copy does. Before 2026-08-18 they were three independent
  stacks and "Factory & showroom, one address" wrapped to two lines at ~1200px and up
  while its neighbours held one, dropping its paragraph 33px below theirs — at exactly
  the widths the section is read at, since below that everything wraps and it hid
  itself. The row gap has to stay **split off the `gap` shorthand**: as a shorthand it
  lands between the number, the heading and the body *inside* every column.
  ⚠️ **Mount it only through `DoorWallSlot.tsx`**, never by importing `DoorWall` directly.
  Two separate reasons, both fatal on the home page: (1) `Home` is eager, so a plain
  import puts `DriftWall` + the photo manifest into the *entry* bundle (the slot's `lazy`
  boundary has to live in its own module for this — that is why it is a second file);
  (2) `DriftWall` runs an **unconditional rAF** that writes a transform to every tile for
  the whole life of the component, so an ungated mount would leave that loop running
  under the 520vh hero scrub — the same mistake the beams' `beamsLive` gate exists to
  prevent. `useNearViewport` mounts it one viewport out and unmounts it past 2.2, two
  boundaries so parking on the edge can't thrash it. `.doorwall-hold` holds the band's
  height *and its colour* until then (a cream gap turning dark as it enters reads as a
  fault); its two constants are measured off the rendered band, not derived — re-measure
  them if the head's copy changes. Entry bundle unmoved at 96 kB gz; the wall is its own
  4.2 kB chunk.
  ⚠️ three fixes on top of the registry `DriftWall`: (1) the tile is `transform-style: flat`,
  not `preserve-3d` — inside a preserve-3d subtree Chrome resolves `elementFromPoint` (so
  also mouse events) to the track for ~half the wall and the clicks vanish; the hover
  `translateZ(lift)` is recreated as `scale(--dw-pop)`, computed from lift/perspective.
  (2) the click is delegated to the wall and falls back to the tiles' projected rects when
  `elementFromPoint` still misses near the plane's edges. (3) **the mask fades all four
  edges** (2026-08-17). Upstream masks the top only — a radial vignette that bottoms out
  around 0.6 alpha at the sides, intersected with a `to top` linear — so the plane (1216px
  wide × 8299 tall inside a 600×620 pane) was chopped by `overflow: hidden` at 60% opacity
  on the other three, three hard seams with empty band beyond them. `--dw-edge-b` (bottom)
  and `--dw-edge-x` (sides) add the missing stops. Neither mirrors the top: the head's copy
  sits above the pane so the top can afford a long dissolve, whereas the same depth at the
  bottom eats the wall's mass and at the sides eats a whole column. `--dw-edge-b` is
  **derived from `--dw-edge`** (which `DriftWall.tsx` writes from the `fade` prop) so it can
  never order ahead of the top stop whatever `fade` becomes. `--dw-edge-x` goes to `0%`
  under 900px — there the wall is full-bleed and its side edges *are* the screen's, which
  reads as "continues"; fading it invents two dark gutters instead.
  Also `dim`/`.drift-wall__overlay`
  go near-opaque under `(hover: none)`: the scrim only pays for itself if hover can lift it.
- **No FAQ accordion on `/`.** A `.faqteaser` (three `<details>` off `FAQS` + "read the
  full FAQ") sat between `.terms` and `.cta` until 2026-08-13. Removed, not moved: a
  stack of collapsed shipping questions is the oldest furniture on a storefront, and the
  page had already answered the two that matter in its own voice one section earlier —
  `.process` is how it works, `.terms` is what you pay and when. The rest was fine print.
  It is not lost: `FAQS` renders in full on `/faq`, and `/faq` + `/policies` now link to
  each other (the footer carries both). The `.faq` accordion CSS stays — those two pages
  use it; only the `.faqteaser` grid went. `verify.e2e.mjs`'s "home sections render" step
  now asserts `.faq` is **absent** from `/`, so a re-add trips the smoke test.
- **StrokeText** (`src/components/reactbits/StrokeText.tsx`): SVG draw-on headline, used
  for the Door Wall title. Needs `gsap` + ScrollTrigger (~46 KB gz) so it is **lazy-loaded**
  with a `-webkit-text-stroke` fallback that holds the same box. Its `fontSize` prop only
  fixes stroke-to-letterform proportions — the rendered size is the CSS height on
  `.stroke-text__svg` (the viewBox is `meet`-scaled into it). Font-family is inherited.
  It runs on `trigger="scroll"` + `fillMode="fade"`, so the draw plays once as the band
  enters and the letters settle to a cream fill — touch visitors see it too. (This note
  said `trigger="hover"` until 2026-08-11; the code had already moved.)
  · ⚠️ **Inside the keyhole hero it runs on `trigger="mount"` instead, and it has to.**
  The wall's landing is a 100dvh sticky pane, so the title sits mid-viewport from the
  top of the 520vh track — `start: 'top 82%'` is satisfied the moment ScrollTrigger is
  *created*, and the draw plays out minutes of scroll before the wall is on screen. It
  shipped as a plain `<h2>` (`.doorwall__title--plain`) from 2026-08-23 to 2026-08-31
  for that reason; the size was a real constraint but the trigger was the actual bug.
  `DoorWall` now latches off the `headOpacity` the hero already hands it — the hero is
  the only thing that knows when the head arrives — and *mounts* StrokeText on that
  frame, so `mount` fires exactly once, on arrival. Latched, so scrubbing back and
  forward cannot redraw a headline the visitor has already watched.
  ⚠️ The ~46 kB gsap chunk is **pulled on the wall's own mount and merely not played**
  (a bare `import()` in an effect, no component). Mounting the component on the reveal
  frame would start that fetch there too and the headline would arrive plain, then snap
  to outline part-way through its own fade-in.
  ⚠️ `.doorwall--compact .doorwall__title .stroke-text__{stroke,fill} tspan` restate
  gsap's own `setStart()` in CSS. gsap writes those inline — which wins — but only from
  an effect, i.e. *after* the first paint, so without them the finished headline flashes
  for one frame on mount. Harmless in the full band (it mounts off screen); here the
  mount **is** the reveal. `896` there is the component's `dash`, `max(fontSize*7,200)`
  against the `fontSize={128}` at the call site — keep the two in step.
  ⚠️⚠️ **Those two rules go on the `<tspan>`s, never on the `<text>`.** gsap drives
  `[data-stroke-char]`/`[data-fill-char]`, which are the tspans, so only an inline style
  *there* can override one of these. `stroke-dashoffset` inherits, so on the parent it
  happened to work; `opacity` does **not** inherit, it composites — `opacity: 0` on the
  parent `<text>` is a curtain gsap cannot lift, and the headline drew its outline and
  then stayed hollow. It shipped that way for one round on 2026-08-31.
  ⚠️ The E2E step therefore measures the fill as the **product of every opacity from the
  tspan up to the svg**, not the tspan's own — which read a perfectly healthy `1` while
  the letters rendered empty, and is why the first version of that check passed the bug
  straight through. Ask what is on screen, not what one node was told.
  ⚠️ The compact sizes are picked so the head's *total* height matches the plain `<h2>`
  they replaced to within a few px. The band is centred in the pane, so a taller
  headline pushes the kicker up under the fixed nav, which it already grazes at short
  desktop viewports (`.ktwall` has no `--nav-clear`). Bigger type costs the top of the
  section, not the bottom.
  · `verify:e2e`'s "phase C" step pins both ends — nothing drawn at p=0.3, drawn and
  settled at 0.95. ⚠️ The first half checks at **0.3, not near the 0.64 reveal**:
  `wheelTo` drives real wheel events through Lenis and its momentum overshoots, so a
  park at 0.55 crosses the reveal on the way and latches the draw (correctly — a
  visitor who flings the page past 0.64 has arrived).
- **Hover-open door**: CSS on `.door-scene--hover` (SVG −26°, photos −18° + edge-shade
  `::after`). Touch devices get `door-scene--ajar` via `src/lib/useAjarInView.ts`
  (shared IntersectionObserver, mid-viewport band, `(hover: none)` only).
  ⚠️ `.door-scene__frame` sits **behind** the leaf (z 1, leaf z 2, room auto). Its
  `inset: -14px` + `14px` border occupies exactly the ring *outside* the opening, so
  closed it abuts the leaf either way — but the leaf swings toward the viewer and
  perspective makes its near edge overhang the opening top, bottom and right. At z 3
  (where it shipped until 2026-08-16) the architrave painted over that overhang and an
  open door read as tucked behind its own frame. A door that swings out comes out in
  front of the frame. `.photo-showcase__frame` keeps z 3 on purpose — that treatment
  zooms inside a clip and nothing escapes the opening.
- **Try at home** (`/try/:id`, `src/pages/TryAtHome.tsx` + `src/components/tryathome/`):
  the customer photographs their doorway and the chosen leaf is warped into it. The photo
  flow is the feature; **handheld AR** (2026-08-17) is an addition on top of it, not a
  replacement — see the "handheld AR" bullet below and `docs/live-ar-plan.md`.
  ⚠️ **Doors only — every door, nothing but doors.** `tryState()` in `products.ts` is the
  single owner of that rule and both the PDP button and the route read it. **WPC doors are
  doors** (WPC is what the leaf is made of, not a different kind of product; it has its own
  world only because it's sold and finished differently), so `wpc-cnc-door` and
  `wpc-digital-veneer-door` are in. **Timber and ply are not doors** and are out — as is
  `wpc-sheets`, which is 6–18mm board. The rule is `isDoorProduct(world, sub)` — see the
  doorness bullet below; it read `visual.kind` until 2026-09-01, which was only ever a
  proxy for "has a photograph". **All 17 doors in the catalogue render** since
  2026-08-20 — see the leaf-crop bullet below. An earlier draft of this plan had "surface"
  and "volume" modes for ply/timber — dropped 2026-08-16, there is no "see this plywood in
  your hallway".
  ⚠️ `tryState` no longer branches on `visual.kind` first — it asks `leafOf(product)`,
  the one function that decides what is placeable, so the route, the PDP button and the
  state can't disagree. `'soon'` is now what a *newly uploaded* photo reports before it is
  cropped, not the state of the whole catalogue.
  ⚠️ The instruction is **"drag the corners onto your existing door"**, never "the
  doorway", and that is architecture, not wording. Outlining the real leaf makes the
  replacement provably cover the old door (no halo), leaves the architrave/reveal
  shadow/floor line in the photo *in front of* it — which is what makes a composite read
  as real — and hands us the door's true proportions for the Phase 1b size estimate.
  Reword it to "doorway" and all three silently stop working.
  · **The warp is CSS `matrix3d`, and three.js must stay out of this feature.** Canvas 2D
  is affine-only and physically cannot map a rectangle to a trapezoid; a CSS 3D transform
  *is* a projective map, so `matrix3d` is an exact warp for zero bytes and no GL context —
  and it warps the live `<DoorArt>`, so the leaf stays vector and a finish change is a
  plain re-render. `src/lib/homography.ts` is the 8×8 solve. Export (not yet built) is a
  CPU inverse warp, deliberately a second path. Besides the 230 kB gz, `three` currently
  has **exactly one importer** so it lives wholly inside `Beams-*.js`; a second one makes
  Rollup hoist a vendor chunk and changes what the hero fetches.
  ⚠️ CSS `<number>` has **no exponential notation**, and the w-row terms are around 1e-5.
  `String(1e-7)` is `"1e-7"`, which invalidates the whole `matrix3d()` so the browser drops
  the transform and the door snaps back to an unwarped rectangle. `toMatrix3d` formats
  fixed; don't "simplify" it to `join(',')`.
  ⚠️ `.tryd` is **`pointer-events: none`** and the handles live in a separate untransformed
  layer. Second occurrence of the DriftWall scar — Chrome resolves `elementFromPoint`
  wrongly inside a 3D-transformed subtree. Never hit-test the warped surface.
  ⚠️ A folded quad puts `w <= 0` on a vertex and Chrome makes the element **vanish**, so
  `isConvex` gates every pointermove and the editor *refuses* the move rather than
  committing it. That is this feature's "nothing fails to a blank rectangle".
  · **Detection is a silent guess, not a detector.** `quadGuess.ts` is Sobel column/row
  energy on a 240px copy, ~15 ms, zero bytes; it runs before first paint so the handles
  are simply already there, and returns null (→ centred default) when unsure, so the
  customer can't tell which happened. It returns an *axis-aligned* rect by construction —
  perspective correction is the user's drag. A detector right 60% of the time is worse
  than none. OpenCV.js (1.5–8 MB) and ONNX (6–8 MB, plus site-wide COOP/COEP for its
  threaded runtime) are both disqualified on weight for a mid-range-Android store.
  · `photoLoad.ts`: decode via `<img>`, **never `createImageBitmap`** (only `<img>` honours
  EXIF orientation by default — otherwise portrait doorways arrive sideways); cap to 1600px
  and release at once (a 12MP JPEG is ~48 MB decoded, and holding original + preview +
  export OOM-kills the tab); a failed load hands `onerror` an **Event**, so `.message` is
  undefined — hence the typed `PhotoError` codes.
  ⚠️ `capture="environment"` is a **forcing** attribute, not a hint — where honoured it
  removes the photo-library option outright. It is on the "Take a photo" control *only*;
  half of visitors are trying a door they shot yesterday and the counter staff work from
  photos customers sent on WhatsApp.
  · `src/styles/tryathome.css` is imported **from the route module**, not `global.css`, so
  Vite emits it as route-chunk CSS instead of adding ~250 lines to the entry stylesheet.
  It reads tier-1 primitives, not world roles, on purpose: the stage is a neutral dark room
  the customer judges their own photo in, and skinning it per world would wrap a hallway
  photo in terracotta on `/ply`. Its two `#000` mask stops are alpha mattes, not colours.
  ⚠️ But it **restates the tier-2 action roles on `.try`** (2026-08-20), and has to: `.btn`
  is a role-reading component and `--action` is `--ink`, a fill drawn for a cream page. On
  `--deep` it paints near-black on near-black — the pick step shipped a black slab ("Take a
  photo") beside an outline nobody could see ("Choose a photo"), and the AR button the same.
  A dark room is a ground like a world is, so it restates `--action{,-text,-hover,-hover-text}`
  + `--focus{,-halo}` once instead of patching each button (which is what the old
  `.try__controls .btn--ghost` rule was, now generalised to `.try .btn--ghost` — the
  secondary stays a step quieter than the cream primary beside it).
  · **Export** (`compose.ts` + `doorRaster.ts`, both lazy; `shareImage.ts` static). CSS
  transforms can't be screenshotted, so the export inverts the *same* homography and
  samples per-pixel on the CPU. Preview and export share `solveHomography` **and**
  `doorGrade.ts` — one source for the arithmetic is what makes the saved picture provably
  the picture the customer approved, which matters because that image is what reaches our
  WhatsApp. A footer strip (design, size, domain) is burnt in so a forwarded photo isn't
  anonymous.
  ⚠️ `shareImage.ts` is **statically** imported by the route while the compositor is lazy.
  A dynamic `import()` inside the tap handler is an await, and iOS treats that as having
  spent the user activation — `navigator.share()` then rejects with NotAllowedError. For
  the same reason the blob is composed on "Looks right", not inside the share tap.
  ⚠️ `DoorArtDefs` carries `id="dw-defs"` as a **contract**: an SVG serialised into an
  `<img>` is a separate document, so `url(#dw-grain)` resolves to nothing and every wood
  door rasterises as flat un-grained stripes. `doorRaster.ts` inlines those defs into the
  copy. Explicit `width`/`height` on the clone are mandatory too — Safari won't take an
  intrinsic size from `viewBox` alone in an `<img>`.
  ⚠️ Grading is a **nudge, not a re-exposure**, and both constants were wrong first time.
  `brightness` was `luma / 0.55`, which pins to the clamp ceiling on any ordinary daylit
  wall (magnolia photographs at ~0.82) and bleached the leaf. And the tint alpha was fixed:
  a `color` blend carries the source's *saturation* as well as its hue, so a neutral wall
  at a fixed alpha doesn't warm the door, it **drains** it — Golden Teak came out looking
  like grey oak. The alpha is now scaled by the surround's own saturation, so a lamplit
  hallway tints and a white wall leaves the finish alone.
  · **Photographed doors: the cropper does the cutting, the storefront does none.**
  `ImageDropCrop` puts four draggable handles on the uploaded photo; dragging them onto the
  leaf crops the door out of the showroom, removes the camera tilt and yields its true
  proportions in one action (`rectifyToCanvas` — the same projective map the storefront uses
  to put a door *into* a doorway, run backwards). What lands in the catalogue **is the leaf**,
  head-on and edge to edge, so `/try` warps the whole image with nothing to cut away.
  ⚠️ It **replaced a fixed 3:8 react-easy-crop** (2026-08-17), which forced every door into
  a 3ft × 8ft frame — a 4ft grand entrance lost its sides, a 6′6″ utility door was stretched.
  Doors are not one shape. The dep is gone with it (admin 66.6 → 60.5 kB gz); `QuadEditor`
  serves both the cropper and the storefront, so there is one corner-dragger, not two.
  ⚠️ `crop.mode === 'leaf'` is the contract: set by the cropper, read by `fetch-catalog.mjs`
  into `ProductImage.isLeafCrop`, and gated on by `tryState`. Older whole-showroom photos
  lack it — warping one would put our shop floor in a customer's hallway.
  It lives in the existing `crop` jsonb; **no migration needed**. (A `leaf_quad` column was
  added and then dropped the same day — the cropper made it redundant.)
  · ⚠️ **But the cropper was never run, and that broke the feature for two months.**
  `grep -c isLeafCrop src/data/catalog.gen.ts` was `0`: all 17 photographed doors reported
  `soon`, so "see it in your doorway" worked *only* for the 12 drawn doors — and those were
  removed on 2026-08-20, which would have left it working for nothing at all.
  **Fix: `npm run leaves:build`** (`scripts/build-leaves.mjs`) cuts each leaf out of its
  photograph from four corners hand-marked per door in `src/data/photoMap.ts`, using the
  *same* homography as `rectifyImage.ts` re-expressed against raw pixel buffers, and takes
  the leaf's true aspect from `rectifyAspect` so an angled shot is not stretched. Output:
  `public/images/leaves/<id>.webp` + `src/data/leaves.gen.ts` (404 kB for 17, committed).
  ⚠️ It is a **second image, never a replacement for the cover** — the cover keeps the room
  around the door, which is what makes it read as a real door on a card; the leaf has no
  context and would look like a swatch. Cards and PDP galleries are untouched. It rides on
  `Visual.leaf`, and an `/admin` crop still **wins**: that one is cut from the untouched
  original, this one only ever had the committed 960px web copy.
  ⚠️ It is applied as a **post-merge overlay** in `products.ts` for the same reason the
  price table is — the CMS carries all 17 ids and replaces them wholesale.
  · **`guessDoorQuad` is wired into `/admin` too** (2026-08-20). The same Sobel
  column/row guess the storefront runs on a customer's doorway photo now places
  the cropper's four handles on upload, so adding a door is "nudge a corner",
  not "drag four handles in from the edges". ⚠️ It takes a `findSill` option —
  **off on the storefront, on in `/admin`** — which hunts the door's bottom edge
  instead of deriving it from a standard leaf's proportions; a customer's snap
  usually cuts the sill off, a product shot never does. It only ever *replaces*
  the derived sill when the edge is strong and the resulting shape is between
  1.6:1 and 3.4:1, so it cannot make the guess worse.
  ⚠️ The accuracy bar is far lower in `/admin` than on the storefront, and that
  asymmetry is the whole justification — `quadGuess.ts` argues a 60%-accurate
  detector is *worse* than none, and it is right about a customer who cannot
  tell a bad guess from a good one. The shop owner is looking straight at their
  own photograph with the outline drawn on it. Measured over the 17 catalogue
  photos: 9 land at IoU > 0.6 (median 0.78 with `findSill`, 0.74 without), 5
  decline outright → the old centred default, 3 are visibly wrong — a
  white-on-white door, a double door, and a group shot of three doors.
  ⚠️ Marking a quad is eyeball work with a feedback loop, not a one-shot: render the crop,
  look at it, correct. Four of the seventeen were wrong the first time in a way that only
  showed *after* cropping (`main-03` and `main-11` are a door plus a fixed side panel, not
  one wide leaf; `main-27` has a carved transom above the leaf). `verify:geometry` now
  fails any leaf outside 1.4:1–3.6:1, which is what catches that class of mistake.
  ⚠️ Several of these photos carry a third-party watermark that survives the crop
  (`room-03`, `room-20`) and `room-31` is a 480px-wide group shot of three doors, so its
  leaf is only ~140px across. They are placeholders; re-shoot and re-mark.
  · **Flip left-to-right** (`crop.flip`, added 2026-08-17). `.door-scene__leaf` hinges on
  `transform-origin: left center`, so every door on the site swings open from its left edge
  and the handle has to be on the right — a photo of a right-hung door gave a card that
  swings open *from* its handle. A mirrored leaf is still a truthful picture of the design,
  so this is a photo fix, not a second right-hinged swing to maintain.
  ⚠️ The mirror is **two quad rearrangements, never a second pass over the pixels**.
  `flipWinding` (`rectifyImage.ts`) reverses the corner order, and since `rectifyToCanvas`
  maps output (0,0) onto `quad[0]`, that alone walks the leaf out backwards — the mirrored
  door falls out of the warp already running. `mirrorQuad` pairs that reversal with an x
  reflection to draw the handles over the CSS-mirrored stage, and is an involution, so one
  call converts in both directions. Reflection *without* the winding flip is the trap: it
  leaves index 0 at the top-**right**, so the editor and `squareUp` index the corner roles
  back-to-front. `verify:geometry` asserts all of it.
  ⚠️ `crop.quad` always describes the **original, unmirrored** photo and `flip` is recorded
  beside it, so a re-crop restores both. Nothing downstream reads `flip` — the stored image
  is already the right way round — so `fetch-catalog.mjs` needed no change. A re-crop that
  falls back to the saved copy (no original kept) starts `flip` **off**: that copy is the
  previous crop's output and is already mirrored.
  · **Re-crop** reopens the cropper on an existing image (`existing` prop) instead of
  forcing Remove-then-Add. It resolves the untouched original through
  `originalUrl()` — the `originals` bucket is **private**, so that URL must be *signed*;
  the public-URL form that works for `catalog` returns 400 — and restores the handles from
  `crop.quad`. Images seeded before this admin existed have no original (all 42 of them at
  the time of writing), so it falls back to the saved copy and **says so**: that path can
  only trim further in, never recover what an earlier crop removed.
  ⚠️ **`QuadEditor` carries its own `QuadEditor.css`**, and must keep doing so: it is used
  by two separate bundles (the storefront route and the admin cropper). Its rules lived in
  the route-scoped `tryathome.css`, so in `/admin` the handles had no positioning and the
  outline `<polygon>` fell back to SVG's default `fill: black` — a large black rectangle
  over the photo, hiding every control. A component shared across chunks owns its styles;
  only page-level CSS belongs in a page stylesheet. (Rollup emits it inside the shared
  chunk's stylesheet, currently `rectify-*.css`, and injects it for whichever bundle loads
  first.) Verify with `grep -o 'tryq' dist/assets/*.css` after any chunking change.
  ⚠️ `loadImage` sets `crossOrigin='anonymous'` for anything that isn't a `blob:`/`data:`
  URL, and *before* assigning `src` or it has no effect. A re-crop reads its source from
  Supabase storage — a different origin — and `rectifyToCanvas` calls `getImageData`, which
  throws on a tainted canvas. Verified 2026-08-17 that the buckets answer
  `access-control-allow-origin: *`; if that ever changes, re-crop and the try-on export
  both break at their last step, silently until you try to save.
  ⚠️ Photo leaves warp from the 960px stored copy, so they are softer than the vector doors
  at full size. Raise `OUT_WIDTH` if that ever shows.
  ⚠️ Export reads catalogue photos with `crossOrigin='anonymous'` (`loadLeafPhoto`) —
  Supabase storage is a different origin, and a tainted canvas makes `toBlob()` throw, so
  the customer's picture would never appear. The CSS preview needs no CORS; only reading
  pixels back does.
  ⚠️ `Number(null)` is `0` and `Number.isFinite(0)` is true, so reading `?h=&w=` straight
  through turned a bare `/try/:id` — i.e. any pasted or shared link — into a 0×0 door that
  `configFromLine` clamped to the smallest size sold, and the shared picture went out
  stamped "5′ × 1′8″". Absent and zero are different answers. The E2E asserts the 8′ × 3′
  default on a bare link.
  · **Measuring** (`rectify.ts`). The outlined leaf is a rectangle of known shape seen at an
  unknown angle, and that constrains the camera: the two pairs of parallel edges give two
  vanishing points whose world directions must be perpendicular, which yields the focal
  length, which yields the rectangle's aspect (Zhang & He). One tap on a height chip
  (78/81/84/96″ — the heights nearly every Indian home door is built to) turns proportions
  into inches, then straight through the existing `snapToStock` → `quoteFor`. **This needs
  no AR and works on iPhone**, and is *more* accurate than ARCore in the width dimension
  (~1–3% vs ±2–6cm).
  ⚠️ A near-frontal shot pushes both vanishing points to infinity and `f²` explodes or goes
  negative; the fallback is the outline's shape in the image, which is both the correct
  answer for a frontal photo *and* the limit the formula tends to as f→∞, so the branches
  meet instead of jumping. `fromPerspective` reports which ran.
  ⚠️ **It is a guide size, never a cutting size.** The caveat is welded to the number
  everywhere it appears, including inside the WhatsApp text (`try.share.withSize`), because
  the workshop cuts from that message and an unlabelled photo-derived number is a door cut
  20mm short. The E2E asserts the caveat survives into the `wa.me` URL.
  · **Two verifiers, deliberately split.** `npm run verify:e2e` proves the *feature* works
  in a browser (placement, 44px handles, the folded-quad refusal, the composed strip, the
  share File, the doors-only scope rule). `npm run verify:geometry` proves the *arithmetic*
  — it photographs a known 33×84″ door with a synthetic camera at six angles and focal
  lengths and checks it measures back. A browser test cannot do that: it has no ground
  truth. Both load TS through Vite's SSR loader / system Chrome the way the other scripts
  already do.
  · Adding this **did** restructure the chunk graph, benignly: `DoorArt` hoisted out of the
  entry into its own chunk, so entry went 96.6 → 92.6 kB gz with a 4.2 kB `DoorArt-*.js`
  beside it. It is in `index.html`'s `modulepreload` list, so it is fetched in parallel and
  costs no extra round trip — net eager payload +190 bytes. Re-check that preload survives
  if the chunking is ever touched.
- **Live viewfinder** (`src/lib/cameraCapture.ts` + `components/tryathome/CameraShot.tsx`,
  2026-08-18): "Take a photo" opens an in-page rear camera with framing guides instead of
  handing off to the OS picker. Unlike the AR path this works **anywhere `getUserMedia`
  does, iPhones included** — it is a `<video>` and a canvas, not WebXR.
  · It exists for the *guides*, not for the convenience. `rectifyAspect`'s accuracy is
  dominated by how square-on the shot was, and until now that was asked for in words
  (`try.pick.hint`) and discovered afterwards. Two uprights and a floor line, drawn on the
  room while the customer can still take a step back. Deliberately **not** a door-shaped
  outline: their door is an unknown shape, and one they cannot match invites them to line up
  the wrong thing.
  ⚠️ It replaces the `capture="environment"` input **only where it works** (`cameraAvailable()`
  is a capability check, not a permission one) and **never** the photo-library button — half
  of visitors are trying a door they shot yesterday and the counter staff work from WhatsApp
  photos. `verify:e2e` asserts that input still exists.
  ⚠️ `playsInline` + `muted` + `autoPlay` are all load-bearing on iOS: without `playsInline`
  Safari hands the stream to the native fullscreen player, taking the guides and the shutter
  off screen with it.
  ⚠️ `facingMode` is `ideal`, not `exact` — as `exact` it throws OverconstrainedError on any
  device whose back camera isn't labelled as expected, where a front camera would have done.
  ⚠️ `stopCamera` runs from effect cleanup, not from the shutter. A live track keeps the
  camera indicator lit and locks the lens away from every other app on most Androids. The
  unmount-during-permission-sheet race is handled explicitly — it is the common one on a phone.
  · `grabFrame` reads `videoWidth/videoHeight`, never `width/height` (the CSS box), and hands
  back a `LoadedPhoto` from the **shared** `photoFromSource` that `loadPhoto` also uses — same
  1600px cap, same object URL, same `release()`. Past that point there is one photo pipeline
  entered by two doors, which is why nothing downstream needed changing.
  · Tested for real: `verify:e2e` launches Chrome with `--use-fake-device-for-media-stream
  --use-fake-ui-for-media-stream` and drives open → guides → shutter → place step.
  ⚠️ Do **not** add `--auto-accept-camera-and-microphone-capture` beside them — it crashes
  this Chrome on launch (SIGTRAP before the first page) and the fake UI already answers the
  prompt.
- **Finish switch on the result screen** (2026-08-18): the composed picture carries a swatch
  row, so "show me that in walnut" no longer means going back to the corners.
  ⚠️ The result screen holds a flat JPEG, so this **redraws** rather than re-renders — and the
  exporter serialises the *live* SVG, which is not on screen there. Hence `.tryre`, a hidden
  raster stage mounted for exactly one pass (`reTone`), and `composeFrom(selector)`. Don't
  park that artwork permanently: it is ~180 nodes under a turbulence filter.
  ⚠️ A redraw **keeps the height estimate** (`keepEstimate`). Same doorway, same outline —
  clearing it would make the customer re-tap a chip to get their size and price back for what
  is, to them, the same door in another colour. The E2E asserts the estimate survives.
  ⚠️ `pickTone`'s dep array is `[tone, composing]`, **never `[tone.id, …]`**. Dep arrays
  evaluate every render and `tone` is undefined wherever `tonesFor` returns `[]` — i.e. every
  material — so dereferencing it there threw before the doors-only refusal could return, and
  `/try/burmese-teak` crashed instead of explaining itself.
- **Handheld AR** (`src/lib/arScene.ts` + `arSupport.ts` + `components/tryathome/
  ArPlacement.tsx`, 2026-08-17): a WebXR `immersive-ar` session that stands the leaf in the
  customer's room at true size, offered as a third button on `/try/:id`'s pick step.
  ⚠️ **It appears where it works and is invisible everywhere else.** Safari on iOS does not
  implement WebXR on any device, and Android's `immersive-ar` is ARCore-gated, so most
  visitors will never see this. `arSupport.ts` owns that gate. There is deliberately **no**
  disabled button, no "unsupported on your phone" notice and no nudge to switch devices — a
  visitor who cannot have it should not learn it exists. The photo flow is **not a fallback**
  for AR; it is the feature, and it is complete alone. `verify:e2e` asserts the absence (of
  the button, the overlay root *and* the chunk fetch) on a browser without `navigator.xr`,
  which is what stops a regression in the gate shipping a WebGL renderer to every iPhone.
  ⚠️ **Hand-written WebGL, and it must stay that way.** The scene is one textured quad and a
  reticle. Importing `three` would give it a scene graph it does not need and, worse, make a
  *second* importer — which is what currently keeps three wholly inside `Beams-*.js` (see the
  matrix3d bullet above). The AR chunk is 3.3 kB gz and imports only react/i18n/DoorArt;
  entry is unmoved at 92.3 kB gz. Verify with `grep -l THREE dist/assets/*.js` — exactly one
  file, `Beams-*.js`.
  ⚠️ `ArPlacement` is lazy but **mounts as soon as support resolves, not on the tap**.
  `requestSession` consumes transient user activation, so a dynamic `import()` inside the tap
  handler spends the activation on the download and Chrome rejects the session — the same
  class of bug as the `navigator.share()` one in `shareImage.ts`. `startArSession` therefore
  reaches `requestSession` with no `await` before it; the texture is prepared *after*, during
  the reticle phase. Don't "tidy" either into an await-first shape.
  ⚠️ The overlay root must be in the document *before* `requestSession`, so it is always
  mounted and merely parked (`:not([data-live])`, fixed at 0×0). It also sets an explicit
  `background: transparent` — the UA paints a fullscreen element opaque black, which would
  put a black sheet over the camera feed.
  ⚠️ `beforexrselect` is cancelled **only for real controls**, never for the overlay as a
  whole: a tap on empty space is how the door gets placed, and swallowing everything makes
  the feature inert. Without any cancelling, "Done" stands a door up *and* closes.
  · The leaf is upright at every yaw and only ever turns about the vertical axis — a floor
  hit's pose points its normal up, and taking that orientation lays the door flat on the
  carpet. It faces whoever placed it (`yawToward`). `verify:geometry` pins all of it: true
  size in metres, base on the surface, vertical at six yaws, facing at four camera positions.
  Those matrices are `Float32Array`, so that block uses `close32` (1e-5) — the file's 1e-9
  `close` is a float64 tolerance and every AR check fails against it for precision alone.
  · `@types/webxr` is an explicit devDependency (types-only, emits nothing). It was already
  arriving transitively through the three.js ecosystem, but the AR path deliberately does not
  use three, so leaving it implicit would break the build the day the hero's deps are touched.
  · Not verified on hardware — there is no ARCore device in CI, and the render path (session
  handshake, camera passthrough, hit-test quality) can only be confirmed on a real Android.
  The arithmetic and the support gate are covered; the session is not.
- **Mobile-first rules** (the site is browsed on phones; keep these true):
  · every colour-changing `:hover` lives inside `@media (hover: hover)` — touch latches
  `:hover` on the last thing tapped. The `.door-scene--hover:hover` swing is the one
  exception (touch gets `--ajar` instead), as is `.pdp__stage-note--hover/--touch`.
  · form controls are ≥16px or iOS zooms the page on focus and never zooms back;
  interactive targets ≥44px inside the phone breakpoints.
  · `index.html` sets `viewport-fit=cover`, so all fixed chrome (nav, drawer, toast,
  wa-float, footer) pads itself with `env(safe-area-inset-*)`.
  · overlays (cart drawer, burger menu) go through `src/lib/useScrollLock.ts`:
  `overflow:hidden` on `<html>` — **not** the `position:fixed` body trick, which
  zeroes `scrollY` and snaps the portal hero shut behind the overlay. It also parks
  Lenis and sets `body.has-overlay` (wa-float hides, toast moves off the CTA).
  · `Nav.tsx` publishes its measured height as `--nav-h`; the menu sheet and the
  overlay toast position off it instead of hard-coded offsets.
  · `.portal__sticky` is `100dvh` — it has to track the mobile URL bar in **both**
  directions. `100vh`(=lvh) hides the scroll cue under the bar while it shows; `100svh`
  leaves a strip of bare page exactly the bar's height once it retracts. `--scene-h`
  deliberately stays on `svh` (stable), so the bar moving resizes the pane but never
  the door. `.portal--dark` carries the backdrop colour too, so no rounding gap can
  flash cream.
  · the mobile `--scene-h` ends in `calc(100svh - 390px)`: that term caps the door by
  the space actually left after the copy block and the scroll-cue band, so a narrow
  phone that wraps the sub-heading shrinks the door instead of pushing it onto the cue.
  · absolutely positioned centred things use `left:0;right:0` + `width:fit-content;
  margin:0 auto`, never `left:50%` + `translateX(-50%)` — the latter shrink-to-fits
  inside only half the width and wraps the text (it did exactly that to the scroll cue).
  ⚠️ **The toast was the second occurrence**, fixed 2026-08-18. Its declared
  `max-width: min(92vw, 420px)` — widened again to `100vw - 32px` inside the phone
  breakpoint — was unreachable the whole time: "The Meridian added to cart" was laid
  out in a **195px column on a 390px screen**, exactly half, and wrapped onto two
  lines. Desktop hid it (245px is under half of 1440). If a centred overlay ever
  looks narrower than it should, this is the first thing to check.
  · **A page's reading measure goes on its contents, never on `.page-pad`.**
  `.page-pad` carries `margin: 0 auto`, so a narrower `max-width` on the *same*
  element re-centres the whole page column instead of shortening its lines. `/faq`,
  `/policies` and `/order-confirmed` did that until 2026-08-18 and started 376/416/426px
  from the left at 1440 while every other route started at 146 and the footer under
  them at 86 — three different left edges, and the two that link to each other did not
  even match. They now set the measure on `> *`.
  · **Prose links can take vertical padding, not a box.** Padding on an inline box
  never enters the line box, so `padding-block: 14px` gives a 16px link a 44px target
  and leaves the paragraph laid out identically — but only where the link has no
  neighbour: applied to `.policies a` wholesale it made the phone number's and the
  email's areas *overlap* on adjacent lines, so a tap aimed at the number opened the
  mail client. That contact line is now a `.policies__contact` list that breaks to one
  entry per row on a phone; the padding is scoped to the two standalone `__sub` links.
- **SVG art**: `classic` alone in `src/components/DoorArt.tsx` — the 12 catalog designs
  went with the Designer Studio doors on 2026-08-20 (`ArtId` is now the single literal
  `'classic'`, and `docs/design-research.md` is history). It is **not a product**: it is
  the hero corridor's Doors texture and the fallback for a door not yet photographed.
  Shared filters in `<DoorArtDefs/>` (mounted once in App, also used by MaterialArt);
  per-instance gradient ids are uid-prefixed.
- **Door configurator / pricing** (every priced door — see the removal bullet) — model in `src/data/pricing.ts`,
  UI in `DoorConfigurator.tsx`, both driven from one `DoorConfig`. Replaced the five fixed
  size buttons 2026-08-08 (modelled on brightdoors.in's Uni CPO setup, rebuilt client-side:
  they POST to WordPress on every slider tick and it visibly lags).
  · **Sliders**, not presets: height 60–96″, width 20–48″, ¼″ steps. Native
    `<input type=range>` on purpose — a slider lib would be new weight on a phone-first
    store, and native gets keyboard/AT/touch-drag right for free. ± nudges each side
    because a ¼″ is undraggable at 390px. `COMMON_SIZES` survives as the quick-pick pills
    under the sliders (`.cfg__tick`).
  · **Price = base + rate × snapped area.** The chosen size is rounded *up* to the smallest
    stock panel covering it (`snapToStock` over `STOCK_PANELS`, the H×W cartesian) and
    billed on that — a leaf is cut from a board, so 79″ costs what 81″ costs. This is why
    the price climbs in steps and holds flat between them; the `.cfg__hint` says so, and
    the E2E asserts both halves. Leaf = a fixed share (`PRICING.fixedShare`, doesn't shrink
    with the door) + a per-sq-ft share scaled by `thicknessFactor`.
  · Options: thickness, back-side design, frame (none/3-side/4-side → reveals section +
    design, priced on running feet via `frameRunningFeet`), hardware/lock. Unlike Bright
    Doors, **the sliders always measure the leaf** — the frame is an add-on derived from it,
    not a second size mode that hides the door sliders. Far less conditional-visibility
    logic for the same quote.
  · ⚠️ **Every number in `PRICING`, `STOCK_PANELS` and the option deltas is a placeholder**,
    back-solved so a plain 30mm 8′×3′ still equals `product.price` exactly (nothing moved
    commercially when this shipped). Confirm the whole table with the client. Prices stay
    all-inclusive of GST + installation — no tax split anywhere.
  · Each computed line rounds to `roundTo` and the total is their plain **sum** — never a
    second rounding, or the printed breakdown stops adding up (the E2E checks it does).
  · `PriceBreakdown` renders after the finish swatches, not inside the configurator: the
    finish is one of the lines it itemises.
- Cart lines keyed `product|size|tone|opts` (the `opts` segment is empty for an all-default
  door), localStorage `patidar.cart.v1` (one-time migration from `doorswala.cart.v1`);
  order ids `PD-…`. `sizeId` is `height x width` in inches — the same shape the old fixed
  ids used (`'84x33'`), so **carts and orders saved before the configurator still parse and
  price**; `CartLine.opts` / `OrderLineSnapshot.optsLabel` are optional for the same reason
  and fall back to `DEFAULT_CONFIG`. The wa.me order carries the size in feet-inches *and*
  plain inches plus the spec line, because the workshop cuts from that message.
- TS config uses `verbatimModuleSyntax` (use `import type`) and `erasableSyntaxOnly`
  (no enums), `noUnusedLocals/Parameters`.
- **Three verifiers now**, and the split is deliberate: `verify:e2e` proves the site works
  in a browser, `verify:geometry` proves the try-at-home arithmetic, and **`verify:scrub`
  proves the hero's compositor path draws the same tunnel its JS fallback does** — see the
  keyhole-hero bullet. A smoke test cannot tell a correct tunnel from a plausible one.
- E2E smoke test: `scripts/verify.e2e.mjs` (playwright-core + system Chrome, headless).
  `BASE=… OUT=… node scripts/verify.e2e.mjs` against a dev/preview server. Covers portal
  phases, world pages, photo cards, the door wall (desktop click-to-viewer + mobile
  tap-to-zoom), redirect, the door configurator (panel-snap steps, conditional frame
  groups, breakdown sums to the headline, mobile 44px targets), full cart→wa.me flow,
  mobile. Keep it green.
  ⚠️ Its catalogue counts are a **floor**, not an equality: ≥37 products, ≥15 doors.
  They were exact (and 49/27 before the Designer Studio removal) until the catalogue
  went live-backed on 2026-08-30 — the client can add a door in /admin and it is on
  the page a second later, so an exact number would make their edits fail our tests.
  The floor is still exact and permanent: `buildCatalogue` starts from the 37 local
  products and the CMS only ever overrides one by id or appends a new slug, so fewer
  than 37 means the merge dropped something.
  ⚠️ The **exhaustive** "every door has a leaf cut-out" check lives in `verify:geometry`,
  not here — it is a fact about the data and the browser would pay a page load per product
  to learn it. The E2E asserts one door per range instead; a single passing door is exactly
  what hid the two-month `isLeafCrop = 0` bug.
  ⚠️ The result screen's finish switcher is deliberately **not** covered any more: no
  product is drawn, so the swatch row never renders. The code stays for the `classic`
  fallback path; a test driving it would be testing a screen no customer can reach.
  ⚠️ The door-wall steps go through `gotoDoorWall()`, which walks to the band's *reserve*
  (`.doorwall-hold`, the only thing in the page before the chunk mounts) and re-centres on
  `.doorwall__wall` once it renders. No fixed offset can find it — it is lazy, mounted on
  approach and sits under a 520vh hero. A companion step asserts the opposite at scroll 0:
  the reserve is present and `.drift-wall` is *not*, which is what keeps the rAF off the
  hero. `/shop` is asserted to have neither.
  ⚠️ Scroll the storefront with the script's `wheelTo()`, never a raw `window.scrollTo`:
  Lenis owns wheel scrolling and lerps the page back to its own target, which leaves the
  portal at the wrong phase (its corridor invisible → clicks time out). The admin step
  passes with or without `.env`; the wa.me assertion reads `config.whatsappNumber`.
- React 19 StrictMode gotcha: rAF-throttled scroll handlers must reset their ref to 0 in
  effect cleanup (see `useTrackProgress`).
- Admin backend built + verified end-to-end (create/upload/crop/save into Supabase);
  remaining go-live steps in docs/admin-setup.md (client user + admins allow-list, disable
  signup, Vercel webhook).
- **Failure states** (hardening pass 2026-08-08). The rule is that nothing on this site
  fails to a blank rectangle — a store whose goal is footfall must still hand over an
  address when it breaks.
  · `ErrorBoundary.tsx` wraps the root, the page (keyed on pathname, so navigating away
  clears a crash and the nav/footer survive it), the lazy admin, and — with
  `fallback` — the two decorative lazy chunks. It **detects a stale chunk separately**:
  a hashed `Beams-*.js` / `StrokeText-*.js` / `AdminApp-*.js` that 404s is not a bug but
  a redeploy under an open tab, so the copy says "reload", and reload goes back to the
  server rather than re-rendering into the same dead URL. The beams fall back to
  nothing (`.portal__rays`' gradient already stands in); the Door Wall headline falls
  back to its `-webkit-text-stroke` span.
  · `index.html` carries a `<noscript>` with the phone, hours, address and a directions
  button — **inline-styled**, because in dev the stylesheet is injected by the very
  script that isn't running. Skip link is in `App.tsx` + `.skip-link` (min-height 44px:
  12px micro-caps with generous padding still lands at 42).
  · **Nothing trusts `localStorage`.** `order.ts` coerces the saved order field by field
  (a truncated write used to reach `customer.name.split()` during render);
  `CartContext.loadInitial` re-derives every line and clamps qty; `configFromLine`
  validates each option against the ones we sell — an unrecognised thickness reached
  `PRICING.thicknessFactor[…]` as `undefined` and printed `NaN` into the WhatsApp
  message the workshop cuts from. `fmtINR` degrades a non-finite number to `—`.
  · **Cart ceilings are message-length rules**, not commercial ones: 50/line, 30 lines,
  and checkout refuses a `wa.me` URL over 1900 chars — in-app browsers (Instagram,
  Gmail, some Android shells) truncate long URLs *silently*, and a truncated order is
  worse than a refused one. Checkout also latches `handing` against double-submit and
  records `blocked: true` when `window.open` is refused, which makes `/order-confirmed`
  lead with the button instead of the receipt.
  · **Catalogue photos** go through `ProductPhoto.tsx` (drawn stand-in on `onError`) —
  the client can delete a photo in `/admin` while the build-time snapshot still points
  at it. The Door Wall is the exception: its small tiles are inside the vendored
  `DriftWall`, so they are covered from outside via `color: transparent` +
  `img::before` (generated content renders on an `<img>` **only** while it is falling
  back to a non-replaced box, i.e. only when broken — a loaded photo never shows it);
  the two big `width:auto` images get a real React fallback, `WallPhoto`.
  ⚠️ `ProductPhoto` renders the CMS's real `width`/`height` **attributes** (that is what
  reserves the box against CLS), and those are *presentational hints on both the `width`
  and the `height` property*. An author `width: 100%` outranks the width hint; nothing
  outranked the height one on `.pdp__gallery img`, so from 2026-08-15 until 2026-08-17
  each PDP thumbnail took its pixel height straight off the attribute — 154px wide and
  1280–1920px tall, `aspect-ratio` ignored (an explicit height beats it) — and the three
  alternate photos ran ~1700px down the page under every photographed door. Every other
  `<img>` rule in the sheet already pairs a CSS width with a height (`100%`/`auto`);
  keep it that way, the pair is the rule.
  · **Admin**: `humanError()` in `api.ts` maps 23505/23503/42501/401/offline to what the
  owner should do next, and keeps anything unrecognised verbatim. Every mutation was a
  bare `await` with no catch — a blocked write rejected into nothing and the reload put
  the row straight back. Dashboard has loading/error/retry and an **orphan bucket**
  (a product whose section was deleted rendered nowhere while still counting in the
  header). Editor has a load-failure retry, `beforeunload` + Back guards on a dirty
  form, and blank-spec stripping. Uploads validate type and size *before* decoding,
  reject with a real message on HEIC (`img.onerror` hands back an Event, so
  `.message` was undefined and the error box rendered empty), guard `toBlob`'s null,
  revoke every object URL, and show which of the three round trips is running.
- **Kannada/Hindi readiness** (no translations shipped). `src/lib/i18n.ts` is a keyed
  catalogue + `t()` over the **functional** copy only — controls, errors, empty states,
  admin chrome; editorial copy stays with the CMS. `t()` is a plain function, not a
  hook, which is safe only because one locale ships; a second one needs a provider and
  the call sites don't change. `fmtINR` runs through `Intl` on the active locale, but
  the order message uses `fmtINROrder` pinned to `en-IN` — the workshop reads it.
  ⚠️ The type rules matter more than the strings: `--serif`/`--sans` carry Noto/Sangam
  tails (Cormorant and Archivo are Latin-only), and under `html:lang(kn|hi)` all
  `letter-spacing` and `text-transform` are dropped — uppercase is a no-op in a caseless
  script and tracking **separates a consonant from its matra**, so the akshara stops
  reading as one unit. The `:not(:lang(en))` in that selector is the contract for
  whoever translates: mark Latin runs (`WPC`, `710 BWP`, the brand) `lang="en"` and they
  keep the system's voice.

## prototype/ (historical)

`prototype/Doorswala.dc.html` is the original single-file DC prototype (Claude design),
kept for reference only — the site no longer uses it. Its old quirks (inlined `support.js`
runtime because the DC preview endpoint 401s subresources; `\x3C` escaping rules) only
matter if that file is ever edited again in the DC preview environment.
