"""PROTOTYPE round 1 · C "The first cut" (wild): a teak log, end-on. A band-saw blade runs its length toward
you, the kerf line advancing along the top in a spray of sawdust; it comes out through the near end and
splits the rings; the two halves fall open like a book, showing mirror-image grain (bookmatched). The
camera faces the cut, so the kerf is a near-vertical line on screen and the page splits along it.

True thing it shows: logs are bought whole and sawn in Patidar's own yard (owner-confirmed, round 1 Q9).
The log, the saw and the set are representative. The end grain is a photographed log end (ambientCG
TreeEnd003, CC0), tinted toward teak; the log's outline is read from that scan, so the photo fits it.

  blender -b --factory-startup --python tools/render/r1/cut.py -- --out <dir> [--phone] [--count 120] \
      [--frames 0,60,119] [--test]

Frame plan (COUNT=120): 0-14 still log · 14-78 the blade travels far end -> near end · 78-86 it comes out,
the near face splits · 86-116 the halves open like a book · then they rest, the sawdust settles.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=120)
opt, _ = ap.parse_known_args(C.argv)
COUNT = opt.count
k = (COUNT - 1) / 119.0
T_START, T_EXIT, T_SPLIT, T_OPEN = (round(t * k) for t in (14, 78, 86, 116))

C.setup_cycles(look="AgX - Medium High Contrast", exposure=-0.15, bounces=8)
scene = C.scene
scene.frame_start, scene.frame_end = 0, COUNT - 1
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.5

R0, L = 0.31, 3.0                    # mean log radius at the near (butt) end, length (m)
RAIL_H = 0.27                        # the carriage rail lifts the log, so the opened halves clear the floor
ZC = RAIL_H + R0                     # axis height

# ------------------------------------------------------------------ the scanned log end: outline + texture
TE = os.path.join(C.TEXTURES, "TreeEnd003", "TreeEnd003_2K-JPG_")
op = bpy.data.images.load(TE + "Opacity.jpg", check_existing=True)
IW, IH = op.size
mask = np.array(op.pixels[:], dtype=np.float32).reshape(IH, IW, 4)[..., 0] > 0.5
ys, xs = np.nonzero(mask)
CX, CY = xs.mean(), ys.mean()
ANG = np.linspace(0, 2 * math.pi, 720, endpoint=False)
r_px = []
for a in ANG:
    ca, sa = math.cos(a), math.sin(a)
    r = 0
    while True:
        x, y = int(CX + r * ca), int(CY + r * sa)
        if x < 0 or y < 0 or x >= IW or y >= IH or not mask[y, x]:
            break
        r += 1
    r_px.append(r - 2)
r_px = np.convolve(np.r_[r_px[-4:], r_px, r_px[:4]], np.ones(9) / 9, mode="same")[4:-4]
R_PX = float(np.mean(r_px))
print("LOG OUTLINE from scan: mean radius px", round(R_PX, 1), "min/max", int(min(r_px)), int(max(r_px)))


def outline(theta):
    t = (theta % (2 * math.pi)) / (2 * math.pi) * len(ANG)
    i0 = int(t) % len(ANG)
    i1 = (i0 + 1) % len(ANG)
    f = t - int(t)
    return (r_px[i0] * (1 - f) + r_px[i1] * f) / R_PX


def taper(y):
    return 1.0 - 0.07 * (y / L)


def radius(theta, y):
    return R0 * taper(y) * outline(theta)


# ------------------------------------------------------------------ materials
def end_grain(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    uv = n.new("ShaderNodeUVMap")

    def img(kind, cs):
        t = n.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(TE + kind + ".jpg", check_existing=True)
        t.image.colorspace_settings.name = cs
        t.interpolation = "Cubic"
        l.new(uv.outputs["UV"], t.inputs["Vector"])
        return t

    col, rg, nr = img("Color", "sRGB"), img("Roughness", "Non-Color"), img("NormalGL", "Non-Color")
    hs = n.new("ShaderNodeHueSaturation")
    hs.inputs["Saturation"].default_value = 1.0
    hs.inputs["Value"].default_value = 0.82
    l.new(col.outputs["Color"], hs.inputs["Color"])
    tn = n.new("ShaderNodeMix"); tn.data_type = "RGBA"; tn.blend_type = "MULTIPLY"
    tn.inputs["Factor"].default_value = 1.0
    l.new(hs.outputs["Color"], D._sock(tn, "A", "RGBA"))
    D._sock(tn, "B", "RGBA").default_value = (*C.srgb("#D8A877"), 1)       # toward teak's gold, not orange
    l.new(D._out(tn, "RGBA"), b.inputs["Base Color"])
    rm = n.new("ShaderNodeMapRange")
    rm.inputs["To Min"].default_value, rm.inputs["To Max"].default_value = 0.6, 0.9
    l.new(rg.outputs["Color"], rm.inputs["Value"]); l.new(rm.outputs[0], b.inputs["Roughness"])
    nm = n.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.0
    l.new(nr.outputs["Color"], nm.inputs["Color"]); l.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def add_kerf_line(mat, width=0.0028, dark="#22160D"):
    """A dark line |x| < width wherever the blade has already passed (object y > cut_pos). Drawn in the
    shader because the two halves touch at x = 0 until they part: a real slot would hide inside the log.
    Returns the Value node to keyframe."""
    n, l = mat.node_tree.nodes, mat.node_tree.links
    b = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    src = next(lk for lk in l if lk.to_node == b and lk.to_socket.name == "Base Color").from_socket
    tc = n.new("ShaderNodeTexCoord")
    sp = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sp.inputs[0])
    ax = n.new("ShaderNodeMath"); ax.operation = "ABSOLUTE"; l.new(sp.outputs["X"], ax.inputs[0])
    inx = n.new("ShaderNodeMath"); inx.operation = "LESS_THAN"; inx.inputs[1].default_value = width
    l.new(ax.outputs[0], inx.inputs[0])
    cut = n.new("ShaderNodeValue"); cut.name = "cut_pos"; cut.outputs[0].default_value = 99.0
    past = n.new("ShaderNodeMath"); past.operation = "GREATER_THAN"
    l.new(sp.outputs["Y"], past.inputs[0]); l.new(cut.outputs[0], past.inputs[1])
    both = n.new("ShaderNodeMath"); both.operation = "MULTIPLY"
    l.new(inx.outputs[0], both.inputs[0]); l.new(past.outputs[0], both.inputs[1])
    mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
    l.new(both.outputs[0], mix.inputs["Factor"])
    l.new(src, D._sock(mix, "A", "RGBA"))
    D._sock(mix, "B", "RGBA").default_value = (*C.srgb(dark), 1)
    l.new(D._out(mix, "RGBA"), b.inputs["Base Color"])
    return cut


end_mat = end_grain("end_grain")
bark_mat = D.wood("bark", "Bark014", tile_m=0.9, sat=0.7, val=0.4, rough=(0.75, 0.95), normal=1.5, var=0.08,
                  per_object=False)
fresh_mat = D.teak("fresh_teak", "raw", val=0.74, sat=1.2, per_object=False)    # the inside, just sawn
cut_nodes = [add_kerf_line(bark_mat), add_kerf_line(end_mat)]
steel = D.metal("blade_steel", "#C9CDD1", rough=0.14, rough_var=0.05, aniso=0.6)
dark_steel = D.dark_metal("machine", 0.38)
dust_mat = D.flat("sawdust", "#9A6A35", 0.85)

# ------------------------------------------------------------------ the log, as two halves split at x = 0
NT, NY = 96, 60                                              # outline segments per half, rings along the length


def half_log(name, side, spine):
    """side -1 = the left half (x < 0), +1 = the right. Built round its own axis (so object space is
    centred for the end-grain UVs and the kerf line), parented to `spine`, an empty on the bottom of the
    cut: rotating the spine about Y opens the half like a book cover."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    th0, th1 = (math.pi / 2, 3 * math.pi / 2) if side < 0 else (-math.pi / 2, math.pi / 2)
    rings = []
    for j in range(NY + 1):
        y = L * j / NY
        ring = []
        for i in range(NT + 1):
            th = th0 + (th1 - th0) * i / NT
            r = radius(th, y)
            x = 0.0 if i in (0, NT) else r * math.cos(th)       # the two ends of the outline sit on the cut
            ring.append(bm.verts.new((x, y, r * math.sin(th))))
        rings.append(ring)
    faces_bark, faces_cut = [], []
    for j in range(NY):
        a, b2 = rings[j], rings[j + 1]
        for i in range(NT):
            faces_bark.append(bm.faces.new((a[i], a[i + 1], b2[i + 1], b2[i])))
        faces_cut.append(bm.faces.new((a[NT], a[0], b2[0], b2[NT])))
    ends = [bm.faces.new(rings[0]), bm.faces.new(rings[NY][::-1])]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in faces_bark:
        f.material_index = 0
        for lp in f.loops:
            co = lp.vert.co
            lp[uvl].uv = (math.atan2(co.z, co.x) * R0, co.y)    # V along the log: the fissures run with it
    for f, y in zip(ends, (0.0, L)):
        f.material_index = 1
        mpp = R0 * taper(y) / R_PX                             # metres per scan pixel at this end
        for lp in f.loops:
            co = lp.vert.co
            lp[uvl].uv = ((CX + co.x / mpp) / IW, (CY + co.z / mpp) / IH)
    for f in faces_cut:
        f.material_index = 2
        for lp in f.loops:
            lp[uvl].uv = (lp.vert.co.z, lp.vert.co.y)          # the same coordinates on both halves: bookmatched
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mat in (bark_mat, end_mat, fresh_mat):
        me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = p.material_index == 0
    ob = bpy.data.objects.new(name, me)
    C.scene.collection.objects.link(ob)
    ob.parent = spine
    ob.location = (0, 0, ZC - spine.location.z)                  # the axis at height ZC in the world
    return ob


