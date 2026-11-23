"""PROTOTYPE round 2 · F "Actual size" (wild): an eight-foot teak door at its real size. The page lays this strip
down the screen at the screen's own millimetres and the visitor scrolls down the door; captions sit at their
real heights, a tape runs down the edge and a small map says where on the door they are.

Orthographic, square on, rendered in horizontal bands so a strip three metres tall stays a few megapixels a
file. Writes NN.webp (band 0 at the top) and strip.json (how to lay the bands out, and where things are). With
--map it writes only map.webp, the whole doorway small, for the "you are here" map.

  blender -b --factory-startup --python tools/render/r2/actual.py -- --out <dir> --set desk|phone [--map]
      [--frames 0-14] [--test]

Coordinates are millimetres: x = 0 is the doorway's centre line (the lock edge at +457), z = 0 the floor.
True thing (decisions.md, round 1 Q9): everything is made to measure. The door is representative; 8 feet is
the reference height of the site's own price list (src/config.ts, baseSizeLabel).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--set", choices=["desk", "phone"], default="desk")
ap.add_argument("--map", action="store_true")
opt, _ = ap.parse_known_args(C.argv)
scene = C.scene

W_MM, H_MM = 914, 2438                     # 3 ft by 8 ft
SETS = {                                   # strip x range (mm), pixels per mm
    "desk": dict(x=(-150, 700), ppm=7.0),     # wide enough for a 2560 px screen at 4 px/mm
    "phone": dict(x=(300, 450), ppm=12.0),
}
TOP, BAND = 2940, 200                      # the strip starts 2940 mm up (wall above the door) and comes in 200 mm bands
COUNT = 15                                 # down to -60 mm: the floor line and a sliver under it

C.setup_cycles(exposure=-0.45, bounces=10)
leaf = D.teak("teak_leaf", "polished", tex="teak_veneer_8k", pores=1.0, val=0.6, sat=1.2)
# matte black hardware: square on and orthographic, a flat brass plate reflects one direction and reads as paint
d = D.door(W_MM, H_MM, 45, "panel", leaf, frame_mat=D.teak("frame", "polished", tex="teak_veneer_8k", val=0.48),
           hw_mat=D.dark_metal("black_hw", 0.38), handle="lever", lock_height=1050)
ow, oh = d["opening"]
D.wall_around(ow, oh, d["frame_face"], 160, 2200, 2200, 3400, D.plaster("wall", "#ECEBE7"))
skirt = D.flat("skirting", "#DCDBD6", 0.5)
for side in (-1, 1):
    D.box(f"skirting_{side}", (1600, 12, 80), (side * (ow / 2 + 70 + 800), -86, 40), skirt, "x", 0.6)
D.floor("floor", (9000, 9000), D.stone("floor", base="#A7A9A4", alt="#9FA19C", rough=0.35), (0, -4000, 0))
FLOOR = "#9FA19C"
C.world_hdri("studio_small_09_2k.hdr", strength=0.25, rotate_deg=30, camera_color=FLOOR)
C.area("window", (-2.6, -2.2, 3.2), 2.2, 900, "#FFF2E2", (0.2, 0.0, 1.3), size_y=2.6)   # upper left: mouldings shade
C.area("fill", (2.4, -2.6, 1.2), 2.4, 90, "#EEF2FF", (0.2, 0.0, 1.2))
C.area("card", (0.3, -2.8, 1.4), 3.2, 70, "#FFFFFF", (0.3, 0.0, 1.4), size_y=3.2)     # what the brass reflects

cam = C.camera(50)
cam.data.type = "ORTHO"
cam.data.sensor_fit = "HORIZONTAL"
cam.rotation_euler = (math.radians(90), 0, 0)
cam.data.clip_end = 20.0

out = C.args.out
if opt.map:
    x0, x1 = -760, 760
    cam.data.ortho_scale = (x1 - x0) * D.MM
    scene.render.resolution_x = 300
    scene.render.resolution_y = round(300 * (TOP + 60) / (x1 - x0))
    cam.location = ((x0 + x1) / 2 * D.MM, -3.0, (TOP - 60) / 2 * D.MM)
    C.render_to(os.path.join(out, "map.webp"))
    sys.exit(0)

S = SETS[opt.set]
x0, x1 = S["x"]
ppm = S["ppm"]
scene.render.resolution_x = round((x1 - x0) * ppm)
scene.render.resolution_y = round(BAND * ppm)
cam.data.ortho_scale = (x1 - x0) * D.MM
for b in C.frame_list(COUNT):
    zc = TOP - BAND * (b + 0.5)
    cam.location = ((x0 + x1) / 2 * D.MM, -3.0, zc * D.MM)
    C.render_to(os.path.join(out, f"{b:02d}.webp"))

lz = 1050                                    # doorkit: the lock rail's height; the lever sits 30 mm above
with open(os.path.join(out, "strip.json"), "w") as fh:
    json.dump({
        "ppm": ppm, "x_mm": [x0, x1], "top_mm": TOP, "band_mm": BAND, "count": COUNT,
        "door": {"width": W_MM, "height": H_MM, "top": H_MM + 8, "lock_edge": W_MM / 2, "head_top": H_MM + 8 + 3 + 70,
                 "lever": [W_MM / 2 - 62 - 55, lz + 30], "rose_x": W_MM / 2 - 62, "keyhole": [W_MM / 2 - 62, lz - 85]},
    }, fh)
print("STRIP", opt.set, scene.render.resolution_x, scene.render.resolution_y, COUNT)
