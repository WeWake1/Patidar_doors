// PROTOTYPE round 3 · live 3D (J "Pavilion", K "Object"): what the two three.js concepts share. A renderer with
// AgX tone mapping and soft shadows, studio reflections (RoomEnvironment), and a door built from a catalogue
// photograph: a slab with real thickness, the photo on its face (products stay photographs, decisions.md round 1
// Q8), oiled-teak edges, a clear coat so the face catches the light. The loop sleeps when the canvas is off screen.
// three has exactly one importer on the live site (Beams); this prototype is dev-only and never bundled with it.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export const CATALOGUE = [
  { id: 'architect-teak-door', name: 'Architect Teak Doors' },
  { id: 'membrane-door', name: 'Membrane Doors' },
  { id: 'burma-teak-door', name: 'Burma Teak Door' },
  { id: 'wpc-cnc-door', name: '28 mm CNC WPC Doors' },
  { id: 'honne-ab-door', name: 'Honne A & B Grade Doors' },
  { id: 'korean-membrane-door', name: 'Korean Membrane Doors' },
  { id: 'burma-border-teak-door', name: 'Burma Border Teak Door' },
  { id: 'microcoat-door', name: 'Lamination / MicroCoated Doors' },
  { id: 'gana-teak-polish-door', name: 'Gana Teak Polish Doors' },
  { id: 'primer-door', name: 'Primer Doors' },
  { id: 'mahagony-ab-door', name: 'Mahagony A & B Grade Doors' },
  { id: 'teak-osc-2nds', name: '2nds Teak OSC Doors' },
] as const

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** start the loop; `frame(dt, t)` runs every animation frame while the canvas is on screen */
  run(frame: (dt: number, t: number) => void): void
  destroy(): void
}

export function createStage(canvas: HTMLCanvasElement, opts: { fov?: number; background?: string } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  if (opts.background) scene.background = new THREE.Color(opts.background)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.55
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, 1, 0.05, 200)
  let raf = 0
  let visible = true
  let last = performance.now()
  let frame: ((dt: number, t: number) => void) | null = null
  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  const tick = (now: number) => {
    raf = 0
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    frame?.(dt, now / 1000)
    renderer.render(scene, camera)
    canvas.classList.add('is-ready')
    if (visible) raf = requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting)
    if (visible && !raf) {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  })
  io.observe(canvas)
  return {
    renderer,
    scene,
    camera,
    run(f) {
      frame = f
      if (!raf) raf = requestAnimationFrame(tick)
    },
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        mats.forEach((x) => {
          ;(x as THREE.MeshStandardMaterial).map?.dispose()
          x.dispose()
        })
      })
      env.dispose()
      pmrem.dispose()
      renderer.dispose() // the context stays with the canvas: StrictMode's second mount gets it back
    },
  }
}

const loader = new THREE.TextureLoader()
export function loadLeaf(id: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  return new Promise((ok, no) =>
    loader.load(
      `/images/leaves/${id}.webp`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = renderer.capabilities.getMaxAnisotropy()
        ok(t)
      },
      undefined,
      no,
    ),
  )
}

// oiled teak for the edges: a little canvas of streaks, enough that a slab edge doesn't read as plastic
let edgeTex: THREE.CanvasTexture | null = null
function teakEdge() {
  if (edgeTex) return edgeTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#8a5b35'
  g.fillRect(0, 0, 64, 512)
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '60,35,18' : '170,120,75'},${0.15 + Math.random() * 0.25})`
    g.lineWidth = Math.random() * 1.6 + 0.3
    const x = Math.random() * 64
    g.beginPath()
    g.moveTo(x, 0)
    g.bezierCurveTo(x + Math.random() * 6 - 3, 170, x + Math.random() * 6 - 3, 340, x + Math.random() * 4 - 2, 512)
    g.stroke()
  }
  edgeTex = new THREE.CanvasTexture(c)
  edgeTex.colorSpace = THREE.SRGBColorSpace
  return edgeTex
}

export const DOOR_H = 2.1
export const DOOR_T = 0.045

/** A door: origin at the middle of its bottom edge, face toward +Z. */
export function makeDoor(face: THREE.Texture): THREE.Group {
  const img = face.image as { width: number; height: number }
  const w = DOOR_H * (img.width / img.height)
  const geo = new RoundedBoxGeometry(w, DOOR_H, DOOR_T, 2, 0.003)
  // RoundedBoxGeometry has one group; split the faces by normal: +Z face gets the photo, -Z the same photo
  // mirrored (a door has two faces), the rest teak edge
  geo.clearGroups()
  const pos = geo.attributes.position
  const nrm = geo.attributes.normal
  const uv = geo.attributes.uv
  // RoundedBoxGeometry comes non-indexed in this three: treat every three vertices as a triangle either way
  const idx = geo.index
  const vert = (i: number) => (idx ? idx.getX(i) : i)
  const tris = idx ? idx.count : pos.count
  const groups: number[][] = [[], [], []]
  for (let i = 0; i < tris; i += 3) {
    const a = vert(i)
    const b = vert(i + 1)
    const c = vert(i + 2)
    const nz = (nrm.getZ(a) + nrm.getZ(b) + nrm.getZ(c)) / 3
    groups[nz > 0.7 ? 0 : nz < -0.7 ? 1 : 2].push(a, b, c)
  }
  for (let i = 0; i < pos.count; i++) {
    // planar UVs from position: the photo spans the face exactly
    uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / DOOR_H + 0.5)
  }
  const all = [...groups[0], ...groups[1], ...groups[2]]
  geo.setIndex(all)
  geo.addGroup(0, groups[0].length, 0)
  geo.addGroup(groups[0].length, groups[1].length, 1)
  geo.addGroup(groups[0].length + groups[1].length, groups[2].length, 2)
  const front = new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.22 })
  const back = front.clone()
  const edge = new THREE.MeshStandardMaterial({ map: teakEdge(), roughness: 0.55 })
  const mesh = new THREE.Mesh(geo, [front, back, edge])
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = DOOR_H / 2
  const g = new THREE.Group()
  g.add(mesh)
  g.userData.width = w
  return g
}

/** A soft dark blob to stand a door on: contact shadows cheaper and softer than any shadow map. */
export function contactShadow(width: number, depth = 0.5, opacity = 0.5): THREE.Mesh {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 32, 4, 64, 32, 62)
  grd.addColorStop(0, `rgba(0,0,0,${opacity})`)
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.scale(1, 0.5)
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.5, depth),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.002
  return m
}

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
