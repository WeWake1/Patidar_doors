# Patidar Doors project notes

Vite + React + TypeScript site for **Patidar Doors** (D2C brand of Patidar Timbers).
Showcase site — the goal is footfall to the physical store, not online selling (the cart/
WhatsApp checkout is kept for the 12 Designer Studio doors only). `npm run dev` / `build` /
`preview` / `lint` / `images:build`.

- **Contact details are placeholders** in `src/config.ts` (`whatsappNumber`, `phoneDisplay`,
  `email`, `storeAddress`, `mapsUrl`) — replace before launch. Checkout/enquiries go via wa.me.
- **Product copy is unverified draft** — tags/stories/specs across all four worlds were
  drafted by AI and must be confirmed with the client.
- **Four worlds IA**: `/timbers` `/doors` `/ply` `/wpc` render one `WorldPage` themed by
  `[data-world]` token scopes in `src/styles/worlds.css`. Worlds/subcategories defined in
  `src/data/worlds.ts`. The home world-strip tiles carry `data-world` too, so they read the
  same block and can't drift from the page they open.
- **Colour tokens are two-tier** (`src/styles/global.css`). Tier 1 = primitives, physical
  names for pigments (`--cream --panel --night --brass --gold --lamp2/3 …`). Tier 2 =
  **roles** (`--surface[-raised|-sunk|-band] --text[-2|-3] --border[-strong|-control]
  --accent[-deep|-text] --action[-text|-hover|-hover-text] --focus --focus-halo --stage`)
  and **components only ever read roles**. Each `[data-world]` block restates the roles, so
  one component set renders as four sub-brands — if you catch yourself writing
  `[data-world='x'] .card__name`, a role is missing. `--w-*` survive only as aliases.
  Global chrome (nav, footer, drawer, toast, wa-float) reads tier 1 and deliberately does
  **not** theme — it's what holds the four worlds together as one brand.
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
- **Data model** (`src/data/products.ts`): `Product.visual` is a union —
  `art` (SVG door + tone group), `photo` (real image; `presentation: 'swing'`
  door-opens-animation vs `'showcase'` zoom/lift for in-situ shots), `material`
  (generated swatch in `MaterialArt.tsx` for timber/ply/wpc). `ProductVisual.tsx` is the
  single map visual→component (cards, PDP, admin preview all use it). `PhotoShowcase.tsx`
  = the non-swinging photo treatment. `purchasable` + `price` ⇒ size(+finish if art)
  configurator & cart; otherwise "Enquire on WhatsApp" PDP. Legacy `/door/:id` → `/product/:id`.
- **CMS = Supabase + custom `/admin`** (replaced Sanity 2026-07-22 — the generic studio
  gave no crop control, so door photos looked wrong swinging). Project `yevrjgmgbguwvluemtsw`.
  Tables `subcategories`/`products`(FK→subcategory)/`product_images`, `admins` allow-list;
  buckets `catalog`(public)/`originals`(private); RLS = anyone reads published, only
  allow-listed admins write. Admin app in `src/admin/` (lazy-loaded under `/admin`, off the
  public bundle; Supabase auth; product editor with react-easy-crop → canvas webp 480/960
  → Storage; live `ProductVisual` preview). Build-time still static: `npm run catalog:fetch`
  → `catalog.gen.ts` (same merge — Designer Studio protected, new slugs/sections append).
  `npm run catalog:seed` writes `supabase/seed.sql`. Env: root `.env` (VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY = publishable key). Setup/security/webhook in `docs/admin-setup.md`.
  ⚠️ storage uploads must NOT pass `upsert:true` (hits the UPDATE policy → RLS 403; paths are
  unique uuids anyway). RLS uses `exists(admins…)`, not `auth.role()` (which can be null).
  Remaining: create the client's admin user + add to `admins`, disable public signup,
  Vercel build cmd + Supabase→Vercel deploy webhook (docs §"Auto-rebuild").
- **Brand logo**: the official mark is the "PP" monogram + "DOORS • PLYWOODS • BOARDS"
  lockup. Vector master: `brand/patidar-logo.pdf` (source of truth for re-exports/print).
  Web derivatives in `public/images/logo/` — full lockup `patidar-logo{,-cream}-{1200,600}.png`
  and monogram `patidar-mark{,-cream}.png` (dark ink `--ink` for light bg, cream `#f0e3c2`
  for dark bg; transparent PNGs keyed white→alpha from the PDF). Used: nav brand mark
  (`.nav__mark`, dark) + wordmark text kept; footer brand (`.footer__mark`, cream);
  favicon `public/favicon-32.png` + `apple-touch-icon.png` (cream monogram on `--deep`
  rounded square); social `public/images/logo/og-image.png` (1200×630, wired in index.html
  og:image/twitter:image). Replaced the old hand-drawn `favicon.svg`.
