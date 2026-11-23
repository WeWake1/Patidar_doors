// PROTOTYPE round 3 · K "Object" (live 3D, three.js). One door presented the way Apple presents a product: alone in a
// warm white studio, soft key light, a real shadow. It turns from three-quarters to face you, then edge-on to show
// it is a slab of real thickness, then turns back as six more rise beside it into a lineup. Computers: the scroll
// drives it (a pinned section, eased so a flick glides). Phones: it plays once by itself when it comes into view,
// then "Play again" (no scroll-driven motion on phones, decisions.md round 1 Q11). Reduced motion: the lineup,
// still. The faces are catalogue photographs on 3D slabs (doors3d.ts).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { isWide, prefersReduced } from '../../lib/film'
import { CATALOGUE, clamp01, contactShadow, createStage, ease, loadLeaf, makeDoor } from '../doors3d'
import { Foot, Header, LANDMARK, Visit, WA } from '../Shell'
import '../r3.css'
import './k.css'

type V3 = [number, number, number]
interface Key {
  p: number
  pos: V3
  look: V3
  rot: number
}
const DESK: Key[] = [
  { p: 0, pos: [1.1, 1.55, 8.8], look: [0.1, 1.5, 0], rot: -0.62 },
  { p: 0.33, pos: [0, 1.35, 6.6], look: [0, 1.15, 0], rot: 0 },
  { p: 0.5, pos: [0.6, 1.3, 1.95], look: [-0.3, 1.1, 0.42], rot: 0.95 },
  { p: 0.64, pos: [0, 1.3, 6.4], look: [0, 1.1, 0], rot: 0 },
  { p: 1, pos: [0, 1.6, 15.5], look: [0, 0.95, -0.6], rot: 0 },
]
const PHONE: Key[] = [
  { p: 0, pos: [0.7, 1.5, 8.6], look: [0.05, 1.3, 0], rot: -0.62 },
  { p: 0.33, pos: [0, 1.25, 6.8], look: [0, 1.1, 0], rot: 0 },
  { p: 0.5, pos: [0.5, 1.3, 2.4], look: [-0.3, 1.1, 0.42], rot: 0.95 },
  { p: 0.64, pos: [0, 1.2, 7.0], look: [0, 1.05, 0], rot: 0 },
  { p: 1, pos: [0, 1.45, 13.5], look: [0, 1.0, -0.5], rot: 0 },
]
const LINE = 7 // the hero and six beside it
const SLOT = [0, -1, 1, -2, 2, -3, 3] // where each one stands in the lineup (0 = centre)
const CAPS: [number, number][] = [
  [0.1, 0.3],
  [0.37, 0.56],
  [0.74, 1.2],
]
const PLAY_MS = 9500

function at(keys: Key[], p: number) {
  let i = 0
  while (i < keys.length - 2 && p > keys[i + 1].p) i++
  const a = keys[i]
  const b = keys[i + 1]
  const t = ease(clamp01((p - a.p) / (b.p - a.p)))
  const mix = (u: V3, v: V3) => u.map((x, k) => x + (v[k] - x) * t) as V3
  return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), rot: a.rot + (b.rot - a.rot) * t }
}

