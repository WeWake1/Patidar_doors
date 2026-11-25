"""PROTOTYPE round 4 · M "Arrival II" (Blender film, plays by itself). Round 3's "Arrival", which the owner liked best,
pushed further on all four counts they asked for: grander architecture, more photoreal detail, a cinematic camera
and a better page round it. The same white court, six metres tall now, with deeper fins (bolder stripes), a 3.3 m
pivot main door in a teak-lined portal, a narrow rill of still water along the path mirroring the striped walls,
bigger plants. The camera starts high at the court's mouth, cranes down to eye level and glides in to the door.
(A first version with a sandstone wall, a light-well canopy and a pool read as cheap brick and blue tiles.)

  blender -b --factory-startup --python tools/render/r4/grand.py -- --out <dir> --size 1600x900 [--phone]
      [--count 144] [--frames 0-143] [--test]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "r3"))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import kit3 as K  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=144)
ap.add_argument("--leaf", default="architect-teak-door")
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
C.setup_cycles(exposure=0.4, bounces=12)

# ------------------------------------------------------------------ materials
plaster = K.white_wall("plaster")
fins_m = K.white_wall("fins", "#F1EFEA", bump=0.1)
floor_m = K.pbr("floor", "smooth_concrete_floor", size_m=3.0, val=1.7, sat=0.1, rough=(0.25, 0.4), bump=0.08)
drive = K.pbr("drive", "concrete_wall_008", size_m=3.0, val=0.95, sat=0.25, rough=(0.6, 0.85), bump=0.3)
facade = K.pbr("facade", "concrete_wall_008", size_m=2.5, val=1.15, sat=0.18, rough=(0.7, 0.9), bump=0.35)
dark_stone = K.pbr("dark_stone", "smooth_concrete_floor", size_m=2.0, val=0.22, sat=0.1, rough=(0.3, 0.5), bump=0.1)
lining = D.teak("lining", "oiled", val=0.52, sat=1.05)
glass = bpy.data.materials.new("frosted")
glass.use_nodes = True
gb = glass.node_tree.nodes["Principled BSDF"]
gb.inputs["Transmission Weight"].default_value = 1.0
gb.inputs["Roughness"].default_value = 0.3
gb.inputs["IOR"].default_value = 1.5


def water(name="water"):
    """Still water over a dark basin: a mirror with the faintest moving ripple (W advances with the film)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.01, 0.012, 0.014, 1)
    b.inputs["Roughness"].default_value = 0.015
    b.inputs["IOR"].default_value = 1.33
    b.inputs["Specular IOR Level"].default_value = 0.6
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.noise_dimensions = "4D"
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 4.0
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    bp = n.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.03
    bp.inputs["Distance"].default_value = 0.01
    l.new(nz.outputs["Fac"], bp.inputs["Height"])
    l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m, nz.inputs["W"]


pool_m, ripple_w = water()

# ------------------------------------------------------------------ the back wall's portal: a 3.3 m pivot door
DEPTH, DOOR_H, SIDE = 600, 3300, 520
door, door_w = K.photo_door(opt.leaf, DOOR_H / 1000, 0.055, lip=D.teak("lip", "polished", val=0.5), gloss=0.12)
DW = round(door_w * 1000)
PW, PH = DW + SIDE + 180, DOOR_H + 80 + 700
x0 = -PW / 2
COURT_W, COURT_D, COURT_H, T = PW + 2 * 2100, 7600, 6000, 300
cw2 = COURT_W / 2
for name, w, cx, z0, h in (
    ("wall_l", cw2 - PW / 2, -(PW / 2 + (cw2 - PW / 2) / 2), 0, COURT_H),
    ("wall_r", cw2 - PW / 2, PW / 2 + (cw2 - PW / 2) / 2, 0, COURT_H),
    ("wall_t", PW, 0, PH, COURT_H - PH),
):
    D.box(name, (w, T, h), (cx, T / 2, z0 + h / 2), plaster, "z", 0)
