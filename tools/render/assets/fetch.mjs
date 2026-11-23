// PROTOTYPE render assets: downloads CC0 models, textures and HDRIs from Poly Haven (polyhaven.com, CC0) into
// tools/render/assets/<id>/ (models, textures) and tools/render/hdri/ (HDRIs). Re-run to restore them.
//   node tools/render/assets/fetch.mjs model:potted_plant_04:1k tex:stacked_stone_wall:2k hdri:qwantani_dusk_2:2k
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const HDRI = path.join(HERE, '..', 'hdri')
const get = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}
const save = async (url, file) => {
  if (fs.existsSync(file)) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, await get(url))
  console.log('saved', path.relative(HERE, file))
}

for (const spec of process.argv.slice(2)) {
  const [kind, id, res = '1k'] = spec.split(':')
  const files = JSON.parse((await get(`https://api.polyhaven.com/files/${id}`)).toString())
  if (kind === 'model') {
    const g = files.gltf[res].gltf
    const dir = path.join(HERE, id)
    await save(g.url, path.join(dir, path.basename(new URL(g.url).pathname)))
    for (const [rel, f] of Object.entries(g.include ?? {})) await save(f.url, path.join(dir, rel))
  } else if (kind === 'tex') {
    const want = { Diffuse: 'diff', nor_gl: 'nor_gl', Rough: 'rough', Displacement: 'disp' }
    for (const [k, short] of Object.entries(want)) {
      const f = files[k]?.[res]?.jpg ?? files[k]?.[res]?.png
      if (f) await save(f.url, path.join(HERE, id, `${id}_${short}_${res}${path.extname(f.url)}`))
    }
  } else if (kind === 'hdri') {
    await save(files.hdri[res].hdr.url, path.join(HDRI, `${id}_${res}.hdr`))
  }
}
