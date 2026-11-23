// PROTOTYPE round 2 · G: Blender writes the stack's face masks (NNN.png from flip.py) as barely compressed 8-bit
// PNGs with dither in them (±1 noise everywhere), about 0.9 MB each though they are flat colour on black. This
// snaps the dither away (0-3 -> 0, 252-255 -> 255; the anti-aliased edges in between are kept), packs each as
// lossless WebP (mNNN.webp) and deletes the PNG. Run after flip.py (also re-cleans existing mNNN.webp):
//   node tools/render/r2/pack-masks.mjs reboot/frames/r2/g/desk reboot/frames/r2/g/phone
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

sharp.cache(false) // on Windows a cached input stays open and cannot be overwritten

for (const dir of process.argv.slice(2)) {
  const files = fs.readdirSync(dir).filter((f) => /^(\d{3}\.png|m\d{3}\.webp)$/.test(f))
  let before = 0
  let after = 0
  for (const f of files) {
    const src = path.join(dir, f)
    const dst = path.join(dir, f.startsWith('m') ? f : `m${f.replace('.png', '.webp')}`)
    before += fs.statSync(src).size
    const { data, info } = await sharp(fs.readFileSync(src)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let i = 0; i < data.length; i++) data[i] = data[i] <= 3 ? 0 : data[i] >= 252 ? 255 : data[i]
    fs.writeFileSync(dst, await sharp(data, { raw: info }).webp({ lossless: true, effort: 6 }).toBuffer())
    after += fs.statSync(dst).size
    if (f.endsWith('.png')) fs.unlinkSync(src)
  }
  fs.rmSync(path.join(dir, '_tmp'), { recursive: true, force: true })
  console.log(`${dir}: ${files.length} masks, ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(2)} MB`)
}
