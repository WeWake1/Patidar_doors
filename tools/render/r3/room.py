"""PROTOTYPE round 3 · L "One room" (Blender plate + live photographs): a calm, sunlit room, and in it one door that
can be any of the catalogue's. Morning sun comes through a tall window on the left and lies across the oak floor
and up the door wall; an armchair, a side table, a plant. The camera pushes in very slowly (the page plays it back
and forth). The door's face is rendered blank and white, like G's stack: the page warps the chosen catalogue
photograph into it and multiplies it by this light, so a design swap is a crossfade, not a re-render.

Per frame: NNN.webp (the plate), NNN.png (R = the door's face; repack with pack-masks.mjs), corners.json.

  blender -b --factory-startup --python tools/render/r3/room.py -- --out <dir> --size 1600x900 [--phone]
      [--count 48] [--frames 0-47] [--test]
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import kit3 as K  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=48)
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
EXPOSURE = 0.3
C.setup_cycles(exposure=EXPOSURE, bounces=12)
PLATE_SAMPLES = scene.cycles.samples

plaster = K.white_wall("plaster")
oak = K.pbr("oak", "wood_floor", size_m=2.0, val=1.25, sat=0.55, rough=(0.35, 0.55), bump=0.2)
trim = D.teak("trim", "oiled", val=0.55, sat=1.0)

# ------------------------------------------------------------------ the room (mm): door wall at y = 0, room on -Y
RW, RD, RH = 6200, 6000, 3100
D.box("floor", (RW, RD, 60), (0, -RD / 2, -30), oak, "x", 0)
D.box("ceiling", (RW, RD, 60), (0, -RD / 2, RH + 30), plaster, "x", 0)
DW, DH = 980, 2170                                     # the leaf: about the catalogue photos' 1:2.2
OX = 650                                               # the door sits right of centre
for name, w, cx, z0, h in (
    ("wall_l", RW / 2 + OX - DW / 2 - 10, (-RW / 2 + OX - DW / 2 - 10) / 2, 0, RH),
    ("wall_r", RW / 2 - OX - DW / 2 - 10, (RW / 2 + OX + DW / 2 + 10) / 2, 0, RH),
    ("wall_t", DW + 20, OX, DH + 10, RH - DH - 10),
):
    D.box(name, (w, 160, h), (cx, 80, z0 + h / 2), plaster, "z", 0)
for name, w, cx, h, zc in (("arch_l", 60, OX - DW / 2 - 40, DH + 70, (DH + 70) / 2),
                           ("arch_r", 60, OX + DW / 2 + 40, DH + 70, (DH + 70) / 2),
                           ("arch_t", DW + 140, OX, 60, DH + 40)):
    D.box(name, (w, 24, h), (cx, -12, zc), trim, "z" if h > w else "x", 1.0)
# the left wall with a tall window: the sun comes in through it
WIN_Y0, WIN_Y1, WIN_Z0, WIN_Z1 = -4300, -1100, 120, 2900
LX = -RW / 2
for name, sy, cy, sz, cz in (
    ("lw_a", RD - abs(WIN_Y0), (WIN_Y0 - RD) / 2, RH, RH / 2),
    ("lw_b", abs(WIN_Y1), WIN_Y1 / 2, RH, RH / 2),
    ("lw_c", WIN_Y1 - WIN_Y0, (WIN_Y0 + WIN_Y1) / 2, WIN_Z0, WIN_Z0 / 2),
    ("lw_d", WIN_Y1 - WIN_Y0, (WIN_Y0 + WIN_Y1) / 2, RH - WIN_Z1, (RH + WIN_Z1) / 2),
):
    D.box(name, (160, sy, sz), (LX - 80, cy, cz), plaster, "z", 0)
D.box("right_wall", (160, RD, RH), (RW / 2 + 80, -RD / 2, RH / 2), plaster, "z", 0)
D.box("skirting", (RW, 14, 90), (0, -7, 45), D.flat("skirting", "#E9E6E0", 0.5), "x", 0.5)

# the door: a blank white face (material 0) the page fills with a photograph, teak edges
receiver = bpy.data.materials.new("receiver")
receiver.use_nodes = True
rb = receiver.node_tree.nodes["Principled BSDF"]
rb.inputs["Base Color"].default_value = (0.72, 0.72, 0.72, 1)
rb.inputs["Roughness"].default_value = 0.5
lip = D.teak("lip", "polished", val=0.55)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
W, H, TT = DW / 1000, DH / 1000, 0.045
for v in bm.verts:
    v.co = Vector((v.co.x * W, (v.co.y + 0.5) * TT, (v.co.z + 0.5) * H))
bm.normal_update()
for f in bm.faces:
    f.material_index = 0 if f.normal.y < -0.9 else 1
me = bpy.data.meshes.new("door")
bm.to_mesh(me)
bm.free()
me.materials.append(receiver)
me.materials.append(lip)
door = bpy.data.objects.new("door", me)
scene.collection.objects.link(door)
door.location = (OX / 1000, -0.005, 0.008)
# no hardware of our own: every catalogue photograph brings its own handle

# furniture and a plant (CC0 models)
K.model("modern_arm_chair_01", (-1.35, -2.0, 0.0), rot_deg=-35, height=0.82)
K.model("side_table_01", (-0.55, -1.35, 0.0), rot_deg=10, height=0.52)
K.model("ceramic_vase_03", (-0.55, -1.35, 0.52), rot_deg=0, height=0.32)
K.model("potted_plant_02", (-2.55, -1.0, 0.0), rot_deg=60, height=1.35)

# ------------------------------------------------------------------ light: morning sun through the window


def world(ambient):
    w = bpy.data.worlds.new("w")
    scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*C.srgb("#EFE7DB"), 1)
    bg.inputs["Strength"].default_value = ambient
    return bg


WORLD = 1.1
world_bg = world(WORLD)
sun = C.sun("sun", 8.0, "#FFF0DA", 1.0)
C.aim_sun(sun, 24, 28)                                # low from the front left: across the floor, up the door wall
C.area("sky_window", (-3.4, -2.75, 1.6), 2.6, 260, "#F2F4F8", (0.0, -2.5, 1.0), size_y=2.4)   # the window's sky

# ------------------------------------------------------------------ camera: a very slow push
cam = C.camera(32 if opt.phone else 35)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 6.3
door_c = Vector((OX / 1000, 0.0, 1.15))


def place(t):
    e = C.ease_in_out(t)
    if opt.phone:
        cam.location = (OX / 1000 - 0.1, -4.4 + 0.5 * e, 1.25)
        C.look_at(cam, Vector((OX / 1000 - 0.25, 0.0, 1.2)))
    else:
        cam.location = (-0.6 + 0.12 * e, -5.0 + 0.45 * e, 1.22)
        C.look_at(cam, Vector((-0.4 + 0.05 * e, -0.6, 1.08)))
    cam.data.dof.focus_distance = (door_c - cam.location).length


# ------------------------------------------------------------------ the mask pass (as flip.py)
black = bpy.data.materials.new("mask_black")
black.use_nodes = True
nt = black.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (0, 0, 0, 1)
nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
red = bpy.data.materials.new("mask_red")
red.use_nodes = True
rt = red.node_tree
rt.nodes.remove(rt.nodes["Principled BSDF"])
re_ = rt.nodes.new("ShaderNodeEmission")
re_.inputs["Color"].default_value = (1, 0, 0, 1)
rt.links.new(re_.outputs[0], rt.nodes["Material Output"].inputs["Surface"])
meshes = [o for o in scene.objects if o.type == "MESH"]
saved = {o.name: [s.material for s in o.material_slots] for o in meshes}
lights_on = {o.name: o.hide_render for o in scene.objects if o.type == "LIGHT"}


def mask_mode():
    for o in meshes:
        for s in o.material_slots:
            s.material = black
    door.material_slots[0].material = red
    world_bg.inputs["Strength"].default_value = 0.0
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.render.dither_intensity = 0.0


def plate_mode():
    for o in meshes:
        for s, m in zip(o.material_slots, saved[o.name]):
            s.material = m
    world_bg.inputs["Strength"].default_value = WORLD
    scene.cycles.samples = PLATE_SAMPLES
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    for name in ("AgX - Medium High Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = name
            break
        except TypeError:
            continue
    scene.view_settings.exposure = EXPOSURE
    scene.render.dither_intensity = 1.0


RW_PX = int(scene.render.resolution_x * scene.render.resolution_percentage / 100)
RH_PX = int(scene.render.resolution_y * scene.render.resolution_percentage / 100)
FACE = [Vector((-W / 2, 0, H)), Vector((W / 2, 0, H)), Vector((W / 2, 0, 0)), Vector((-W / 2, 0, 0))]
corners = []
todo = set(C.frame_list(N))
for f in range(N):
    place(f / (N - 1))
    bpy.context.view_layer.update()
    q = []
    for p in FACE:
        c = world_to_camera_view(scene, cam, door.matrix_world @ p)
        q.append([round(c.x * RW_PX, 2), round((1 - c.y) * RH_PX, 2), round(c.z, 3)])
    corners.append([q])
    if f not in todo:
        continue
    plate_mode()
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
    mask_mode()
    s = scene.render.image_settings
    s.file_format, s.color_mode, s.color_depth = "PNG", "RGB", "8"
    scene.render.filepath = os.path.join(C.args.out, f"{f:03d}.png")
    bpy.ops.render.render(write_still=True)
    plate_mode()

with open(os.path.join(C.args.out, "corners.json"), "w") as fh:
    json.dump({"count": N, "size": [RW_PX, RH_PX], "slots": 1, "frames": corners}, fh)
print("CORNERS written", N, RW_PX, RH_PX)
