# CMS setup — Sanity admin for Patidar Doors

The client manages the catalogue in a hosted **Sanity Studio** (their "admin
dashboard"). The site stays fully static: at build time `npm run cms:fetch`
pulls published products into `src/data/catalog.gen.ts`, and a webhook rebuilds
the site whenever the client hits **Publish**. With no CMS configured the site
runs entirely on the local data files — nothing breaks.

How products merge (see the bottom of `src/data/products.ts`):
- A CMS product whose slug matches a local id **replaces** the local entry.
- New slugs are **appended** (a new `sub`/section auto-appears on its world page).
- The 12 Designer Studio doors are **never** overridden (SVG art + cart pricing
  live in code).
- Cover photo ⇒ hover-open door card. No cover but swatch colours ⇒ drawn
  material swatch. Neither ⇒ neutral placeholder door.
- "Sell online" toggle + price ⇒ size configurator + cart; otherwise the PDP
  shows **Enquire on WhatsApp**.

## Provisioning status (done 2026-07-20)

Steps 1–5 below are **complete**: project `sn4590lo`, public `production` dataset,
catalogue seeded, studio live at **https://patidar-doors-admin.sanity.studio**.
Still to do: step 6 (Vercel webhook — after the site itself is deployed to Vercel) and
inviting the client (manage.sanity.io → Members → invite as **Editor**).

## One-time setup (you, ~15 minutes)

1. **Create the Sanity project** (free tier):
   ```bash
   cd studio
   npx sanity login            # opens the browser — use your (or the client's) account
   npx sanity projects create  # or create one at sanity.io/manage; note the project id
   ```
2. **Configure ids**:
   - `studio/.env` (copy from `studio/.env.example`): `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET=production`
   - repo-root `.env` (copy from `.env.example`): `SANITY_PROJECT_ID` (same id), `SANITY_DATASET=production`
   - Create the dataset if needed: `cd studio && npx sanity dataset create production --visibility public`
     (public = the site can read it without a token).
3. **Seed the existing catalogue** (37 products + curated photos):
   - Create a write token: [manage.sanity.io](https://manage.sanity.io) → your project → API → Tokens → add token with **Editor** permissions.
   - Put it in root `.env` as `SANITY_WRITE_TOKEN=…`, then:
   ```bash
   npm run cms:seed
   ```
4. **Verify the round-trip**:
   ```bash
   npm run cms:fetch && npm run dev
   ```
   Product pages should now serve images from `cdn.sanity.io`.
5. **Deploy the Studio** so the client gets a URL (e.g. `patidar-doors.sanity.studio`):
   ```bash
   cd studio && npx sanity deploy
   ```
   Invite the client at manage.sanity.io → Members (Editor role).
6. **Auto-rebuild on publish** (Vercel):
   - Vercel → project → Settings → Environment Variables: add `SANITY_PROJECT_ID`, `SANITY_DATASET`.
   - Vercel → Settings → Build & Development: set Build Command to
     `npm run cms:fetch && npm run build`.
   - Vercel → Settings → Git → Deploy Hooks: create one, copy the URL.
   - manage.sanity.io → API → Webhooks: add a webhook that POSTs that URL on
     create/update/delete of `product`. Publishing in the Studio now redeploys
     the site in ~a minute.

## Day-to-day (the client)

Open the studio URL → pick a range (Timbers / Doors / Ply / WPC) → **＋ New
product** → fill Name, Section, one-line description, upload the **main photo**
(straight-on, portrait, full door — that's what gets the door-opens-on-hover
effect), add gallery shots → **Publish**. The site updates itself.

## Notes

- `npm run cms:seed` is idempotent (stable document ids, deduped image uploads)
  — safe to re-run after local data edits.
- Keep `SANITY_WRITE_TOKEN` only in the local `.env` (gitignored), never in
  Vercel — the build only ever reads.
- The studio schema lives in `studio/schemas/product.ts`; if you add fields,
  mirror them in `scripts/fetch-catalog.mjs` (GROQ + conversion).