spine_z = ZC - radius(3 * math.pi / 2, 0)                        # the bottom of the cut, where the halves hinge
spines = []
for side in (-1, 1):
    sp_ob = bpy.data.objects.new(f"spine_{side}", None)
    C.scene.collection.objects.link(sp_ob)
    sp_ob.location = (0, 0, spine_z)
    half_log(f"half_{side}", side, sp_ob)
    spines.append((side, sp_ob))

# ------------------------------------------------------------------ the machine and the set
# the carriage: one steel rail under the spine, so the halves open away from it
D.box("rail", (70, (L + 0.4) * 1000, spine_z * 1000), (0, L * 500, spine_z * 500), dark_steel, "y", 3)
D.box("rail_foot", (260, (L + 0.4) * 1000, 24), (0, L * 500, 12), dark_steel, "y", 3)
blade = D.box("blade", (1.2, 150, 3000), (0, 0, 1500), steel, "y", 0.3)
guide = D.box("guide", (120, 180, 260), (0, 0, 0), dark_steel, "z", 6)   # the blade guide rides just above the log
floor_mat = D.cyc("cyc", "#EEEEEC", "#EDEDEB", (4.5, 11.0))
floor_ob = D.floor("floor", (30000, 30000), floor_mat, (0, 0, 0))
floor_ob.modifiers.new("collision", "COLLISION")               # the sawdust lands and stays
floor_ob.collision.damping_factor = 0.9
floor_ob.collision.friction_factor = 0.9

