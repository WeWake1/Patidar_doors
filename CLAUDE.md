# Doorswala project notes

Vite + React + TypeScript site for Doorswala (D2C brand of Patidar Timbers): made-to-measure
doors, factory direct. `npm run dev` / `build` / `preview` / `lint`.

- **Contact details are placeholders** in `src/config.ts` (`whatsappNumber`, `phoneDisplay`,
  `email`) — the user must replace them before launch. Checkout sends orders via wa.me link.
- **Door visuals are original SVG artwork** in `src/components/DoorArt.tsx` — 12 catalog
  designs + hero `classic`, recreated from Pinterest-trend motifs (see
  `docs/design-research.md`). Do not replace with photos from Pinterest — copyright.
  Shared SVG filters live in `<DoorArtDefs/>` (mounted once in App); per-instance gradient
  ids are uid-prefixed to avoid collisions.
- Catalog/pricing in `src/data/products.ts`: base price = 8′×3′ leaf; sizes scale by area
  (`priceFor`), finishes add flat `delta`. Cart lines are keyed `product|size|tone` and
  persisted to localStorage (`doorswala.cart.v1`).
- TS config uses `verbatimModuleSyntax` (use `import type`) and `erasableSyntaxOnly`
  (no enums), `noUnusedLocals/Parameters`.
- E2E smoke test: `scripts/verify.e2e.mjs` (playwright-core + system Chrome, headless;
  no browser download). Run against a dev/preview server with `BASE=… OUT=… node scripts/verify.e2e.mjs`.
  It stubs `window.open` to capture the wa.me order URL. Keep it green.
- React 19 StrictMode gotcha already fixed once: rAF-throttled scroll handlers must reset
  their ref to 0 in effect cleanup (see `useScrollProgress` in `src/pages/Home.tsx`).

## prototype/ (historical)

`prototype/Doorswala.dc.html` is the original single-file DC prototype (Claude design),
kept for reference only — the site no longer uses it. Its old quirks (inlined `support.js`
runtime because the DC preview endpoint 401s subresources; `\x3C` escaping rules) only
matter if that file is ever edited again in the DC preview environment.
