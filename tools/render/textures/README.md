# Render textures and HDRIs (all CC0)

Photographed material scans used by `tools/render/doorkit.py` and the scene scripts. Every set is CC0
(public domain): no attribution needed, free for commercial use. Downloaded 2026-11-23.

| Folder | What | Source | Used for |
|---|---|---|---|
| `teak_veneer/` | Teak veneer, 1 m × 1 m scan, 4K (diffuse, roughness, OpenGL normal, displacement) | [Poly Haven · teak_veneer](https://polyhaven.com/a/teak_veneer) | Every finished teak door and frame; the fresh-sawn faces in "The first cut" |
| `teak_veneer/teak_veneer_diff_8k.jpg` | The same scan's colour map at 8K (32 MB) | [Poly Haven · teak_veneer](https://polyhaven.com/a/teak_veneer) | Round 2 "Actual size", where the door is seen at its real size (8 px per mm instead of 4) |
| `TreeEnd003/` | A photographed log end with its rings, a check and the bark rim, 2K (colour, opacity, normal, roughness) | [ambientCG · TreeEnd003](https://ambientcg.com/view?id=TreeEnd003) | The log's end grain in "The first cut"; its opacity map also gives the log its outline |
| `Bark014/` | Fibrous bark, 2K | [ambientCG · Bark014](https://ambientcg.com/view?id=Bark014) | The log's bark |
| `Wood087/` | Plywood edge (layers), 2K | [ambientCG · Wood087](https://ambientcg.com/view?id=Wood087) | The ply sheet's edge in "Four materials" |
| `Wood092/` | Light softwood, 2K | [ambientCG · Wood092](https://ambientcg.com/view?id=Wood092) | The blockboard core inside the door corner sample |

Tried for teak and dropped (they read as walnut and as weathered oak): ambientCG
[Wood026](https://ambientcg.com/view?id=Wood026) and [Wood066](https://ambientcg.com/view?id=Wood066).
The set here is about 87 MB, and the HDRIs another 25 MB; everything is re-downloadable from the links.

HDRIs in `../hdri/` (2K, Poly Haven, CC0): `studio_small_09`, `photo_studio_loft_hall`, `lebombo`,
`artist_workshop`. They light the scenes; what the camera sees is usually a flat studio colour instead
(`common.world_hdri(camera_color=...)`).
