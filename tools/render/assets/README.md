# Render assets (round 3 on)

All **CC0** from [Poly Haven](https://polyhaven.com) (no attribution required), downloaded with
`node tools/render/assets/fetch.mjs kind:id:res ...` (re-run it to restore anything missing). HDRIs go to
`../hdri/`.

| Kind | Id | Used in |
|---|---|---|
| model | `potted_plant_02`, `potted_plant_04`, `fern_02` | Arrival (court planters), One room (by the window) |
| model | `modern_arm_chair_01`, `side_table_01`, `ceramic_vase_03`, `wooden_stool_01` | One room; the vase also in Arrival |
| texture | `white_plaster_02` | walls (its height map only; `kit3.white_wall` paints them white) |
| texture | `marble_tiles`, `wood_floor`, `concrete_wall_008` | Arrival's floor and facade, One room's oak floor |
| texture | `stacked_stone_wall`, `japanese_stone_wall`, `granite_tile`, `terrazzo_tiles` | the first, rejected dusk version of Arrival (`r3/dusk.py`); kept for later scenes |
| hdri | `qwantani_dusk_2`, `kiara_9_dusk`, `entrance_hall` | the dusk version; the daylight scenes use Blender's physical sky |

The door faces in every round-3 scene are the catalogue's leaf photographs (`public/images/leaves/`), which
are still the placeholders found online.
