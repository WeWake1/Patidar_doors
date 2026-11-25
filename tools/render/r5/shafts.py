"""PROTOTYPE round 5 · Q "Arrival, filmed" (Blender film, plays by itself). Round 4's grand court, the owner's
favourite direction, shot the way a film crew would: it opens on leaves out of focus in the foreground, pulls
focus to the door far down the court, and pushes slowly in past the plant. Keyframed camera with motion blur;
grain, vignette and a little bloom at the encode.

  blender -b --factory-startup --python tools/render/r5/shafts.py -- --out <dir> --size 1600x900 [--phone]
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
import court as S  # noqa: E402  (builds the court)
import kit3 as K  # noqa: E402
import kit5 as F  # noqa: E402
from mathutils import Vector  # noqa: E402

scene = C.scene
# round 4's bright morning: the sun through the fins in stripes (a haze for visible beams was tried: it greyed the
# whole court and the beams only read when looking into the sun, with the door then in shade)
K.daylight(58, 48, sky_strength=0.25, ambient=0.55, sun_power=5.2)
# a plant right at the court's mouth, for the camera to look past
K.model("potted_plant_02", (-0.95, -S.COURT_D / 1000 - 0.1, 0.0), rot_deg=60, height=1.5)

cam = C.camera(32 if opt.phone else 35)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 2.8
door_c = Vector((S.dx / 1000, S.DEPTH / 1000, 1.7))
leaf_c = Vector((-0.85, -S.COURT_D / 1000 - 0.1, 1.15))


def place(t):
    e = C.ease_in_out(t)
    start = Vector((-0.55, -S.COURT_D / 1000 - 1.35, 1.25))
    end = Vector((S.dx / 1000 - 0.1, -5.6, 1.6))       # far enough that the whole 3.3 m door is in frame
    cam.location = start.lerp(end, e)
    C.look_at(cam, door_c + Vector((0.0, 0.0, 0.9 * (1 - e) - 0.05 * e)))
    far = (door_c - cam.location).length
    near = (leaf_c - cam.location).length
    cam.data.dof.focus_distance = F.rack(t, 0.08, 0.38, near, far)
    S.ripple_w.default_value = t * 1.2


F.film(cam, place, N, C.args.out, extra=[(S.ripple_w, "default_value")])