D.box("lining_l", (50, DEPTH, PH), (x0 + 25, DEPTH / 2, PH / 2), lining, "z", 1.0)
D.box("lining_r", (50, DEPTH, PH), (-x0 - 25, DEPTH / 2, PH / 2), lining, "z", 1.0)
D.box("lining_t", (PW, DEPTH, 50), (0, DEPTH / 2, PH - 25), lining, "x", 1.0)
D.box("back", (PW, 60, PH), (0, DEPTH + 90, PH / 2), plaster, "z", 0)
dx = x0 + 60 + DW / 2
door.location = (dx / 1000, (DEPTH + 10) / 1000, 0.0)
D.box("head", (DW + 120, 60, 80), (dx, DEPTH + 30, DOOR_H + 40), lining, "x", 1.0)
for i, px in enumerate((x0 + 30, x0 + 60 + DW + 30, -x0 - 30)):
    D.box(f"post_{i}", (60, 80, DOOR_H + 80), (px, DEPTH + 30, (DOOR_H + 80) / 2), lining, "z", 1.0)
sx = x0 + 60 + DW + 60 + SIDE / 2
D.box("sidelight", (SIDE, 12, DOOR_H), (sx, DEPTH + 20, DOOR_H / 2), glass, "z", 0)
glow = bpy.data.materials.new("hall_glow")                 # the house's own light behind the frosted glass
glow.use_nodes = True
gn = glow.node_tree
gn.nodes.remove(gn.nodes["Principled BSDF"])
ge = gn.nodes.new("ShaderNodeEmission")
ge.inputs["Color"].default_value = (*C.srgb("#FFE9CF"), 1)
ge.inputs["Strength"].default_value = 2.2
gn.links.new(ge.outputs[0], gn.nodes["Material Output"].inputs["Surface"])
D.box("hall_behind", (SIDE - 20, 6, DOOR_H - 20), (sx, DEPTH + 42, DOOR_H / 2), glow, "z", 0)   # between the glass and the wall
D.cylinder("pull", 15, 1500, (dx + DW / 2 - 140, DEPTH - 55, 1350), D.brass("pull_brass", 0.18), "z", None, 32, 1.5)
for s2 in (-1, 1):
    D.cylinder(f"pull_post_{s2}", 8, 55, (dx + DW / 2 - 140, DEPTH - 27, 1350 + s2 * 650), D.brass("pp", 0.2), "y",
               None, 24)

# ------------------------------------------------------------------ the court: tall walls, deep fins, a rill
for side in (-1, 1):
    D.box(f"court_{side}", (T, COURT_D, COURT_H), (side * (cw2 + T / 2), -COURT_D / 2, COURT_H / 2), plaster, "z", 0)
D.box("beam_front", (COURT_W + 2 * T, 400, 500), (0, -COURT_D + 200, COURT_H + 250), fins_m, "x", 2.0)
D.box("beam_back", (COURT_W + 2 * T, 400, 500), (0, -200, COURT_H + 250), fins_m, "x", 2.0)
FIN_W, FIN_D, NF = 110, 420, 12
for i in range(NF + 1):
    x = -COURT_W / 2 + i * COURT_W / NF
    D.box(f"fin_{i}", (FIN_W, COURT_D - 400, FIN_D), (x, -COURT_D / 2, COURT_H + 40 + FIN_D / 2), fins_m, "y", 2.0)
D.box("court_floor", (COURT_W, COURT_D + DEPTH, 160), (0, -COURT_D / 2 + DEPTH / 2, -80), floor_m, "x", 0)
RX0, RX1 = -cw2 + 700, -cw2 + 1500                          # the rill, along the left of the path
D.box("rill_water", (RX1 - RX0, COURT_D - 1400, 20), ((RX0 + RX1) / 2, -COURT_D / 2 - 500, 5), pool_m, "y", 0)
D.box("rill_basin", (RX1 - RX0, COURT_D - 1400, 40), ((RX0 + RX1) / 2, -COURT_D / 2 - 500, -300), dark_stone, "y", 0)
FY = -COURT_D - 150                                           # the street facade around the court's mouth
D.box("facade_l", (8000, 300, 9000), (-cw2 - T - 4000, FY, 4000), facade, "z", 0)
D.box("facade_r", (8000, 300, 9000), (cw2 + T + 4000, FY, 4000), facade, "z", 0)
D.box("facade_t", (COURT_W + 2 * T, 300, 9000 - COURT_H - 900), (0, FY, COURT_H + 900 + (9000 - COURT_H - 900) / 2 - 500),
      facade, "x", 0)
