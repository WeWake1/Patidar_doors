// PROTOTYPE round 2 · E "Knock": draws a rendered surface in a WebGL canvas and sends a ring through it from the
// knuckle. The ring is a wave packet that bends the picture a few pixels and lights its crest, and it is
// stretched along the grain (sound runs several times faster along wood fibres than across them). A knock can
// also carry the next material in on its crest: inside the ring is the new surface, outside the old one.
// Plain WebGL 1, one full-screen triangle; the pictures are Blender renders, nothing here is modelled.

export interface Surface {
  img: HTMLImageElement
  /** unit vector along the grain, in screen space (y down) */
  grain: [number, number]
  /** how much faster the ring runs along the grain than across it (1 = a circle) */
  stretch: number
  /** where to keep the picture when it is cropped to the screen, 0..1 */
  focus: [number, number]
}

const VERT = `
attribute vec2 a_p;
varying vec2 v_uv;
void main() { v_uv = vec2(a_p.x, -a_p.y) * 0.5 + 0.5; gl_Position = vec4(a_p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_a, u_b;
uniform vec2 u_res, u_imgA, u_imgB, u_focA, u_focB;
uniform vec4 u_k[6];          // knocks: x, y (canvas px), start (s), strength
uniform vec4 u_w;             // the material change: x, y, start, on
uniform vec3 u_gA, u_gB;      // grain x, y, stretch
uniform float u_t, u_scale;

vec2 cover(vec2 p, vec2 img, vec2 foc) {
  float s = max(u_res.x / img.x, u_res.y / img.y);
  vec2 size = img * s;
  return (p - (u_res - size) * foc) / size;
}
float ell(vec2 d, vec3 g) {
  float a = dot(d, g.xy);
  float c = dot(d, vec2(-g.y, g.x));
  return sqrt((a / g.z) * (a / g.z) + c * c);
}
void main() {
  vec2 p = v_uv * u_res;
  vec2 disp = vec2(0.0);
  float light = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 k = u_k[i];
    float age = u_t - k.z;
    if (k.w > 0.0 && age > 0.0 && age < 1.8) {
      vec2 d = p - k.xy;
      float r = ell(d, u_gA);
      float R = age * 0.95 * u_scale;
      float w = 0.016 * u_scale;
      float env = k.w * exp(-age * 2.4) * smoothstep(0.0, 0.04, age);
      // the main ring and a weaker one behind it
      float x1 = (r - R) / w;
      float x2 = (r - R * 0.78) / (w * 1.3);
      float wave = exp(-x1 * x1) * sin(x1 * 2.6) + 0.45 * exp(-x2 * x2) * sin(x2 * 2.6);
      vec2 dir = d / max(length(d), 1.0);
      disp += dir * wave * env * 0.0075 * u_scale;
      light += wave * env;
    }
  }
  float m = 0.0;
  if (u_w.w > 0.0) {
    float age = u_t - u_w.z;
    float r = ell(p - u_w.xy, u_gB);
    float R = age * 0.95 * u_scale;
    m = 1.0 - smoothstep(R - 0.02 * u_scale, R + 0.004 * u_scale, r);
  }
  vec2 q = p - disp;
  vec3 ca = texture2D(u_a, cover(q, u_imgA, u_focA)).rgb;
  vec3 cb = texture2D(u_b, cover(q, u_imgB, u_focB)).rgb;
  vec3 c = mix(ca, cb, m);
  c *= 1.0 + light * 0.11;
  gl_FragColor = vec4(c, 1.0);
}`

export interface Ripple {
  /** knock at canvas CSS px; `to` = the index of a surface to carry in on the ring, or -1 */
  knock(x: number, y: number, to: number, strength?: number): void
  /** show a surface at once, no ring */
  show(i: number): void
  destroy(): void
}