# sawdust: emitted where the blade meets the top of the log; it follows the blade, flies and settles.
emitter = D.box("dust_emitter", (40, 30, 10), (0, 0, (ZC + R0) * 1000), dust_mat, "z", 0)
emitter.show_instancer_for_render = False                    # draw the dust, not the emitter's own box
chip = D.box("chip", (6.0, 3.5, 1.6), (0, 0, -5000), dust_mat, "z", 0)
ps = emitter.modifiers.new("dust", "PARTICLE_SYSTEM").particle_system.settings
ps.count = 9000
ps.frame_start, ps.frame_end = T_START + 1, T_EXIT + 4
ps.lifetime = COUNT
ps.emit_from = "VOLUME"
ps.normal_factor = 0.0
ps.object_align_factor = (0.0, -1.6, 2.8)                    # up, and toward the camera
ps.factor_random = 2.2
ps.render_type = "OBJECT"
ps.instance_object = chip
ps.particle_size = 1.0
ps.size_random = 0.75
ps.use_rotations = True
ps.rotation_factor_random = 1.0
ps.angular_velocity_mode = "RAND"
ps.angular_velocity_factor = 14.0
ps.mass = 1.0                        # a tiny mass with drag makes the integration diverge (positions go to inf)
ps.drag_factor = 0.06


# ------------------------------------------------------------------ animation
def blade_y(f):
    if f <= T_START:
        return L + 0.12
    if f >= T_EXIT:
        return -0.2
    t = (f - T_START) / (T_EXIT - T_START)
    return (L + 0.12) + (-0.2 - (L + 0.12)) * C.ease_in_out(t)


