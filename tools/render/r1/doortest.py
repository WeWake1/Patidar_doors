"""PROTOTYPE builder check (not a concept): one doorway built by doorkit, to judge the teak, the brass and
the joinery before any scene depends on them.

  blender -b --factory-startup --python tools/render/r1/doortest.py -- --out <dir> --test \
      [--style panel|plank|flush] [--handle lever|pull] [--angle 0]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--style", default="panel")
ap.add_argument("--handle", default="lever")
ap.add_argument("--angle", type=float, default=0.0)
ap.add_argument("--tex", default="teak_veneer")
opt, _ = ap.parse_known_args(C.argv)

C.setup_cycles(exposure=0.0)
leaf = D.teak("teak_leaf", "polished", tex=opt.tex)
frame = D.teak("teak_frame", "polished", tex=opt.tex, val=0.92)
d = D.door(1050, 2100, 40, style=opt.style, leaf_mat=leaf, frame_mat=frame, handle=opt.handle)
d["pivot"].rotation_euler.z = math.radians(opt.angle)
ow, oh = d["opening"]
D.wall_around(ow, oh, d["frame_face"], 250, 2600, 2600, 3000, D.plaster())
D.floor("floor", (12000, 12000), D.stone())

C.world_hdri("photo_studio_loft_hall_2k.hdr", strength=0.35, rotate_deg=40)
s = C.sun("sun", 5.0, "#FFF1E0", 1.5)
C.aim_sun(s, 26, 12)

cam = C.camera(35)
cam.location = (-1.55, -3.4, 1.35)
C.look_at(cam, (0.15, 0, 1.08))
C.render_to(os.path.join(C.args.out, f"door_{opt.style}_{opt.tex}_{int(opt.angle)}.webp"))
