"""PROTOTYPE round 2 · G "The stack" (premium): doors leaning against a white wall in a pale room, fanned so the
ones behind show a strip. A tap pulls the front door forward and lays it down out of the picture; the stack
settles forward and the next door is in front.

The doors are not rendered with designs. Products are shown by photographs (decisions.md, round 1 Q8), so each
face is a plain white "receiver": the page warps a catalogue photo into it and multiplies it by this render's
light (its shadows, the window, the falling door's shadow on the next). Per frame this writes:
  NNN.webp     the plate: the room, the doors' edges, and the light on each face
  NNN.png      the faces, an RGB atlas twice as wide: left R, G, B = the front, second and third doors; right R =
               the fourth (hidden until the stack settles). No alpha: browsers premultiply it away
  corners.json each face's four corners in pixels, clockwise from the top-left, per frame
Then `node tools/render/r2/pack-masks.mjs <dir>` repacks the masks as lossless mNNN.webp (Blender's PNGs are ~0.9 MB).

The last frame is the first frame with every door one place further forward, so the page loops by shifting the
photos one slot and going back to frame 0.

  blender -b --factory-startup --python tools/render/r2/flip.py -- --out <dir> --size 1600x900 [--phone]
      [--count 36] [--frames 0-35] [--test]
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=36)
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
EXPOSURE = -0.75
C.setup_cycles(exposure=EXPOSURE, bounces=10)
PLATE_SAMPLES = scene.cycles.samples

W, H, T = 0.95, 2.1, 0.038                    # the leaf (m): 950 x 2100, close to the catalogue photos' 1:2.2
GAP = 0.012                                    # leaning doors touch near the top only
LEAN = math.radians(6.5)                      # from vertical, top toward the wall
WALL_Y = 0.0                                   # the wall's face; the room is on -Y, the camera too
STEP = (T + GAP) / math.cos(LEAN)              # one door further out, measured along the floor
FAN = 0.13                                     # each door behind sits this much further right
BG = "#E9E8E5"

# ------------------------------------------------------------------ room
wall_m = D.plaster("wall", "#E4E3DF", rough=0.9, bump=0.04)
D.box("wall", (9000, 200, 4200), (0, 100, 2100), wall_m, "z", 0)
skirting = D.flat("skirting", "#E4E3DF", 0.5)
D.box("skirting", (9000, 14, 90), (0, -7, 45), skirting, "x", 0.5)
floor_m = D.stone("floor", base="#C9C9C4", alt="#C2C2BD", tile_mm=800, rough=0.42, joint="#ADADA8")
D.floor("floor", (12000, 12000), floor_m, (0, -5000, 0))

# ------------------------------------------------------------------ the doors
receiver = bpy.data.materials.new("receiver")                 # the face: lit white, the photo goes here
receiver.use_nodes = True
rb = receiver.node_tree.nodes["Principled BSDF"]
rb.inputs["Base Color"].default_value = (0.72, 0.72, 0.72, 1)
rb.inputs["Roughness"].default_value = 0.55
lip = D.teak("lipping", "polished", val=0.62, sat=1.05)
back = D.teak("door_back", "polished", val=0.7)


def door_mesh(name):
    """A leaf in its own space: face on -Y at y = 0, back at y = T, bottom at z = 0, centred on x. Material
    0 = the face (receiver), 1 = the back, 2 = the edges."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * W, (v.co.y + 0.5) * T, (v.co.z + 0.5) * H))
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        f.material_index = 0 if n.y < -0.9 else (1 if n.y > 0.9 else 2)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in (receiver, back, lip):
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = 0.0015
    bv.segments = 2
    bv.limit_method = "ANGLE"
    return ob


# poses: (x of the leaf's centre, distance of its bottom front edge from the wall, yaw in degrees)
D_BACK = H * math.sin(LEAN) + T * math.cos(LEAN) + 0.002      # the hidden door's top edge rests on the wall
X0 = 0.0
POSES = [
    (X0, D_BACK + 3 * STEP, -0.4),          # 0: in front
    (X0 + FAN, D_BACK + 2 * STEP, 0.3),     # 1
    (X0 + 2 * FAN, D_BACK + STEP, -0.2),    # 2
    (X0 + 2 * FAN, D_BACK, 0.2),            # 3: right behind 2, hidden
]


def pose_matrix(x, d, yaw_deg, tip=0.0, slide=0.0):
    """World matrix of a leaf standing at (x, d) leaning on the wall; tip (rad, + = top toward the camera)
    turns it about its bottom front edge, slide moves that edge toward the camera."""
    lean = -LEAN + tip                                          # rotation about X: + brings the top to -Y
    m = Matrix.Translation((x, WALL_Y - d - slide, 0.0))
    m = m @ Matrix.Rotation(math.radians(yaw_deg), 4, "Z")
    m = m @ Matrix.Rotation(lean, 4, "X")
    return m


def lerp(a, b, t):
    return a + (b - a) * t


doors = [door_mesh(f"door_{k}") for k in range(4)]
FACE = [Vector((-W / 2, 0, H)), Vector((W / 2, 0, H)), Vector((W / 2, 0, 0)), Vector((-W / 2, 0, 0))]


