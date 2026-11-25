"""PROTOTYPE round 4 · P "Golden hour" (Blender film, plays by itself). A living room in the late afternoon: white
walls, a herringbone oak floor, a sofa, a lounge chair, a round table with a brass vase, a plant, a pendant. A tall
window wall on the left lets the low sun in: long golden shapes of the window across the floor and up the back
wall, where a catalogue door stands. The camera pushes slowly across the room toward it.
(The owner's round-4 answers: other light (golden hour), other rooms, a more cinematic camera.)

  blender -b --factory-startup --python tools/render/r4/golden.py -- --out <dir> --size 1600x900 [--phone]
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
ap.add_argument("--leaf", default="gana-teak-polish-door")
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
C.setup_cycles(exposure=0.45, bounces=12)

plaster = K.white_wall("plaster", "#F4F2EE")
parquet = K.pbr("parquet", "herringbone_parquet", size_m=1.6, val=1.45, sat=0.5, rough=(0.3, 0.5), bump=0.15)
trim = D.teak("trim", "oiled", val=0.6, sat=1.0)
rug = D.flat("rug", "#D9D2C6", 0.95)


def clear_glass(name):
    """Window glass the camera sees, which lets light through (caustics are off: glass would block the sun)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.0
    lp = n.new("ShaderNodeLightPath")
    mx_ = n.new("ShaderNodeMath")
    mx_.operation = "MAXIMUM"
    l.new(lp.outputs["Is Shadow Ray"], mx_.inputs[0])
    l.new(lp.outputs["Is Diffuse Ray"], mx_.inputs[1])
    tr = n.new("ShaderNodeBsdfTransparent")
    mix = n.new("ShaderNodeMixShader")
    l.new(mx_.outputs[0], mix.inputs["Fac"])
    l.new(b.outputs[0], mix.inputs[1])
    l.new(tr.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], n["Material Output"].inputs["Surface"])
    return m


# ------------------------------------------------------------------ the room (mm): back wall's face at y = 0
RW, RD, RH = 7200, 6400, 3300
D.box("floor", (RW, RD, 60), (0, -RD / 2, -30), parquet, "x", 0)
D.box("ceiling", (RW, RD, 80), (0, -RD / 2, RH + 40), plaster, "x", 0)
D.box("right_wall", (200, RD, RH), (RW / 2 + 100, -RD / 2, RH / 2), plaster, "z", 0)
D.box("front_wall", (RW, 200, RH), (0, -RD - 100, RH / 2), plaster, "z", 0)
DOOR_H = 2400
door, door_w = K.photo_door(opt.leaf, DOOR_H / 1000, 0.045, lip=D.teak("lip", "polished", val=0.5), gloss=0.12)
DW = round(door_w * 1000)
DX = 1300
for name, w, cx, z0, h in (
    ("back_l", RW / 2 + DX - DW / 2 - 10, (-RW / 2 + DX - DW / 2 - 10) / 2, 0, RH),
    ("back_r", RW / 2 - DX - DW / 2 - 10, (RW / 2 + DX + DW / 2 + 10) / 2, 0, RH),
    ("back_t", DW + 20, DX, DOOR_H + 10, RH - DOOR_H - 10),
):
    D.box(name, (w, 200, h), (cx, 100, z0 + h / 2), plaster, "z", 0)
door.location = (DX / 1000, 0.0, 0.0)
for name, size, loc in (("arch_l", (60, 30, DOOR_H + 70), (DX - DW / 2 - 40, -15, (DOOR_H + 70) / 2)),
                        ("arch_r", (60, 30, DOOR_H + 70), (DX + DW / 2 + 40, -15, (DOOR_H + 70) / 2)),
                        ("arch_t", (DW + 140, 30, 60), (DX, -15, DOOR_H + 40))):
    D.box(name, size, loc, trim, "z" if size[2] > size[0] else "x", 1.0)
# the window wall on the left: tall glass between slim frames
WX = -RW / 2
glass = clear_glass("window")
D.box("win_glass", (20, RD - 1200, RH - 300), (WX, -RD / 2, (RH - 300) / 2 + 150), glass, "z", 0)
frame = D.flat("win_frame", "#2C2B29", 0.4)
for i in range(6):
    D.box(f"win_mull_{i}", (80, 70, RH), (WX - 20, -600 - i * (RD - 1200) / 5, RH / 2), frame, "z", 0)
for zz in (150, RH - 150, 2300):
    D.box(f"win_rail_{zz}", (80, RD - 1200, 60), (WX - 20, -RD / 2, zz), frame, "y", 0)
D.box("win_sill_wall_a", (200, 600, RH), (WX - 100, -300, RH / 2), plaster, "z", 0)
D.box("win_sill_wall_b", (200, 600, RH), (WX - 100, -RD + 300, RH / 2), plaster, "z", 0)
D.box("garden_wall", (300, 40000, 4200), (WX - 4500, -RD / 2, 2100), K.white_wall("gw", "#E9E6E0"), "z", 0)
D.box("outside", (200, 40000, 100), (WX - 6000, -RD / 2, -200), K.pbr("lawn", "concrete_wall_008", size_m=3, val=0.7,
                                                                     sat=0.4), "x", 0)
# furniture
D.box("rug", (3000, 2200, 12), (-900, -3000, 6), rug, "x", 2.0)
K.model("sofa_03", (-0.9, -4.6, 0.0), rot_deg=0, height=0.82)
K.model("mid_century_lounge_chair", (0.9, -2.4, 0.0), rot_deg=-120, height=0.85)
K.model("coffee_table_round_01", (-0.8, -3.0, 0.0), rot_deg=0, height=0.42)
K.model("brass_vase_01", (-0.75, -3.0, 0.42), height=0.3)
K.model("potted_plant_01", (-2.9, -0.6, 0.0), rot_deg=40, height=1.8)
K.model("modern_ceiling_lamp_01", (-0.8, -3.0, RH / 1000 - 0.9), height=0.9)

# ------------------------------------------------------------------ light: the low sun through the window wall
K.daylight(19, 38, sky_strength=0.35, ambient=0.6, sun_power=7.0, sun_color="#FFDCB0", amb="#EEEAE4")

# ------------------------------------------------------------------ the camera: a slow push across the room
cam = C.camera(24 if opt.phone else 26)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
door_c = Vector((DX / 1000, 0.0, 1.2))


def place(t):
    e = C.ease_in_out(t)
    start = Vector((2.5, -6.0, 1.45)) if not opt.phone else Vector((2.2, -6.0, 1.4))
    end = Vector((1.9, -3.2, 1.35))
    cam.location = start.lerp(end, e)
    C.look_at(cam, Vector((-0.2 + 1.2 * e, 0.0, 1.15)))
    cam.data.dof.focus_distance = (door_c - cam.location).length


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
