"""PROTOTYPE round 5 · T "Courtyard" (Blender film, plays by itself). Inside the house behind the pivot door: the
film opens straight down on the open court from above the roofs, the brass urli of marigolds a circle in the
middle of the square, the tree's crown in the corner; then the camera cranes down into the court and tilts up as
it comes, and settles low beside the urli: marigolds soft in the foreground, the carved door across the court
sharp (the doors are catalogue photographs, placeholders).

  blender -b --factory-startup --python tools/render/r5/courtyard.py -- --out <dir> --size 1600x900 [--phone]
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
import court as S  # noqa: E402  (the outer court stands behind the front wall; only its tall walls are seen)
import aangan as A  # noqa: E402
import kit3 as K  # noqa: E402
import kit5 as F  # noqa: E402
from mathutils import Vector  # noqa: E402

K.daylight(58, 48, sky_strength=0.25, ambient=0.55, sun_power=5.2)
A.fill()

cam = C.camera(30 if opt.phone else 32)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 2.8
cx = A.cx / 1000
uy = (A.COURT_Y0 + A.COURT_Y1) / 2
urli = Vector((cx, uy, 0.4))
# where it lands: a phone's tall frame takes the urli and the door from close; a wide one stands back and looks low
END = Vector((cx - 0.5, uy - 1.3, 0.86)) if opt.phone else Vector((cx - 0.45, uy - 2.15, 1.0))
far = Vector((cx + 0.1, A.FAR_Y, 1.2 if opt.phone else 0.5))


def place(t):
    e = C.ease_in_out(t)
    k = C.ease_in_out(min(max((t - 0.12) / 0.8, 0.0), 1.0))       # the tilt lags the descent a little
    cam.location = Vector((cx, uy - 0.25, 9.6)).lerp(END, e)
    target = (urli + Vector((0, 0.35, 0))).lerp(far, k)
    C.look_at(cam, target)
    cam.data.dof.focus_distance = (target + Vector((0, 0, 1.0 - target.z)) * k - cam.location).length
    A.water_w.default_value = t * 0.8


F.film(cam, place, N, C.args.out, extra=[(A.water_w, "default_value")])
