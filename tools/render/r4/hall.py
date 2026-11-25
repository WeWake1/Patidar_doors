"""PROTOTYPE round 4 · O "The hall" (Blender film, plays by itself). Inside the home: a calm double-height hall, white
plaster, a pale polished floor, and along its long wall four catalogue doors in slim teak frames, with a bench,
plants and a vase between them. The far side is floor-to-ceiling glass in slim mullions: low morning sun comes
through and lays the mullions' shadows diagonally across the floor and up the doors. The camera tracks slowly
along the doors. (A first version lit from a skylight slot only reached the top metre of the wall.)
(The owner's round-4 answers: other rooms in the same style; a more cinematic camera; more photoreal detail.)

  blender -b --factory-startup --python tools/render/r4/hall.py -- --out <dir> --size 1600x900 [--phone]
      [--count 144] [--frames 0-143] [--test]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "r3"))
import common as C  # noqa: E402
import bpy  # noqa: E402
import doorkit as D  # noqa: E402
import kit3 as K  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=144)
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
C.setup_cycles(exposure=0.45, bounces=12)

plaster = K.white_wall("plaster")
floor_m = K.pbr("floor", "smooth_concrete_floor", size_m=3.0, val=1.6, sat=0.1, rough=(0.18, 0.32), bump=0.06)
frame_m = D.teak("frame", "oiled", val=0.55, sat=1.0)
bench_m = D.teak("bench", "oiled", val=0.6, sat=1.0)

# ------------------------------------------------------------------ the hall (mm): the door wall's face at y = 0
L, Wd, H = 18000, 4600, 6200
D.box("floor", (L, Wd + 400, 120), (0, -Wd / 2, -60), floor_m, "x", 0)
D.box("door_wall", (L, 300, H), (0, 150, H / 2), plaster, "z", 0)
for side in (-1, 1):
    D.box(f"end_{side}", (300, Wd + 600, H), (side * (L / 2 + 150), -Wd / 2, H / 2), plaster, "z", 0)
D.box("ceiling", (L, Wd + 300, 300), (0, -Wd / 2, H + 150), plaster, "x", 0)
# the far side is glass, floor to ceiling, in slim mullions: the sun comes through it onto the floor and the doors
glass = bpy.data.materials.new("glass")
glass.use_nodes = True
gb = glass.node_tree.nodes["Principled BSDF"]
gb.inputs["Transmission Weight"].default_value = 1.0
gb.inputs["Roughness"].default_value = 0.0
gb.inputs["IOR"].default_value = 1.45
# with caustics off, glass would block the sun and the sky's light entirely: light rays pass, the camera sees glass
gn, gl = glass.node_tree.nodes, glass.node_tree.links
glp = gn.new("ShaderNodeLightPath")
gmax = gn.new("ShaderNodeMath")
gmax.operation = "MAXIMUM"
gl.new(glp.outputs["Is Shadow Ray"], gmax.inputs[0])
gl.new(glp.outputs["Is Diffuse Ray"], gmax.inputs[1])
gtr = gn.new("ShaderNodeBsdfTransparent")
gmix = gn.new("ShaderNodeMixShader")
gl.new(gmax.outputs[0], gmix.inputs["Fac"])
gl.new(gb.outputs[0], gmix.inputs[1])
gl.new(gtr.outputs[0], gmix.inputs[2])
gl.new(gmix.outputs[0], gn["Material Output"].inputs["Surface"])
GY = -Wd
D.box("glazing", (L, 24, H), (0, GY, H / 2), glass, "z", 0)
mull = D.flat("mullion", "#2A2A28", 0.4)
for i in range(13):
    D.box(f"mull_{i}", (70, 120, H), (-L / 2 + i * L / 12, GY - 40, H / 2), mull, "z", 0)
D.box("transom", (L, 120, 70), (0, GY - 40, 2700), mull, "x", 0)
D.box("garden", (60000, 30000, 100), (0, GY - 15000, -200), K.pbr("garden", "concrete_wall_008", size_m=3, val=0.8,
                                                                  sat=0.3), "x", 0)
# four doors along the wall, each in a slim teak frame
LEAVES = ["architect-teak-door", "burma-border-teak-door", "membrane-door", "honne-ab-door"]
DOOR_H = 2600
XS = [-5600, -1800, 2000, 5800]
for leaf, x in zip(LEAVES, XS):
    d, w = K.photo_door(leaf, DOOR_H / 1000, 0.045, lip=D.teak(f"lip_{leaf}", "polished", val=0.5), gloss=0.1)
    d.location = (x / 1000, -0.005, 0.0)
    W = round(w * 1000)
    for name, size, loc in ((f"fl_{x}", (50, 60, DOOR_H + 50), (x - W / 2 - 25, -20, (DOOR_H + 50) / 2)),
                            (f"fr_{x}", (50, 60, DOOR_H + 50), (x + W / 2 + 25, -20, (DOOR_H + 50) / 2)),
                            (f"ft_{x}", (W + 100, 60, 50), (x, -20, DOOR_H + 25))):
        D.box(name, size, loc, frame_m, "z" if size[2] > size[0] else "x", 1.0)
# between them: a teak bench, plants, a vase
D.box("bench_top", (1800, 420, 50), (100, -330, 450), bench_m, "x", 2.0)
for i, bx in enumerate((-650, 850)):
    D.box(f"bench_leg_{i}", (60, 380, 425), (bx, -330, 212), bench_m, "z", 1.0)
K.model("ceramic_vase_03", (0.55, -0.3, 0.475), height=0.38)
K.model("potted_plant_01", (-3.7, -0.5, 0.0), rot_deg=30, height=1.9)
K.model("potted_plant_02", (3.9, -0.45, 0.0), rot_deg=200, height=1.3)
K.model("fern_02", (-7.6, -0.5, 0.0), rot_deg=100, height=0.8)
K.model("standing_picture_frame_01", (7.6, -0.25, 0.0), rot_deg=180, height=1.4)

# ------------------------------------------------------------------ light: the sun down the door wall
K.daylight(34, 62, sky_strength=0.35, ambient=0.7, sun_power=5.5)

# ------------------------------------------------------------------ the camera: a slow track along the doors
cam = C.camera(24 if opt.phone else 28)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6


def place(t):
    e = C.ease_in_out(t)
    x = -6.8 + 9.6 * e
    cam.location = (x, -3.6 if not opt.phone else -3.9, 1.55)
    look = Vector((x + 2.6 - 1.4 * e, 0.0, 1.45))             # angled along the wall, squaring up as it slows
    C.look_at(cam, look)
    cam.data.dof.focus_distance = (look - cam.location).length


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
