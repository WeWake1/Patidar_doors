# Prototype history

Every design round, what it tried, and the owner's verdict. Screenshots are 1440 px desktop (1×) and
390 px phone (2×), WebP. Decisions themselves live in [`../decisions.md`](../decisions.md).

## Round 5 · filmed, and something happens (25 Nov 2026) · awaiting the owner's verdict

Folder: `round-5/`. Live at **`/reboot/?variant=Q|R|S|T`** (`npm run reboot` opens it; rounds 1 to 4 stay at
`A-P`). Code: `src/reboot/r5/` (round 4's player, reused); renders `tools/render/r5/`; films `reboot/films/r5/`;
frames `reboot/frames/r5/` (gitignored). The brief, from round 4's verdict: "getting better", another round "for
the same"; the owner could not say what was still short, so this round works from Claude's own reading of round 4:

- **They were filmed like architecture renders, not like films.** A camera glided on rails, everything sharp,
  nothing in the foreground, clean digital frames. So every round-5 film is shot as a crew would: a keyframed
  camera with real motion blur (Cycles, a 0.45 shutter), focus that pulls from near to far, foreground that passes
  the lens out of focus, and a grade at the encode (a little bloom on the highlights, a vignette, film grain).
- **Nothing happened in them.** An Apple hero film has a moment. So the door opens and the camera goes through
  it (R), the rain falls (S), the camera drops out of the sky (T).
- **The places were empty white boxes.** So three films go *inside* round 4's pivot door, into a courtyard house:
  a verandah on teak columns round an open court (an aangan), a brass urli of water and marigolds on a stone
  plinth in the middle, a tree in one corner, and rooms behind doors on three sides (catalogue photographs).

| | Film | What you see |
|---|---|---|
| Q | **Arrival, filmed** | Round 4's M, the owner's favourite direction, shot as a film: it opens on leaves out of focus right in front of the lens, the focus pulls to the pivot door at the end of the striped court, and the camera pushes slowly in past the plant. "Make an entrance." |
| R | **Come in** | The same court in its morning sun. The camera walks up it; the 3.3 m pivot door swings open on its pivot as it comes; and the camera goes on through the doorway into the courtyard: the urli of marigolds in the sun, teak columns, the tree, a carved door across the court on the axis, more doors either side. "Come in." |
| S | **Monsoon** | The courtyard in the rain on a silver afternoon: rain falling straight into the open court, the stone wet and dark, the urli stirred, warm lamps washing the doors in the dry verandah. The camera tracks along the verandah behind its columns, which pass in front of it, and settles on the carved door. "Come in from the rain." |
| T | **Courtyard** | It opens straight down on the courtyard from above the roofs (the urli a circle in the middle of the square, the tree's crown in the corner), then cranes down into it and tilts up as it comes, landing low beside the urli: marigolds soft in front, the carved door sharp across the court. "A door for every room." |

What went wrong first, so it isn't tried again:
- **A haze for visible sun shafts** (Q's first idea): a thin volume over the court greyed the whole picture, and
  the beams only showed when looking into the sun, with the door in shadow. Dropped.
- **R's first version had the sun low behind the house**, so it would pour through the door as it opened: the
  beam was faint, it landed metres from the door, and the whole court sat in a flat beige shade. Replaced by the
  bright morning and the walk through the door.
- **S was first the outer court in rain** with particle drops: grey, flat, the rain invisible (a raindrop is under
  a pixel wide). The rain that works is a field of thin streaks falling as one object, lengthened by the motion
  blur and lit against the dark verandah.
- **Marigolds**: bumpy spheres read as oranges, then as biscuits; each head is now built petal by petal, eight
  rings of them. Bright saturated orange shifts to salmon under the AgX view, so the petal colours are set deeper
  than they look.
- **The urli's water** was a black mirror (round 4's rill material); it is clear water now, so the brass shows
  through it.
- **The grade turned magenta** when ffmpeg blended in YUV; it blends in RGB (`format=gbrp`) first.

Rendering: 144 frames (computers, 1600 × 900) and 120 (phones, 900 × 1600) per film at 128 samples with motion
blur and depth of field, then graded and encoded by ffmpeg (H.264, crf 21, `+faststart`; the posters are the first
and last graded frames). The grade:
`format=gbrp,split[a][b];[b]curves=all='0/0 0.75/0 1/1',gblur=sigma=22[g];[a][g]blend=all_mode=screen:all_opacity=0.28,vignette=angle=PI/7,noise=alls=4:allf=t`.
New CC0 models for the courtyard: `island_tree_02`, `shrub_02`, `shrub_04`, `planter_pot_clay` (Poly Haven); the
urli, the plinth, the marigolds and the rain are built in the scripts. About 25 to 40 minutes per film and size on
this machine (R and T, with the tree, are the slowest). The eight films are 26 MB together (round 4's were 14 MB):
grain and rain cost bitrate, and S is the largest at 4.8 MB on computers. The stills they are encoded from
(`reboot/frames/r5/`, 95 MB) are gitignored.

**A render can stop early without an error.** Q's computer render quit at frame 110 of 144 with nothing in the
log, and the film was encoded from what was there (4.6 s, not 6). The missing frames were rendered again
(`--frames 110-143`) and the film re-encoded; every film was then checked for its full count with `ffprobe
-count_frames` (144 on computers, 120 on phones). Check the count before judging a film's ending.

The page is round 4's, with one fix (`src/reboot/r5/r5.css`): on the bright films the sub-line in grey vanished
into the sunlit wall behind it, so it is in full ink, and on computers the left of the frame carries a soft light
wash (the light film's version of round 4's dark scrim). S is the one dark film (white words, the dark scrim).

Checked:
- Switching: `/reboot/` opens Q; the arrows cycle Q → R → S → T; the round label reaches rounds 1 to 4; old links
  (`?variant=B`, `?round=1`) still open what they opened. No page errors on any of the four, computer or phone.
- All eight films autoplay muted and inline in Chrome, run their full length (6 s on computers, 5 s on phones) and
  hold the last frame with "Play again". Reduced motion: the last frame, still, no running animation.
- Phones (390 × 844): the words in a band above the film, light for Q, R and T, dark for S.
- `tsc` and `oxlint` clean.

Files: `Q-{desk,phone}-*`, `R-*`, `S-*`, `T-*` (the start, the moments that matter, the end).

## Round 4 · four cinematic films that play by themselves (24 Nov 2026) · verdict: getting better; another round

Folder: `round-4/`. Live at **`/reboot/?variant=M|N|O|P`** (`npm run reboot` opens it). Code: `src/reboot/r4/`;
renders `tools/render/r4/`; films `reboot/films/r4/` (MP4, H.264, 24 fps, 6 s on computers, 5 s on phones, plus a
first and last frame for the poster), frames `reboot/frames/r4/`. The brief, from round 3's verdict: "Arrival" was
"really nice" but not there yet; push it on all four counts (more photoreal detail, a more cinematic camera,
grander architecture, a better page around it), explore every direction "and more", Blender only ("much more
premium and real"), and **the film plays by itself**, like an Apple hero video, the same on computers and phones.

| | Film | What you see |
|---|---|---|
| M | **Arrival II** | Round 3's court made grander: six metres tall, deeper fins and bolder stripes, a 3.3 m teak pivot door in a teak-lined portal beside a warmly lit frosted panel, a still rill along the path mirroring the striped walls, bigger plants. The camera starts high at the court's mouth, cranes down to eye level and glides in to the door. "The first thing they see." |
| N | **Nightfall** | The whole house at blue hour: a modern white house with its upper floor cantilevered over the entrance, the living room glowing through floor-to-ceiling glass, a stone wall grazed by uplights, the door lit under the overhang, lawn and slab path. A slow arc from the street that settles on the door. "Coming home." |
| O | **The hall** | Inside: a bright double-height hall, four catalogue doors in slim teak frames along one wall, a teak bench, plants; morning sun through a glass wall lays the mullions' lines across the doors. The camera tracks slowly along them. "Every door in the house." |
| P | **Late light** | A calm living room in the late afternoon: white walls, herringbone oak, a sofa, a lounge chair, a round table; the window's light falls in long shapes across the wall and a teak door. A slow push across the room. "At home in the light." |

The page: the film edge to edge; the headline arrives a beat after it starts; it plays once and holds its last
frame, with a quiet "Play again". On phones the words sit in a band above the film (over it they landed on the
door by the last frame). Reduced motion: the last frame, still.

What went wrong first, so it isn't tried again: a sandstone wall read as cheap brick, a light-well canopy put the
whole court in shadow, and a pool read as flat blue tiles (M's first build); the dusk sky HDRI at strength read as
hazy daylight, so N's sky is a drawn blue-hour gradient; glass blocks the sun when caustics are off, so every
window lets light rays through while the camera still sees glass; golden hour turned the whole living room brown,
so P is gentler late-afternoon light on white walls.

Rendering: 144 frames (computers, 1600 × 900) and 120 (phones, 900 × 1600) per film at 128 samples, about 10 to
15 s a frame, encoded with ffmpeg (H.264, crf 21, `+faststart`): 14 MB for all eight films. M was rendered twice
(its frosted sidelight first read blue: the glow sat inside the wall behind it). The stills the films are encoded
from (`reboot/frames/r4/`, 83 MB) are gitignored.

Checked:
- Switching: `/reboot/` opens M; the arrows cycle M → N → O → P; the round label reaches rounds 1 to 3; old links
  still open what they opened. No page errors on any of the four, computer or phone.
- The films autoplay muted and inline in Chrome on a computer and on a phone, play once (6 s), hold the last frame
  and offer "Play again". Reduced motion: the last frame, still, no animation.
- Phones (390 × 844): the words in a band above the film. On computers, the dark film (N) shades the left of the
  frame under the words, because the camera's arc brings the lit living room behind them.
- `tsc` and `oxlint` clean.

Files: `M-{desk,phone}-*`, `N-*`, `O-*`, `P-*` (start, the middle of the move, the end).

## Round 3 · four calm, photoreal heroes (23 Nov 2026) · verdict: better; Arrival really nice

Folder: `round-3/`. Live at **`/reboot/?variant=I|J|K|L`** (`npm run reboot` opens it; the round label in the bar
reaches rounds 1 and 2, kept as judged). Code: `src/reboot/r3/`; renders `tools/render/r3/`; frames
`reboot/frames/r3/`. The brief, from the owner's diagnosis of round 2: **no tricks or jokes; G's calm premium look
and its realistic room and light; an Apple-style wow at first sight with smooth cinematic motion; live 3D in one
or two, to compare with Blender renders.** So all four share G's look (warm white, Gloock, Hanken Grotesk, ink),
every scene is daylight and white, and the door faces are the catalogue's photographs throughout.

| | Concept | What happens | Phones | Made with |
|---|---|---|---|---|
| I | **Arrival** | A white entrance court in morning sun: the pergola's fins lay diagonal stripes across the walls, the pale floor and the door; plants in low planters; a teak main door in a teak-lined portal at the back. The camera glides from the drive, through the opening, up the steps, to the door. "The first thing they see." | Plays once by itself, then "Play again" | Blender film, 96 frames (60 on phones); computers: the scroll drives it |
| J | **Pavilion** | Twelve catalogue doors on low plinths along the aisle of an open white pavilion; a real-time sun through its fins stripes the floor and the doors; the camera drifts down the aisle and back by itself. The door you face is named; a tap opens its page. "Doors, in daylight." | Drag sideways to look around | **Live 3D** (three.js): photographs on 3D slabs, real-time shadows |
| K | **Object** | One door presented like an Apple product in a white studio: it turns from three-quarters to face you, the camera comes close to show its edge, then six more rise beside it into a lineup. "Made to measure." | Plays once by itself (9.5 s), then "Play again" | **Live 3D** (three.js); computers: the scroll drives it |
| L | **One room** | A calm room in morning sun (white walls, oak floor, an armchair, a side table, a plant); the camera pushes in and drifts back, very slowly, all the time. The door in the room changes every few seconds, a crossfade in the room's own light, or pick one from the row along the bottom. "The door makes the room." | The same | Blender plate (48 frames, blended so the push is smooth) + the photo warped into the render's blank door and lit by it (G's method) |

How they are made:
- Photorealism came from real CC0 assets this round (`tools/render/assets/README.md`): scanned plants and
  furniture, plaster, concrete and oak scans, Blender's physical sky, and `tools/render/r3/kit3.py` (scan
  materials in real metres, glTF models, a door whose face is a catalogue photograph and whose edges are wood).
- I was first lit as a stone court at blue hour (`r3/dusk.py`): it read dark, orange and brown, the palette the
  owner hates, so it moved to white plaster in morning sun. A photographer's white balance is imitated by lighting
  the court with a warm neutral while the camera still sees the blue sky.
- J and K share `doors3d.ts`: AgX tone mapping, soft shadows, studio reflections, contact shadows, and the door
  slab built from the photo. three.js loads only inside this dev-only page.

Rendering: I's film 96 + 60 frames at 128 samples, about 12 s a frame; L's room 48 plates + face masks per device
at 160 samples. Both were rendered twice: I first with grey plaster (the scan's own colour reads as concrete), then
with clean white walls and a pale microcement floor; L first with a black lever of its own, which sat on top of
every photograph's handle, then without. Frames in `reboot/frames/r3/`: 9.7 MB.

Checked:
- Switching: `/reboot/` opens I; the arrows cycle I → J → K → L; the round label reaches rounds 1 and 2; old links
  still open what they opened. No page errors on any of the four, computer or phone.
- Reduced motion: nothing animates; I shows its last frame and K its lineup, and neither keeps its scroll track.
- Phones (390 × 844): titles above the pictures (over them they could not be read); I and K play once by
  themselves and offer "Play again"; J drags to look; L's thumbnails are 44 × 88 px targets.
- `tsc` and `oxlint` clean; a production build contains nothing from the prototype (three.js stays out of it).

Files: `I-{desk,phone}-*` (start, in the court, at the door), `J-{desk,phone}-*`, `K-{desk,phone}-*` (start,
front, the edge, the lineup), `L-{desk,phone}-*` (a door, the next door, one picked).

## Round 2 · four more hero concepts (23 Nov 2026) · verdict: all bad, G the least

Folder: `round-2/`. Live at **`/reboot/?variant=E|F|G|H`** (`npm run reboot` opens it; the arrow keys and the
bottom bar switch within the round, the "Round 2" label jumps to round 1, which is kept exactly as judged). Code:
`src/reboot/r2/`; renders `tools/render/r2/`, frames `reboot/frames/r2/`. The brief for this round: round 1 was
"good enough, but none of them are up to the mark of being a hero page", so four new ideas, "more unique and
cool", none of them a scrubbed film of one object again, and none of them anything Pallet Euro has done (its
rounds 4 to 7 used the cursor carrying the sun, moving dappled shade and a slab carved away to reveal the object,
so those were dropped here). Every look is one the owner liked in round 1, recombined. Each idea is a different
gesture: tap, scroll, tap/swipe, type.

| | Concept | True thing it shows | What happens | Phones | Look |
|---|---|---|---|---|---|
| E | **Knock** (wild) | The four things sold, one confirmed fact each: door leaves pressed and finished in Patidar's own factory; logs bought whole, sawn in its own yard and seasoned against warping; everything made to measure; WPC doors don't swell | The screen is a teak door, close. "Knock." You tap it: a knock sounds, a ring runs out through the grain from your knuckle (stretched along the grain, as sound travels in wood) and the picture shudders. Every knock after the first carries the next material in on its ring: a teak log end on, a stack of plywood, a WPC door. The fifth brings the door back: "You can't knock on a website. Come and knock on the real ones." | The same: it is a tap. The words go dark on the pale ply and WPC | Lilac, violet; Syne + Instrument Sans + Geist Mono (D's) |
| F | **Actual size** (wild, deadpan) | Everything is made to measure; a door is eight feet of wood, and a phone shows a sliver of it | "This is a door at actual size." An eight-foot teak door laid down the page in the screen's own millimetres: scrolling down it takes as long as a door is tall (about 15 phone screens). A yellow tape runs down the edge (inches, feet in red), deadpan captions sit at their real heights ("The handle, at actual size. It's wider than your screen."), a small map shows where on the door you are. Ends: "That was one door." | Nothing moves by itself: it is a tall picture and plain scrolling. Browsers don't say how big a pixel is, so the scale is guessed per kind of device and "Not actual size?" matches a bank card | White, safety yellow; Unbounded + DM Mono (C's) |
| G | **Next door** (premium, the range) | The doors themselves, which round 1 never showed | Twelve catalogue doors lean in a stack against a pale wall, fanned. Tap and the front one is pulled forward and laid down out of the picture (a soft thump); the stack settles and the next door stands in front, its name linking to its page. Swipe right brings one back | Tap or swipe; it pulls one door by itself once, as a hint; the words sit above the stack | White room, vermilion (B's colour); Gloock + Hanken Grotesk (A's type) |
| H | **Your name here** (premium, personal) | Everything is made to measure, so each door is made for one doorway | A teak main door at eye level with a brass nameplate. Type your family's name and it is engraved into the plate as you type (black enamel letters, their cut edges lit by the render's own light; serif or capitals); then "Send it to the family" shares the picture, with the store's name and landmark on it, through WhatsApp | The picture above the field; focusing the field brings the plate into view above the keyboard | White, oxblood; Gloock + Instrument Sans (A's colour) |

How they are made:
- **E** (`knock.py`, four stills per device): the page draws them in WebGL and adds only the ring and the change
  of material (`ripple.ts`). The knocks are **synthesised** (`knockAudio.ts`: a knuckle's noise ringing each
  material's resonances, in a small room), checked as spectrograms and levels, not by ear. The final site should
  use recordings of the store's own doors, a phone and ten minutes. Sound is silent until the first tap and has an
  off switch.
- **F** (`actual.py`): an orthographic, square-on render in 200 mm bands at 12 px/mm (phones) and 7 px/mm
  (computers), from the 8K teak scan, so the grain holds up at 1:1. The tape, captions and map are page elements.
- **G** (`flip.py`, 36 frames per device): the doors' faces are rendered blank white, with a face mask and each
  face's corners per frame. The page warps a catalogue photograph into each face and multiplies it by the
  render's light (`stackGl.ts`), so the photos carry the window, the shadows and the falling door's shade. The
  products stay photographs (round 1 Q8), and when the real photos arrive the hero has them with no re-render. The
  12 used are the leaf cut-outs that are clean and door-shaped (three carry someone else's watermark or are a
  group shot, two are not one door); **all are still the placeholders found online**.
- **H** (`nameplate.py`): the door twice from the same camera, the plate brushed brass and the plate as black
  enamel. The page cuts the letters out of the second and draws each letter's lit and shaded wall (`engrave.ts`).
  The name never leaves the device.

Rendering (RX 9060 XT, shared with another project's renders that afternoon): E's eight stills about 45 s each
at 256 samples; H's four about a minute; G's 72 frames 8 to 25 s each at 128 samples, plus two quick flat mask
renders per frame; F's 30 bands 25 to 50 s each. Frames in `reboot/frames/r2/`: 14 MB in all, 12 MB of it F's
true-scale bands (loaded a band at a time as you scroll); E 0.9 MB, G 1.7 MB, H 0.3 MB. Every render path is
now checked: `common.py` refuses to write anywhere but the repo and the temp folder.

Checked:
- Switching: `/reboot/` opens E; the arrows cycle E → F → G → H within round 2; the "Round 2" label opens round 1,
  where the arrows cycle A to D; old links (`?variant=B`) and `?round=1` still open round 1. No page errors.
- Reduced motion: no animation runs on any of the four (E's ring and shudder off, a knock cuts straight to the
  next material; G's door cuts to the next without the fall and never moves by itself); every word is on the page.
- Phones (390 × 844): E's headline fits; on touch a knock fires on a tap, never on the start of a scroll. F's
  first screen has the top of the door in it. G's first screen holds the doors, the headline, the door's name
  and the controls. On H, focusing the name field brings the plate above the keyboard.
- E's knocks rendered offline in Chrome and measured: the energy is in the 300 Hz to 2 kHz "tock" (centroids
  about 340 to 530 Hz, where a phone's speaker can play them), each dies in 100 to 200 ms, ply rings longest,
  WPC is highest and shortest, all within about 4 dB of each other.
- H's picture: on a computer "Save the picture" downloads a 1080 × 1350 JPEG with the name engraved and a strip
  saying "Patidar Doors · Doors made to measure · Opposite IKEA, Nagasandra, Bengaluru"; on a phone it opens the
  share sheet (WhatsApp), falling back to a download.
- G's frames: the face masks are repacked as lossless WebP without Blender's dither
  (`tools/render/r2/pack-masks.mjs`): the whole set went from 72 MB to 1.7 MB.
- `tsc` and `oxlint` clean; a production build contains nothing from the prototype.

Verdict (23 Nov 2026): "all of them are really bad". G was "kinda decent" for its calm premium look and its realistic room and light, still not a hero; the others were gimmicky and not premium or real enough. The owner wants an Apple-style hero: a big cinematic visual and smooth motion, calm, photoreal. Kept at `?variant=E-H`.

Files: `E-{desk,phone}-*` (start, a knock, timber arriving on the ring, ply or WPC, the finale), `F-{desk,phone}-*`
(top, seven feet, the handle, the floor), `G-{desk,phone}-*` (start, pulled forward, the next door),
`H-{desk,phone}-*` (blank plate, a name).

## Round 1 · four hero concepts (23 Nov 2026) · verdict: none is a hero

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

Verdict (23 Nov 2026): "good enough, but none of them are up to the mark of being a hero page." Parts may come
back elsewhere on the site, not as the hero. Kept as it is at `/reboot/?variant=A-D`. Colours: all four liked;
typefaces: all liked except B's (Schibsted Grotesk).

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