export function ObjectHero() {
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const caps = useRef<(HTMLDivElement | null)[]>([])
  const replay = useRef(() => {})
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const cv = canvas.current
    const tr = track.current
    if (!cv || !tr) return
    const BG = '#f1f0ed'
    const st = createStage(cv, { fov: wide ? 22 : 30, background: BG })
    const { scene, camera, renderer } = st
    scene.fog = new THREE.Fog(BG, 7, 26)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#f3f1ed', roughness: 0.92 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const key = new THREE.DirectionalLight('#fff4e6', 2.4)
    key.position.set(-4, 7, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    key.shadow.radius = 8
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 })
    scene.add(key)
    scene.add(new THREE.HemisphereLight('#ffffff', '#e6dfd5', 0.75))
    const rim = new THREE.DirectionalLight('#eef2ff', 0.6)
    rim.position.set(5, 4, -4)
    scene.add(rim)

    const doors: THREE.Group[] = []
    let live = true
    Promise.all(CATALOGUE.slice(0, LINE).map((d) => loadLeaf(d.id, renderer)))
      .then((tex) => {
        if (!live) return
        tex.forEach((t, i) => {
          const g = makeDoor(t)
          g.add(contactShadow(g.userData.width as number, 0.55, 0.45))
          scene.add(g)
          doors[i] = g
        })
      })
      .catch(() => {})

    const keys = wide ? DESK : PHONE
    let p = reduced ? 1 : 0
    let target = p
    let playFrom = -1
    const progress = () => {
      const r = tr.getBoundingClientRect()
      return clamp01(-r.top / Math.max(r.height - window.innerHeight, 1))
    }
    const io = new IntersectionObserver(
      (es) => {
        if (!wide && !reduced && playFrom < 0 && es.some((e) => e.intersectionRatio > 0.55)) playFrom = performance.now()
      },
      { threshold: [0, 0.55, 1] },
    )
    io.observe(cv)
    replay.current = () => {
      setEnded(false)
      p = 0
      playFrom = performance.now()
    }
    const look = new THREE.Vector3()
    let endedSent = false
    st.run((dt, t) => {
      if (reduced) target = 1
      else if (wide) target = progress()
      else if (playFrom >= 0) target = clamp01((performance.now() - playFrom) / PLAY_MS)
      p = wide && !reduced ? p + (target - p) * (1 - Math.exp(-dt * 7)) : target
      const k = at(keys, p)
      camera.position.set(...k.pos)
      look.set(...k.look)
      camera.lookAt(look)
      const sway = (p < 0.04 || p > 0.97) && !reduced ? Math.sin(t * 0.6) * 0.05 : 0
      doors.forEach((g, i) => {
        if (!g) return
        const w = g.userData.width as number
        const s = SLOT[i]
        if (i === 0) {
          g.rotation.y = k.rot + sway
          g.position.set(0, 0, 0)
          return
        }
        const rise = ease(clamp01((p - 0.64 - Math.abs(s) * 0.045) / 0.2))
        g.visible = rise > 0
        g.position.set(s * (w + 0.42), -2.3 * (1 - rise), -Math.abs(s) * 0.4)
        g.rotation.y = -s * 0.07 + sway * 0.5
      })
      CAPS.forEach(([a, b], i) => {
        const el = caps.current[i]
        if (!el) return
        const o = reduced ? (i === 2 ? 1 : 0) : clamp01((p - a) / 0.05) * clamp01((b - p) / 0.05)
        el.style.opacity = String(o)
        el.style.visibility = o > 0.01 ? 'visible' : 'hidden'
      })
      if (title.current && wide) title.current.style.opacity = String(reduced ? 1 : clamp01(1 - p / 0.08))
      if (!wide && !reduced && p >= 1 && !endedSent) {
        endedSent = true
        setEnded(true)
      }
      if (p < 1) endedSent = false
    })
    return () => {
      live = false
      io.disconnect()
      st.destroy()
    }
  }, [wide, reduced])

  return (
    <div className="rb r3 vk" id="top">
      <Header />
      <section className="vk-hero" aria-labelledby="vk-h">
        {!wide && (
          <div className="vk-title vk-title--flow">
            <h1 id="vk-h" className="r3-title">
              Made to measure.
            </h1>
            <p className="r3-sub">Doors pressed and finished in our own factory, for your doorway alone.</p>
          </div>
        )}
        <div className="vk-track" ref={track}>
          <div className="vk-stage">
            <canvas ref={canvas} aria-label="A teak door alone in a white studio, turning; then seven doors in a row." />
            {wide && (
              <div className="vk-title" ref={title}>
                <h1 id="vk-h" className="r3-title">
                  Made to measure.
                </h1>
                <p className="r3-sub">Doors pressed and finished in our own factory, for your doorway alone.</p>
              </div>
            )}
            <div className="vk-cap r3-cap" ref={(el) => void (caps.current[0] = el)}>
              Pressed and finished in our own factory.
            </div>
            <div className="vk-cap r3-cap" ref={(el) => void (caps.current[1] = el)}>
              A slab of real thickness, cut to your doorway.
            </div>
            <div className="vk-cap vk-cap--end" ref={(el) => void (caps.current[2] = el)}>
              <p className="r3-cap">Seven of them. Come and see them for real.</p>
              <div className="r3-ctas">
                <a className="rb-btn" href="/doors">
                  See the doors
                </a>
                <a className="rb-btn rb-btn--quiet" href={WA}>
                  WhatsApp
                </a>
              </div>
            </div>
            {!wide && ended && (
              <button type="button" className="r3-again vk-again" onClick={() => replay.current()}>
                Play again
              </button>
            )}
          </div>
        </div>
      </section>
      <Visit title="Then come and see them." lead={`${LANDMARK}.`} />
      <Foot />
    </div>
  )
}