- **Photo pipeline**: raw photos live in gitignored `Main Doors/` + `Room Doors/`;
  `npm run images:build` (sharp) emits 480/960 webp to `public/images/doors/` + manifest
  `src/data/images.gen.ts`. Curation lives in `src/data/photoMap.ts`; `/dev/gallery`
  (DEV builds) previews the manifest. The same script also encodes the two fixed hero
  shots from gitignored `/Hero/` (pattern is root-anchored — plain `Hero/` would also
  ignore `public/images/hero/` on case-insensitive macOS) → committed
  `public/images/hero/hero-{frame,leaf}.webp`; skips if the folder is absent.
  ⚠️ Several raw photos carry third-party watermarks (see photoMap.ts header) — they are
  unmapped; replace with client photography.
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
- **World cards** (`.wcard`, in the corridor): each world is an arched opening with its
  material full-bleed — `MaterialArt` slices to fill; the doors leaf is `DoorArt` (drawn
  `preserveAspectRatio="none"`) given its 3:8 ratio back in CSS so it overflows and crops
  like a photo instead of squashing. Colours are the *material* (teak, golden-teak leaf,
  birch ply, slate-green WPC), not the world accent — that stays on the frame/rule via
  `--wd`. Replaced the glass-globe treatment 2026-08-03: the sphere, its spinning
  specular sweep and the bobbing float read as a toy against the rest of the site.
  ⚠️ `.wcard__art` carries `will-change: transform` purely to force a compositor layer,
  and needs it. `.wcard` is scroll-scrubbed (transform+opacity per frame) while that box
  holds the expensive pixels — an feTurbulence/feDisplacementMap-filtered SVG under an
  elliptical clip, a 60px drop shadow and a 60px inset one. Unpromoted, Chrome
  re-rasterises all four on every frame of the reveal, which is exactly the phase that
  stuttered on a phone. Verify with CDP `LayerTree`: all 4 must have their own layer.
- **Door Wall** (`src/components/DoorWall.tsx`, top of `/shop`): full-bleed dark band —
  reactbits `DriftWall` of door photos drifting in 3D. ≥900px (`useMediaQuery`) it is a
  two-up, wall right + clicked photo big on the left; below that the wall stays as-is and
  a tap opens a full-screen `.doorzoom` (through `useScrollLock`), because a viewer above
  or below the wall would update off-screen. Photos = `src/data/wallPhotos.ts`, a list of
  ids from `images.gen.ts` — ⚠️ **placeholders borrowed from the catalogue photography**,
  28 of them, hand-checked at full size for watermarks (the wall shows photos far bigger
  than a card, so marks photoMap only had to dodge on covers surface here). Swap by
  editing `WALL_IDS`; captions are opt-in via `CAPTIONS` and blank by default while copy
  is unconfirmed. `.shop` is no longer one `.page-pad` — it is head / wall / list so the
  band can go edge to edge.
  ⚠️ two fixes on top of the registry `DriftWall`: (1) the tile is `transform-style: flat`,
  not `preserve-3d` — inside a preserve-3d subtree Chrome resolves `elementFromPoint` (so
  also mouse events) to the track for ~half the wall and the clicks vanish; the hover
  `translateZ(lift)` is recreated as `scale(--dw-pop)`, computed from lift/perspective.
  (2) the click is delegated to the wall and falls back to the tiles' projected rects when
  `elementFromPoint` still misses near the plane's edges. Also `dim`/`.drift-wall__overlay`
  go near-opaque under `(hover: none)`: the scrim only pays for itself if hover can lift it.
- **StrokeText** (`src/components/reactbits/StrokeText.tsx`): SVG draw-on headline, used
  for the Door Wall title. Needs `gsap` + ScrollTrigger (~46 KB gz) so it is **lazy-loaded**
  with a `-webkit-text-stroke` fallback that holds the same box. Its `fontSize` prop only
  fixes stroke-to-letterform proportions — the rendered size is the CSS height on
  `.stroke-text__svg` (the viewBox is `meet`-scaled into it). Font-family is inherited.
  ⚠️ it runs on `trigger="hover"`, which starts *at* the finished state and replays the
  draw on `pointerenter` — so touch visitors only ever see the finished headline. Switch
  to `trigger="scroll"` if the animation should play for them too.
- **Hover-open door**: CSS on `.door-scene--hover` (SVG −26°, photos −18° + edge-shade
  `::after`). Touch devices get `door-scene--ajar` via `src/lib/useAjarInView.ts`
  (shared IntersectionObserver, mid-viewport band, `(hover: none)` only).
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
- **SVG art**: 12 catalog designs + hero `classic` in `src/components/DoorArt.tsx`
  (original artwork — do not replace with Pinterest photos; see `docs/design-research.md`).
  Shared filters in `<DoorArtDefs/>` (mounted once in App, also used by MaterialArt);
  per-instance gradient ids are uid-prefixed.
- **Door configurator / pricing** (Designer Studio only) — model in `src/data/pricing.ts`,
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
- E2E smoke test: `scripts/verify.e2e.mjs` (playwright-core + system Chrome, headless).
  `BASE=… OUT=… node scripts/verify.e2e.mjs` against a dev/preview server. Covers portal
  phases, world pages, photo cards, the door wall (desktop click-to-viewer + mobile
  tap-to-zoom), redirect, the door configurator (panel-snap steps, conditional frame
  groups, breakdown sums to the headline, mobile 44px targets), full cart→wa.me flow,
  mobile. Keep it green.
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
