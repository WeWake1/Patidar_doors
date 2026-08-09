# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, confirmed as co-primary — no one of them wins by default when
their needs conflict, so a surface that serves only one is incomplete.

- **Homeowners mid-project.** Building or renovating in and around Bengaluru,
  choosing doors, ply and WPC for a whole house. Browsing on a phone, often
  alongside a spouse or parent, deciding whether this yard is worth the drive.
  Job: get confident enough about material and price to walk in.
- **Trade — contractors, carpenters, site supervisors.** Sourcing timber and
  panels in volume, repeatedly. Job: check the range, grades and thicknesses
  quickly, then buy or send someone to collect.
- **Architects and interior designers.** Specifying finishes for a client's
  project. Job: use the catalogue as a spec reference and judge whether the
  showroom is worth bringing a client to.

## Product Purpose

A showcase site for **Patidar Doors**, the D2C brand of **Patidar Timbers** —
timber, made-to-measure doors, plywood and WPC. Success is **footfall to the
physical store** in Nagasandra, Bengaluru, plus WhatsApp enquiries; it is not an
e-commerce funnel. Everything on the site is a preview of what is standing on
the shop floor, and the site's job is to make the drive feel worth it.

## Positioning

**Own yard, own factory — no middleman between the log and the door.** Logs are
bought whole and sawn in Patidar's own yard; leaves are pressed and finished in
Patidar's own factory. A reseller showroom down the road cannot truthfully say
either half of that. Related facts that are true but *not* the differentiator:
all four material categories under one roof, and made-to-measure cutting.

## Operating Context

- **The store is the product.** Customers come to touch grain, compare finishes
  side by side and see stock depth. The site precedes the visit; it rarely
  replaces it.
- **WhatsApp is the channel.** Enquiries, quotes and the Designer Studio order
  message all leave the site as a `wa.me` deep link. The workshop cuts from that
  message, so it must carry the full spec.
- **Confirmed sales flow:** free measurement visit → production begins only
  after the customer approves measurements → 50% to start production, 50% after
  installation → 10–14 working day build. Nothing is paid online.
- **Service reach:** measurement and installation crews are local to Bengaluru.
  Timber, ply and doors can be freighted further on enquiry, without fitting.
  ⚠️ The FAQ currently claims free measurement visits in metros and tier-1
  cities pan-India — that overstates reach and is not product truth.
- **Phone-first.** The overwhelming share of visitors are on a phone, often on
  Indian mobile data. Weight and jank are product problems, not polish.

## Capabilities and Constraints

- **Four worlds IA:** Timbers · Doors · Ply · WPC, each its own themed page.
  Terminology is the trade's: leaf, frame/chaukhat, 710 marine grade,
  calibrated, blockboard, membrane, WPC, running feet, sq ft.
- **Two catalogue tiers.** The 12 **Designer Studio** doors are priced and carry
  a size/finish configurator, cart and WhatsApp checkout. Every other product is
  showcase-and-enquire. *Open decision:* this split is a pilot — pricing and
  checkout are intended to reach more of the catalogue later, so future work
  should not treat "only 12 transact" as permanent, nor expand it unasked.
- **Pricing model** rounds the customer's size *up* to the smallest stock panel
  that covers it and bills on that, because a leaf is cut from a board. Prices
  quoted are all-inclusive of GST and installation; no tax is ever split out.
  ⚠️ Every number in the pricing table is a placeholder pending client sign-off.
- **Client-editable catalogue** via a custom `/admin` on Supabase; the public
  build stays static. The client is a non-technical store owner — admin
  workflows must survive that.
- Warranty: a warranty **does exist**, but its length and coverage differ from
  what the site currently says. Terms unconfirmed.

## Brand Commitments

- Names: **Patidar Doors** (D2C brand) of **Patidar Timbers** (parent).
- Official mark: the "PP" monogram with the "DOORS • PLYWOODS • BOARDS" lockup.
  Vector master `brand/patidar-logo.pdf`; web derivatives in
  `public/images/logo/` (dark ink for light grounds, cream `#f0e3c2` for dark).
- Voice in the existing copy: plain, physical, first-person-plural, specific
  about process ("sawn in our own yard", "hung on our hinges"). No hype, no
  exclamation marks, no marketing superlatives.

## Evidence on Hand

**Real and confirmed:**

- Store contact details in `src/config.ts` — the Nagasandra / Tumkur Road
  address, `+91 96119 53838`, `patidartimber.pt@gmail.com`, the maps link. These
  are the real store's. (`README.md` still calls them placeholders; it is stale.)
- The measurement → approval → 50/50 payment → 10–14 day production flow.
- Real product photography of the client's own doors, in gitignored `Main
  Doors/` and `Room Doors/`, built to `public/images/doors/`. ⚠️ Several raw
  frames carry third-party watermarks and are deliberately unmapped — see the
  header of `src/data/photoMap.ts`. Client photography is still needed to
  replace them, and the Door Wall on `/shop` shows borrowed catalogue photos as
  placeholders.
- 12 original SVG door designs in `DoorArt.tsx` — drawn for this project.

**Not confirmed — future work must not treat these as fact:**

- **The three testimonials in `src/data/content.ts` are fabricated.** "Meera
  Krishnan", "Arjun Shah", "Ritika & Dev Malhotra" are not real customers and
  did not say those things. No real customer quotes exist yet. Do not write more
  of them, and do not lean on social proof that isn't there.
- The **10-year warranty** wording throughout (`config.warrantyYears`, the FAQ,
  product pages). A warranty exists; these terms are wrong.
- **All product copy** — tags, stories and specs across the four worlds — is AI
  drafted and awaiting client confirmation.
- The pan-India delivery and free-metro-measurement claims in the FAQ.
- Every price, stock panel and option delta in `src/data/pricing.ts`.

## Product Principles

1. **The visit is the conversion.** Every surface should end in a reason to come
   to Nagasandra or open WhatsApp — never in a checkout that pretends to be the
   point.
2. **Show the material, not a rendering of it.** Grain, thickness, finish and
   edge are what the customer came for; the site earns trust by being physical
   and specific where a reseller's site is generic.
3. **One floor, three visitors.** A homeowner, a carpenter and an architect must
   each find their level on the same page — the homeowner's confidence and the
   trade's grade/thickness detail cannot be traded off against each other.
4. **Claim only what is true.** This catalogue is largely unverified draft
   sitting next to real photography and a real address. Never add a number, a
   quote, a certification or a delivery promise that no one has confirmed.
5. **A phone on Indian mobile data is the target device.** Bundle weight,
   scroll smoothness and touch targets are product requirements, not polish —
   the hero and the catalogue must stay fluid on a mid-range Android.

## Accessibility & Inclusion

No formal standard has been set by the client. Product-specific needs that are
already established: touch targets ≥44px and form controls ≥16px inside the
phone breakpoints (iOS zooms and never zooms back below that); safe-area padding
on all fixed chrome; and a static, non-animated path through the hero under
`prefers-reduced-motion`.
