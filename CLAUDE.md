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
  `[data-world]` token scopes (`--w-bg/-ink/-accent/…`) in `src/styles/worlds.css`.
  Worlds/subcategories defined in `src/data/worlds.ts`.
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
  · **Auto push-through** (`useAutoPushThrough`): the swing (0–.25) is the reader's to
  scrub, but the zoom is a cutscene — stopping inside it parks the hero in a blurred
  doorway. Crossing p=.26 hands the rest of the track to one `smoothScrollTo` landing at
  p=.92 (corridor settled); re-arms below p=.18. Fires on the crossing, *not* on the
  scroll going idle — idle meant waiting out Lenis's inertia tail first, which read as a
  ~1s stall. ⚠️ two gotchas: the glide passes an explicit `duration` (Lenis's lerp is
  asymptotic and crawls the last 10%), and the touch-deferred call goes through
  `requestAnimationFrame` — a `lenis.scrollTo` issued *inside* a `touchend` handler is
  swallowed by Lenis's own touch bookkeeping, which runs after ours.
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
  Colour is `--gold-l` `#f2d18a`, not the demo's orange, and `speed` is half the demo's.
  ⚠️ It is **lazy-loaded** (`React.lazy` + `Suspense`) and must stay that way: three is
  ~238kB gz, twice the rest of the site, and this is a phone-first store. It gets its own
  chunk, `.portal__rays`' warm gradient stands in until it lands, and the canvas fades in
  (`@keyframes beams-in`) because its scene background is opaque black — without the fade
  the hero snaps from warm brown to black when the chunk arrives.
  · Console carries a `THREE.Clock … deprecated` warning from inside @react-three/fiber;
  upstream, not ours, and `verify.e2e.mjs` reports it as console noise.
- **World cards** (`.wcard`, in the corridor): each world is an arched opening with its
  material full-bleed — `MaterialArt` slices to fill; the doors leaf is `DoorArt` (drawn
  `preserveAspectRatio="none"`) given its 3:8 ratio back in CSS so it overflows and crops
  like a photo instead of squashing. Colours are the *material* (teak, golden-teak leaf,
  birch ply, slate-green WPC), not the world accent — that stays on the frame/rule via
  `--wd`. Replaced the glass-globe treatment 2026-08-03: the sphere, its spinning
  specular sweep and the bobbing float read as a toy against the rest of the site.
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
- Pricing (Designer Studio only): base price = 8′×3′ leaf; sizes scale by area (`priceFor`),
  finishes add flat `delta`. Cart lines keyed `product|size|tone`, localStorage
  `patidar.cart.v1` (one-time migration from `doorswala.cart.v1`); order ids `PD-…`.
- TS config uses `verbatimModuleSyntax` (use `import type`) and `erasableSyntaxOnly`
  (no enums), `noUnusedLocals/Parameters`.
- E2E smoke test: `scripts/verify.e2e.mjs` (playwright-core + system Chrome, headless).
  `BASE=… OUT=… node scripts/verify.e2e.mjs` against a dev/preview server. Covers portal
  phases, world pages, photo cards, the door wall (desktop click-to-viewer + mobile
  tap-to-zoom), redirect, full cart→wa.me flow, mobile. Keep it green.
  ⚠️ Scroll the storefront with the script's `wheelTo()`, never a raw `window.scrollTo`:
  Lenis owns wheel scrolling and lerps the page back to its own target, which leaves the
  portal at the wrong phase (its corridor invisible → clicks time out). The admin step
  passes with or without `.env`; the wa.me assertion reads `config.whatsappNumber`.
- React 19 StrictMode gotcha: rAF-throttled scroll handlers must reset their ref to 0 in
  effect cleanup (see `useTrackProgress`).
- Admin backend built + verified end-to-end (create/upload/crop/save into Supabase);
  remaining go-live steps in docs/admin-setup.md (client user + admins allow-list, disable
  signup, Vercel webhook).

## prototype/ (historical)

`prototype/Doorswala.dc.html` is the original single-file DC prototype (Claude design),
kept for reference only — the site no longer uses it. Its old quirks (inlined `support.js`
runtime because the DC preview endpoint 401s subresources; `\x3C` escaping rules) only
matter if that file is ever edited again in the DC preview environment.
