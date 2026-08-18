/**
 * The door, standing in the customer's actual room.
 *
 * A WebXR `immersive-ar` session that puts one textured quad — the chosen leaf,
 * at its real size in metres — on a surface found by ARCore's hit test.
 *
 * ── Why this is hand-written WebGL and not three.js ──────────────────────────
 *
 * The scene is *one quad and a reticle*. No scene graph, no lights, no
 * materials, no loaders. three.js would be ~230 kB gz to draw a rectangle, and
 * it would cost the home page: `three` currently has **exactly one importer**
 * (the hero's Beams), which is what keeps it wholly inside `Beams-*.js`. A
 * second importer makes Rollup hoist a shared vendor chunk and changes what the
 * hero fetches on a phone. So the constraint recorded in CLAUDE.md is honoured
 * by not needing it: this file's whole renderer is two shader programs, one
 * vertex buffer and a 4×4 multiply.
 *
 * ⚠️ Do not "simplify" this by importing three. The weight is not the only
 * cost; the chunk graph is.
 *
 * ── Where the WebXR types come from ──────────────────────────────────────────
 *
 * `@types/webxr`, which is types-only and emits nothing. It was already being
 * resolved transitively through the three.js ecosystem, but it is declared as a
 * direct devDependency because *this* file is what needs it — leaving it to
 * arrive via a package the AR path deliberately does not use would break the
 * build the day the hero's dependencies are touched.
 */

type Mat = Float32Array<ArrayBufferLike>

/* ── errors ────────────────────────────────────────────── */

export type ArErrorCode =
  /** The visitor declined the camera, or dismissed the consent sheet. */
  | 'denied'
  /** ARCore is present but refused the session — usually "update ARCore". */
  | 'unavailable'
  /** WebGL or the XR layer could not be created. */
  | 'gl'
  /** The session started but the device never granted hit-test. */
  | 'nohittest'

export class ArError extends Error {
  code: ArErrorCode
  constructor(code: ArErrorCode) {
    super(code)
    this.name = 'ArError'
    this.code = code
  }
}

/* ── 4×4, column-major, matching what WebXR hands us and what WebGL wants ── */

/**
 * ⚠️ `mul`, `uprightQuad` and `yawToward` are exported for `verify:geometry`
 * and for nothing else. Column-major conventions are the classic silent bug —
 * a transposed multiply still renders *something*, just in the wrong place —
 * and this repo's rule is that arithmetic gets checked against ground truth
 * outside the browser. Nothing but the verifier should import them.
 */
export function mul(out: Mat, a: Mat, b: Mat): Mat {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4]
    const b1 = b[c * 4 + 1]
    const b2 = b[c * 4 + 2]
    const b3 = b[c * 4 + 3]
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3
    }
  }
  return out
}

/**
 * An upright quad, centred on its own middle, facing `yaw`.
 *
 * The door is deliberately **not** given the hit surface's orientation. A hit
 * on the floor comes back with its normal pointing up, and a door lying flat on
 * the carpet is not what anyone asked for. The leaf stands vertical always, and
 * only turns about the vertical axis — which is the one degree of freedom a
 * real door in a real room actually has.
 */
export function uprightQuad(
  out: Mat,
  x: number,
  y: number,
  z: number,
  yaw: number,
  halfW: number,
  halfH: number,
): Mat {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  out[0] = c * halfW
  out[1] = 0
  out[2] = -s * halfW
  out[3] = 0
  out[4] = 0
  out[5] = halfH
  out[6] = 0
  out[7] = 0
  out[8] = s
  out[9] = 0
  out[10] = c
  out[11] = 0
  out[12] = x
  out[13] = y
  out[14] = z
  out[15] = 1
  return out
}

/**
 * The yaw that turns an upright quad at (hx, hz) to face a camera at (cx, cz).
 *
 * `uprightQuad`'s local +z is `(sin yaw, 0, cos yaw)`, so facing the viewer
 * means matching that to the horizontal direction from door to camera — which
 * is `atan2` of that direction, in exactly this argument order. Getting the two
 * arguments the other way round is a 90° error that looks plausible on screen
 * until you walk sideways.
 */
export function yawToward(cx: number, cz: number, hx: number, hz: number): number {
  return Math.atan2(cx - hx, cz - hz)
}

/**
 * The reticle lies *in* the detected surface, so it takes the hit pose's own
 * orientation — a quad in XY rotated onto the surface's XZ, scaled to `r`.
 * That makes it read correctly on a wall as well as on a floor.
 */
const FLAT = new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1])
function flatOnSurface(out: Mat, hit: Mat, r: number): Mat {
  const basis = new Float32Array(FLAT)
  for (let i = 0; i < 12; i++) basis[i] *= r
  return mul(out, hit, basis)
}

/* ── shaders ───────────────────────────────────────────── */

