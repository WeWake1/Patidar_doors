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
  `art` (SVG door + tone group), `photo` (real image, gets hover-open door treatment),
  `material` (generated swatch in `MaterialArt.tsx` for timber/ply/wpc). `purchasable`
  + `price` ⇒ size(+finish if art) configurator & cart; otherwise "Enquire on WhatsApp"
  PDP. Legacy `/door/:id` redirects to `/product/:id`.
- **CMS (Sanity)** — the client's admin dashboard. `studio/` is the Sanity Studio
  (own package.json/node_modules, schema in `studio/schemas/product.ts`, desk grouped by
  world). Build-time integration, site stays static: `npm run cms:fetch` writes published
  docs → `src/data/catalog.gen.ts` (committed; empty when unconfigured) and the merge at
  the bottom of products.ts lets CMS docs override local ids (never the 12 Designer
  Studio ids) and append new slugs — WorldPage auto-appends client-invented `sub`
  sections. `npm run cms:seed` pushes the local catalogue + curated images (idempotent,
  needs `SANITY_WRITE_TOKEN`). Env in root `.env` / `studio/.env` (both gitignored,
  `.example` files committed). Provisioned 2026-07-20: project
  `sn4590lo`, dataset `production` (public), seeded (37 products/42 images), studio live at
  https://patidar-doors-admin.sanity.studio (appId pinned in studio/sanity.cli.ts).
  ⚠️ Seed ids are `product-<slug>` — never dot-namespaced ids (Sanity hides `x.y` ids from
  public queries). Remaining: Vercel deploy + deploy-hook webhook (docs/cms-setup.md §6),
  invite the client as Editor at manage.sanity.io.
- **Photo pipeline**: raw photos live in gitignored `Main Doors/` + `Room Doors/`;
  `npm run images:build` (sharp) emits 480/960 webp to `public/images/doors/` + manifest
  `src/data/images.gen.ts`. Curation lives in `src/data/photoMap.ts`; `/dev/gallery`
  (DEV builds) previews the manifest. The same script also encodes the two fixed hero
  shots from gitignored `/Hero/` (pattern is root-anchored — plain `Hero/` would also
  ignore `public/images/hero/` on case-insensitive macOS) → committed
  `public/images/hero/hero-{frame,leaf}.webp`; skips if the folder is absent.
  ⚠️ Several raw photos carry third-party watermarks (see photoMap.ts header) — they are
  unmapped; replace with client photography.
- **Portal hero** (`src/components/HeroPortal.tsx`): 520vh (mobile 420vh) sticky track;
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
- React 19 StrictMode gotcha: rAF-throttled scroll handlers must reset their ref to 0 in
  effect cleanup (see `useTrackProgress`).
- CMS is live; only the Vercel webhook (needs the site deployed to Vercel first) and the
  client's Editor invite remain — docs/cms-setup.md §6.

## prototype/ (historical)

`prototype/Doorswala.dc.html` is the original single-file DC prototype (Claude design),
kept for reference only — the site no longer uses it. Its old quirks (inlined `support.js`
runtime because the DC preview endpoint 401s subresources; `\x3C` escaping rules) only
matter if that file is ever edited again in the DC preview environment.
