# Creative reboot brief: Patidar Doors

I'm building this site for my client, Patidar Doors (the D2C brand of Patidar Timbers). The current site works and is decent, but I want it to become something unique and memorable: premium, crafted, the kind of site people send to each other. Not a template with nicer colours.

I'm doing the same thing on another, unrelated project of mine, the Pallet Euro Packaging website at `/Users/wewake/Pallet Euro/PE website`. I like how that one is going: we try many genuinely different ideas, the hero and scroll moments are photoreal Blender renders played back as image frames, and Claude asks me at every decision so we work it out together. I want the same process and the same level of ambition here.

**Borrow that project's process and techniques. Never borrow its content, look or concepts.** It sells pallets; this site sells doors, timber, ply and WPC. The ideas have to come from Patidar's own products.

## 1. How we work

1. **Ask me at every decision.** Don't guess at anything that's mine or the client's to decide. On Pallet Euro, Claude misread one ambiguous line of the brief as "dark theme" and built three full prototypes I rejected outright: a whole round wasted on a guess. If the brief is ambiguous, ask.
2. **Use the grilling format.** Questions come in rounds, numbered, each with your recommended answer, worded so that "yes" accepts it. Only ask what you can ask now, without depending on an answer you don't have yet. Copy the skills from the other project into this repo first:
   ```
   mkdir -p .claude/skills
   cp -R "/Users/wewake/Pallet Euro/PE website/.claude/skills/grilling" \
         "/Users/wewake/Pallet Euro/PE website/.claude/skills/prototype" \
         "/Users/wewake/Pallet Euro/PE website/.claude/skills/karpathy-guidelines" .claude/skills/
   ```
3. **Facts are your job, decisions are mine.** Look things up yourself (the codebase, the web, subagents). Don't ask me anything you could find out.
4. **Keep a decisions log** at `docs/decisions.md`, newest first: a table of `# | Question | Answer` per session, then the open questions. Log every answer the same day. Never re-ask anything that's answered there. Keep a "Rejected, never repeat" section describing what was tried and why it failed. See `/Users/wewake/Pallet Euro/PE website/docs/decisions.md` for the shape.
5. **Show visual and motion choices, don't describe them.** Every visual decision is a working prototype: three radically different variants on one route, switched with `?variant=A|B|C`, arrow keys and a small floating switcher (the `prototype` skill). Three tints of one idea don't count. Prototype code is clearly marked PROTOTYPE, lives on its own route, and leaves the live site alone until I pick something.
6. **Work in rounds, and archive each one.** After each round, save screenshots (1440 px desktop, 390 px phone) to `docs/prototypes/round-N/`, and add a row to `docs/prototypes/README.md`: each variant, its idea, its motion, and my verdict. Keep the old rounds viewable on their own routes. When I reject a variant but like one part of it, carry that part forward. On Pallet Euro a rejected hero idea came back as a scroll section after the hero, and it's one of the best parts of the site now.
7. **Never invent facts.** No made-up numbers, prices, clients, testimonials, years or awards. Use visible placeholders like `{{years_in_business}}`. Note that the current product copy and the prices in `docs/design-research.md` were drafted by AI and are unconfirmed. Flag anything like that and don't build on it as if it were true.

## 2. The creative bar

