/**
 * The keyhole hero's tunnel of doors, drawn into ONE canvas.
 *
 * ⚠️⚠️ **This file is the fix for the hero tearing itself apart on phones, and
 * the fix is the shape, not a tuning.** From 2026-08-21 to 2026-11-11 every door
 * in the tunnel was DOM: first picture layers under a `preserve-3d` scene, then
 * (2026-09-10) four `<img>`s per door laid out at ten times their size so
 * Chrome would take its "directly composited image" path, scrubbed from a
 * generated 1,900-line scroll-timeline stylesheet. Each version measured clean
 * in headless Chrome and each one broke on real phones — doors drawn in
 * chunks, strips missing, stutter — because all of them asked the browser's
 * compositor to do the same thing: keep ~20 layers that each grow 30× on their
 * way past the camera correctly tiled, rastered and inside a GPU memory budget.
 * Whether that works is decided by heuristics that differ per browser, per
 * version and per device, and a page cannot see or steer any of them.
 *
 * A canvas takes that decision away from the compositor entirely:
 *  · it is one layer, exactly the size of the screen, at every point of the
 *    flight — there is nothing to tile, re-raster or evict;
 *  · its memory is a constant: one drawing buffer plus five ~3 MB textures,
 *    the same on the way in, at rest and on the way back;
 *  · the GPU draws at most fifteen textured quads a frame, which is nothing
 *    for any phone made this decade;
 *  · and it draws the same thing in Chrome, Samsung Internet, Safari and
 *    Firefox, because WebGL has no "fast path" to fall off.
 * It is what every scroll-scrubbed product page that has to survive phones
 * does (a canvas driven from scroll), minus the megabytes of pre-rendered
 * frames — the frames here are five photographs and some arithmetic.
 *
 * ⚠️ **Hand-written WebGL, and it must stay that way** — the same rule and the
 * same reason as `arScene.ts`. The scene is three kinds of quad. `three` would
 * add a scene graph it does not need and, worse, a second importer of `three`,
 * which makes Rollup hoist a vendor chunk into what every visitor downloads.
 *
 * The geometry reproduces the CSS it replaced exactly (so the lock, which is
 * still a DOM button over the door up front, lands on the same pixels): a door
 * is a flat box at depth z under a 900px perspective — on screen, a uniform
 * scale about the pane's centre — and its leaf turns about its left edge under
 * the door's own 900px perspective. No React, no DOM beyond the canvas; the
 * numbers come from `heroTunnel.ts`.
 */

/** One door for one frame. Everything is CSS px in the canvas's own box. */
export interface TunnelDoor {
  /** which texture (index into the list given to `setImage`) */
  tex: number
  /** where the door's centre lands on screen */
  cx: number
  cy: number
  /** the door plane's projected scale, PERSPECTIVE / (PERSPECTIVE − z) */
  scale: number
  /** the leaf at scale 1 */
  w: number
  h: number
  /** fog × fade, 0–1 */
  opacity: number
  /** how far the leaf has swung, 0–1 */
  open: number
  /** how bright the room behind the leaf is, 0–1 */
  glow: number
}

export interface TunnelRenderer {
  /** Size the drawing buffer. Cheap to call with unchanged numbers. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void
  /** Hand over (or replace) a door photograph. Uploads on a later frame. */
  setImage(index: number, img: HTMLImageElement): void
  /**
   * Draw one frame. `doors` must be ordered far → near. Returns true while
   * something is still animating by itself (a photograph fading in), i.e. the
   * caller should draw again next frame even if nothing scrolled.
   */
  draw(doors: readonly TunnelDoor[], now: number): boolean
  /** False while the GPU has taken the context away (backgrounded tab). */
  isLive(): boolean
  /**
   * Share of the drawing buffer that is not transparent, 0–1, sampled on a
   * coarse grid straight after a redraw of the last frame. For `verify:e2e`
   * only — a canvas has no DOM to assert on, and "the hero is blank" is
   * exactly the regression a markup check cannot see.
   */
  coverage(): number
  destroy(): void
}

export interface TunnelOptions {
  /** the opening a leaf hangs in, as sRGB 0–255 */
  jamb: readonly [number, number, number]
  /** the door's own perspective distance, CSS px */
  perspective: number
  /** how far the leaf swings when fully open, degrees */
  openDeg: number
  /** called whenever a new frame is wanted that scroll did not ask for */
  invalidate: () => void
}

type GL = WebGLRenderingContext | WebGL2RenderingContext

