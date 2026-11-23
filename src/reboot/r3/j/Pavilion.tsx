// PROTOTYPE round 3 · J "Pavilion" (live 3D, three.js). Twelve catalogue doors stand on low plinths along the aisle
// of an open white pavilion; a real-time sun comes through the pergola's fins and lays crisp stripes across the
// floor and the doors. The camera drifts slowly down the aisle and back by itself; on a computer the cursor turns
// your head, on a phone a sideways drag does. The door you are facing is named, and a tap opens it. Reduced motion:
// the camera stays put. Faces are catalogue photographs on 3D slabs (doors3d.ts).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { isWide, prefersReduced } from '../../lib/film'
import { CATALOGUE, contactShadow, createStage, loadLeaf, makeDoor } from '../doors3d'
import { Foot, Header, LANDMARK, Visit } from '../Shell'
import '../r3.css'
import './j.css'

export function Pavilion() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const label = useRef<HTMLAnchorElement>(null)
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const SKY = '#e8edf1'
    const st = createStage(cv, { fov: wide ? 40 : 56, background: SKY })
    const { scene, camera, renderer } = st
    scene.fog = new THREE.Fog(SKY, 10, 30)
    const white = new THREE.MeshStandardMaterial({ color: '#f2f0eb', roughness: 0.85 })
    const stone = new THREE.MeshStandardMaterial({ color: '#e6dfd3', roughness: 0.7 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), stone)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m = white) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      b.position.set(x, y, z)
      b.castShadow = true
      b.receiveShadow = true
      scene.add(b)
      return b
    }
    // the pergola: columns, two beams, and fins across the aisle every 45 cm
    const Z0 = 3.2
    const Z1 = -12.5
    for (const x of [-3.1, 3.1]) {
      for (let z = Z0; z >= Z1; z -= 3.9) box(0.26, 3.5, 0.26, x, 1.75, z)
      box(0.3, 0.32, Z0 - Z1 + 0.3, x, 3.66, (Z0 + Z1) / 2)
    }
    for (let z = Z0; z >= Z1; z -= 0.45) box(6.5, 0.24, 0.06, 0, 3.94, z)
    // the sun: crisp shadows (a high-resolution map over just the pavilion)
    const sun = new THREE.DirectionalLight('#fff0db', 3.4)
    sun.position.set(-7, 10, 3)
    sun.target.position.set(0, 0, -4)
    sun.castShadow = true
    sun.shadow.mapSize.set(4096, 4096)
    sun.shadow.bias = -0.0002
    sun.shadow.normalBias = 0.015
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 12, bottom: -12, near: 1, far: 40 })
    scene.add(sun, sun.target)
    scene.add(new THREE.HemisphereLight('#e3ebf2', '#eadfce', 1.0))

    // twelve doors facing the aisle, six a side, each on a low plinth
    const doors: { g: THREE.Group; i: number }[] = []
    let live = true
    Promise.all(CATALOGUE.map((d) => loadLeaf(d.id, renderer)))
      .then((tex) => {
        if (!live) return
        tex.forEach((t, i) => {
          const side = i % 2 ? 1 : -1
          const z = 1.4 - Math.floor(i / 2) * 2.15
          const g = makeDoor(t)
          g.add(contactShadow(g.userData.width as number, 0.4, 0.4))
          g.position.set(side * 1.9, 0.06, z)
          g.rotation.y = -side * (Math.PI / 2)
          scene.add(g)
          box(1.3, 0.06, 0.5, side * 1.9, 0.03, z)
          doors.push({ g, i })
        })
      })
      .catch(() => {})

    // looking about: the cursor (computers) or a sideways drag (phones) turns the head
    let yaw = 0
    let yawT = 0
    let pitchT = 0
    let pitch = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = cv.getBoundingClientRect()
      yawT = -((e.clientX - r.left) / r.width - 0.5) * 0.9
      pitchT = -((e.clientY - r.top) / r.height - 0.5) * 0.2
    }
    let dragX = -1
    let dragYaw = 0
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      dragX = e.clientX
      dragYaw = yawT
    }
    const onDrag = (e: PointerEvent) => {
      if (dragX < 0) return
      yawT = Math.max(-1.3, Math.min(1.3, dragYaw - ((e.clientX - dragX) / cv.clientWidth) * 2.2))
    }
    const onUp = () => {
      dragX = -1
    }
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', onUp)
    const ray = new THREE.Raycaster()
    let facing = -1
    const onClick = (e: MouseEvent) => {
      const r = cv.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const hit = ray.intersectObjects(doors.map((d) => d.g), true)[0]
      const d = hit && doors.find((x) => x.g === hit.object.parent)
      if (d) window.location.href = `/product/${CATALOGUE[d.i].id}`
    }
    cv.addEventListener('click', onClick)

    const fwd = new THREE.Vector3()
    const to = new THREE.Vector3()
    st.run((dt, t) => {
      // down the aisle and back, slowly: 50 s there and back, eased at the ends
      const s = reduced ? 0.15 : (1 - Math.cos((t / 50) * Math.PI * 2)) / 2
      const z = 4.6 - s * 10.5
      yaw += (yawT + (reduced ? 0 : Math.sin(t * 0.21) * 0.28) - yaw) * (1 - Math.exp(-dt * 3))
      pitch += (pitchT - pitch) * (1 - Math.exp(-dt * 3))
      camera.position.set(Math.sin(t * 0.13) * (reduced ? 0 : 0.18), 1.58, z)
      camera.rotation.set(pitch - 0.04, yaw, 0, 'YXZ')
      // which door the view is on: the nearest in front within the middle of the picture
      camera.getWorldDirection(fwd)
      let best = -1
      let bestScore = 0.86
      for (const d of doors) {
        to.copy(d.g.position).setY(1.1).sub(camera.position)
        const dist = to.length()
        const score = to.normalize().dot(fwd) - dist * 0.012
        if (score > bestScore) {
          bestScore = score
          best = d.i
        }
      }
      if (best !== facing && label.current) {
        facing = best
        label.current.style.opacity = best < 0 ? '0' : '1'
        if (best >= 0) {
          label.current.href = `/product/${CATALOGUE[best].id}`
          label.current.firstChild!.textContent = CATALOGUE[best].name
        }
      }
    })
    return () => {
      live = false
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onDrag)
      window.removeEventListener('pointerup', onUp)
      cv.removeEventListener('click', onClick)
      st.destroy()
    }
  }, [wide, reduced])

  return (
    <div className="rb r3 vj" id="top">
      <Header />
      <section className="vj-hero" aria-labelledby="vj-h">
        <div className="vj-copy">
          <h1 id="vj-h" className="r3-title">
            Doors, in daylight.
          </h1>
          <p className="r3-sub">
            Twelve from our catalogue, standing in the sun. {wide ? 'Look around.' : 'Drag to look around.'} Then
            come and see them for real.
          </p>
        </div>
        <div className="vj-scene">
          <canvas
            ref={canvas}
            aria-label="An open white pavilion; sunlight through its fins falls in stripes across twelve doors standing along the aisle."
          />
          <a className="vj-label" ref={label} href="/doors">
            <span>Doors</span> <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <Visit title="Come and see them for real." lead={`${LANDMARK}.`} />
      <Foot />
    </div>
  )
}
