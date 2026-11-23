// PROTOTYPE round 3 · L "One room": draws a frame of the rendered room with a catalogue photograph in its door. The
// render's door face is blank white; this warps the photo into it (homography from the frame's four corners) and
// multiplies it by the render's light, so the photo carries the sun across it. Two photos and a mix: changing the
// design is a crossfade in the room's own light. G's method (r2/g/stackGl.ts) for one door. Plain WebGL 1.
import { solveHomography, type Quad } from '../../../lib/homography'

export interface RoomData {
  count: number
  size: [number, number]
  frames: [number, number, number][][][]
}

const VERT = `
attribute vec2 a_p;
varying vec2 v_uv;
void main() { v_uv = vec2(a_p.x, -a_p.y) * 0.5 + 0.5; gl_Position = vec4(a_p, 0.0, 1.0); }`
const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_plate, u_plate2, u_mask, u_a, u_b;
uniform vec2 u_res, u_img, u_foc;
uniform mat3 u_h;
uniform float u_mix, u_on, u_k, u_pmix;
void main() {
  vec2 p = v_uv * u_res;
  float s = max(u_res.x / u_img.x, u_res.y / u_img.y);
  vec2 ip = (p - (u_res - u_img * s) * u_foc) / s;
  vec2 tuv = clamp(ip / u_img, 0.0, 1.0);
  vec3 plate = mix(texture2D(u_plate, tuv).rgb, texture2D(u_plate2, tuv).rgb, u_pmix);
  float m = texture2D(u_mask, tuv).r * u_on;
  vec3 c = plate;
  if (m > 0.002) {
    vec3 q = u_h * vec3(ip, 1.0);
    vec2 uv = clamp(q.xy / q.z, 0.0, 1.0);
    vec3 photo = mix(texture2D(u_a, uv).rgb, texture2D(u_b, uv).rgb, u_mix);
    c = mix(plate, photo * plate * u_k, m);
  }
  gl_FragColor = vec4(c, 1.0);
}`
const UV: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

export interface RoomGl {
  /** f may be fractional: neighbouring frames are blended and the door's corners interpolated */
  draw(f: number, a: HTMLImageElement | null, b: HTMLImageElement | null, mix: number): void
  destroy(): void
}

export function createRoomGl(
  canvas: HTMLCanvasElement,
  data: RoomData,
  plates: HTMLImageElement[],
  masks: HTMLImageElement[],
  focus: [number, number],
): RoomGl | null {
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
  const plate2T = mk(false)
  const maskT = mk(false)
  const photoT = [mk(true), mk(true)]
  const photoOf: (HTMLImageElement | null)[] = [null, null]
  const pot = document.createElement('canvas')
  pot.width = 512
  pot.height = 1024
  const pctx = pot.getContext('2d')!
  let shown = -1
  let shown2 = -1
  const u = {
    plate: U('u_plate'), plate2: U('u_plate2'), pmix: U('u_pmix'), mask: U('u_mask'), a: U('u_a'), b: U('u_b'), res: U('u_res'), img: U('u_img'),
    foc: U('u_foc'), h: U('u_h'), mix: U('u_mix'), on: U('u_on'), k: U('u_k'),
  }
  let dead = false
  return {
    draw(ff, a, b, mixv) {
      if (dead) return
      const f = Math.floor(ff)
      const f2 = Math.min(f + 1, data.count - 1)
      const ft = ff - f
      const pl = plates[f]
      const pl2 = plates[f2]
      const ma = masks[Math.round(ff)]
      const ok = (im?: HTMLImageElement) => !!im && im.complete && im.naturalWidth > 0
      if (!ok(pl) || !ok(pl2) || !ok(ma)) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const hh = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== hh) {
        canvas.width = w
        canvas.height = hh
      }
      gl.viewport(0, 0, w, hh)
      if (shown !== f) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, plateT)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pl)
        shown = f
      }
      if (shown2 !== f2) {
        gl.activeTexture(gl.TEXTURE4)
        gl.bindTexture(gl.TEXTURE_2D, plate2T)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pl2)
        shown2 = f2
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, maskT)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, ma)
      ;[a, b].forEach((im, s) => {
        gl.activeTexture(gl.TEXTURE2 + s)
        gl.bindTexture(gl.TEXTURE_2D, photoT[s])
        if (im && im.complete && im.naturalWidth && photoOf[s] !== im) {
          pctx.drawImage(im, 0, 0, 512, 1024)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pot)
          gl.generateMipmap(gl.TEXTURE_2D)
          photoOf[s] = im
        }
      })
      const c0 = data.frames[f][0]
      const c1 = data.frames[f2][0]
      const c = c0.map((p, i) => [p[0] + (c1[i][0] - p[0]) * ft, p[1] + (c1[i][1] - p[1]) * ft, Math.min(p[2], c1[i][2])])
      const hm = c.every((p) => p[2] > 0.05) ? solveHomography(c.map(([x, y]) => ({ x, y })) as unknown as Quad, UV) : null
      if (hm) gl.uniformMatrix3fv(u.h, false, [hm[0], hm[3], hm[6], hm[1], hm[4], hm[7], hm[2], hm[5], hm[8]])
      gl.uniform1i(u.plate, 0)
      gl.uniform1i(u.plate2, 4)
      gl.uniform1f(u.pmix, ft)
      gl.uniform1i(u.mask, 1)
      gl.uniform1i(u.a, 2)
      gl.uniform1i(u.b, 3)
      gl.uniform2f(u.res, w, hh)
      gl.uniform2f(u.img, data.size[0], data.size[1])
      gl.uniform2f(u.foc, focus[0], focus[1])
      gl.uniform1f(u.mix, mixv)
      gl.uniform1f(u.on, hm && photoOf[0] ? 1 : 0)
      gl.uniform1f(u.k, 1.32)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.classList.add('is-ready')
    },
    destroy() {
      dead = true
      ;[plateT, plate2T, maskT, ...photoT].forEach((t) => gl.deleteTexture(t))
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    },
  }
}
