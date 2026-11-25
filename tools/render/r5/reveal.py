"""PROTOTYPE round 5 · R "Come in" (Blender film, plays by itself). Round 4's grand court in its bright morning,
the pivot door shut. The camera walks up the court; the door swings open on its pivot as it comes; and the camera
goes on through it, into the house's own courtyard: a verandah on teak columns round an open court, a brass urli
of water and marigolds in the sun, a tree, and more doors round it. It ends just inside, the open door at the
edge of the frame.

  blender -b --factory-startup --python tools/render/r5/reveal.py -- --out <dir> --size 1600x900 [--phone]
      [--count 144] [--frames 0-143] [--test]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "r3"))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=144)
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
C.setup_cycles(exposure=0.25, bounces=10)
import court as S  # noqa: E402
import aangan as A  # noqa: E402
import kit3 as K  # noqa: E402
import kit5 as F  # noqa: E402
from mathutils import Vector  # noqa: E402

K.daylight(58, 48, sky_strength=0.25, ambient=0.55, sun_power=5.2)   # round 4's morning: stripes through the fins
A.fill()

cam = C.camera(30 if opt.phone else 32)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
cx = A.cx / 1000
OPEN_T0, OPEN_T1, OPEN_DEG = 0.12, 0.55, 82.0
far = Vector((cx, A.FAR_Y, 1.0))                     # the carved door on the courtyard's far side, on the axis


def place(t):
    e = C.ease_in_out(t)
    k = C.ease_in_out((t - OPEN_T0) / (OPEN_T1 - OPEN_T0))
    A.open_door(OPEN_DEG * k)
    # up the court, then through the doorway's right-hand side (the leaf turns in on the left)
    cam.location = Vector((cx + 0.5, -5.8, 1.55)).lerp(Vector((cx + 0.15, 1.75, 1.5)), e)
    door = Vector((cx, S.DEPTH / 1000, 1.7))
    C.look_at(cam, door.lerp(far, C.ease_in_out((t - 0.25) / 0.55)))
    cam.data.dof.focus_distance = F.rack(t, 0.35, 0.65, (door - cam.location).length, (far - cam.location).length)
    S.ripple_w.default_value = t * 1.2
    A.water_w.default_value = t * 0.8


F.film(cam, place, N, C.args.out,
       extra=[(S.ripple_w, "default_value"), (A.water_w, "default_value"), (A.pivot, "rotation_euler")])
