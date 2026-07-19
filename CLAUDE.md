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
  `material` (generated swatch in `MaterialArt.tsx` for timber/ply/wpc). `purchasable: false`
  ⇒ "Enquire on WhatsApp" PDP instead of configurator/cart. Shaped for a future headless-CMS
  (Sanity/Payload) swap — see the comment atop products.ts. Legacy `/door/:id` redirects to
  `/product/:id`.
- **Photo pipeline**: raw photos live in gitignored `Main Doors/` + `Room Doors/`;
  `npm run images:build` (sharp) emits 480/960 webp to `public/images/doors/` + manifest
  `src/data/images.gen.ts`. Curation lives in `src/data/photoMap.ts`; `/dev/gallery`
  (DEV builds) previews the manifest. ⚠️ Several raw photos carry third-party watermarks
  (see photoMap.ts header) — they are unmapped; replace with client photography.
- **Portal hero** (`src/components/HeroPortal.tsx`): 520vh (mobile 420vh) sticky track;
  phases: door opens (0–.25) → scale push-through (.25–.55, transform+opacity only,
  `portalMode` on DoorScene keeps the shadow static) → corridor of 4 world-doors (.55–.9).
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
- **Next phase (agreed with user)**: admin dashboard via headless CMS (Sanity or Payload)
  so the client can add door photos/products themselves; the data layer is already URL-based.

## prototype/ (historical)

`prototype/Doorswala.dc.html` is the original single-file DC prototype (Claude design),
kept for reference only — the site no longer uses it. Its old quirks (inlined `support.js`
runtime because the DC preview endpoint 401s subresources; `\x3C` escaping rules) only
matter if that file is ever edited again in the DC preview environment.
