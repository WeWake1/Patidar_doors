"""PROTOTYPE round 2 · E "Knock" (wild): four close stills to knock on, one for each thing Patidar sells. The page
draws them in a WebGL canvas; a tap plays a knock and sends a ring through the grain from the knuckle, and each
knock turns the surface into the next material.

  blender -b --factory-startup --python tools/render/r2/knock.py -- --surface door|timber|ply|wpc \
      --out <dir> --size 1920x1080 [--phone] [--test]

  door    the lock stile of a panelled teak door: the lever, the lock rail, a raised panel, the frame
  timber  a teak log end on: rings, checks and a lip of bark (the log end is a CC0 scan, TreeEnd003)
  ply     18 mm sheets stacked flat, edges toward you: the plies as stripes
  wpc     a white WPC door face with routed V-grooves, its edge and the frame

True things (decisions.md, round 1 Q9): door leaves pressed and finished in Patidar's own factory; logs bought
whole and sawn in its own yard; timber seasoned to resist warping; WPC doors do not swell. Representative
pieces, not catalogue products.
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
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--surface", required=True, choices=["door", "timber", "ply", "wpc"])
ap.add_argument("--phone", action="store_true")
opt, _ = ap.parse_known_args(C.argv)
S, PHONE = opt.surface, opt.phone
scene = C.scene


def cam_at(loc, target, lens, fstop=8.0):
    cam = C.camera(lens)
    cam.location = Vector(loc)
    C.look_at(cam, Vector(target))
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    cam.data.dof.focus_distance = (Vector(target) - Vector(loc)).length
    if PHONE:
        cam.data.sensor_fit = "VERTICAL"
        cam.data.sensor_height = 36.0
    return cam


def boolean_cut(target, cutter):
    m = target.modifiers.new("cut_" + cutter.name, "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = cutter
    cutter.hide_render = True
    cutter.hide_viewport = True


# ====================================================================== door
BG = "#DAD8D3"                                                          # what the camera sees past the subject
if S == "door":
    C.setup_cycles(exposure=-0.55, bounces=10)
    leaf = D.teak("teak_leaf", "polished", pores=0.55, val=0.62, sat=1.2)
    d = D.door(900, 2100, 40, "panel", leaf, handle="lever", lock_height=1050)
    ow, oh = d["opening"]
    D.wall_around(ow, oh, d["frame_face"], 140, 1600, 1600, 3000, D.plaster("wall", "#EDEDEA"))
    D.floor("floor", (8000, 8000), D.stone("floor"))
    C.world_hdri("studio_small_09_2k.hdr", strength=0.12, rotate_deg=40, camera_color=BG)
    C.area("key", (-2.1, -0.45, 1.75), 0.9, 420, "#FFF0DC", (0.2, 0.0, 1.1))    # a window far left: grazing light
    C.area("bounce", (1.4, -1.6, 0.9), 1.6, 22, "#EEF2FF", (0.3, 0.0, 1.1))
    if PHONE:
        cam_at((0.06, -1.05, 1.24), (0.28, 0.02, 1.16), 50)
    else:
        cam_at((-0.06, -0.97, 1.2), (0.21, 0.02, 1.1), 50)

# ====================================================================== timber: a log end, from the scan
elif S == "timber":
    C.setup_cycles(exposure=-0.25, bounces=8)
    TE = os.path.join(C.TEXTURES, "TreeEnd003", "TreeEnd003_2K-JPG_")
    op = bpy.data.images.load(TE + "Opacity.jpg", check_existing=True)
    IW, IH = op.size
    mask = np.array(op.pixels[:], dtype=np.float32).reshape(IH, IW, 4)[..., 0] > 0.5
    ys, xs = np.nonzero(mask)
    CX, CY = xs.mean(), ys.mean()
    NT = 360
    ANG = np.linspace(0, 2 * math.pi, NT, endpoint=False)
    rp = []
    for a in ANG:
        ca, sa = math.cos(a), math.sin(a)
        r = 0
        while True:
            x, y = int(CX + r * ca), int(CY + r * sa)
            if x < 0 or y < 0 or x >= IW or y >= IH or not mask[y, x]:
                break
            r += 1
        rp.append(r - 2)
    rp = np.convolve(np.r_[rp[-4:], rp, rp[:4]], np.ones(9) / 9, mode="same")[4:-4]
    RPX = float(np.mean(rp))
    R0, L = 0.33, 1.6

    def end_mat():
        m = bpy.data.materials.new("end_grain")
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
        hs.inputs["Value"].default_value = 0.86
        l.new(col.outputs["Color"], hs.inputs["Color"])
        tn = n.new("ShaderNodeMix"); tn.data_type = "RGBA"; tn.blend_type = "MULTIPLY"
        tn.inputs["Factor"].default_value = 1.0
        l.new(hs.outputs["Color"], D._sock(tn, "A", "RGBA"))
        D._sock(tn, "B", "RGBA").default_value = (*C.srgb("#DDAE7C"), 1)
        l.new(D._out(tn, "RGBA"), b.inputs["Base Color"])
        rm = n.new("ShaderNodeMapRange")
        rm.inputs["To Min"].default_value, rm.inputs["To Max"].default_value = 0.62, 0.9
        l.new(rg.outputs["Color"], rm.inputs["Value"]); l.new(rm.outputs[0], b.inputs["Roughness"])
        nm = n.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.2
        l.new(nr.outputs["Color"], nm.inputs["Color"]); l.new(nm.outputs["Normal"], b.inputs["Normal"])
        return m

    end = end_mat()
    bark = D.wood("bark", "Bark014", tile_m=0.5, sat=0.85, val=0.42, rough=(0.75, 0.95), normal=1.0, per_object=False)
    # the log lies along +Y, its sawn end at y = 0 facing the camera (-Y)
    me = bpy.data.meshes.new("log")
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    front, back = [], []
    for i, a in enumerate(ANG):
        r = R0 * rp[i] / RPX
        front.append(bm.verts.new((r * math.cos(a), 0.0, -r * math.sin(a))))      # image y runs down: flip
        back.append(bm.verts.new((r * 0.93 * math.cos(a), L, -r * 0.93 * math.sin(a))))
    cap = bm.faces.new(list(reversed(front)))
    cap.material_index = 0
    for lp in cap.loops:
        i = front.index(lp.vert)
        a = ANG[i]
        lp[uvl].uv = ((CX + rp[i] * math.cos(a)) / IW, 1 - (CY + rp[i] * math.sin(a)) / IH)
    for i in range(NT):
        j = (i + 1) % NT
        f = bm.faces.new((front[i], front[j], back[j], back[i]))
        f.material_index = 1
        for lp, uvv in zip(f.loops, ((i / NT * 2, 0), ((i + 1) / NT * 2, 0), ((i + 1) / NT * 2, L), (i / NT * 2, L))):
            lp[uvl].uv = uvv
    bm.faces.new(back)
    bm.to_mesh(me)
    bm.free()
    log = bpy.data.objects.new("log", me)
    scene.collection.objects.link(log)
    log.data.materials.append(end)
    log.data.materials.append(bark)
    log.location = (0, 0, R0 * 1.02)
    D.floor("floor", (8000, 8000), D.cyc("cyc", BG, BG, (3.0, 8.0)))
    C.world_hdri("studio_small_09_2k.hdr", strength=0.25, rotate_deg=200, camera_color=BG)
    C.area("key", (-1.4, -0.6, 0.9), 0.5, 140, "#FFF1DE", (0.0, 0.0, R0))          # low and from the side: the saw marks
    C.area("fill", (1.2, -1.4, 0.8), 1.4, 30, "#EEF2FF", (0.0, 0.0, R0))
    if PHONE:
        cam_at((0.07, -0.72, R0 + 0.06), (0.07, 0.0, R0 + 0.06), 50, 11)
    else:
        cam_at((0.1, -0.66, R0 + 0.12), (0.1, 0.0, R0 + 0.12), 50, 11)

# ====================================================================== ply: sheets stacked flat, edges on
elif S == "ply":
    C.setup_cycles(exposure=-0.4, bounces=8)

    def ply_edge(name, seed):
        """The cut edge of an 18 mm sheet: 13 plies of about 1.3 mm, alternate ones turned 90 degrees (the
        cross plies show end grain: darker, speckled), dark glue lines between them, a slight wave."""
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        n, l = m.node_tree.nodes, m.node_tree.links
        b = n["Principled BSDF"]
        tc = n.new("ShaderNodeTexCoord")
        sep = n.new("ShaderNodeSeparateXYZ")
        l.new(tc.outputs["Object"], sep.inputs[0])
        wav = n.new("ShaderNodeTexNoise"); wav.inputs["Scale"].default_value = 9.0
        wav.noise_dimensions = "4D"
        wav.inputs["W"].default_value = seed
        wm = n.new("ShaderNodeMath"); wm.operation = "MULTIPLY_ADD"
        wm.inputs[1].default_value = 0.00035; wm.inputs[2].default_value = -0.000175
        l.new(wav.outputs["Fac"], wm.inputs[0])
        zz = n.new("ShaderNodeMath"); zz.operation = "ADD"
        l.new(sep.outputs["Z"], zz.inputs[0]); l.new(wm.outputs[0], zz.inputs[1])
        k = n.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = 1 / 0.00132
        l.new(zz.outputs[0], k.inputs[0])
        fr = n.new("ShaderNodeMath"); fr.operation = "FRACT"; l.new(k.outputs[0], fr.inputs[0])
        fl = n.new("ShaderNodeMath"); fl.operation = "FLOOR"; l.new(k.outputs[0], fl.inputs[0])
        md = n.new("ShaderNodeMath"); md.operation = "PINGPONG"; md.inputs[1].default_value = 1.0
        l.new(fl.outputs[0], md.inputs[0])                       # 0, 1, 0, 1 ... by ply
        # fibre: long streaks on the face plies, specks on the cross plies
        streak = n.new("ShaderNodeTexNoise"); streak.inputs["Scale"].default_value = 60.0
        streak.inputs["Detail"].default_value = 8.0
        mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.04, 1.0, 8.0)
        l.new(tc.outputs["Object"], mp.inputs["Vector"]); l.new(mp.outputs["Vector"], streak.inputs["Vector"])
        speck = n.new("ShaderNodeTexVoronoi"); speck.inputs["Scale"].default_value = 900.0
        l.new(tc.outputs["Object"], speck.inputs["Vector"])
        a = n.new("ShaderNodeMix"); a.data_type = "RGBA"
        D._sock(a, "A", "RGBA").default_value = (*C.srgb("#C9AE7A"), 1)
        D._sock(a, "B", "RGBA").default_value = (*C.srgb("#ECDDB6"), 1)
        l.new(streak.outputs["Fac"], a.inputs["Factor"])
        c = n.new("ShaderNodeMix"); c.data_type = "RGBA"
        D._sock(c, "A", "RGBA").default_value = (*C.srgb("#83603A"), 1)
        D._sock(c, "B", "RGBA").default_value = (*C.srgb("#B48A57"), 1)
        l.new(speck.outputs["Distance"], c.inputs["Factor"])
        sel = n.new("ShaderNodeMix"); sel.data_type = "RGBA"
        l.new(md.outputs[0], sel.inputs["Factor"])
        l.new(D._out(a, "RGBA"), D._sock(sel, "A", "RGBA")); l.new(D._out(c, "RGBA"), D._sock(sel, "B", "RGBA"))
        glue = n.new("ShaderNodeMapRange"); glue.inputs["From Min"].default_value = 0.0
        glue.inputs["From Max"].default_value = 0.09; glue.inputs["To Min"].default_value = 0.35
        l.new(fr.outputs[0], glue.inputs["Value"])
        dk = n.new("ShaderNodeMix"); dk.data_type = "RGBA"; dk.blend_type = "MULTIPLY"
        l.new(D._out(sel, "RGBA"), D._sock(dk, "A", "RGBA"))
        gv = n.new("ShaderNodeCombineColor")
        for ch in ("Red", "Green", "Blue"):
            l.new(glue.outputs[0], gv.inputs[ch])
        l.new(gv.outputs[0], D._sock(dk, "B", "RGBA")); dk.inputs["Factor"].default_value = 1.0
        l.new(D._out(dk, "RGBA"), b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.78
        bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.25; bp.inputs["Distance"].default_value = 0.0003
        l.new(glue.outputs[0], bp.inputs["Height"]); l.new(bp.outputs["Normal"], b.inputs["Normal"])
        return m

    face = D.wood("ply_face", "teak_veneer", sat=0.62, val=1.0, rough=(0.5, 0.7), tint="#DCC3A3", per_object=True)
    root = D.empty("ply_stack")
    rng = np.random.default_rng(7)
    T = 18.0
    for i in range(9):
        dx, dyy = rng.uniform(-14, 14), rng.uniform(-9, 9)
        rot = rng.uniform(-0.6, 0.6)
        e = D.empty(f"sheet_{i}", (dx, dyy, i * (T + 0.2)), root)
        e.rotation_euler.z = math.radians(rot)
        D.box(f"core_{i}", (2440, 1220, T - 0.8), (0, 0, (T - 0.8) / 2), ply_edge(f"ply_edge_{i}", i * 1.7), "x", 0.5, e)
        D.box(f"top_{i}", (2440, 1220, 0.8), (0, 0, T - 0.4), face, "x", 0, e)
    root.location = (0, 0.61, 0)
    D.floor("floor", (9000, 9000), D.cyc("cyc", BG, BG, (3.0, 8.0)))
    C.world_hdri("studio_small_09_2k.hdr", strength=0.3, rotate_deg=120, camera_color=BG)
    C.area("key", (-1.5, -0.9, 0.7), 0.8, 180, "#FFF2E2", (0.0, 0.0, 0.08))
    C.area("top", (0.2, -0.3, 1.6), 1.6, 60, "#FFFFFF", (0.0, 0.0, 0.08))
    if PHONE:
        cam_at((0.9, -0.3, 0.27), (1.08, 0.02, 0.085), 50, 8)
    else:
        cam_at((0.79, -0.25, 0.2), (1.04, 0.02, 0.088), 50, 8)

# ====================================================================== wpc: a white door face, V-grooves meeting
else:
    C.setup_cycles(exposure=-0.55, bounces=12)

    def wpc_material(name):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        n, l = m.node_tree.nodes, m.node_tree.links
        b = n["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*C.srgb("#E9E8E4"), 1)
        b.inputs["Roughness"].default_value = 0.42
        nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1400.0; nz.inputs["Detail"].default_value = 4.0
        bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.08; bp.inputs["Distance"].default_value = 0.0002
        l.new(nz.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs["Normal"], b.inputs["Normal"])
        return m

    wpc = wpc_material("wpc")
    # a WPC door leaf, its lock edge at x = 0 and its face at y = 0 (camera on -Y); routed horizontal V-grooves
    slab = D.box("wpc_slab", (900, 32, 2100), (-450, 16, 1050), wpc, "z", 1.8, segments=2)
    g = 8.0
    for i in range(6):
        c = D.box(f"groove_{i}", (760, g, g), (-450, 0, 1240 + i * 70), wpc, "x", 0)
        c.rotation_euler.x = math.radians(45)
        boolean_cut(slab, c)
    frame = D.flat("frame", "#E3E2DE", 0.5)
    D.box("jamb", (70, 125, 2300), (3 + 35, 30, 1150), frame, "z", 1.0)
    D.box("wall", (2000, 120, 3000), (3 + 70 + 1000, 40, 1500), D.plaster("wall", "#EEEEEB"), "z", 0)
    D.floor("floor", (8000, 8000), D.cyc("cyc", BG, BG, (3.0, 8.0)))
    C.world_hdri("studio_small_09_2k.hdr", strength=0.45, rotate_deg=60, camera_color=BG)
    C.area("key", (-1.5, -0.35, 2.1), 0.6, 300, "#FFF4E8", (-0.2, 0.0, 1.45))      # grazing: the grooves cast lines
    C.area("fill", (1.2, -1.5, 1.2), 1.6, 30, "#EEF2FF", (-0.1, 0.0, 1.4))
    if PHONE:
        cam_at((-0.34, -0.62, 1.52), (-0.12, 0.0, 1.44), 50, 9)
    else:
        cam_at((-0.62, -0.52, 1.56), (-0.16, 0.0, 1.45), 50, 9)

C.render_to(os.path.join(C.args.out, f"{S}.webp"))
