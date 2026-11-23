"""PROTOTYPE round 1 · D "Into the grain" (wild): the film opens so close to polished teak that the pores and
the figure read as terrain, and nobody can tell what they are looking at. The camera pulls back about
175 times, past the brass lever, to a whole door standing alone in a pale lilac studio. The page shows
a live scale readout: scale.json beside the frames gives the width of the view at the door, per frame.

True thing it shows: this is what Patidar's customers come to the store to see and touch: the grain.
The captions on the page carry the confirmed facts (seasoned, sawn in their own yard, three generations).
The door is representative, not a catalogue product.

  blender -b --factory-startup --python tools/render/r1/grain.py -- --out <dir> [--phone] [--count 96] \
      [--frames 0,48,95] [--test]
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
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=96)
opt, _ = ap.parse_known_args(C.argv)
COUNT = opt.count
BG = "#ECE8F4"                                   # the page's ground: the studio is the page

C.setup_cycles(look="AgX - Medium High Contrast", exposure=-0.75, bounces=8)
scene = C.scene

leaf = D.teak("teak_leaf", "polished", sat=1.08, val=0.7, pores=1.0)
frame = D.teak("teak_frame", "polished", sat=1.08, val=0.64, pores=0.8)
brass = D.brass(rough=0.16)
d = D.door(1000, 2100, 40, style="panel", leaf_mat=leaf, frame_mat=frame, hw_mat=brass, handle="lever",
           frame_face=75, frame_depth=130)
ow, oh = d["opening"]
slab = D.plaster("slab", "#B8A6EA", rough=0.9, bump=0.06)              # a lilac wall: the door colour-blocked
D.wall_around(ow, oh, d["frame_face"], 250, 1600, 1600, 3000, slab)     # a short wall standing alone
D.box("slab_cap", (3200, 250, 10), (0, 0, 3005), slab, "x", 0)
BG_STRENGTH = 2.1
D.floor("floor", (40000, 40000), D.cyc("cyc", "#E9E4F3", BG, (6.0, 16.0), bg_strength=BG_STRENGTH))

C.world_hdri("photo_studio_loft_hall_2k.hdr", strength=0.3, rotate_deg=70, camera_color=BG, camera_strength=BG_STRENGTH)
C.area("key", (-3.8, -1.2, 2.2), 2.2, 700, "#FFF3E6", (0, 0, 1.1))       # raking from the left: the grain stands up
C.area("fill", (3.0, -3.5, 1.6), 3.0, 180, "#EEF0FF", (0, 0, 1.2))

# the spot the film starts on: the lock stile, a hand's width from the lever, at about chest height
bpy.context.view_layer.update()
leaf_ob = d["leaf"]
front_y = (leaf_ob.matrix_world @ Vector((0, -4e-3 - 0.040, 0))).y        # the leaf's front face (see doorkit)
lever = bpy.data.objects["lever_-1"].matrix_world.translation
SPOT = Vector((lever.x + 0.05, front_y, lever.z + 0.17))
CENTRE = Vector((0.0, front_y, 1.2))

lens = 60.0
cam = C.camera(lens, clip_start=0.002)
if opt.phone:
    scene.render.resolution_x, scene.render.resolution_y = 800, 1000
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
D0, D1 = 0.045, 7.8                                # camera distance: 4.5 cm -> 7.8 m (about 175 times)
cam.data.dof.use_dof = True

scale = []
for f in range(COUNT):
    t = f / (COUNT - 1)
    e = C.ease_in_out(t)
    dist = D0 * (D1 / D0) ** e                     # exponential: every second covers the same "zoom"
    w = min(max((e - 0.18) / 0.62, 0.0), 1.0)      # aim drifts from the spot to the door's centre
    aim = SPOT.lerp(CENTRE, C.ease(w))
    yaw = math.radians(16 * (1 - C.ease(t * 1.4)))  # starts a little oblique (the macro falls off), ends square
    pitch = math.radians(6 * (1 - C.ease(t * 1.2)))
    dirv = Vector((math.sin(yaw), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    cam.location = aim + dirv * dist
    C.look_at(cam, aim)
    cam.data.dof.focus_distance = dist
    cam.data.dof.aperture_fstop = 4.0 + 7.0 * C.ease(min(t * 1.5, 1.0))
    sensor = cam.data.sensor_width if not opt.phone else cam.data.sensor_height * 0.8
    scale.append(round(dist * sensor / lens, 5))   # metres across the view, at the door
    if f in C.frame_list(COUNT):
        C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))

with open(os.path.join(C.args.out, "scale.json"), "w") as fh:
    json.dump({"count": COUNT, "view_width_m": scale}, fh)
print("SCALE first/last", scale[0], scale[-1])
