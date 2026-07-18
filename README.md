# Doorswala

Production website for **Doorswala** — premium made-to-measure doors, factory direct,
delivered and installed across India. Built with Vite + React + TypeScript.

Home (scroll-to-open hero door) · Shop with category filters · 12 original door designs
(SVG artwork recreated from trending Pinterest motifs) · per-door configurator
(size × finish, live pricing) · persistent cart · WhatsApp checkout · FAQ & policies.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

End-to-end smoke test (drives real Chrome headlessly through browse → configure →
cart → checkout → WhatsApp order):

```bash
npm run dev -- --port 5199 &
BASE=http://localhost:5199 OUT=/tmp node scripts/verify.e2e.mjs
```

## ⚠️ Before going live

All business details live in **`src/config.ts`** — currently placeholders:

- `whatsappNumber` — orders are sent to this number via wa.me (digits only, e.g. `919876543210`)
- `phoneDisplay`, `email`

Change them once there; checkout, footer, floating button and policies all update.

## Deploy

Static site — any host works. `dist/` is the build output.

- **Netlify**: drag-drop `dist/` or connect the repo (SPA redirect included via `public/_redirects`)
- **Vercel**: import repo (SPA rewrite included via `vercel.json`)
- **GitHub Pages / others**: serve `dist/` with all routes falling back to `index.html`

## Project layout

```
src/
  config.ts             ← business details (EDIT THIS)
  data/products.ts      ← catalog, sizes, finishes, pricing
  data/content.ts       ← FAQs, testimonials, process copy
  components/DoorArt.tsx← the 12 SVG door designs
  cart/CartContext.tsx  ← cart state (localStorage-persisted)
  pages/                ← Home, Shop, Product, Checkout, …
docs/design-research.md ← Pinterest-trend research behind the designs
prototype/              ← original Claude-design prototype (reference only)
scripts/verify.e2e.mjs  ← headless end-to-end smoke test
```

Pricing model: base price covers the standard 8′ × 3′ leaf; other sizes scale by
area; premium finishes add a flat delta. See `priceFor()` in `src/data/products.ts`.
