# Live AR — Phase 2

Status: **WebXR AR shipped 2026-08-17, Android only.** See §8 for what was built.

This document began as a costing of the one line `CLAUDE.md` used to carry ("live AR is
Phase 2"). Its analysis is kept below because it is still the reason the feature is shaped
the way it is — Android-only, hand-written WebGL, and invisible where it cannot run.

**The recommendation in §6 was not followed, deliberately and with the trade understood.**
The owner's call was to ship the WebXR path anyway rather than stop at the cheaper rungs.
What follows in §1–§7 is the original assessment, unedited; §8 records what was actually
built and what it cost.

---

## 0. The blocker that comes first

```
$ grep -c isLeafCrop src/data/catalog.gen.ts
0
```

`tryState()` returns `ready` for the 12 drawn Designer Studio doors and `soon` for all 17
photographed ones, because none of them have been re-cropped through the leaf cropper that
shipped on 2026-08-17. The cropper exists; it has not been run.

**17 of 29 doors in scope cannot be placed in a doorway at all today.** Building a second,
harder way to place a door before that is fixed is putting a new front door on a house with
no rooms behind it. This is an afternoon in `/admin`, not an engineering task, and it should
happen before any of what follows.

---

## 1. Why "WebXR" is not the answer

**Safari on iOS still does not implement the WebXR Device API in 2026** — no `immersive-ar`,
no `immersive-vr`, no ARKit through the browser, and Apple has never announced a timeline.
Even on visionOS, where Safari does expose WebXR, the Augmented Reality Module is off. There
is no version of "we ship WebXR and iPhones get it".

On Android, `immersive-ar` works in Chrome but is gated on **ARCore device support**, which
is exactly where a mid-range Android — the visitor `useDecorativeChunk.ts` is written
around — falls off the list. So the honest coverage estimate for a WebXR build is *some
fraction of the Android half*, and the fraction is worst precisely for the phones this site
is designed for.

⚠️ It would also cost the hero. `three` currently has **exactly one importer**, which is
why it lives wholly inside `Beams-*.js`; a WebXR scene is a second importer, Rollup hoists a
vendor chunk, and what the home page fetches changes. A 230 kB gz dependency added to a
feature reachable from a PDP button, to serve a minority of one platform, is the wrong trade
twice over.

**Decision: no WebXR, no `three`, no ARCore. Not "later" — this path is closed.**

The alternatives are worth naming so nobody re-opens them:

| Rejected | Why |
| --- | --- |
| WebXR `immersive-ar` | No iOS at all; ARCore-gated on Android; drags `three` out of the Beams chunk. |
| AR Quick Look (USDZ) | iOS-only, needs a USDZ per door per finish, hands off to a native viewer we cannot brand, compose or screenshot — and the shareable picture is the entire point. |
| 8th Wall / Zappar | WASM SLAM that does work cross-platform, but it is a paid per-view SaaS and ~2–4 MB. A footfall-driving showcase cannot carry a per-impression cost. |
| OpenCV.js | 1.5–8 MB. Already disqualified in `quadGuess.ts` on exactly these grounds; nothing has changed. |

---

## 2. The real technical wall is tracking, not the camera

Getting a live camera onto the screen is easy. Keeping the door *stuck to the doorway while
the phone moves* is the entire problem, and without ARKit/ARCore we would be writing the
tracker ourselves.

Two things make it harder here than the generic case:

1. **A door leaf is the worst possible tracking target.** A flat painted or veneered leaf is
   a low-texture region by design. There is nothing on it to track. Any real tracker has to
   lock onto the *surround* — architrave, skirting, floor line, wall texture, light switch —
   and ride the door quad on the wall plane's homography. That is a different and larger
   piece of work than "track the thing the user outlined".

2. **This repo has already written down the standard for guessing.** From `quadGuess.ts`:

   > A detector that is right 60% of the time is worse than none — the user has to notice it
   > is wrong before they can undo it.

   A tracker that holds lock in a bright hallway and slides off in the evening fails that
   bar in the most visible way possible: the customer watches the door detach from the wall
   and float. Phase 1's still composite never does that.

---

## 3. What "live" actually buys, audited honestly

The business goal is footfall to the Nagasandra store, and the artifact that drives it is
the WhatsApp picture. Against that:

| Reason to want AR | Does live actually help? |
| --- | --- |
| See it at true scale, in place | **No** — Phase 1 already does this, and does it *better*, because a still frame is stable and shareable. |
| Walk around it | **No.** A door is planar and against a wall. There is no other side. |
| Try several designs quickly | **Yes, but** this is a Phase 1 UX gap, not an AR one. The leaf stays vector under an unchanged `matrix3d`, so switching design or finish on a placed door is already nearly free — it just isn't offered in the result view. |
| Confidence about size | **No** — `rectify.ts` already turns the outline into inches, and it is *more* accurate in width than ARCore. |
| Framing the shot well | **Yes.** This is the one genuine, unserved win, and it is upstream of everything: `rectifyAspect`'s accuracy is dominated by how square-on the photo was, and today we ask for that in *words* (`try.pick.hint`). |

That audit is why the plan below is a ladder rather than a single build. Rung one captures
most of the value for a few hundred lines; rung three is a CV project that should only start
if evidence demands it.

---

## 4. The ladder

### 2a — Live viewfinder, freeze to the existing flow · **recommended, build this**

Replace the "Take a photo" file input with an in-page camera: a live `<video>` with the door
guide drawn over it, a shutter, and a freeze that hands the existing pipeline exactly what it
already eats.

- `getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } } })`
- Draw the frozen frame to a canvas capped at `MAX_EDGE`, and return a `LoadedPhoto`. **This
  is the whole integration** — it joins the existing code at `onPick`'s output, so the place
  step, `quadGuess`, `rectifyAspect`, grading, compose and share are untouched.
- Draw two upright guides over the live view: "step back until both sides of your door are
  inside the guides." That is the framing win, and it feeds the measurement.

New file: `src/lib/cameraCapture.ts` (~150 lines, zero dependencies, zero library bytes).

⚠️ `playsinline` + `muted` + `autoplay` on the `<video>` are mandatory, not stylistic — iOS
Safari hands the stream to the native fullscreen player without `playsinline` and the overlay
guides vanish with it.

⚠️ Secure context only. `localhost` counts, so `npm run dev` works; the deployed origin is
already HTTPS.

⚠️ Every rejection path falls back to the existing file input rather than dead-ending —
`NotAllowedError` (declined), `NotFoundError` (no camera), `NotReadableError` (Android, camera
held by another app). Three codes, three strings, same shape as `PhotoErrorCode`. This is the
"nothing fails to a blank rectangle" rule applied to a permission prompt.

⚠️ Keep `capture="environment"` on nothing new. The existing note stands: half of visitors are
trying a door they photographed yesterday, and the counter staff work from photos customers
sent on WhatsApp. The live camera is an *addition* to the picker, never a replacement for it.

### 2b — Held-still live preview · **cheap, honest, no tracker**

Composite the door over the live video while the phone is still, and admit it when it isn't.

- Motion is detected by frame-difference energy on a 120px grayscale downscale — ~2 ms, and
  crucially **no permission prompt**. (`DeviceOrientationEvent` would also work but needs
  `requestPermission()` from a gesture on iOS 13+, which buys a second dialog for nothing.)
- Still → the door sits in place. Moving → it fades to a wireframe outline and says "hold
  still". It never claims to track, so it can never be caught lying.
- Shares the whole geometry path with 2a; the increment is one rAF loop and a threshold.

This is what most people actually picture when they say "live AR", delivered without a
tracker, and it degrades to 2a on any device where the loop can't keep up.

### 2c — Tracked plane preview · **only on evidence**

The real thing: the door stays stuck to the doorway as the phone moves.

- Sparse pyramidal Lucas–Kanade on ~40 features in an **annulus around** the quad (never
  inside it — see §2), 3 levels, 240px working resolution.
- Per frame, fit the wall plane's homography from the tracked correspondences under RANSAC,
  and compose it with the placement homography. **`solveHomography` is already the exact
  4-point minimal solver RANSAC needs** — the 8×8 Gauss–Jordan in `homography.ts` is the
  kernel, unchanged.
- Main thread does `drawImage(video)` → `getImageData` on a small canvas (~1–2 ms) and
  transfers the array to a Worker. Not `ImageCapture.grabFrame` (Chromium-only) and not
  `OffscreenCanvas` from a `video` (Safari friction) — the portable path is the boring one.
- Budget ~8–12 ms/frame on a mid-range Android. That is feasible at 30 fps and it is also
  the same main thread the hero already fought for twice (the beams' `beamsLive` gate, the
  DriftWall rAF). Losing lock parks it at 2b's behaviour, which is the whole reason 2b is
  built first.
- Still zero dependencies. Still never OpenCV.

Estimate: **weeks, not days**, and it is a genuine computer-vision project with a real chance
of ending at "good in a showroom, unreliable in a customer's hallway at 7pm". Do not start it
until 2a and 2b have shipped and something in their use says the missing piece is tracking.

---

## 5. Verification

Both existing verifiers extend cleanly, and the split between them stays the documented one —
`verify:e2e` proves the feature works in a browser, `verify:geometry` proves the arithmetic,
because a browser test has no ground truth.

- **`verify.e2e.mjs`** — Chrome can be handed a synthetic camera:
  `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<doorway.y4m>` plus
  `--use-fake-ui-for-media-stream` to auto-grant. So the live path is fully testable headless
  with a known doorway clip: permission grant, freeze, handoff into the place step, and the
  three denial fallbacks.
- **`verify.geometry.mjs`** — for 2c, extend the synthetic camera to emit a *sequence* along
  an arc and assert the recovered per-frame homography against ground truth. That is the only
  place tracker accuracy can be honestly measured.

---

## 6. Recommendation

1. **Re-crop the 17 photographed doors in `/admin`.** Nothing below matters until
   `tryState` stops saying `soon` for more than half the catalogue.
2. **Build 2a.** It is the only unserved win in the audit, it is a few hundred lines with no
   dependencies, and it improves the size estimate that becomes a price.
3. **Add the design/finish switcher to the result view.** Free — the leaf is already vector
   under an unchanged matrix — and it serves the one "try several quickly" need that people
   were really asking AR for.
4. **Then 2b**, if the camera step lands well.
5. **Hold 2c** until there is evidence that stillness is the thing standing in the way.

---

## 7a. Open questions for the client

- Is "live AR" a thing the client has *promised* anyone, or an idea in the backlog? If it has
  been shown to customers as coming, the framing of 2a/2b matters more than their internals.
- Does the counter staff want the picture to arrive on WhatsApp differently from how it does
  now? That is the actual conversion point, and no rung of this ladder changes it.

---

## 8. What was actually built (2026-08-17)

WebXR `immersive-ar`, shipped. §1's finding stands unchanged — **no iPhone can run this**,
and neither can an Android without ARCore. The decision was to ship it for the visitors who
*can*, with the photo flow untouched underneath for everyone else.

### Shape

| File | Role |
| --- | --- |
| `src/lib/arSupport.ts` | The gate. `isSessionSupported('immersive-ar')`, cached, never throws. |
| `src/lib/arScene.ts` | Session lifecycle + the whole renderer. Two shaders, one vertex buffer, one 4×4 multiply. |
| `src/components/tryathome/ArPlacement.tsx` | The button, the DOM overlay, the texture hand-off. |

### The three decisions worth keeping

**Hand-written WebGL, not `three`.** §1 flagged that a WebXR build would drag `three` out of
`Beams-*.js` and change what the home page fetches. That was avoided by not needing it: the
scene is one textured quad and a reticle, which is two shaders. Measured after:

```
ArPlacement-*.js    7.68 kB │ gzip: 3.33 kB     (imports: react, i18n, DoorArt — no three)
index-*.js        291.74 kB │ gzip: 92.31 kB    (unchanged)
Beams-*.js        891.56 kB │ gzip: 237.75 kB   (still the only chunk containing three)
```

**Absent, not disabled, where unsupported.** No greyed-out button, no "not supported on your
phone" notice. A visitor who cannot have it does not learn it exists, and the photo flow is
never reframed as a fallback. `verify:e2e` asserts the button, the overlay root *and* the
chunk fetch are all absent without `navigator.xr` — the chunk assertion matters most, since
a broken gate would be invisible in the UI while shipping a renderer to every iPhone.

**Upright always.** A floor hit's pose points its normal up; adopting it would lay the door
flat on the carpet. The leaf stands vertical at every yaw and only turns about the vertical
axis, facing whoever placed it.

### Verification

`verify:geometry` gained four checks on the model matrix — true size in metres, base on the
placed surface, vertical at six yaws, facing at four camera positions. Column-major bugs
render *something*, just in the wrong place, and this is hardware CI cannot reach.

⚠️ Those matrices are `Float32Array`, so the AR block uses its own `close32` (1e-5). The
file's existing `close` is 1e-9, a float64 pixel tolerance, and every AR check fails against
it on precision alone — 33″ came back as 0.8381999731 m against an expected 0.8382.

### What is *not* verified

**The session itself.** There is no ARCore device in CI. The handshake, camera passthrough,
hit-test quality, reticle behaviour on real planes and the texture upload have not run on
hardware. The arithmetic and the support gate are covered; everything downstream of
`requestSession` is not. **This needs one pass on a real Android before it is announced.**

### Still true from §0

`grep -c isLeafCrop src/data/catalog.gen.ts` is still `0`. 17 of the 29 in-scope doors report
`soon` and can be placed in neither a photo nor a room. AR does not change that, and it
remains the highest-value work available on this feature.