/* The jamb shows as an 18px ring around a closed leaf, and the lit room behind
   an open one bleeds 15% past the leaf on every side — the same boxes the CSS
   gave `.ktun__jamb` and `.ktun__gap`. */
const JAMB_RING = 18
const GAP_BLEED = 0.15
/** a photograph fades up over this, so a late one arrives rather than pops */
const FADE_MS = 260
/* Never more than 2 device px per CSS px, and never more than ~4 MP in all.
   The tunnel is moving photographs in fog — at 3.5× a phone would fill three
   times the pixels for a difference nobody can see, and a 4K laptop on an
   integrated GPU would be asked for 8 MP of blending a frame. */
const MAX_DPR = 2
const MAX_PIXELS = 4_000_000

const VERT = `
attribute vec2 a_q;
uniform vec2 u_view;
uniform vec2 u_centre;
uniform float u_scale;
uniform vec4 u_rect;
uniform vec3 u_swing;
uniform float u_persp;
varying vec2 v_uv;
void main() {
  /* door space: px from the door's own centre, y down */
  vec2 l = mix(u_rect.xy, u_rect.zw, a_q);
  /* rotateY about the hinge line, exactly as CSS does it: a point u px from
     the hinge lands at x = u·cos, z = −u·sin, and the door's own perspective
     divides by (d − z)/d. Flat quads pass cos 1, sin 0 and w stays 1. */
  float u = l.x - u_swing.x;
  float x = u_swing.x + u * u_swing.y;
  float w = (u_persp + u * u_swing.z) / u_persp;
  /* screen = centre + scale·(x, y)/w. Emitted homogeneous (everything × w) so
     the GPU interpolates the photograph perspective-correctly across the leaf. */
  vec2 s = u_centre * w + u_scale * vec2(x, l.y);
  gl_Position = vec4((s / u_view * 2.0 - w) * vec2(1.0, -1.0), 0.0, w);
  v_uv = a_q;
}`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_mode;
uniform vec4 u_colour;
uniform float u_alpha;
uniform float u_shade;
uniform vec2 u_px;
void main() {
  vec4 c;
  if (u_mode < 0.5) {
    /* the jamb: one flat colour */
    c = u_colour;
  } else if (u_mode < 1.5) {
    /* The lit room behind the leaf: a warm ellipse, brightest just above the
       middle, gone by the time it reaches the edge of its box. Stop for stop
       the kt-gap image this replaced (itself a baked radial-gradient): 54%
       cream at the centre, 16% brass at 0.605 of the radius, nothing at 1.
       Colour and alpha are mixed separately and multiplied after, the way that
       image was drawn, so the mid-tones match it. */
    float t = length((v_uv - vec2(0.5, 0.46)) / vec2(0.48, 0.44));
    float k = clamp(t / 0.605, 0.0, 1.0);
    vec3 rgb = mix(vec3(0.9647, 0.8745, 0.6745), vec3(0.6902, 0.5098, 0.2510), k);
    float a = t < 0.605 ? mix(0.54, 0.16, k) : 0.16 * (1.0 - clamp((t - 0.605) / 0.395, 0.0, 1.0));
    c = vec4(rgb * a, a);
    /* half a level of noise: this ramp crosses ~140 levels over a door that
       can be three screens tall, and without it the glow arrives in rings */
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    c.rgb += n / 255.0 * min(1.0, c.a * 40.0);
  } else {
    /* the photograph, with the edge shade it takes as it turns from the light
       (was .ktun__shade: rgba(8,5,2,.03) at the hinge → .5 at the handle) */
    c = texture2D(u_tex, v_uv);
    float a = mix(0.03, 0.5, v_uv.x) * u_shade;
    c.rgb = mix(c.rgb, vec3(0.0314, 0.0196, 0.0078) * c.a, a);
  }
  /* a one-pixel ramp at the quad's edge, from its known size on screen — the
     slanted top and bottom of a turning leaf are the only hard diagonals in
     the scene, and this is cheaper than a multisampled buffer */
  vec2 e = min(v_uv, 1.0 - v_uv) * u_px;
  gl_FragColor = c * (u_alpha * clamp(min(e.x, e.y) + 0.5, 0.0, 1.0));
}`

interface Slot {
  img: HTMLImageElement | null
  tex: WebGLTexture | null
  /** performance.now() when the texture became drawable, 0 = not yet */
  born: number
}

/**
 * Returns null when the browser will not give this canvas a WebGL context at
 * all — the caller falls back to the static hero, which needs nothing.
 */
export function createTunnelRenderer(canvas: HTMLCanvasElement, opts: TunnelOptions): TunnelRenderer | null {
  const attrs: WebGLContextAttributes = {
    alpha: true,
    premultipliedAlpha: true,
    /* edges are ramped in the shader; a multisampled buffer would be 4× the
       memory of the one thing here that is sized by the screen */
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
  }
  let ctx: GL | null = null
  try {
    ctx =
      (canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null)
  } catch {
    ctx = null
  }
  if (!ctx) return null
  const gl: GL = ctx
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext

  let program: WebGLProgram | null = null
  let quad: WebGLBuffer | null = null
  let loc: Record<string, WebGLUniformLocation | null> = {}
  let aniso: { ext: EXT_texture_filter_anisotropic; max: number } | null = null
  let live = !gl.isContextLost()
  let disposed = false
  /** bumped on every (re)initialisation, so an upload that was awaiting a
      decode across a context loss cannot write into the new context's slots */
  let generation = 0
  const slots: Slot[] = []
  const queue: number[] = []
  let cssW = 1
  let cssH = 1
  let lastDoors: readonly TunnelDoor[] = []

  const jamb: [number, number, number] = [opts.jamb[0] / 255, opts.jamb[1] / 255, opts.jamb[2] / 255]
  const cosOpen = (open: number) => Math.cos((-open * opts.openDeg * Math.PI) / 180)
  const sinOpen = (open: number) => Math.sin((-open * opts.openDeg * Math.PI) / 180)

  function compile(type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh)
      return null
    }
    return sh
  }

  /** Everything the context owns. Runs at start and again after a restore. */
  function init(): boolean {
    generation++
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) return false
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'a_q')
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog)
      return false
    }
    program = prog
    loc = {}
    for (const name of ['view', 'centre', 'scale', 'rect', 'swing', 'persp', 'tex', 'mode', 'colour', 'alpha', 'shade', 'px']) {
      loc[name] = gl.getUniformLocation(prog, `u_${name}`)
    }
    quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    gl.useProgram(prog)
    gl.uniform1i(loc.tex, 0)
    gl.uniform1f(loc.persp, opts.perspective)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    /* premultiplied throughout: the canvas is composited over the page */
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)

    const ext = gl.getExtension('EXT_texture_filter_anisotropic')
    aniso = ext ? { ext, max: Math.min(4, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) } : null

    /* textures died with the old context; queue every photograph we hold */
    queue.length = 0
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (!s) continue
      s.tex = null
      s.born = 0
      if (s.img) queue.push(i)
    }
    return true
  }

  /**
   * WebGL 1 only mipmaps power-of-two textures, and a door that is a tenth of
   * its size at the far end of the hall shimmers badly without them — so there
   * the photograph is redrawn into a 512×1024 box first. WebGL 2 (every phone
   * since ~2017) takes it at its own size.
   */
  function potSource(img: TexImageSource): TexImageSource {
    if (webgl2) return img
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 1024
    const g = c.getContext('2d')
    if (!g) return img
    g.drawImage(img as CanvasImageSource, 0, 0, c.width, c.height)
    return c
  }

  async function upload(index: number): Promise<void> {
    const slot = slots[index]
    const img = slot?.img
    if (!slot || !img) return
    const gen = generation
    /* Decode off the main thread where the browser can: `texImage2D` from an
       <img> that has not been decoded yet does it synchronously, and that is a
       dropped frame if it lands while the page is moving. */
    let src: TexImageSource = img
    let bitmap: ImageBitmap | null = null
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(img)
        src = bitmap
      } catch {
        bitmap = null
      }
    }
    if (disposed || !live || gen !== generation || slots[index]?.img !== img) {
      bitmap?.close()
      return
    }
    const tex = gl.createTexture()
    if (!tex) {
      bitmap?.close()
      return
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, potSource(src))
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    /* a leaf seen at 72° is the textbook case for it, and 4 taps is free */
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.ext.TEXTURE_MAX_ANISOTROPY_EXT, aniso.max)
    bitmap?.close()
    if (slot.tex) gl.deleteTexture(slot.tex)
    slot.tex = tex
    slot.born = performance.now()
    opts.invalidate()
  }

  /** One upload per frame, so five cached photographs cannot land as one hitch. */
  let pumping = false
  function pump() {
    if (pumping || disposed || !live) return
    const next = queue.shift()
    if (next === undefined) return
    pumping = true
    void upload(next).finally(() => {
      pumping = false
      if (queue.length) requestAnimationFrame(pump)
    })
  }

  function rect(x0: number, y0: number, x1: number, y1: number) {
    gl.uniform4f(loc.rect, x0, y0, x1, y1)
  }

  function draw(doors: readonly TunnelDoor[], now: number): boolean {
    lastDoors = doors
    if (disposed || !live || !program) return false
    const pxPerCss = canvas.width / cssW
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(loc.view, cssW, cssH)
    let animating = false

    for (const d of doors) {
      if (d.opacity <= 0.002) continue
      const hw = d.w / 2
      const hh = d.h / 2
      const k = d.scale * pxPerCss
      gl.uniform2f(loc.centre, d.cx, d.cy)
      gl.uniform1f(loc.scale, d.scale)

      /* the opening */
      gl.uniform3f(loc.swing, 0, 1, 0)
      gl.uniform1f(loc.mode, 0)
      gl.uniform4f(loc.colour, jamb[0], jamb[1], jamb[2], 1)
      gl.uniform1f(loc.alpha, d.opacity)
      gl.uniform1f(loc.shade, 0)
      rect(-hw - JAMB_RING, -hh - JAMB_RING, hw + JAMB_RING, hh + JAMB_RING)
      gl.uniform2f(loc.px, (d.w + 2 * JAMB_RING) * k, (d.h + 2 * JAMB_RING) * k)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      /* the light the leaf swings away from */
      const glow = d.opacity * d.open * d.glow
      if (glow > 0.004) {
        const bw = hw * (1 + 2 * GAP_BLEED)
        const bh = hh * (1 + 2 * GAP_BLEED)
        gl.uniform1f(loc.mode, 1)
        gl.uniform1f(loc.alpha, glow)
        rect(-bw, -bh, bw, bh)
        gl.uniform2f(loc.px, 2 * bw * k, 2 * bh * k)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      /* the leaf — once its photograph has landed */
      const slot = slots[d.tex]
      if (slot?.tex) {
        const fade = Math.min(1, (now - slot.born) / FADE_MS)
        if (fade < 1) animating = true
        const cos = cosOpen(d.open)
        gl.bindTexture(gl.TEXTURE_2D, slot.tex)
        gl.uniform3f(loc.swing, -hw, cos, sinOpen(d.open))
        gl.uniform1f(loc.mode, 2)
        gl.uniform1f(loc.alpha, d.opacity * fade)
        gl.uniform1f(loc.shade, d.open * 0.8)
        rect(-hw, -hh, hw, hh)
        gl.uniform2f(loc.px, Math.max(1, d.w * cos * k), d.h * k)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    }
    return animating
  }

  const onLost = (e: Event) => {
    /* without this the browser never offers the context back */
    e.preventDefault()
    live = false
  }
  const onRestored = () => {
    if (disposed) return
    live = init()
    if (live) {
      pump()
      opts.invalidate()
    }
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  if (live && !init()) return null

  return {
    resize(width, height, dpr) {
      cssW = Math.max(1, width)
      cssH = Math.max(1, height)
      const scale = Math.min(dpr || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / (cssW * cssH)))
      const w = Math.max(1, Math.round(cssW * scale))
      const h = Math.max(1, Math.round(cssH * scale))
      /* assigning either dimension clears the buffer, even to the same value */
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
    },
    setImage(index, img) {
      const slot = (slots[index] ??= { img: null, tex: null, born: 0 })
      slot.img = img
      if (!queue.includes(index)) queue.push(index)
      pump()
    },
    draw,
    isLive: () => live && !disposed,
    coverage() {
      if (disposed || !live) return 0
      draw(lastDoors, performance.now() + FADE_MS)
      const w = canvas.width
      const h = canvas.height
      const row = new Uint8Array(w * 4)
      let hit = 0
      let seen = 0
      for (let i = 1; i < 24; i++) {
        gl.readPixels(0, Math.floor((h * i) / 24), w, 1, gl.RGBA, gl.UNSIGNED_BYTE, row)
        for (let x = 3; x < row.length; x += 4 * 8) {
          seen++
          if (row[x] > 8) hit++
        }
      }
      return seen ? hit / seen : 0
    },
    destroy() {
      disposed = true
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      /* ⚠️ Free what we made, but do NOT lose the context. A canvas only ever
         has one: `getContext` hands the same object back for the life of the
         element, so under React StrictMode (mount → cleanup → mount) a context
         lost here is the dead one the second mount is given. */
      if (!gl.isContextLost()) {
        for (const s of slots) if (s?.tex) gl.deleteTexture(s.tex)
        if (quad) gl.deleteBuffer(quad)
        if (program) gl.deleteProgram(program)
      }
      slots.length = 0
      queue.length = 0
    },
  }
}