export function createRipple(canvas: HTMLCanvasElement, surfaces: Surface[], reduced: boolean): Ripple | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const ap = gl.getAttribLocation(prog, 'a_p')
  gl.enableVertexAttribArray(ap)
  gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const u = {
    a: U('u_a'), b: U('u_b'), res: U('u_res'), imgA: U('u_imgA'), imgB: U('u_imgB'), focA: U('u_focA'),
    focB: U('u_focB'), k: U('u_k'), w: U('u_w'), gA: U('u_gA'), gB: U('u_gB'), t: U('u_t'), scale: U('u_scale'),
  }
  // StrictMode mounts, destroys and mounts again on the same canvas, so the same context: a destroyed instance's
  // pending image loads must not upload into the live one's textures
  let dead = false
  const tex = surfaces.map((s) => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const up = () => {
      if (dead) return
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, s.img)
      loaded.add(s)
      draw()
    }
    if (s.img.complete && s.img.naturalWidth) queueMicrotask(up)
    else s.img.addEventListener('load', up, { once: true })
    return t
  })
  const loaded = new Set<Surface>()
  const knocks = new Float32Array(24)
  let slot = 0
  let cur = 0
  let next = -1
  let wipeAt = 0
  const wipe = [0, 0]
  let raf = 0
  let lastKnock = -1e9
  const t0 = performance.now()
  const now = () => (performance.now() - t0) / 1000

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    return dpr
  }
  const ro = new ResizeObserver(() => {
    size()
    draw()
  })
  ro.observe(canvas)

  function draw() {
    if (dead) return
    const a = surfaces[cur]
    if (!loaded.has(a)) return
    size()
    const b = next >= 0 && loaded.has(surfaces[next]) ? surfaces[next] : a
    const t = now()
    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, tex[cur])
    gl!.activeTexture(gl!.TEXTURE1)
    gl!.bindTexture(gl!.TEXTURE_2D, tex[b === a ? cur : next])
    gl!.uniform1i(u.a, 0)
    gl!.uniform1i(u.b, 1)
    gl!.uniform2f(u.res, canvas.width, canvas.height)
    gl!.uniform2f(u.imgA, a.img.naturalWidth, a.img.naturalHeight)
    gl!.uniform2f(u.imgB, b.img.naturalWidth, b.img.naturalHeight)
    gl!.uniform2f(u.focA, a.focus[0], a.focus[1])
    gl!.uniform2f(u.focB, b.focus[0], b.focus[1])
    gl!.uniform3f(u.gA, a.grain[0], a.grain[1], a.stretch)
    gl!.uniform3f(u.gB, b.grain[0], b.grain[1], b.stretch)
    gl!.uniform4fv(u.k, knocks)
    gl!.uniform4f(u.w, wipe[0], wipe[1], wipeAt, next >= 0 ? 1 : 0)
    gl!.uniform1f(u.t, t)
    gl!.uniform1f(u.scale, Math.max(canvas.width, canvas.height))
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    canvas.classList.add('is-ready')
    // the material change is done once the ring has crossed the whole picture
    if (next >= 0 && (t - wipeAt) * 0.95 > 1.5) {
      cur = next
      next = -1
    }
    const busy = next >= 0 || t - lastKnock < 1.8
    raf = busy ? requestAnimationFrame(draw) : 0
  }

  return {
    knock(x, y, to, strength = 1) {
      const dpr = size()
      const t = now()
      const px = x * dpr
      const py = y * dpr
      if (reduced) {
        if (to >= 0) cur = to
        draw()
        return
      }
      if (next >= 0) cur = next // a knock mid-change finishes the last one first
      knocks.set([px, py, t, strength], slot * 4)
      slot = (slot + 1) % 6
      lastKnock = t
      if (to >= 0 && to !== cur) {
        next = to
        wipeAt = t
        wipe[0] = px
        wipe[1] = py
      } else {
        next = -1
      }
      if (!raf) raf = requestAnimationFrame(draw)
    },
    show(i) {
      cur = i
      next = -1
      draw()
    },
    destroy() {
      // free what this made, but never lose the context: a canvas keeps one context for life, and under
      // StrictMode the second mount is handed the same one (CLAUDE.md, the hero tunnel's destroy())
      dead = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      tex.forEach((t) => gl.deleteTexture(t))
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    },
  }
}
