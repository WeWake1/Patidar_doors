// PROTOTYPE round 2 · G "Next door": draws one frame of the stack. The frame is a Blender render (the room, the
// doors' edges, and the light falling on each blank face) plus a mask saying which pixels are which door's face.
// Each face gets a catalogue photograph, warped by the homography from that frame's four corners and multiplied
// by the render's light, so the photo carries the window, the shadows and the falling door's shade. Products stay
// photographs (decisions.md, round 1 Q8); only the motion and the light are rendered. Plain WebGL 1.
import { solveHomography, type Quad } from '../../../lib/homography'

export interface StackData {
  count: number
  size: [number, number]
  slots: number
  frames: [number, number, number][][][] // frame, slot, corner (clockwise from top-left): x, y (px), depth
}

const VERT = `
attribute vec2 a_p;
varying vec2 v_uv;
void main() { v_uv = vec2(a_p.x, -a_p.y) * 0.5 + 0.5; gl_Position = vec4(a_p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_plate, u_mask, u_p0, u_p1, u_p2, u_p3;
uniform vec2 u_res, u_img, u_foc;
uniform mat3 u_h0, u_h1, u_h2, u_h3;
uniform vec4 u_on;
uniform float u_k;
vec3 photo(sampler2D t, mat3 h, vec2 ip) {
  vec3 q = h * vec3(ip, 1.0);
  return texture2D(t, clamp(q.xy / q.z, 0.0, 1.0)).rgb;
}
void main() {
  vec2 p = v_uv * u_res;
  float s = max(u_res.x / u_img.x, u_res.y / u_img.y);
  vec2 ip = (p - (u_res - u_img * s) * u_foc) / s;
  vec2 tuv = clamp(ip / u_img, 0.0, 1.0);
  vec3 plate = texture2D(u_plate, tuv).rgb;
  vec3 m3 = texture2D(u_mask, vec2(tuv.x * 0.5, tuv.y)).rgb;
  float m4 = texture2D(u_mask, vec2(0.5 + tuv.x * 0.5, tuv.y)).r;
  vec4 m = vec4(m3, m4) * u_on;
  float cov = min(m.r + m.g + m.b + m.a, 1.0);
  vec3 face = vec3(0.0);
  if (cov > 0.002) {
    face = photo(u_p0, u_h0, ip) * m.r + photo(u_p1, u_h1, ip) * m.g
         + photo(u_p2, u_h2, ip) * m.b + photo(u_p3, u_h3, ip) * m.a;
  }
  gl_FragColor = vec4(plate * (1.0 - cov) + face * plate * u_k, 1.0);
}`

const UV: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

export interface StackGl {
  /** draw frame f with photos[slot] on each face */
  draw(f: number, photos: (HTMLImageElement | null)[]): void
  destroy(): void
}

export function createStackGl(
  canvas: HTMLCanvasElement,
  data: StackData,
  plates: HTMLImageElement[],
  masks: HTMLImageElement[],
  focus: [number, number],
): StackGl | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
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
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const mk = (mips: boolean) => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const plateT = mk(false)
  const maskT = mk(false)
  const photoT = [mk(true), mk(true), mk(true), mk(true)]
  const photoOf: (HTMLImageElement | null)[] = [null, null, null, null]
  // photos go up as 512 x 1024 (a power of two, so WebGL 1 can mipmap them: a door far off shimmers without)
  const pot = document.createElement('canvas')
  pot.width = 512
  pot.height = 1024
  const pctx = pot.getContext('2d')!
  let shown = -1
  const h = ['u_h0', 'u_h1', 'u_h2', 'u_h3'].map(U)
  const u = {
    plate: U('u_plate'), mask: U('u_mask'), res: U('u_res'), img: U('u_img'), foc: U('u_foc'), on: U('u_on'), k: U('u_k'),
    p: ['u_p0', 'u_p1', 'u_p2', 'u_p3'].map(U),
  }

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(canvas.clientWidth * dpr)
    const hh = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== w || canvas.height !== hh) {
      canvas.width = w
      canvas.height = hh
    }
  }

  return {
    draw(f, photos) {
      const pl = plates[f]
      const ma = masks[f]
      if (!pl?.complete || !pl.naturalWidth || !ma?.complete || !ma.naturalWidth) return
      size()
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (shown !== f) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, plateT)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pl)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, maskT)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, ma)
        shown = f
      }
      const on = [0, 0, 0, 0]
      for (let s = 0; s < 4; s++) {
        const im = photos[s]
        gl.activeTexture(gl.TEXTURE2 + s)
        gl.bindTexture(gl.TEXTURE_2D, photoT[s])
        if (im && im.complete && im.naturalWidth && photoOf[s] !== im) {
          pctx.drawImage(im, 0, 0, 512, 1024)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pot)
          gl.generateMipmap(gl.TEXTURE_2D)
          photoOf[s] = im
        }
        const c = data.frames[f][s]
        const q = c.map(([x, y]) => ({ x, y })) as unknown as Quad
        const hm = photoOf[s] && c.every((p) => p[2] > 0.05) ? solveHomography(q, UV) : null
        if (hm) {
          // row-major to GLSL's column-major
          gl.uniformMatrix3fv(h[s], false, [hm[0], hm[3], hm[6], hm[1], hm[4], hm[7], hm[2], hm[5], hm[8]])
          on[s] = 1
        }
        gl.uniform1i(u.p[s], 2 + s)
      }
      gl.uniform1i(u.plate, 0)
      gl.uniform1i(u.mask, 1)
      gl.uniform2f(u.res, canvas.width, canvas.height)
      gl.uniform2f(u.img, data.size[0], data.size[1])
      gl.uniform2f(u.foc, focus[0], focus[1])
      gl.uniform4f(u.on, on[0], on[1], on[2], on[3])
      gl.uniform1f(u.k, 1.32) // the blank face's own grey, divided back out
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.classList.add('is-ready')
    },
    destroy() {
      // free what this made; never lose the context (StrictMode hands the second mount the same one)
      ;[plateT, maskT, ...photoT].forEach((t) => gl.deleteTexture(t))
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    },
  }
}