for i in range(2):
    D.box(f"step_{i}", (COURT_W, 380, 150), (0, FY - 150 - 190 - 380 * i, -75 - 150 * i), floor_m, "x", 2.0)
D.box("drive", (50000, 24000, 100), (0, FY - 1100 - 12000, -360), drive, "x", 0)
D.box("planter_r", (700, 4200, 480), (cw2 - 350, -COURT_D / 2 - 600, 240), facade, "y", 6.0)
K.model("potted_plant_01", (cw2 / 1000 - 0.35, -2.4, 0.48), rot_deg=30, height=1.9)
K.model("potted_plant_02", (cw2 / 1000 - 0.35, -3.9, 0.48), rot_deg=200, height=1.3)
K.model("fern_02", (cw2 / 1000 - 0.35, -5.2, 0.48), rot_deg=100, height=0.75)
K.model("potted_plant_01", (-cw2 / 1000 + 0.45, -0.7, 0.0), rot_deg=160, height=2.2)
K.model("ceramic_vase_01", (dx / 1000 + door_w / 2 + SIDE / 1000 + 0.55, 0.25, 0.0), rot_deg=0, height=0.9)


# ------------------------------------------------------------------ light: a physical sky and the sun through the fins
def sky(strength, elev, azim, ambient):
    w = bpy.data.worlds.new("sky")
    scene.world = w
    w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
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
    l.new(t.outputs["Color"], n["Background"].inputs["Color"])
    n["Background"].inputs["Strength"].default_value = strength
    # the camera and reflections see the real sky; diffuse light is a warm neutral, as a photographer would
    # white-balance the blue out of the shade
    amb = n.new("ShaderNodeBackground")
    amb.inputs["Color"].default_value = (*C.srgb("#EFE6DA"), 1)
    amb.inputs["Strength"].default_value = ambient
    lp = n.new("ShaderNodeLightPath")
    sel = n.new("ShaderNodeMath")
    sel.operation = "MAXIMUM"
    l.new(lp.outputs["Is Camera Ray"], sel.inputs[0])
    l.new(lp.outputs["Is Glossy Ray"], sel.inputs[1])
    mx = n.new("ShaderNodeMixShader")
    l.new(sel.outputs[0], mx.inputs["Fac"])
    l.new(amb.outputs[0], mx.inputs[1])
    l.new(n["Background"].outputs[0], mx.inputs[2])
    l.new(mx.outputs[0], n["World Output"].inputs["Surface"])


SUN_EL, SUN_AZ = 58, 48
sky(0.25, SUN_EL, SUN_AZ + 90, 0.55)
sun = C.sun("sun", 5.2, "#FFF4E6", 0.6)
C.aim_sun(sun, SUN_EL, SUN_AZ)

# ------------------------------------------------------------------ the camera: high at the court's mouth, craning down
cam = C.camera(24 if opt.phone else 26)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
door_c = Vector((dx / 1000, DEPTH / 1000, 1.75))


def place(t):
    e = C.ease_in_out(t)
    k = C.ease(min(t * 1.5, 1.0))                            # the crane settles before the glide ends
    start = Vector((0.9, -12.5, 4.6)) if not opt.phone else Vector((0.5, -12.0, 5.0))
    end = Vector((dx / 1000 - 0.05, -3.9, 1.6))
    p = start.lerp(end, e)
    p.z = start.z + (end.z - start.z) * k
    cam.location = p
    C.look_at(cam, door_c + Vector((0, 0, 0.35 * (1 - e))))
    cam.data.dof.focus_distance = (door_c - cam.location).length
    ripple_w.default_value = t * 1.2


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
