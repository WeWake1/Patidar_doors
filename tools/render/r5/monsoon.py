"""PROTOTYPE round 5 · S "Monsoon" (Blender film, plays by itself). The courtyard house behind the pivot door, in
the rain: an overcast sky, rain falling straight into the open court, the stone wet and mirror-dark, the urli
brimming and stirred, and warm lamps over the doors in the dry verandah. The camera tracks slowly along the
verandah behind its teak columns, which pass in front of it out of focus, and settles on the carved door across
the court. (Monsoon is when doors swell and stick; the page may say what is true of the products, nothing more.)

  blender -b --factory-startup --python tools/render/r5/monsoon.py -- --out <dir> --size 1600x900 [--phone]
      [--count 144] [--frames 0-143] [--test]
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "r3"))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=144)
ap.add_argument("--exposure", type=float, default=1.6)
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
FPS = 24
C.setup_cycles(exposure=opt.exposure, bounces=10)
import court as S  # noqa: E402
import aangan as A  # noqa: E402
import kit3 as K  # noqa: E402
import kit5 as F  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

scene = C.scene
MM = 0.001
cx = A.cx / 1000

# ------------------------------------------------------------------ light: an overcast sky, warm lamps over the doors
w = bpy.data.worlds.new("overcast")
scene.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (*C.srgb("#AEB7C2"), 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
for i, x in enumerate((cx - 3.4, cx, cx + 3.4)):
    K.spot(f"door_lamp_{i}", (x, A.FAR_Y - 0.5, 3.15), (x, A.FAR_Y, 1.1), 85, "#FFBE7A", 70, 0.9, 0.04)
for i, y in enumerate((A.COURT_Y0 + 1.7, A.COURT_Y1 - 1.7)):
    K.spot(f"side_lamp_{i}", (cx - 5.1, y, 3.15), (cx - 5.6, y, 1.1), 55, "#FFBE7A", 70, 0.9, 0.04)

# ------------------------------------------------------------------ wet: the court's stone darkened and glazed
def wet(mat, darken=0.55, coat_rough=0.05):
    n, l = mat.node_tree.nodes, mat.node_tree.links
    b = n["Principled BSDF"]
    src = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].links else None
    mul = n.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    if src is not None:
        l.new(src, mul.inputs[6])
    else:
        mul.inputs[6].default_value = b.inputs["Base Color"].default_value
    mul.inputs[7].default_value = (darken, darken, darken, 1)
    l.new(mul.outputs[2], b.inputs["Base Color"])
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = coat_rough


wet(A.court_stone)
wet(A.kerb, 0.7)
wet(bpy.data.materials["plinth"], 0.65)
# the urli brimming and stirred by the drops
for node in bpy.data.materials["urli_water"].node_tree.nodes:
    if node.type == "BUMP":
        node.inputs["Strength"].default_value = 0.25
    if node.type == "TEX_NOISE":
        node.inputs["Scale"].default_value = 30.0

# ------------------------------------------------------------------ rain: one mesh of streaks that falls for the film
V = 8.0                                             # m/s
TOP = 4.6                                           # just above the roofs: nothing visible falls from higher
DROP = V * N / FPS
rng = random.Random(3)
bm = bmesh.new()
x0, x1 = (A.cx - A.CXH) * MM + 0.05, (A.cx + A.CXH) * MM - 0.05
y0, y1 = A.COURT_Y0 + 0.05, A.COURT_Y1 - 0.05
count = int((x1 - x0) * (y1 - y0) * (TOP + DROP) * 15)
if C.args.test:
    count //= 3
for _ in range(count):
    x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
    z = rng.uniform(0.0, TOP + DROP)
    ln = rng.uniform(0.04, 0.07)
    r = 0.0011
    ring = [bm.verts.new((x + r * math.cos(a), y + r * math.sin(a), z)) for a in (0, 2.1, 4.2)]
    tip = [bm.verts.new((v.co.x, v.co.y, z + ln)) for v in ring]
    for k in range(3):
        bm.faces.new((ring[k], ring[(k + 1) % 3], tip[(k + 1) % 3], tip[k]))
me = bpy.data.meshes.new("rain")
bm.to_mesh(me)
bm.free()
rain = bpy.data.objects.new("rain", me)
scene.collection.objects.link(rain)
rm = bpy.data.materials.new("rain")
rm.use_nodes = True
n, l = rm.node_tree.nodes, rm.node_tree.links
n.remove(n["Principled BSDF"])
gl = n.new("ShaderNodeBsdfGlossy")
gl.inputs["Roughness"].default_value = 0.1
em = n.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (*C.srgb("#DDE4EC"), 1)
em.inputs["Strength"].default_value = 0.35
ad = n.new("ShaderNodeAddShader")
l.new(gl.outputs[0], ad.inputs[0])
l.new(em.outputs[0], ad.inputs[1])
tr = n.new("ShaderNodeBsdfTransparent")
mx = n.new("ShaderNodeMixShader")
mx.inputs["Fac"].default_value = 0.5
l.new(tr.outputs[0], mx.inputs[1])
l.new(ad.outputs[0], mx.inputs[2])
l.new(mx.outputs[0], n["Material Output"].inputs["Surface"])
me.materials.append(rm)
rain.visible_shadow = False
rain.visible_diffuse = False

# ------------------------------------------------------------------ the camera: along the verandah behind its columns
cam = C.camera(34 if opt.phone else 40)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 2.8
door = Vector((cx, A.FAR_Y, 1.25))
aim = Vector((cx, A.FAR_Y, 0.8))                     # a little low: the wet stone and its reflections in frame
CAM_Y = A.COURT_Y0 - 0.95


def place(t):
    e = C.ease_in_out(t)
    cam.location = Vector((cx - 3.0, CAM_Y, 1.5)).lerp(Vector((cx - 0.12, CAM_Y + 0.25, 1.45)), e)
    C.look_at(cam, aim + Vector((-1.6 * (1 - e), 0, 0)))
    cam.data.dof.focus_distance = (door - cam.location).length
    rain.location.z = -t * DROP
    A.water_w.default_value = t * 6.0


F.film(cam, place, N, C.args.out, extra=[(rain, "location"), (A.water_w, "default_value")])
