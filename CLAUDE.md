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
  · `.portal__sticky` uses `100svh` — with `100vh` the scroll cue hides under the
  mobile URL bar.
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
  phases, world pages, photo cards, redirect, full cart→wa.me flow, mobile. Keep it green.
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
