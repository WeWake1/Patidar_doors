"""PROTOTYPE round 1 · B "Four materials, one roof" (premium): a still life of the four things Patidar sells,
one real offcut of each, stacked like a sculpture: a rough-sawn teak plank (Timbers), an 18 mm ply sheet
with its layers showing (Ply), a white WPC board (WPC), and on top a door corner sample of the kind a
showroom keeps, its cut sides showing the core inside (Doors). On the page the cursor orbits the stack and
each layer carries a label that links to its section; hotspots.json gives every layer's screen position
for every frame so the labels ride the render.

True thing it shows: timber, doors, plywood and WPC are all sold under one roof (PRODUCT.md). The pieces
are representative, not catalogue products.

  blender -b --factory-startup --python tools/render/r1/stack.py -- --out <dir> [--phone] [--count 48] [--test]
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=48)
opt, _ = ap.parse_known_args(C.argv)
COUNT = opt.count
BG, BG_STRENGTH = "#F2F2F0", 1.6

C.setup_cycles(look="AgX - Medium High Contrast", exposure=-0.55, bounces=10)
scene = C.scene

# ------------------------------------------------------------------ materials
sawn = D.teak("sawn_teak", "raw", val=0.78, sat=1.15, pores=0.5)
face_ply = D.wood("ply_face", "teak_veneer", sat=0.62, val=0.98, hue=0.5, rough=(0.5, 0.7), tint="#DCC3A3")  # a pale hardwood face
ply_edge = D.wood("ply_edge", "Wood087", tile_m=0.06, sat=0.9, val=0.95, rough=(0.6, 0.8), normal=0.8, per_object=False)
polished = D.teak("door_face", "polished", sat=1.08, val=0.62, coat=0.14, coat_rough=0.22)
lipping = D.teak("door_lipping", "polished", sat=1.08, val=0.58)
core = D.wood("core", "Wood092", sat=0.8, val=0.95, rough=(0.6, 0.8))           # blockboard strips inside the door


def wpc_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*C.srgb("#E8E7E3"), 1)
    b.inputs["Roughness"].default_value = 0.62
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 900.0; nz.inputs["Detail"].default_value = 3.0
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12; bp.inputs["Distance"].default_value = 0.0002
    l.new(nz.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


wpc = wpc_material("wpc")

# ------------------------------------------------------------------ the stack: built in layers, each turned a little
root = D.empty("stack")
layers = {}                                                   # name -> (anchor empty for the page's label)


def layer(name, z_mm, rot_deg, offset_mm=(0, 0)):
    e = D.empty(name, (offset_mm[0], offset_mm[1], z_mm), root)
    e.rotation_euler.z = math.radians(rot_deg)
    return e


# 1. timber: a rough-sawn teak plank, 1150 x 260 x 70
L1 = layer("timber", 0, 0)
plank = D.box("plank", (1150, 260, 70), (0, 0, 35), sawn, "x", 3.0, L1, segments=2)
layers["timbers"] = D.empty("a_timbers", (420, -130, 35), L1)

# 2. ply: an 18 mm sheet, 900 x 560, its edge a stack of veneers
L2 = layer("ply", 70, 8, (-50, 30))
D.box("ply_core", (900, 560, 17), (0, 0, 9), ply_edge, "x", 0.6, L2)
D.box("ply_top", (900, 560, 0.6), (0, 0, 17.8), face_ply, "x", 0, L2)
layers["ply"] = D.empty("a_ply", (340, -280, 9), L2)

# 3. WPC: an 18 mm solid board, 760 x 470
L3 = layer("wpc", 88, -7, (40, -20))
D.box("wpc_board", (760, 470, 18), (0, 0, 9), wpc, "x", 1.2, L3)
layers["wpc"] = D.empty("a_wpc", (-320, -235, 9), L3)

# 4. a door corner sample, 420 x 420 x 32: face veneers, solid teak lipping on two edges, a blockboard core
L4 = layer("door", 106, 13, (-40, -40))
T, S = 32, 420
D.box("door_face_top", (S, S, 1.2), (0, 0, T - 0.6), polished, "z", 0.4, L4)
D.box("door_face_bot", (S, S, 1.2), (0, 0, 0.6), polished, "z", 0.4, L4)
for i in range(8):                                            # the core: strips of softwood, edge-glued
    D.box(f"core_{i}", (S - 24, S / 8 - 1.5, T - 2.4), (-12, -S / 2 + S / 16 + i * S / 8, T / 2), core, "x", 0.4, L4)
D.box("lip_long", (24, S, T), (S / 2 - 12, 0, T / 2), lipping, "y", 1.0, L4)
D.box("lip_short", (S, 24, T), (0, S / 2 - 12, T / 2), lipping, "x", 1.0, L4)
layers["doors"] = D.empty("a_doors", (0, -S / 2, T), L4)

D.floor("floor", (40000, 40000), D.cyc("cyc", "#F0F0EE", BG, (5.0, 13.0), bg_strength=BG_STRENGTH))

# ------------------------------------------------------------------ light
C.world_hdri("studio_small_09_2k.hdr", strength=0.45, rotate_deg=150, camera_color=BG, camera_strength=BG_STRENGTH)
C.area("key", (-2.2, -1.8, 2.8), 2.6, 520, "#FFF4E8", (0, 0, 0.1))
C.area("rim", (1.6, 2.6, 1.9), 2.0, 380, "#FFFFFF", (0, 0, 0.1))
C.area("kick", (2.6, -1.6, 0.6), 1.4, 120, "#EAF0FF", (0, 0, 0.1))

# ------------------------------------------------------------------ the orbit
# low and close: the stack is only 14 cm tall, and its edges (the ply's layers, the door's core, the plank's
# end grain) are the point, so the camera sits near their height and looks across them
cam = C.camera(55 if not opt.phone else 40)
if opt.phone:
    scene.render.resolution_x, scene.render.resolution_y = 800, 1000
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
else:
    cam.data.shift_x = -0.14                 # the stack sits right of centre, clear of the headline
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
target = Vector((0.0, -0.05, 0.08))
RADIUS = 2.45 if not opt.phone else 1.8     # phones: close, so the stack fills the portrait frame
ELEV = math.radians(15 if not opt.phone else 24)
AZ0, AZ1 = math.radians(-50), math.radians(50)

hot = {k: [] for k in layers}
for f in range(COUNT):
    az = AZ0 + (AZ1 - AZ0) * f / (COUNT - 1)
    cam.location = target + Vector((math.sin(az) * math.cos(ELEV), -math.cos(az) * math.cos(ELEV), math.sin(ELEV))) * RADIUS
    C.look_at(cam, target)
    cam.data.dof.focus_distance = RADIUS
    bpy.context.view_layer.update()
    for k, e in layers.items():
        p = world_to_camera_view(scene, cam, e.matrix_world.translation)
        hot[k].append([round(p.x, 4), round(1 - p.y, 4)])     # 0..1 across, 0..1 down (CSS-ready)
    if f in C.frame_list(COUNT):
        C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))

with open(os.path.join(C.args.out, "hotspots.json"), "w") as fh:
    json.dump({"count": COUNT, "layers": hot}, fh)
print("HOTSPOTS written for", list(hot))