def place(t):
    """t in 0..1 across the flip."""
    # the front door: pulled forward at the foot while its top comes down, like laying a door down
    u = C.ease(min(t / 0.78, 1.0))
    u = u * u * (1.6 - 0.6 * u)                     # slow to start, then it falls
    x, d, yaw = POSES[0]
    doors[0].matrix_world = pose_matrix(x, d, yaw, tip=u * (math.pi / 2 + LEAN), slide=0.55 * u)
    # the rest settle forward one place once the front one is clear of them
    v = C.ease_in_out(min(max((t - 0.32) / 0.6, 0.0), 1.0))
    for k in (1, 2, 3):
        a, b = POSES[k], POSES[k - 1]
        doors[k].matrix_world = pose_matrix(lerp(a[0], b[0], v), lerp(a[1], b[1], v), lerp(a[2], b[2], v))


# ------------------------------------------------------------------ light
WORLD = 0.22
C.world_hdri("studio_small_09_2k.hdr", strength=WORLD, rotate_deg=110, camera_color=BG)
C.area("window", (-3.6, -1.2, 2.2), 2.2, 520, "#FFF1E0", (0.3, 0.0, 0.9), size_y=1.8)    # a big window, left
C.area("bounce", (2.6, -3.2, 1.4), 2.5, 45, "#EEF1F7", (0.3, 0.0, 1.0))

# ------------------------------------------------------------------ camera
if opt.phone:
    cam = C.camera(42)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
    cam.location = (0.13, -3.3, 1.2)
    C.look_at(cam, Vector((0.13, 0.0, 1.06)))
else:
    cam = C.camera(40)
    cam.location = (-0.55, -5.0, 1.28)        # the stack sits right of centre, clear of the headline
    C.look_at(cam, Vector((-0.55, 0.0, 1.06)))
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 5.6
cam.data.dof.focus_distance = (Vector((0.1, -0.4, 1.0)) - cam.location).length

# ------------------------------------------------------------------ the face masks: a second, flat render
black = bpy.data.materials.new("mask_black")
black.use_nodes = True
nt = black.node_tree
nt.nodes.remove(nt.nodes["Principled BSDF"])
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (0, 0, 0, 1)
nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])


def emit(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    t.nodes.remove(t.nodes["Principled BSDF"])
    e = t.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*rgb, 1)
    e.inputs["Strength"].default_value = 1.0
    t.links.new(e.outputs[0], t.nodes["Material Output"].inputs["Surface"])
    return m


CHAN = [emit("m_r", (1, 0, 0)), emit("m_g", (0, 1, 0)), emit("m_b", (0, 0, 1)), emit("m_w", (1, 0, 0))]
everything = [o for o in scene.objects if o.type == "MESH"]
saved = {o.name: [s.material for s in o.material_slots] for o in everything}


def mask_mode(which):
    """which: 'a' (doors 0-2 in R, G, B) or 'b' (door 3 in R)."""
    for o in everything:
        for s in o.material_slots:
            s.material = black
    for k, dr in enumerate(doors):
        if (which == "a" and k < 3) or (which == "b" and k == 3):
            dr.material_slots[0].material = CHAN[k]
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0


def plate_mode():
    for o in everything:
        for s, m in zip(o.material_slots, saved[o.name]):
            s.material = m
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = WORLD
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


def render_png(path):
    s = scene.render.image_settings
    s.file_format = "PNG"
    s.color_mode = "RGB"
    s.color_depth = "8"
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


RW = int(scene.render.resolution_x * scene.render.resolution_percentage / 100)
RH = int(scene.render.resolution_y * scene.render.resolution_percentage / 100)
tmp = os.path.join(C.args.out, "_tmp")
os.makedirs(tmp, exist_ok=True)
corners = []
todo = set(C.frame_list(N))
for f in range(N):
    place(f / (N - 1))
    bpy.context.view_layer.update()
    fr = []
    for dr in doors:
        q = []
        for p in FACE:
            c = world_to_camera_view(scene, cam, dr.matrix_world @ p)
            q.append([round(c.x * RW, 2), round((1 - c.y) * RH, 2), round(c.z, 3)])
        fr.append(q)
    corners.append(fr)
    if f not in todo:
        continue
    plate_mode()
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
    mask_mode("a")
    render_png(os.path.join(tmp, "a.png"))
    mask_mode("b")
    render_png(os.path.join(tmp, "b.png"))
    a = bpy.data.images.load(os.path.join(tmp, "a.png"))
    b = bpy.data.images.load(os.path.join(tmp, "b.png"))
    for im in (a, b):
        im.colorspace_settings.name = "Non-Color"
    pa = np.array(a.pixels[:], dtype=np.float32).reshape(RH, RW, 4)
    pb = np.array(b.pixels[:], dtype=np.float32).reshape(RH, RW, 4)
    # one RGB atlas, no alpha (browsers premultiply decoded alpha and would wipe R, G and B wherever A is 0):
    # left half = doors 0-2 in R, G, B; right half = door 3 in R
    out = np.zeros((RH, RW * 2, 4), dtype=np.float32)
    out[..., 3] = 1.0
    out[:, :RW, :3] = pa[..., :3]
    out[:, RW:, 0] = pb[..., 0]
    img = bpy.data.images.new(f"mask_{f}", RW * 2, RH, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(out.ravel())
    img.filepath_raw = os.path.join(C.args.out, f"{f:03d}.png")
    img.file_format = "PNG"
    img.save()
    for im in (a, b, img):
        bpy.data.images.remove(im)
    print("MASK", f, flush=True)
    plate_mode()

with open(os.path.join(C.args.out, "corners.json"), "w") as fh:
    json.dump({"count": N, "size": [RW, RH], "slots": 4, "frames": corners}, fh)
print("CORNERS written", N, RW, RH)