for f in range(COUNT):
    by = blade_y(f)
    blade.location = (0, by, 1.5)
    blade.keyframe_insert("location", frame=f)
    top = ZC + radius(math.pi / 2, min(max(by, 0.0), L))
    guide.location = (0, by, top + 0.16)
    guide.keyframe_insert("location", frame=f)
    emitter.location = (0, min(max(by, 0.0), L), top)
    emitter.keyframe_insert("location", frame=f)
    for node in cut_nodes:                                    # the kerf: from the blade to the far end; gone
        node.outputs[0].default_value = by if f < T_SPLIT + 2 else 99.0   # once the halves part
        node.outputs[0].keyframe_insert("default_value", frame=f)
    gone = f >= T_EXIT + 4
    for ob in (blade, guide):
        ob.hide_render = gone
        ob.keyframe_insert("hide_render", frame=f)
    o = C.ease_in_out((f - T_SPLIT) / (T_OPEN - T_SPLIT)) if f > T_SPLIT else 0.0
    for side, sp_ob in spines:
        sp_ob.rotation_euler = (0, side * math.radians(76) * o, 0)
        sp_ob.keyframe_insert("rotation_euler", frame=f)

# ------------------------------------------------------------------ light and camera
C.world_hdri("studio_small_09_2k.hdr", strength=0.3, rotate_deg=200, camera_color="#EDEDEB", camera_strength=0.95)
C.area("key", (-2.4, -1.4, 3.2), 2.4, 420, "#FFF4E8", (0, 0.8, 0.5))
C.area("fill", (2.8, -2.4, 1.5), 2.0, 110, "#E8EEFF", (0, 0.8, 0.5))
C.area("rim", (0.6, 4.8, 2.8), 3.0, 420, "#FFFFFF", (0, 0.6, 0.5))
scene.view_settings.exposure = -0.3

# the camera: a little left of and above the cut (the blade's face and the log's top read, and the split
# stays near-vertical on screen); after the split it rises to look down into the open book
tgt = bpy.data.objects.new("cam_target", None)
C.scene.collection.objects.link(tgt)
if opt.phone:
    scene.render.resolution_x, scene.render.resolution_y = 800, 1000
    cam = C.camera(44)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 30
    shots = [((-0.3, -2.45, 1.05), (0.0, 1.0, 0.5)), ((-0.12, -2.3, 2.9), (0.0, 1.1, 0.2))]
else:
    cam = C.camera(50)
    shots = [((-0.42, -2.3, 1.02), (0.0, 1.0, 0.5)), ((-0.15, -2.25, 2.75), (0.0, 1.15, 0.22))]
con = cam.constraints.new("TRACK_TO")
con.target = tgt
con.track_axis = "TRACK_NEGATIVE_Z"
con.up_axis = "UP_Y"
for fr, (loc, look) in ((0, shots[0]), (T_SPLIT, shots[0]), (min(T_OPEN + 3, COUNT - 1), shots[1])):
    cam.location, tgt.location = loc, look
    cam.keyframe_insert("location", frame=fr)
    tgt.keyframe_insert("location", frame=fr)
cam.data.dof.use_dof = True
cam.data.dof.focus_object = tgt
cam.data.dof.aperture_fstop = 9.0

# step the dust simulation forward once, in order, so any frame can then be rendered on its own
for f in range(COUNT):
    scene.frame_set(f)
if os.environ.get("DUST_DEBUG"):
    for f in (T_START + 10, (T_START + T_EXIT) // 2, T_EXIT):
        scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        pss = emitter.evaluated_get(dg).particle_systems[0].particles
        alive = [p for p in pss if p.alive_state == "ALIVE"]
        zs = [p.location.z for p in alive]
        print("DUST", f, "alive", len(alive), "of", len(pss), "z range", (round(min(zs), 3), round(max(zs), 3)) if zs else None,
              "emitter at", tuple(round(v, 3) for v in emitter.matrix_world.translation))

# where the split lands on screen (x across 0..1, y up 0..1): the page splits along this line
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402
scene.frame_set(T_SPLIT)
for zz in (ZC + R0, ZC - R0):
    print("SPLIT_SCREEN", tuple(round(v, 4) for v in world_to_camera_view(scene, cam, Vector((0, 0, zz)))))

for f in C.frame_list(COUNT):
    scene.frame_set(f)
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