const VERT = `
attribute vec2 a_pos;
uniform mat4 u_mvp;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = u_mvp * vec4(a_pos, 0.0, 1.0);
}`

/* Premultiplied throughout — the texture is uploaded premultiplied and the
   blend func is (ONE, ONE_MINUS_SRC_ALPHA), so a plain multiply by u_alpha
   fades correctly instead of darkening the edges. */
const FRAG_DOOR = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_alpha;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv) * u_alpha;
}`

const FRAG_RETICLE = `
precision mediump float;
uniform float u_alpha;
varying vec2 v_uv;
void main() {
  float d = distance(v_uv, vec2(0.5));
  float ring = smoothstep(0.50, 0.46, d) * smoothstep(0.34, 0.38, d);
  gl_FragColor = vec4(0.949, 0.820, 0.541, 1.0) * ring * u_alpha;
}`

function compile(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) throw new ArError('gl')
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const p = gl.createProgram()
  if (!p) throw new ArError('gl')
  gl.attachShader(p, make(gl.VERTEX_SHADER, vert))
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, frag))
  gl.bindAttribLocation(p, 0, 'a_pos')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new ArError('gl')
  return p
}

/* ── session ───────────────────────────────────────────── */

const IN_TO_M = 0.0254

/** How long the leaf takes to fade in once placed, in seconds. */
const SETTLE_S = 0.28

export interface ArHandle {
  /** Swap the texture — a finish change while the session is live. */
  setTexture(image: TexImageSource): void
  /** Back to reticle mode; the next tap re-places. */
  moveAgain(): void
  /** Ends the session. Idempotent, and safe after the session ended itself. */
  end(): void
}

export interface ArSceneOptions {
  /** Real leaf size, in inches — what makes this true-scale rather than a toy. */
  heightIn: number
  widthIn: number
  /** DOM overlay root. Chrome renders it above the camera feed. */
  overlay: HTMLElement
  /** Fired when the reticle finds/loses a surface, so the copy can follow. */
  onTracking(found: boolean): void
  /** Fired once the leaf is standing, and again on `moveAgain`. */
  onPlaced(placed: boolean): void
  /** Session ended — by the visitor, by the system, or by `end()`. */
  onEnd(): void
}

/**
 * Start a session. **Must be called synchronously from a user gesture** —
 * `requestSession` consumes transient activation, so any `await` before it
 * (a dynamic import, a texture decode) makes Chrome reject the call. That is
 * the same class of bug as the `navigator.share()` one recorded in
 * shareImage.ts, and it is why ArPlacement pre-loads this module on mount and
 * only awaits the texture *after* the session is up.
 */
export async function startArSession(opts: ArSceneOptions): Promise<ArHandle> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr
  if (!xr) throw new ArError('unavailable')

  let session: XRSession
  try {
    session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: opts.overlay },
    })
  } catch (e) {
    /* A declined permission and a missing/outdated ARCore both land here and
       need different copy — the first is a choice, the second is fixable. */
    const name = e instanceof Error ? e.name : ''
    throw new ArError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
  }

  /* The canvas is never inserted into the document: in an immersive session it
     exists only to own the GL context that XRWebGLLayer draws through. */
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', {
    xrCompatible: true,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  } as WebGLContextAttributes) as WebGL2RenderingContext | null
  if (!gl) {
    await session.end().catch(() => {})
    throw new ArError('gl')
  }

  let doorProg: WebGLProgram
  let retProg: WebGLProgram
  try {
    doorProg = compile(gl, VERT, FRAG_DOOR)
    retProg = compile(gl, VERT, FRAG_RETICLE)
  } catch {
    await session.end().catch(() => {})
    throw new ArError('gl')
  }

  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) })

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  /* CLAMP + LINEAR with no mips: the leaf is non-power-of-two and is only ever
     seen at roughly its authored size, so mipmapping would cost upload time to
     fix a shimmer that does not happen. */
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)

  const refSpace = await session.requestReferenceSpace('local')
  const viewerSpace = await session.requestReferenceSpace('viewer')
  /* Both halves are genuinely optional: the method is absent where the feature
     was not granted, and it can resolve undefined where it was granted and then
     withdrawn. A session with no hit test can only ever show a camera feed, so
     it is closed rather than left open looking broken. */
  const hitSource = await session.requestHitTestSource?.({ space: viewerSpace })
  if (!hitSource) {
    await session.end().catch(() => {})
    throw new ArError('nohittest')
  }

  /* ── state ─────────────────────────────────────────── */

  const halfW = (opts.widthIn * IN_TO_M) / 2
  const halfH = (opts.heightIn * IN_TO_M) / 2

  let hasTexture = false
  let placed: { x: number; y: number; z: number; yaw: number; at: number } | null = null
  let lastHit: Mat | null = null
  let yawToViewer = 0
  let tracking = false
  let ended = false

  const model = new Float32Array(16)
  const mv = new Float32Array(16)
  const mvp = new Float32Array(16)

  const doorMvp = gl.getUniformLocation(doorProg, 'u_mvp')
  const doorAlpha = gl.getUniformLocation(doorProg, 'u_alpha')
  const doorTex = gl.getUniformLocation(doorProg, 'u_tex')
  const retMvp = gl.getUniformLocation(retProg, 'u_mvp')
  const retAlpha = gl.getUniformLocation(retProg, 'u_alpha')

  /**
   * ⚠️ A tap on an overlay control must not *also* place the door. Chrome fires
   * `beforexrselect` on the overlay before turning a tap into an XR `select`,
   * and cancelling it there is the documented way to stop a tap counting twice
   * — without it, "Done" stands a door up and then closes the session on it.
   *
   * Cancelled only for real controls, never for the overlay as a whole: a tap
   * on empty space is how the door gets placed, and swallowing everything would
   * make the feature inert.
   */
  const swallow = (e: Event) => {
    const el = e.target as Element | null
    if (el?.closest?.('button, a, input, select, textarea')) e.preventDefault()
  }
  opts.overlay.addEventListener('beforexrselect', swallow)

  const onSelect = () => {
    if (!lastHit || placed) return
    /* Face whoever placed it. A door is a plane, so the only orientation that
       is ever right is "square to the person looking at it" — and at the moment
       of the tap, that is the camera. */
    placed = {
      x: lastHit[12],
      y: lastHit[13] + halfH,
      z: lastHit[14],
      yaw: yawToViewer,
      at: performance.now() / 1000,
    }
    opts.onPlaced(true)
  }
  session.addEventListener('select', onSelect)

  const onEnded = () => {
    if (ended) return
    ended = true
    opts.overlay.removeEventListener('beforexrselect', swallow)
    session.removeEventListener('select', onSelect)
    session.removeEventListener('end', onEnded)
    try {
      hitSource.cancel()
    } catch {
      /* already gone with the session */
    }
    gl.deleteTexture(tex)
    gl.deleteBuffer(quad)
    gl.deleteProgram(doorProg)
    gl.deleteProgram(retProg)
    /* Drop the GL context explicitly. An immersive canvas holds a real GPU
       surface, and leaving it to the collector on a mid-range Android is how a
       second session comes back as a black frame. */
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    opts.onEnd()
  }
  session.addEventListener('end', onEnded)

  const onFrame = (_t: number, frame: XRFrame) => {
    if (ended) return
    session.requestAnimationFrame(onFrame)

    const layer = session.renderState.baseLayer
    const pose = frame.getViewerPose(refSpace)
    if (!layer || !pose) return

    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    if (!placed) {
      const hits = frame.getHitTestResults(hitSource)
      const hit = hits.length ? hits[0].getPose(refSpace) : null
      lastHit = hit ? hit.transform.matrix : null
      if (lastHit) {
        const cam = pose.transform.position
        yawToViewer = yawToward(cam.x, cam.z, lastHit[12], lastHit[14])
      }
      const found = lastHit !== null
      if (found !== tracking) {
        tracking = found
        opts.onTracking(found)
      }
    }

    for (const view of pose.views) {
      const vp = layer.getViewport(view)
      if (!vp) continue
      gl.viewport(vp.x, vp.y, vp.width, vp.height)

      if (placed && hasTexture) {
        const age = performance.now() / 1000 - placed.at
        const a = Math.min(1, age / SETTLE_S)
        uprightQuad(model, placed.x, placed.y, placed.z, placed.yaw, halfW, halfH)
        mul(mv, view.transform.inverse.matrix, model)
        mul(mvp, view.projectionMatrix, mv)
        gl.useProgram(doorProg)
        gl.uniformMatrix4fv(doorMvp, false, mvp)
        gl.uniform1f(doorAlpha, a)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.uniform1i(doorTex, 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      } else if (lastHit) {
        flatOnSurface(model, lastHit, 0.12)
        mul(mv, view.transform.inverse.matrix, model)
        mul(mvp, view.projectionMatrix, mv)
        gl.useProgram(retProg)
        gl.uniformMatrix4fv(retMvp, false, mvp)
        gl.uniform1f(retAlpha, 0.85)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    }
  }
  session.requestAnimationFrame(onFrame)

  return {
    setTexture(image) {
      if (ended) return
      gl.bindTexture(gl.TEXTURE_2D, tex)
      /* ⚠️ Both of these are set per upload, not once: they are global unpack
         state, and anything else that touches a texture between two calls here
         would otherwise silently flip the door upside down. FLIP_Y because
         image row 0 is the top while texture t=0 is the bottom. */
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      hasTexture = true
    },
    moveAgain() {
      if (ended) return
      placed = null
      opts.onPlaced(false)
    },
    end() {
      if (ended) return
      session.end().catch(() => {})
    },
  }
}
