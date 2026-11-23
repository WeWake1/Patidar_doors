"""PROTOTYPE round 3 · I "Dusk" (Blender film): arriving at a main door at blue hour. A stone-clad facade with a
deep teak-lined portal under a cantilevered concrete canopy, a polished granite porch, real plants, warm light
grazing the stone and pooling on the door; the camera glides from the drive up to the door.

The door's face is a catalogue photograph (photo_door): products stay photographs. Everything else is real CC0
scans and models (tools/render/assets/README.md).

  blender -b --factory-startup --python tools/render/r3/dusk.py -- --out <dir> --size 1600x900 [--phone]
      [--count 96] [--frames 0-95] [--test]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import kit3 as K  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=96)
ap.add_argument("--leaf", default="architect-teak-door")
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
C.setup_cycles(exposure=0.35, bounces=10)
if hasattr(scene.cycles, "feature_set"):  # Blender 5 dropped it
    scene.cycles.feature_set = "EXPERIMENTAL"

# ------------------------------------------------------------------ materials
stone = K.pbr("stone", "stacked_stone_wall", size_m=1.6, val=0.78, sat=0.8, displace=0.025, bump=0)
granite = K.pbr("granite", "granite_tile", size_m=1.2, val=0.55, sat=0.6, rough=(0.08, 0.22), bump=0.15)
concrete = K.pbr("concrete", "concrete_wall_008", size_m=2.5, val=0.85, sat=0.4, rough=(0.7, 0.9), bump=0.4)
drive = K.pbr("drive", "concrete_wall_008", size_m=3.0, val=0.35, sat=0.4, rough=(0.25, 0.5), bump=0.3)
plaster = K.pbr("plaster", "white_plaster_02", size_m=1.5, val=0.9, sat=0.5, bump=0.3)
lining = D.teak("lining", "oiled", val=0.36, sat=1.1)
glass = bpy.data.materials.new("frosted")
glass.use_nodes = True
gb = glass.node_tree.nodes["Principled BSDF"]
gb.inputs["Transmission Weight"].default_value = 1.0
gb.inputs["Roughness"].default_value = 0.35
gb.inputs["IOR"].default_value = 1.5
glow = bpy.data.materials.new("interior_glow")
glow.use_nodes = True
gt = glow.node_tree
gt.nodes.remove(gt.nodes["Principled BSDF"])
ge = gt.nodes.new("ShaderNodeEmission")
ge.inputs["Color"].default_value = (*C.srgb("#FFB36A"), 1)
ge.inputs["Strength"].default_value = 6.0
gt.links.new(ge.outputs[0], gt.nodes["Material Output"].inputs["Surface"])

# ------------------------------------------------------------------ the facade with its portal (mm, doorkit boxes)
DEPTH = 450                                    # how deep the portal is
DOOR_H = 2550
door, door_w = K.photo_door(opt.leaf, DOOR_H / 1000, 0.05, lip=D.teak("lip", "polished", val=0.42))
DW = round(door_w * 1000)
SIDE = 420                                     # the frosted sidelight beside the door
PW = DW + SIDE + 3 * 60                        # the portal's clear width: door, sidelight, three 60 mm posts
PH = DOOR_H + 80 + 420                         # door, a head, and a band of lining above
WALL_H, WALL_W, T = 4300, 9000, 300
x0 = -PW / 2
for name, w, cx, z0, h in (
    ("wall_l", (WALL_W - PW) / 2, -(PW / 2 + (WALL_W - PW) / 4), 0, WALL_H),
    ("wall_r", (WALL_W - PW) / 2, PW / 2 + (WALL_W - PW) / 4, 0, WALL_H),
    ("wall_t", PW, 0, PH, WALL_H - PH),
):
    ob = D.box(name, (w, T, h), (cx, T / 2, z0 + h / 2), stone, "z", 0)
    K.subdivide(ob, 7)
# the portal: lined in teak, the door and the sidelight at its back
D.box("lining_l", (40, DEPTH, PH), (x0 + 20, DEPTH / 2, PH / 2), lining, "z", 1.0)
D.box("lining_r", (40, DEPTH, PH), (-x0 - 20, DEPTH / 2, PH / 2), lining, "z", 1.0)
D.box("lining_t", (PW, DEPTH, 40), (0, DEPTH / 2, PH - 20), lining, "x", 1.0)
D.box("back", (PW, 60, PH), (0, DEPTH + 90, PH / 2), plaster, "z", 0)
dx = x0 + 60 + DW / 2
door.location = (dx / 1000, (DEPTH + 10) / 1000, 0.0)
D.box("head", (DW + 120, 60, 80), (dx, DEPTH + 30, DOOR_H + 40), lining, "x", 1.0)
for i, px in enumerate((x0 + 30, x0 + 60 + DW + 30, -x0 - 30)):
    D.box(f"post_{i}", (60, 80, DOOR_H + 80), (px, DEPTH + 30, (DOOR_H + 80) / 2), lining, "z", 1.0)
sx = x0 + 60 + DW + 60 + SIDE / 2
D.box("sidelight", (SIDE, 12, DOOR_H), (sx, DEPTH + 20, DOOR_H / 2), glass, "z", 0)
D.box("sidelight_glow", (SIDE, 4, DOOR_H), (sx, DEPTH + 70, DOOR_H / 2), glow, "z", 0)
# a slim brass pull on the door, and the door's own light: a downlight in the portal's head
D.cylinder("pull", 12, 1100, (dx + DW / 2 - 110, DEPTH - 45, 1150), D.brass("pull_brass", 0.18), "z", None, 32, 1.0)
for sx2 in (-1, 1):
    D.cylinder(f"pull_post_{sx2}", 7, 45, (dx + DW / 2 - 110, DEPTH - 22, 1150 + sx2 * 480), D.brass("pp", 0.2), "y",
               None, 24)

# ------------------------------------------------------------------ the entrance court: side walls, a roof slab,
# and the street facade with one big opening onto it; looking in from the drive there is no horizon, only the court
COURT_W, COURT_D, COURT_H = PW + 2 * 1300, 3600, 3550
cw2 = COURT_W / 2
for side in (-1, 1):
    ob = D.box(f"court_{side}", (T, COURT_D, COURT_H), (side * (cw2 + T / 2), -COURT_D / 2, COURT_H / 2), stone, "z", 0)
    K.subdivide(ob, 7)
D.box("roof", (COURT_W + 2 * T, COURT_D + T, 260), (0, -COURT_D / 2 + T / 2, COURT_H + 130), concrete, "x", 2.0)
D.box("court_floor", (COURT_W, COURT_D + DEPTH, 160), (0, -COURT_D / 2 + DEPTH / 2, -80), granite, "x", 0)
FY = -COURT_D - 150                                  # the street facade, around the opening
D.box("facade_l", (6000, 300, 7000), (-cw2 - T - 3000, FY, 3000), concrete, "z", 0)
D.box("facade_r", (6000, 300, 7000), (cw2 + T + 3000, FY, 3000), concrete, "z", 0)
D.box("facade_t", (COURT_W + 2 * T, 300, 7000 - COURT_H - 260), (0, FY, COURT_H + 260 + (7000 - COURT_H - 260) / 2 - 500),
      concrete, "x", 0)
for i in range(2):                                   # two steps down to the drive
    D.box(f"step_{i}", (COURT_W, 380, 150), (0, FY - 150 - 190 - 380 * i, -75 - 150 * i), granite, "x", 2.0)
D.box("drive", (30000, 16000, 100), (0, FY - 1100 - 8000, -360), drive, "x", 0)
# planters along the court's side walls, and plants in them
for side in (-1, 1):
    D.box(f"planter_{side}", (520, 2400, 380), (side * (cw2 - 260), -COURT_D / 2 - 200, 190), concrete, "y", 6.0)
K.model("potted_plant_02", (-cw2 / 1000 + 0.3, -0.9, 0.38), rot_deg=30, height=1.05)
K.model("fern_02", (-cw2 / 1000 + 0.28, -2.3, 0.38), rot_deg=-40, height=0.6)
K.model("fern_02", (cw2 / 1000 - 0.28, -1.2, 0.38), rot_deg=100, height=0.62)
K.model("potted_plant_04", (cw2 / 1000 - 0.3, -2.6, 0.38), rot_deg=200, height=0.7)

# ------------------------------------------------------------------ light: blue hour outside, warm lamps inside
C.world_hdri("qwantani_dusk_2_2k.hdr", strength=0.35, rotate_deg=190)
WARM = "#FFB16A"
for side in (-1, 1):                                 # uplights at the foot of the side walls, grazing the stone
    for k, yy in enumerate((-0.7, -2.0, -3.2)):
        x = side * (cw2 / 1000 - 0.08)
        K.spot(f"up_{side}_{k}", (x, yy, 0.42), (side * (cw2 / 1000 + 0.3), yy, 3.2), 260, WARM, 32, 0.5, 0.015)
for k, yy in enumerate((-1.0, -2.6)):                 # downlights in the roof slab
    K.spot(f"down_{k}", (0.0, yy, COURT_H / 1000 - 0.02), (0.0, yy - 0.05, 0.0), 320, WARM, 60, 0.85, 0.04)
K.spot("door_light", (dx / 1000, DEPTH / 1000 - 0.12, PH / 1000 - 0.06), (dx / 1000, DEPTH / 1000 + 0.02, 1.1), 420,
       WARM, 50, 0.8, 0.02)
K.spot("stone_wash", (0.0, -0.6, COURT_H / 1000 - 0.05), (0.0, 0.0, 1.6), 260, WARM, 75, 0.9, 0.05)

# ------------------------------------------------------------------ camera: from the drive to the door
cam = C.camera(30 if opt.phone else 32)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 4.0
door_c = Vector((dx / 1000, DEPTH / 1000, 1.3))


def place(t):
    """t 0..1: from the drive outside the opening, up the steps and through the court, to the door."""
    e = C.ease_in_out(t)
    y = -8.6 + (-2.3 + 8.6) * e
    z = 1.25 + 0.3 * e
    x = dx / 1000 * e + 0.25 * (1 - e)
    cam.location = (x, y, z)
    look = door_c + Vector((0, 0, 0.35 * (1 - e) + 0.05))
    C.look_at(cam, look)
    cam.data.dof.focus_distance = (door_c - cam.location).length


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
