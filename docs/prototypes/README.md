# Prototype history

Every design round, what it tried, and the owner's verdict. Screenshots are 1440 px desktop (1×) and
390 px phone (2×), WebP. Decisions themselves live in [`../decisions.md`](../decisions.md).

## Round 1 · four hero concepts (23 Nov 2026) · awaiting the owner's verdict

Folder: `round-1/`. Live on the dev server at **`/reboot/?variant=A|B|C|D`** (`npm run reboot`; the arrow keys
and the bottom bar switch). Code: `src/reboot/` (dev-only entry `reboot/index.html`, not a build input, so
nothing ships with the live site). Every picture is a path-traced Blender render (Cycles, AgX) from
`tools/render/r1/`, with real CC0 material scans (`tools/render/textures/README.md`); frames in
`reboot/frames/r1/`. All four are light, as decided; each tries its own colour and typeface. Two are
premium and bold, two deliberately wild (decisions round 1 Q4). Each hero is followed by the same short
page (the four sections, then "Come and see it" with the confirmed sales flow, address and hours), themed
per variant.

| | Concept | True thing it shows | What happens | Phones | Look |
|---|---|---|---|---|---|
| A | **The weight** (premium) | Solid teak, from logs bought whole and sawn in Patidar's own yard | An 8′ × 4′ solid teak door in a quiet white room. You push it: it lags your hand like a heavy thing, keeps its momentum and slows on its hinges. As it opens, the sunlit courtyard behind throws a slab of light across the floor. It gives a little by itself once, so you know it moves. 37 frames, 0–108°. | Portrait frames; swipe right on the picture (vertical swipes still scroll) | Neutral white, oxblood `#6E1F2A`; Gloock + Hanken Grotesk |
| B | **Four materials, one roof** (premium) | Timber, doors, plywood and WPC are sold under one roof | A still life of one offcut of each, stacked like a sculpture: a rough-sawn teak plank, an 18 mm ply sheet showing its layers, a white WPC board, a door corner sample with its core showing. Moving across it turns it (48 orbit frames); each layer carries a label that rides the render and links to its section, so the hero is the navigation. Turns slowly by itself when idle. | A closer portrait camera; drag to turn; the labels give way to a numbered list of the four sections under the headline (four labels collide at phone width) | White studio, vermilion `#E4572E`; Schibsted Grotesk + JetBrains Mono |
| C | **The first cut** (wild) | Logs are bought whole and sawn in Patidar's own yard | A teak log end-on (a photographed log end). A band-saw blade runs its length toward you in a spray of sawdust, comes out through the near face and splits the rings; the halves fall open like a book (bookmatched grain). Then the page itself is sawn: the screen splits along the rendered kerf line and the halves part onto "No middleman between the log and your door." Scroll-scrubbed, 60 frames. | The film plays once by itself when in view; at the end the picture splits on its own; "Play again" | Grey-white, safety yellow `#FFD400`; Unbounded + DM Mono |
| D | **Into the grain** (wild) | What customers come to the store to touch: the grain. Captions: seasoned in Patidar's own yard, logs bought whole, three generations in timber | Opens so close to polished teak that nobody can tell what it is, then pulls back about 175× to a whole door colour-blocked against a lilac wall. A giant live readout says how wide the view is: "2.4 cm across" … "4.2 m across". Ends on "Come and touch it." Scroll-scrubbed, 96 frames. | Plays once by itself; the readout counts up; "Play again" | Lilac, violet `#5B3FD6`; Syne + Instrument Sans + Geist Mono |

Rendering: the RX 9060 XT renders a 1600×900 frame in about 4–20 s at preview quality (48–72 samples).
These are **preview renders** (all frames together: 9.9 MB); the chosen concept gets a full-quality pass
(more frames and samples, a poster, and the phone set re-checked on a real phone).

Checked: arrow keys cycle A → B → C → D with the URL following; no page errors; under reduced motion every
variant drops its scroll track and shows its final frame with all its text; `tsc` and `oxlint` clean; a
production build contains nothing from the prototype.

Files: `A-{desk,phone}-1-hero / -2-pushed / -3-below`, `B-desk-1-hero / -2-turned`,
`B-phone-1-hero / -2-below`, `C-desk-1-start … -5-sawn-page`, `C-phone-1-start / -2-playing / -3-sawn-page`,
`D-desk-1-macro … -4-door`, `D-phone-1-macro / -2-playing / -3-door`.

Verdict: pending (questions in `../decisions.md`).

## Round 0 · the current site (23 Nov 2026) · the baseline, not a prototype

Folder: `round-0-current/`. Live at `/` on `main`, untouched; the reboot works on branch
`creative-reboot`. Captured with headless Chrome against the dev server; in the full-page captures
the scroll reveals are forced visible, and on the home page the hero track is hidden so the rest of
the page reads.

| | What | Idea | Motion |
|---|---|---|---|
| Hero | "Walk right in." | A teak door (Architect Teak) stands close in a dark hall with a drawn brass keyhole on its lock stile. Turn the key or scroll: it swings open, four more doors fly past, and the last opens onto the Door Wall: borrowed photos drifting in 3D, captioned "Every one of these is standing in the store" | One WebGL canvas scrubbed by scroll (380vh track on computers, 340vh on phones), Lenis smooth scroll; the key scrolls the page for you over 3 s; the wall's headline draws itself on |
| Home | Seven bands | 01/02/03 promises ("Three generations of timber", "See it, touch it, then decide", "Factory & showroom, one address") · Choose your world (four arched doorways of timber, door, ply, WPC) · "A few doors we're proud of" (three priced doors) · Our yard → Your home (the middlemen struck through) · four steps to installed · "Nothing is paid online" (₹0 / 50% / Balance) · "The store is open" | Bands fade and rise in on scroll |
| Sections | Timbers · Doors · Ply · WPC | One page template in four colour skins; timber, ply and WPC board shown as generated swatches | Door cards swing open on hover (on touch, when in view) |
| Product | Configurator | The door photo owns the first screen; sliders for height and width to the quarter inch, thickness, back side, frame and hardware; a live, itemised price | The door swings open on hover |

Files: `home-{desk,phone}-1-hero`, `-2-flight`, `-3-wall`, `-4-below-hero`, and a first screen plus a
full page of `/doors`, `/timbers`, `/ply`, `/product/architect-teak-door`, `/shop` and `/visit`
(`<page>-{desk,phone}-{first,full}`).

Verdict: pending (round-1 questions 1 and 2 in `../decisions.md`).