- **Every big idea starts from something true about the product,** turned into a picture or a motion. The Pallet Euro concepts (all mine, don't reuse them) worked because each one showed a real fact:
  - "Europe's standard, made in India": the pallet in a pale stone room, Indian jaali sunlight falling across it, with the cursor moving the sun.
  - "Built to an exact spec": the pallet's 20 parts hang on wires at different depths and line up into the pallet from one viewpoint only.
  - "78 nails, each in a set place": a lens follows the cursor and shows the pallet as an X-ray with every nail.
  - "The mark is branded in": a scroll film where a hot steel head brands the mark into the wood, it smokes and cools, and the camera flies under the deck.
  Find Patidar's equivalents: the timber, the grain, the weight of a solid door, the craft, the factory, the store, how a door feels to open. Pitch ideas that only a door and timber company could own.
- **Rich, premium motion.** The life comes from renders and animation, not stock video.
- **Avoid AI slop:** glow, aurora or beam backgrounds, radial halos, gradient or shiny text, the 3-column icon-title-text feature grid, icons in coloured circles, bento grids, nested cards, logo marquees, hero "eyebrow" chips, three big numbers with tiny labels, frosted glass everywhere, one bubbly radius on everything, gradient buttons, stock-photo heroes, generic copy ("Welcome to", "Unlock", "world class", "cutting edge", "seamless"), fake testimonials, avatars, star ratings.
- **Theme, colour and typeface are questions for round 1,** not assumptions. The current site has four themed worlds and a cream/deep palette. Ask what stays.
- Use reactbits / 21st.dev components only when they do a real job.

## 3. The technique: photoreal Blender films

**Why:** on Pallet Euro, live WebGL (three.js wood, a 3D container) looked fake and cheap to me. Photoreal path-traced renders, played back as image frames, looked real. So anything visitors look at is a Blender render. Live 3D is only for something like "drag to rotate" on a product page, loaded on tap. Ask before using any live 3D here.

**Pipeline** (read the reference files below for the details):
- Blender is installed at `/Applications/Blender.app`. Run it headless from Python scene scripts kept in the repo (`tools/render/`):
  `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/render/<scene>.py -- --out <dir> --size 1600x900 [--frames 0-167] [--test]`
- Use one shared `common.py` (Cycles on the Metal GPU, AgX view transform, denoising, a camera helper, a frame loop that writes WebP at about quality 80), plus one script per scene. A `--test` flag renders at quarter size with few samples. Look at the test frames, and show me stills, before spending hours on a full render.
- Build a reusable **door builder** (the Pallet Euro equivalent is `palletkit.py`): real geometry from real measurements, plus real materials (teak, veneers, laminates, brass, glass). Ask me for dimensions, real product photos and finish references. Never use the watermarked photos listed in `src/data/photoMap.ts`.
- Render two frame sets per film: computers at 1600×900, about 150–170 frames (about 4–5 MB), and phones with about half the frames at a smaller size (about 1 MB).

**Playback:**
- Draw the frames to a `<canvas>`, cropped to a focus point, and start loading them only when the section gets near the viewport (an IntersectionObserver with a large rootMargin).
- **Computers:** the section is pinned and the scroll position picks the frame, eased a little so a flick glides. Captions fade in and out over set ranges of the film.
- **Phones:** ask whether scroll-driven motion is OK (see section 4). On Pallet Euro it isn't, so the film plays once by itself when it's mostly in view, holds the last frame, and has a "Play again" button.
- **`prefers-reduced-motion`:** show the last frame and every caption. Nothing moves.
- **No JS:** a poster `<img>` (the last frame) with real alt text. All captions are real HTML text.
- Cursor-driven hero frames work too. For example, 48 frames where the cursor position picks the frame (moving the sun, opening a door); on touch devices they drift slowly or follow a drag.

**Reference code** (read it for the technique, don't copy its content):
- `/Users/wewake/Pallet Euro/PE website/tools/render/hero/common.py`: render setup and frame loop
- `/Users/wewake/Pallet Euro/PE website/tools/render/hero/mark.py`: a full scroll film, one continuous shot planned frame by frame
- `/Users/wewake/Pallet Euro/PE website/tools/render/palletkit.py`: the product builder and materials
- `/Users/wewake/Pallet Euro/PE website/src/components/proto/r5/film.ts`, `seq.ts`, `Film.astro`: the frame player (scroll on computers, play once on phones)
- `/Users/wewake/Pallet Euro/PE website/docs/prototypes/README.md`: how each round was written up

## 4. Phones, speed and SEO

- This site is browsed mostly on phones (see `CLAUDE.md`). Keep the mobile-first rules already listed there.
- On Pallet Euro I rejected scroll-driven or pinned animation on phones, Lenis smooth scroll and dot-grid backgrounds, and I target Lighthouse mobile 99–100. **This site currently uses Lenis and a scroll-driven portal hero on phones.** Ask me in round 1 which of the Pallet Euro rules apply here. Don't assume either way.
- The site is a client-rendered Vite SPA, so the text isn't in the static HTML, which hurts SEO (local search matters for a store that wants footfall). Ask me whether to prerender or move to a static setup. Pallet Euro uses Astro with React islands. Don't migrate anything without a yes.

## 5. Guardrails for this repo

- Work on a new branch (for example `creative-reboot`). Don't commit to main, push or deploy (Vercel) unless I say so.
- Leave the live site, the `/admin` CMS, Supabase and the catalogue scripts working. Keep `npm run verify:e2e` green for anything that touches the live site.
- Follow the gotchas in `CLAUDE.md` (Safari sizing, `100dvh`, scroll lock, hover inside `@media (hover: hover)`, etc.).
- Already used on Pallet Euro, so don't reuse them without asking: pallets and EPAL, the jaali-sunlight room, the anamorphic gallery, the X-ray lens, the branding film, the shipping container, deep blue as the brand colour, the Urbanist typeface. If one of these really suits doors (a jaali door throwing its pattern, say), pitch it as a question.

## 6. First steps

1. Read `CLAUDE.md`, `README.md`, `docs/`, your memory for this project, and the code. Open the current site in a browser at desktop and phone width, and screenshot it into `docs/prototypes/round-0-current/`.
2. Read the Pallet Euro references above (process and technique only).
3. Copy the three skills into `.claude/skills/` and create `docs/decisions.md`.
4. **Ask round 1 of questions. No code yet.** Cover at least these:
   - what to keep from the current site
   - what the client thinks of it and what they want
   - who the buyer is
   - light or dark, brand colour and typeface
   - reference sites I or the client like
   - how far to go: hero only, home page, or the whole site
   - whether photoreal Blender films are OK, and which product(s) should star in them
   - what real photos, measurements and facts exist
   - the phone motion rules (section 4)
   - stack and SEO
   - timeline
5. After my answers, build round 1: three radically different hero concepts, each built on something true about Patidar, at least one of them a Blender film. Put them on a prototype route with the `?variant=` switcher, then ask me for a verdict.
