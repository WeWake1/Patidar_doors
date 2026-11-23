"""PROTOTYPE round 3 · I "Arrival" (Blender film): arriving at a main door on a bright morning. A white entrance court
under a pergola of white fins: the sun comes through them in stripes across the plaster and the pale marble floor;
plants in low planters; the door at the back in a deep teak-lined portal beside a frosted sidelight. The camera
glides from the sunlit drive, through the opening in the street facade, up to the door. Calm, white, real light
(the owner's round-2 answers: G's calm premium look and its realistic room and light; an Apple-style wow).

The door's face is a catalogue photograph (kit3.photo_door): products stay photographs. Everything else is CC0
scans and models (tools/render/assets/README.md); the sky is Blender's physical sky.

  blender -b --factory-startup --python tools/render/r3/arrival.py -- --out <dir> --size 1600x900 [--phone]
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
C.setup_cycles(exposure=0.4, bounces=12)

# ------------------------------------------------------------------ materials: white, pale, a little warm wood
plaster = K.white_wall("plaster")
fins_m = K.pbr("fins", "white_plaster_02", size_m=1.4, val=0.97, sat=0.2, bump=0.15, rough=(0.8, 0.95))
marble = K.pbr("marble", "concrete_wall_008", size_m=2.4, val=1.3, sat=0.12, rough=(0.22, 0.38), bump=0.08)   # pale polished microcement
drive = K.pbr("drive", "concrete_wall_008", size_m=3.0, val=0.95, sat=0.25, rough=(0.6, 0.85), bump=0.3)
facade = K.pbr("facade", "concrete_wall_008", size_m=2.5, val=1.1, sat=0.2, rough=(0.7, 0.9), bump=0.35)
lining = D.teak("lining", "oiled", val=0.52, sat=1.05)
glass = bpy.data.materials.new("frosted")
glass.use_nodes = True
gb = glass.node_tree.nodes["Principled BSDF"]
gb.inputs["Transmission Weight"].default_value = 1.0
gb.inputs["Roughness"].default_value = 0.3
gb.inputs["IOR"].default_value = 1.5

# ------------------------------------------------------------------ the back wall's portal: door, sidelight, lining
DEPTH, DOOR_H, SIDE = 450, 2550, 420
door, door_w = K.photo_door(opt.leaf, DOOR_H / 1000, 0.05, lip=D.teak("lip", "polished", val=0.5))
DW = round(door_w * 1000)
PW, PH = DW + SIDE + 180, DOOR_H + 80 + 420
x0 = -PW / 2
COURT_W, COURT_D, COURT_H, T = PW + 2 * 1500, 4200, 3700, 300
cw2 = COURT_W / 2
for name, w, cx, z0, h in (  # the back wall
    ("wall_l", cw2 - PW / 2, -(PW / 2 + (cw2 - PW / 2) / 2), 0, COURT_H),
    ("wall_r", cw2 - PW / 2, PW / 2 + (cw2 - PW / 2) / 2, 0, COURT_H),
    ("wall_t", PW, 0, PH, COURT_H - PH),
):
    D.box(name, (w, T, h), (cx, T / 2, z0 + h / 2), plaster, "z", 0)
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
D.box("hall_behind", (SIDE + 400, 40, DOOR_H + 400), (sx, DEPTH + 700, DOOR_H / 2), plaster, "z", 0)
D.cylinder("pull", 12, 1100, (dx + DW / 2 - 110, DEPTH - 45, 1150), D.brass("pull_brass", 0.18), "z", None, 32, 1.0)
for s2 in (-1, 1):
    D.cylinder(f"pull_post_{s2}", 7, 45, (dx + DW / 2 - 110, DEPTH - 22, 1150 + s2 * 480), D.brass("pp", 0.2), "y",
               None, 24)

# ------------------------------------------------------------------ the court: side walls, pergola fins, floor
for side in (-1, 1):
    D.box(f"court_{side}", (T, COURT_D, COURT_H), (side * (cw2 + T / 2), -COURT_D / 2, COURT_H / 2), plaster, "z", 0)
D.box("beam_front", (COURT_W + 2 * T, 300, 380), (0, -COURT_D + 150, COURT_H + 190), fins_m, "x", 2.0)
D.box("beam_back", (COURT_W + 2 * T, 300, 380), (0, -150, COURT_H + 190), fins_m, "x", 2.0)
FIN_W, FIN_D, PITCH = 80, 220, 480                   # fins run toward the door: the sun lays leading lines
nf = int(COURT_W / PITCH)
for i in range(nf + 1):
    x = -COURT_W / 2 + i * COURT_W / nf
    D.box(f"fin_{i}", (FIN_W, COURT_D - 300, FIN_D), (x, -COURT_D / 2, COURT_H + 30 + FIN_D / 2), fins_m, "y", 1.5)
D.box("court_floor", (COURT_W, COURT_D + DEPTH, 160), (0, -COURT_D / 2 + DEPTH / 2, -80), marble, "x", 0)
FY = -COURT_D - 150                                  # the street facade around the opening
D.box("facade_l", (7000, 300, 7500), (-cw2 - T - 3500, FY, 3250), facade, "z", 0)
D.box("facade_r", (7000, 300, 7500), (cw2 + T + 3500, FY, 3250), facade, "z", 0)
D.box("facade_t", (COURT_W + 2 * T, 300, 7500 - COURT_H - 600), (0, FY, COURT_H + 600 + (7500 - COURT_H - 600) / 2 - 500),
      facade, "x", 0)
for i in range(2):
    D.box(f"step_{i}", (COURT_W, 380, 150), (0, FY - 150 - 190 - 380 * i, -75 - 150 * i), marble, "x", 2.0)
D.box("drive", (40000, 20000, 100), (0, FY - 1100 - 10000, -360), drive, "x", 0)
for side in (-1, 1):
    D.box(f"planter_{side}", (560, 2800, 420), (side * (cw2 - 280), -COURT_D / 2 - 250, 210), facade, "y", 6.0)
K.model("potted_plant_02", (-cw2 / 1000 + 0.3, -1.0, 0.42), rot_deg=30, height=1.1)
K.model("fern_02", (-cw2 / 1000 + 0.3, -2.4, 0.42), rot_deg=-40, height=0.65)
K.model("fern_02", (-cw2 / 1000 + 0.32, -3.3, 0.42), rot_deg=70, height=0.55)
K.model("fern_02", (cw2 / 1000 - 0.3, -1.3, 0.42), rot_deg=100, height=0.66)
K.model("potted_plant_02", (cw2 / 1000 - 0.3, -2.9, 0.42), rot_deg=200, height=0.95)
K.model("ceramic_vase_03", (dx / 1000 + door_w / 2 + SIDE / 1000 + 0.45, 0.2, 0.0), rot_deg=0, height=0.62)

# ------------------------------------------------------------------ light: a physical sky and the sun through the fins


def sky(strength, elev, azim, ambient=0.6):
    w = bpy.data.worlds.new("sky")
    scene.world = w
    w.use_nodes = True
    n = w.node_tree.nodes
    t = n.new("ShaderNodeTexSky")
    for kind in ("MULTIPLE_SCATTERING", "NISHITA", "HOSEK_WILKIE"):
        try:
            t.sky_type = kind
            break
        except TypeError:
            continue
    if hasattr(t, "sun_elevation"):
        t.sun_elevation = math.radians(elev)
        t.sun_rotation = math.radians(azim)
        t.sun_disc = False
    # the camera sees the sky; everything else is lit by a warm neutral, as a photographer would white-balance
    # the blue out of the shade (white plaster in sky light reads cold grey-blue otherwise)
    l = w.node_tree.links
    l.new(t.outputs["Color"], n["Background"].inputs["Color"])
    n["Background"].inputs["Strength"].default_value = strength
    amb = n.new("ShaderNodeBackground")
    amb.inputs["Color"].default_value = (*C.srgb("#EFE6DA"), 1)
    amb.inputs["Strength"].default_value = ambient
    lp = n.new("ShaderNodeLightPath")
    mx = n.new("ShaderNodeMixShader")
    l.new(lp.outputs["Is Camera Ray"], mx.inputs["Fac"])
    l.new(amb.outputs[0], mx.inputs[1])
    l.new(n["Background"].outputs[0], mx.inputs[2])
    l.new(mx.outputs[0], n["World Output"].inputs["Surface"])


SUN_EL, SUN_AZ = 56, 52                             # front left: stripes across the floor and the door wall
sky(0.25, SUN_EL, SUN_AZ + 90, ambient=0.55)
sun = C.sun("sun", 5.0, "#FFF4E6", 0.6)
C.aim_sun(sun, SUN_EL, SUN_AZ)

# ------------------------------------------------------------------ camera
cam = C.camera(26 if opt.phone else 30)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
door_c = Vector((dx / 1000, DEPTH / 1000, 1.3))


def place(t):
    """t 0..1: from the drive outside the opening, up the steps and through the court, to the door."""
    e = C.ease_in_out(t)
    y = -9.8 + (-2.2 + 9.8) * e
    z = 1.3 + 0.25 * e
    x = dx / 1000 * e + 0.35 * (1 - e)
    cam.location = (x, y, z)
    C.look_at(cam, door_c + Vector((0, 0, 0.45 * (1 - e) + 0.05)))
    cam.data.dof.focus_distance = (door_c - cam.location).length


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
