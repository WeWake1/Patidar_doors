# Patidar Doors

Website for **Patidar Doors** (D2C brand of **Patidar Timbers**) — teak timbers,
made-to-measure doors, plywood and WPC, factory direct. The site showcases the
full catalogue online and drives footfall to the physical store.
Built with Vite + React + TypeScript.

Four themed "worlds" (Timbers · Doors · Ply · WPC) · portal hero (scroll opens the
door and walks you into the store) · real product photography with signature
hover-open door cards · per-door configurator (size × finish, live pricing) ·
persistent cart · WhatsApp enquiries & checkout · FAQ & policies.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
npm run images:build   # regenerate optimized photos + manifest (needs the raw photo folders)
npm run catalog:fetch  # pull the published Supabase catalogue into the bundle (no-op if unconfigured)
npm run catalog:seed   # regenerate supabase/seed.sql from local data (idempotent)
```

The client edits products in the custom **/admin** dashboard (in `src/admin/`, backed by
Supabase). Setup, security and the auto-rebuild webhook: `docs/admin-setup.md`.

End-to-end smoke test (drives real Chrome headlessly through browse → configure →
cart → checkout → WhatsApp order):

```bash
npm run dev -- --port 5199 &
BASE=http://localhost:5199 OUT=/tmp node scripts/verify.e2e.mjs
```

## ⚠️ Before going live

All business details live in **`src/config.ts`** — currently placeholders:

- `whatsappNumber` — orders/enquiries are sent to this number via wa.me (digits only, e.g. `919876543210`)
- `phoneDisplay`, `email`, `storeAddress`, `mapsUrl`

Change them once there; checkout, footer, floating button, visit page and policies all update.

## Deploy

Static site — any host works. `dist/` is the build output.

- **Netlify**: drag-drop `dist/` or connect the repo (SPA redirect included via `public/_redirects`)
- **Vercel**: import repo (SPA rewrite included via `vercel.json`)
- **GitHub Pages / others**: serve `dist/` with all routes falling back to `index.html`

## Project layout

```
src/
  config.ts             ← business details (EDIT THIS)
  data/worlds.ts        ← the four category worlds (Timbers/Doors/Ply/WPC)
  data/products.ts      ← catalog, sizes, finishes, pricing
  data/content.ts       ← FAQs, testimonials, process copy
  components/DoorArt.tsx← the 12 SVG door designs
  cart/CartContext.tsx  ← cart state (localStorage-persisted)
  pages/                ← Home, world pages, Shop, Product, Checkout, …
docs/design-research.md ← Pinterest-trend research behind the designs
prototype/              ← original Claude-design prototype (reference only)
scripts/verify.e2e.mjs  ← headless end-to-end smoke test
```

Pricing model: base price covers the standard 8′ × 3′ leaf; other sizes scale by
area; premium finishes add a flat delta. See `priceFor()` in `src/data/products.ts`.
