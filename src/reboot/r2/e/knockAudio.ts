// PROTOTYPE round 2 · E "Knock": a knuckle on four materials, synthesised (no recordings, no download). A knock is
// a short burst of noise (the knuckle) ringing a handful of the board's own resonances, each dying away at its
// own rate, plus a low thump for the mass behind it, in a small room. The presets are educated guesses at each
// material's character, checked as spectrograms (scripts in the round-2 notes), not by ear: the final site
// should use recordings of the store's own doors.

export type Material = 'door' | 'timber' | 'ply' | 'wpc'
interface Mode {
  f: number // Hz
  d: number // seconds for the ring to fall by 1/e
  g: number // relative level
}
interface Preset {
  modes: Mode[]
  thump: { f0: number; f1: number; d: number; g: number }
  knuckle: number // low-pass on the knuckle's noise, Hz: harder materials sound brighter
  click: number // level of the knuckle itself
  gain: number // overall, so the four sit at about the same loudness
}

export const PRESETS: Record<Material, Preset> = {
  // Most of a knock lives between 300 Hz and 2 kHz (the "tock"); the thump below that is felt more than heard,
  // and a phone's speaker drops almost everything under ~300 Hz, so it is kept small.
  // a framed solid door: a deep, short knock with a little wooden ring
  door: {
    modes: [
      { f: 180, d: 0.05, g: 0.7 },
      { f: 290, d: 0.045, g: 1 },
      { f: 420, d: 0.035, g: 0.95 },
      { f: 610, d: 0.028, g: 0.8 },
      { f: 880, d: 0.02, g: 0.6 },
      { f: 1250, d: 0.014, g: 0.45 },
      { f: 1800, d: 0.009, g: 0.3 },
    ],
    thump: { f0: 110, f1: 85, d: 0.05, g: 0.15 },
    knuckle: 3400,
    click: 0.5,
    gain: 0.75,
  },
  // a log's end: dead and heavy, almost no ring
  timber: {
    modes: [
      { f: 220, d: 0.03, g: 0.8 },
      { f: 380, d: 0.024, g: 1 },
      { f: 620, d: 0.018, g: 0.8 },
      { f: 980, d: 0.012, g: 0.5 },
      { f: 1600, d: 0.008, g: 0.3 },
    ],
    thump: { f0: 120, f1: 90, d: 0.04, g: 0.16 },
    knuckle: 2800,
    click: 0.55,
    gain: 0.65,
  },
  // a stack of sheets: boxier, rings longer, more middle
  ply: {
    modes: [
      { f: 200, d: 0.07, g: 0.6 },
      { f: 330, d: 0.06, g: 0.9 },
      { f: 510, d: 0.05, g: 1 },
      { f: 760, d: 0.04, g: 0.8 },
      { f: 1100, d: 0.028, g: 0.6 },
      { f: 1600, d: 0.018, g: 0.4 },
    ],
    thump: { f0: 130, f1: 110, d: 0.04, g: 0.2 },
    knuckle: 3600,
    click: 0.5,
    gain: 1.15,
  },
  // WPC: dense and plasticky, a higher, shorter "tok"
  wpc: {
    modes: [
      { f: 420, d: 0.026, g: 0.9 },
      { f: 760, d: 0.022, g: 1 },
      { f: 1180, d: 0.016, g: 0.85 },
      { f: 1750, d: 0.011, g: 0.6 },
      { f: 2600, d: 0.007, g: 0.4 },
    ],
    thump: { f0: 170, f1: 140, d: 0.025, g: 0.1 },
    knuckle: 5000,
    click: 0.6,
    gain: 0.55,
  },
}

/** Render one knock into any BaseAudioContext (the live one, or an OfflineAudioContext for checking it). */
export function renderKnock(ctx: BaseAudioContext, out: AudioNode, m: Material, at: number, vel = 1, pan = 0) {
  const p = PRESETS[m]
  const jit = () => 1 + (Math.random() - 0.5) * 0.06 // no two knocks quite alike
  const v = vel * (0.85 + Math.random() * 0.3)
  const sum = ctx.createGain()
  sum.gain.value = p.gain * v
  let dest: AudioNode = sum
  if ('createStereoPanner' in ctx) {
    const sp = ctx.createStereoPanner()
    sp.pan.value = Math.max(-1, Math.min(1, pan))
    sum.connect(sp)
    dest = sp
  }
  dest.connect(out)
  // the knuckle: 40 ms of noise, hit hard and gone in a few milliseconds
  const len = Math.round(ctx.sampleRate * 0.04)
  const nb = ctx.createBuffer(1, len, ctx.sampleRate)
  const ch = nb.getChannelData(0)
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = nb
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(1, at + 0.0007)
  env.gain.exponentialRampToValueAtTime(0.001, at + 0.012)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = p.knuckle * jit()
  src.connect(env).connect(lp)
  const click = ctx.createGain()
  click.gain.value = p.click
  lp.connect(click).connect(sum)
  // the board: band-pass resonators, Q set by how long each mode rings (tau = Q / (pi f))
  for (const mo of p.modes) {
    const f = mo.f * jit()
    const q = Math.PI * f * mo.d
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = q
    const g = ctx.createGain()
    g.gain.value = mo.g * Math.sqrt(q) * 8 // a narrow band passes little of a short click: give it back
    lp.connect(bp).connect(g).connect(sum)
  }
  // the mass behind it: a low sine that drops in pitch as it dies
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(p.thump.f0, at)
  o.frequency.exponentialRampToValueAtTime(p.thump.f1, at + p.thump.d * 2)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0, at)
  og.gain.linearRampToValueAtTime(p.thump.g * 0.5, at + 0.002)
  og.gain.exponentialRampToValueAtTime(0.001, at + p.thump.d * 4)
  o.connect(og).connect(sum)
  src.start(at)
  o.start(at)
  o.stop(at + p.thump.d * 4 + 0.05)
  src.stop(at + 0.05)
}

/** A small room: 0.4 s of decaying noise, darker as it goes. */
export function roomImpulse(ctx: BaseAudioContext) {
  const len = Math.round(ctx.sampleRate * 0.4)
  const b = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    let lpv = 0
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate
      const k = 0.35 + 0.6 * Math.exp(-t / 0.08) // the low-pass closes as the tail goes on
      lpv += (Math.random() * 2 - 1 - lpv) * k
      d[i] = lpv * Math.exp(-t / 0.075) * (t < 0.004 ? t / 0.004 : 1)
    }
  }
  return b
}

let live: { ctx: AudioContext; out: GainNode } | null = null

/** The page's sound. Call from inside a tap (browsers start audio only from a gesture). */
export function knock(m: Material, pan: number, on: boolean) {
  if (!on) return
  if (!live) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const out = ctx.createGain()
    out.gain.value = 0.9
    const dry = ctx.createGain()
    dry.gain.value = 1
    const wet = ctx.createGain()
    wet.gain.value = 0.16
    const room = ctx.createConvolver()
    room.buffer = roomImpulse(ctx)
    out.connect(dry).connect(ctx.destination)
    out.connect(room).connect(wet).connect(ctx.destination)
    live = { ctx, out }
  }
  const { ctx, out } = live
  if (ctx.state === 'suspended') void ctx.resume()
  renderKnock(ctx, out, m, ctx.currentTime + 0.004, 1, pan * 0.6)
}
