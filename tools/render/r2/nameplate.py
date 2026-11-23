"""PROTOTYPE round 2 · H "Your name on it" (premium): a teak main door at eye level with a brass nameplate on it.
The visitor types their family's name and the page engraves it into the plate as they type, then they can send
the picture to the family.

The engraving is live, so the plate is rendered twice from the same camera: plain brushed brass, and the same
plate as it looks where it has been cut and filled with black enamel (how brass nameplates are made). The page
draws the second through the shape of the letters and adds the cut edge's highlight. Writes:
  base.webp    the door with a blank plate
  enamel.webp  the same picture, the plate's face as black enamel
  plate.json   the plate face's corners in pixels (clockwise from the top-left) and the light's direction

True thing (decisions.md, round 1 Q9): everything is made to measure, so each door is made for one doorway, one
family's. The door is representative, not a catalogue product; the nameplate is only a way to picture it.

  blender -b --factory-startup --python tools/render/r2/nameplate.py -- --out <dir> --size 1400x1400 | --size 1080x1350 --phone
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
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
opt, _ = ap.parse_known_args(C.argv)
scene = C.scene
C.setup_cycles(exposure=-0.6, bounces=12)

# ------------------------------------------------------------------ the door: a pressed teak-veneer main door
veneer = D.teak("veneer", "polished", per_object=False, val=0.5, sat=1.22, coat=0.32, coat_rough=0.1)
d = D.door(1050, 2100, 45, "flush", veneer, frame_mat=D.teak("frame", "polished", val=0.42), handle="pull",
           lock_height=1050)
ow, oh = d["opening"]
D.wall_around(ow, oh, d["frame_face"], 160, 1800, 1800, 3000, D.plaster("wall", "#E9E8E4"))
D.floor("floor", (8000, 8000), D.stone("floor", base="#B9BAB5", alt="#B2B3AE", rough=0.3))
leaf_front = -4 - 45  # the leaf's face in pivot space (see doorkit.door): y0 - T/2
# two routed grooves across the leaf, a common pressed-door detail
groove = D.flat("groove", "#3A2414", 0.6)
for z in (560, 1640):
    D.box(f"groove_{z}", (1050 - 160, 1.2, 4), (525, leaf_front - 0.5, z), groove, "x", 0, d["leaf"])

# ------------------------------------------------------------------ the plate: brushed brass on stand-offs
PW, PH, PT = 300.0, 92.0, 4.0
PX, PZ = 525.0, 1460.0                       # on the leaf's centre line, at eye height
plate_root = D.empty("plate", (PX, leaf_front - 9, PZ), d["leaf"])
brushed = D.metal("brushed_brass", "#D9B46A", rough=0.26, rough_var=0.05, aniso=0.6)
body = D.box("plate_body", (PW, PT, PH), (0, 0, 0), brushed, "x", 1.4, plate_root, segments=3)
face_mat = D.metal("plate_face", "#D9B46A", rough=0.24, rough_var=0.05, aniso=0.6)
face = D.box("plate_face", (PW - 6, 0.2, PH - 6), (0, -PT / 2 - 0.1, 0), face_mat, "x", 0, plate_root)
for sx in (-1, 1):
    for sz in (-1, 1):
        D.cylinder(f"cap_{sx}_{sz}", 4.2, 3.0, (sx * (PW / 2 - 13), -PT / 2 - 1.5, sz * (PH / 2 - 13)),
                   D.brass("cap", 0.18), "y", plate_root, 32, 1.2)
for sx in (-1, 1):                             # the stand-offs hold it 9 mm off the door: a real shadow
    D.cylinder(f"standoff_{sx}", 6, 9, (sx * (PW / 2 - 13), PT / 2 + 4.5, 0), D.brass("standoff", 0.3), "y",
               plate_root, 24, 0.5)

# ------------------------------------------------------------------ light
C.world_hdri("photo_studio_loft_hall_2k.hdr", strength=0.3, rotate_deg=70)
C.area("window", (-2.4, -1.6, 2.1), 1.6, 380, "#FFF2E2", (0.0, 0.0, 1.45), size_y=1.4)
C.area("ceiling", (0.4, -0.9, 2.8), 0.5, 60, "#FFE7C6", (0.0, 0.0, 1.45))         # a warm downlight above
C.area("fill", (2.2, -2.2, 1.3), 2.0, 40, "#EEF2FF", (0.0, 0.0, 1.4))

# ------------------------------------------------------------------ camera: eye level, square on
cam = C.camera(50)
plate_world = lambda: plate_root.matrix_world.translation  # noqa: E731
bpy.context.view_layer.update()
pw = plate_world()
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
    cam.location = (pw.x + 0.02, -1.05, pw.z - 0.04)
    C.look_at(cam, Vector((pw.x + 0.02, 0.0, pw.z - 0.09)))
else:
    # square, for the right-hand column: the door's lock edge, its frame and the pull handle in shot, the plate
    # in the upper third
    cam.location = (pw.x + 0.08, -1.42, pw.z - 0.1)
    C.look_at(cam, Vector((pw.x + 0.08, 0.0, pw.z - 0.17)))
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 4.0
cam.data.dof.focus_distance = (pw - cam.location).length

out = C.args.out
C.render_to(os.path.join(out, "base.webp"))
# the same frame with the face as black enamel: where the letters are cut, this is what shows
enamel = bpy.data.materials.new("enamel")
enamel.use_nodes = True
eb = enamel.node_tree.nodes["Principled BSDF"]
eb.inputs["Base Color"].default_value = (*C.srgb("#141210"), 1)
eb.inputs["Roughness"].default_value = 0.22
eb.inputs["Coat Weight"].default_value = 0.4
face.material_slots[0].material = enamel
C.render_to(os.path.join(out, "enamel.webp"))

# the face's corners in pixels, and the light's direction on screen (for the cut edge's highlight)
RW = int(scene.render.resolution_x * scene.render.resolution_percentage / 100)
RH = int(scene.render.resolution_y * scene.render.resolution_percentage / 100)
bpy.context.view_layer.update()
mw = face.matrix_world
y = -0.1 * D.MM
quad = []
for lx, lz in ((-(PW - 6) / 2, (PH - 6) / 2), ((PW - 6) / 2, (PH - 6) / 2), ((PW - 6) / 2, -(PH - 6) / 2),
               (-(PW - 6) / 2, -(PH - 6) / 2)):
    c = world_to_camera_view(scene, cam, mw @ Vector((lx * D.MM, y, lz * D.MM)))
    quad.append([round(c.x * RW, 2), round((1 - c.y) * RH, 2)])
light = Vector((-2.4, -1.6, 2.1)) - pw
with open(os.path.join(out, "plate.json"), "w") as fh:
    json.dump({"size": [RW, RH], "quad": quad, "plate_mm": [PW - 6, PH - 6],
               "light": [round(light.x / light.length, 3), round(-light.z / light.length, 3)]}, fh)
print("PLATE", quad)
