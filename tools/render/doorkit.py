"""PROTOTYPE door builder for the render scenes: a door leaf, its frame (chaukhat), brass hardware, the
wall around it and the floor, from real measurements in millimetres, with real-looking materials.

These are representative doors for films, not catalogue products: the owner decided (round 1, Q8)
that the catalogue is shown with photographs, because the designs number in the millions and change.

Conventions (metres in Blender, millimetres in every argument):
  - The doorway's clear opening is centred on x = 0, in a wall whose centre plane is y = 0; the floor
    is z = 0. The camera side is -Y ("room 1"), the far side +Y ("room 2").
  - The leaf hangs on the left jamb as seen from -Y and opens away from the camera, into +Y.
    `door["pivot"]` is an empty on the hinge axis: rotate it about Z by +angle to open the door.
  - Every wooden part is its own object; its UVs follow its grain (`grain="z"` vertical, `"x"`
    horizontal), and the shader shifts each part's texture by the object's random number, so no two
    parts show the same figure.
"""
import math
import os
import random

import bmesh
import bpy

import common as C

MM = 0.001
scene = C.scene
random.seed(7)


# ====================================================================== materials
# The photographed texture sets in tools/render/textures (all CC0; sources in textures/README.md):
# file names, the real width the image covers in metres, and which way the grain runs in the image
# ("u" = across it, "v" = down it). The UVs from box() always put the grain on V; a "u" set gets its
# coordinates swapped in the shader.
def _acg(tid, size_m, grain):
    p = f"{tid}/{tid}_2K-JPG_"
    return dict(color=p + "Color.jpg", rough=p + "Roughness.jpg", normal=p + "NormalGL.jpg", size_m=size_m, grain=grain)


TEXSETS = {
    "teak_veneer": dict(color="teak_veneer/teak_veneer_diff_4k.jpg", rough="teak_veneer/teak_veneer_rough_4k.jpg",
                        normal="teak_veneer/teak_veneer_nor_gl_4k.jpg", size_m=1.0, grain="u"),  # Poly Haven scan, 1 m square
    # the same scan's 8K colour map, for shots seen at true scale (round 2 F): 8 px/mm instead of 4
    "teak_veneer_8k": dict(color="teak_veneer/teak_veneer_diff_8k.jpg", rough="teak_veneer/teak_veneer_rough_4k.jpg",
                           normal="teak_veneer/teak_veneer_nor_gl_4k.jpg", size_m=1.0, grain="u"),
    "Wood092": _acg("Wood092", 0.9, "v"),
    "Bark014": _acg("Bark014", 1.0, "u"),
    "Wood087": _acg("Wood087", 0.4, "u"),
}


def _sock(node, name, kind):
    return next(s for s in node.inputs if s.name == name and s.type == kind)


def _out(node, kind):
    return next(s for s in node.outputs if s.type == kind)


def wood(name, tex="teak_veneer", tile_m=None, hue=0.5, sat=1.0, val=1.0, rough=(0.32, 0.55), coat=0.0,
         coat_rough=0.1, normal=0.55, var=0.06, tint="#FFFFFF", per_object=True, pores=0.0):
    """Wood from a photographed CC0 texture set (see TEXSETS): colour, roughness and normal maps.

    tile_m: metres one repeat covers (defaults to the scan's real size). hue/sat/val: a Hue/Saturation
    node on the photo (hue 0.5 = unchanged). var: how much each part's tone strays from the next.
    coat: a clear polish layer (0 = oiled/raw, 0.2-0.5 = polished). per_object=False samples the same
    figure on every object (two faces of one cut must match: bookmatching). pores (0..1): procedural
    vessel lines, half a millimetre wide and a few long, for macro shots where the 1 m scan goes soft."""
    ts = TEXSETS[tex]
    tile_m = tile_m or ts["size_m"]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.clear()
    out = n.new("ShaderNodeOutputMaterial")
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(b.outputs["BSDF"], out.inputs["Surface"])
    uv = n.new("ShaderNodeUVMap")
    oi = n.new("ShaderNodeObjectInfo")
    # per-object shift of the texture: two pseudo-random numbers from the object's random value
    r1 = n.new("ShaderNodeMath"); r1.operation = "MULTIPLY"; r1.inputs[1].default_value = 7.31
    l.new(oi.outputs["Random"], r1.inputs[0])
    f1 = n.new("ShaderNodeMath"); f1.operation = "FRACT"; l.new(r1.outputs[0], f1.inputs[0])
    r2 = n.new("ShaderNodeMath"); r2.operation = "MULTIPLY"; r2.inputs[1].default_value = 3.17
    l.new(oi.outputs["Random"], r2.inputs[0])
    f2 = n.new("ShaderNodeMath"); f2.operation = "FRACT"; l.new(r2.outputs[0], f2.inputs[0])
    off = n.new("ShaderNodeCombineXYZ")
    l.new(f1.outputs[0], off.inputs["X"]); l.new(f2.outputs[0], off.inputs["Y"])
    sc = n.new("ShaderNodeVectorMath"); sc.operation = "SCALE"
    sc.inputs["Scale"].default_value = 1.0 / tile_m
    l.new(uv.outputs["UV"], sc.inputs[0])
    add = n.new("ShaderNodeVectorMath"); add.operation = "ADD"
    l.new(sc.outputs["Vector"], add.inputs[0])
    if per_object:
        l.new(off.outputs[0], add.inputs[1])
    coords = add.outputs["Vector"]
    if ts["grain"] == "u":                                  # this photo's grain runs across it: swap U and V
        sp = n.new("ShaderNodeSeparateXYZ"); l.new(coords, sp.inputs[0])
        sw = n.new("ShaderNodeCombineXYZ")
        l.new(sp.outputs["Y"], sw.inputs["X"]); l.new(sp.outputs["X"], sw.inputs["Y"])
        coords = sw.outputs[0]

    def img(key, cs):
        t = n.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(C.TEXTURES, ts[key]), check_existing=True)
        t.image.colorspace_settings.name = cs
        t.interpolation = "Cubic"
        l.new(coords, t.inputs["Vector"])
        return t

    col, rgh, nrm = img("color", "sRGB"), img("rough", "Non-Color"), img("normal", "Non-Color")
    hs = n.new("ShaderNodeHueSaturation")
    hs.inputs["Saturation"].default_value = sat
    hmap = n.new("ShaderNodeMapRange")                      # each part a touch warmer or cooler
    hmap.inputs["To Min"].default_value, hmap.inputs["To Max"].default_value = hue - 0.006, hue + 0.006
    l.new(oi.outputs["Random"], hmap.inputs["Value"])
    l.new(hmap.outputs[0], hs.inputs["Hue"])
    vmap = n.new("ShaderNodeMapRange")                      # ... and a touch lighter or darker
    vmap.inputs["To Min"].default_value, vmap.inputs["To Max"].default_value = val * (1 - var), val * (1 + var)
    l.new(f2.outputs[0], vmap.inputs["Value"])
    l.new(vmap.outputs[0], hs.inputs["Value"])
    l.new(col.outputs["Color"], hs.inputs["Color"])
    tn = n.new("ShaderNodeMix"); tn.data_type = "RGBA"; tn.blend_type = "MULTIPLY"
    tn.inputs["Factor"].default_value = 1.0
    l.new(hs.outputs["Color"], _sock(tn, "A", "RGBA"))
    _sock(tn, "B", "RGBA").default_value = (*C.srgb(tint), 1)
    l.new(_out(tn, "RGBA"), b.inputs["Base Color"])
    rm = n.new("ShaderNodeMapRange")
    rm.inputs["To Min"].default_value, rm.inputs["To Max"].default_value = rough
    l.new(rgh.outputs["Color"], rm.inputs["Value"])
    l.new(rm.outputs[0], b.inputs["Roughness"])
    nm = n.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = normal
    l.new(nrm.outputs["Color"], nm.inputs["Color"])
    l.new(nm.outputs["Normal"], b.inputs["Normal"])
    if pores > 0:
        # vessel lines: Voronoi cells squeezed along the grain (UV metres: V runs with it), the nearest
        # few per cell kept as short dark grooves, pressed into the surface through a bump
        stretch = n.new("ShaderNodeVectorMath"); stretch.operation = "MULTIPLY"
        stretch.inputs[1].default_value = (1700.0, 210.0, 0.0)
        l.new(uv.outputs["UV"], stretch.inputs[0])
        vor = n.new("ShaderNodeTexVoronoi"); vor.feature = "F1"; vor.distance = "EUCLIDEAN"
        vor.inputs["Randomness"].default_value = 1.0
        l.new(stretch.outputs["Vector"], vor.inputs["Vector"])
        pr = n.new("ShaderNodeMapRange")
        pr.inputs["From Min"].default_value, pr.inputs["From Max"].default_value = 0.08, 0.32
        pr.inputs["To Min"].default_value, pr.inputs["To Max"].default_value = 1.0, 0.0
        l.new(vor.outputs["Distance"], pr.inputs["Value"])
        amt = n.new("ShaderNodeMath"); amt.operation = "MULTIPLY"; amt.inputs[1].default_value = pores
        l.new(pr.outputs[0], amt.inputs[0])
        dk = n.new("ShaderNodeMix"); dk.data_type = "RGBA"; dk.blend_type = "MULTIPLY"
        l.new(amt.outputs[0], dk.inputs["Factor"])
        src = next(lk for lk in l if lk.to_node == b and lk.to_socket.name == "Base Color").from_socket
        l.new(src, _sock(dk, "A", "RGBA"))
        _sock(dk, "B", "RGBA").default_value = (*C.srgb("#6E4A2A"), 1)
        l.new(_out(dk, "RGBA"), b.inputs["Base Color"])
        pb = n.new("ShaderNodeBump"); pb.invert = True
        pb.inputs["Strength"].default_value = 0.6 * pores
        pb.inputs["Distance"].default_value = 0.0002
        l.new(amt.outputs[0], pb.inputs["Height"])
        l.new(nm.outputs["Normal"], pb.inputs["Normal"])
        l.new(pb.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    return m


def teak(name="teak", finish="polished", tex="teak_veneer", **kw):
    """Teak as a finished door: the scanned teak veneer, golden brown with dark lines.
    finish: polished | oiled | raw (fresh-sawn, paler and duller)."""
    base = dict(tex=tex, hue=0.5, sat=1.06, val=0.92)
    if finish == "polished":
        base.update(rough=(0.34, 0.52), coat=0.25, coat_rough=0.14)
    elif finish == "oiled":
        base.update(rough=(0.42, 0.62), coat=0.1, coat_rough=0.3)
    else:
        base.update(rough=(0.6, 0.85), coat=0.0, normal=0.9, val=1.12, sat=0.82)
    base.update(kw)
    return wood(name, **base)


def metal(name, hexcol, rough=0.22, rough_var=0.08, aniso=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*C.srgb(hexcol), 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Anisotropic"].default_value = aniso
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 60.0
    nz.inputs["Detail"].default_value = 6.0
    mr = n.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = rough - rough_var, rough + rough_var
    l.new(nz.outputs["Fac"], mr.inputs["Value"])
    l.new(mr.outputs[0], b.inputs["Roughness"])
    return m


def brass(name="brass", rough=0.2):
    return metal(name, "#E2BF77", rough=rough, rough_var=0.07)


def dark_metal(name="dark_metal", rough=0.35):
    return metal(name, "#2E2B28", rough=rough, rough_var=0.05)


def plaster(name="plaster", hexcol="#EDEDEB", rough=0.88, bump=0.06):
    """Painted plaster: a flat colour with a soft trowelled bump."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*C.srgb(hexcol), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.3
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 18.0
    nz.inputs["Detail"].default_value = 8.0
    nz.inputs["Roughness"].default_value = 0.62
    bp = n.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    bp.inputs["Distance"].default_value = 0.002
    l.new(nz.outputs["Fac"], bp.inputs["Height"])
    l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def stone(name="kota", base="#8E9893", alt="#7C8782", tile_mm=600, rough=0.2, joint="#5E6662"):
    """Polished Kota-like limestone in square tiles with hairline joints."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 12.0
    nz.inputs["Roughness"].default_value = 0.55
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*C.srgb(alt), 1)
    ramp.color_ramp.elements[1].color = (*C.srgb(base), 1)
    l.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    br = n.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Scale"].default_value = 1.0 / (tile_mm * MM)
    br.inputs["Mortar Size"].default_value = 0.0018
    br.inputs["Brick Width"].default_value = 1.0
    br.inputs["Row Height"].default_value = 1.0
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (1, 1, 1, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    l.new(tc.outputs["Object"], br.inputs["Vector"])
    mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
    l.new(br.outputs["Fac"], mix.inputs["Factor"])
    l.new(ramp.outputs["Color"], _sock(mix, "A", "RGBA"))
    _sock(mix, "B", "RGBA").default_value = (*C.srgb(joint), 1)
    l.new(_out(mix, "RGBA"), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    bp = n.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.25
    bp.inputs["Distance"].default_value = 0.0008
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    l.new(br.outputs["Fac"], inv.inputs[1])
    l.new(inv.outputs[0], bp.inputs["Height"])
    l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def cyc(name, hexcol="#EEEEEC", bg="#EDEDEB", fade=(4.0, 10.0), rough=0.8, bg_strength=1.0):
    """A studio floor that fades into the backdrop with distance from the camera: no horizon line, the
    object sits in an endless white room. bg and bg_strength must match the world's camera colour and
    strength exactly, or the fade ends in a visible band."""
    m = plaster(name, hexcol, rough=rough, bump=0.015)
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    out = n["Material Output"]
    cd = n.new("ShaderNodeCameraData")
    mr = n.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = fade
    l.new(cd.outputs["View Distance"], mr.inputs["Value"])
    em = n.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*C.srgb(bg), 1)
    em.inputs["Strength"].default_value = bg_strength
    mix = n.new("ShaderNodeMixShader")
    l.new(mr.outputs[0], mix.inputs["Fac"])
    l.new(b.outputs["BSDF"], mix.inputs[1])
    l.new(em.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs["Surface"])
    return m


def flat(name, hexcol, rough=0.6, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*C.srgb(hexcol), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metallic
    return m


# ====================================================================== geometry
def empty(name, loc_mm=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    scene.collection.objects.link(ob)
    ob.location = tuple(v * MM for v in loc_mm)
    if parent:
        ob.parent = parent
    return ob


def _uv_by_grain(bm, g):
    """Planar UVs per face in metres: V runs along the grain axis g (0/1/2 = x/y/z); on an end-grain
    face (whose normal is the grain axis) the two remaining axes are used."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        k = max(range(3), key=lambda i: abs(f.normal[i]))
        if g != k:
            ua, va = 3 - k - g, g
        else:
            ua, va = [i for i in range(3) if i != k]
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co[ua], lp.vert.co[va])


def _finish(name, bm, loc_mm, mat, grain, bevel_mm, parent, segments):
    bm.normal_update()
    _uv_by_grain(bm, "xyz".index(grain))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.location = tuple(v * MM for v in loc_mm)
    if parent:
        ob.parent = parent
    if mat:
        me.materials.append(mat)
    if bevel_mm:                                    # smooth + hardened normals only where a bevel rounds the edges;
        for p in me.polygons:                       # a smooth-shaded plain box shades its flat faces as if curved
            p.use_smooth = True
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width = bevel_mm * MM
        bv.segments = segments
        bv.limit_method = "ANGLE"
        bv.harden_normals = True
    return ob


def box(name, size_mm, loc_mm=(0, 0, 0), mat=None, grain="z", bevel_mm=1.2, parent=None, segments=3):
    """A box size_mm = (x, y, z) centred on loc_mm (in the parent's space)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=tuple(v * MM for v in size_mm), verts=bm.verts)
    return _finish(name, bm, loc_mm, mat, grain, bevel_mm, parent, segments)


def cylinder(name, radius_mm, depth_mm, loc_mm, mat, axis="z", parent=None, verts=48, bevel_mm=0.6):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius_mm * MM, radius2=radius_mm * MM,
                          depth=depth_mm * MM)
    if axis == "x":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=_rot("Y", 90))
    elif axis == "y":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=_rot("X", 90))
    ob = _finish(name, bm, loc_mm, mat, "z", bevel_mm, parent, 2)
    return ob


def _rot(axis, deg):
    from mathutils import Matrix
    return Matrix.Rotation(math.radians(deg), 3, axis)


def raised_panel(name, w, h, t_field, t_margin, bevel_w, loc_mm, mat, parent=None, grain="z"):
    """A panel w (x) by h (z): a flat margin t_margin thick round a field t_field thick, joined by a
    sloping bevel bevel_w wide, raised on both faces (y)."""
    bm = bmesh.new()
    hw, hh, b = w / 2 * MM, h / 2 * MM, bevel_w * MM
    ym, yf = t_margin / 2 * MM, t_field / 2 * MM

    def ring(x, z, y):
        return [bm.verts.new(c) for c in ((-x, y, -z), (x, y, -z), (x, y, z), (-x, y, z))]

    fo, fi = ring(hw, hh, -ym), ring(hw - b, hh - b, -yf)
    bo, bi = ring(hw, hh, ym), ring(hw - b, hh - b, yf)
    bm.faces.new(fi)
    bm.faces.new(bi[::-1])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((fo[i], fo[j], fi[j], fi[i]))
        bm.faces.new((bi[i], bi[j], bo[j], bo[i]))
        bm.faces.new((fo[j], fo[i], bo[i], bo[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(name, bm, loc_mm, mat, grain, 0.6, parent, 2)


# ====================================================================== the door
def door(width=1050, height=2100, thickness=40, style="panel", leaf_mat=None, frame_mat=None,
         hw_mat=None, frame_face=70, frame_depth=125, handle="lever", lock_height=1050, n_planks=6):
    """Frame + leaf + hardware for an opening `width` by `height` (the leaf's size; the clear opening
    adds 3 mm gaps at the sides and top, 8 mm under the leaf). Returns a dict with "root" (the whole
    doorway, move it to place the door), "pivot" (rotate about Z to open) and "leaf" (the leaf's empty)."""
    leaf_mat = leaf_mat or teak("teak_leaf")
    frame_mat = frame_mat or leaf_mat
    hw_mat = hw_mat or brass()
    gap, floor_gap = 3, 8
    ow, oh = width + 2 * gap, height + gap + floor_gap          # clear opening
    fd2 = frame_depth / 2
    root = empty("doorway")
    # ---------------------------------------------------------------- frame: jambs, head and the stop
    stop = 12                                                    # how far the stop stands into the opening
    leaf_back = fd2                                              # the leaf's +Y face is flush with the frame
    leaf_front = leaf_back - thickness
    stop_depth = leaf_front + fd2                                # the stop runs from the -Y face to the leaf
    for side in (-1, 1):
        x = side * (ow / 2 + frame_face / 2)
        box(f"jamb_{side}", (frame_face, frame_depth, oh + frame_face), (x, 0, (oh + frame_face) / 2), frame_mat, "z", 1.5, root)
        sx = side * (ow / 2 - stop / 2)
        box(f"stop_{side}", (stop, stop_depth, oh), (sx, -fd2 + stop_depth / 2, oh / 2), frame_mat, "z", 1.0, root)
    box("head", (ow, frame_depth, frame_face), (0, 0, oh + frame_face / 2), frame_mat, "x", 1.5, root)
    box("head_stop", (ow - 2 * stop, stop_depth, stop), (0, -fd2 + stop_depth / 2, oh - stop / 2), frame_mat, "x", 1.0, root)
    # ---------------------------------------------------------------- leaf, hung on its hinge axis
    pivot = empty("pivot", (-ow / 2 + gap, leaf_back + 4, 0), root)
    leaf = empty("leaf", (0, 0, floor_gap), pivot)
    y0 = -4 - thickness / 2                                     # the leaf's mid-plane in pivot space
    W, Hh, T = width, height, thickness
    if style == "panel":
        s, mun, rt, rb, rl = 125, 110, 125, 230, 190
        lock_z = lock_height - floor_gap
        rails = [(rb / 2, rb), (lock_z, rl), (Hh - rt / 2, rt)]
        upper = (lock_z + rl / 2 + Hh - rt) / 2                 # a frieze rail between lock rail and top
        rails.insert(2, (upper + 140, 120))
        box("stile_hinge", (s, T, Hh), (s / 2, y0, Hh / 2), leaf_mat, "z", 1.2, leaf)
        box("stile_lock", (s, T, Hh), (W - s / 2, y0, Hh / 2), leaf_mat, "z", 1.2, leaf)
        for i, (zc, rh) in enumerate(rails):
            box(f"rail_{i}", (W - 2 * s, T, rh), (W / 2, y0, zc), leaf_mat, "x", 1.2, leaf)
        bands = [(rails[i][0] + rails[i][1] / 2, rails[i + 1][0] - rails[i + 1][1] / 2) for i in range(len(rails) - 1)]
        for i, (z0, z1) in enumerate(bands):
            box(f"muntin_{i}", (mun, T, z1 - z0), (W / 2, y0, (z0 + z1) / 2), leaf_mat, "z", 1.2, leaf)
            pw = (W - 2 * s - mun) / 2
            for k, xc in enumerate((s + pw / 2, W - s - pw / 2)):
                raised_panel(f"panel_{i}_{k}", pw + 16, z1 - z0 + 16, T - 8, T - 28, 52,
                             (xc, y0, (z0 + z1) / 2), leaf_mat, leaf, "z")
    elif style == "plank":
        pw = W / n_planks
        for i in range(n_planks):
            box(f"plank_{i}", (pw, T, Hh), (pw * (i + 0.5), y0, Hh / 2), leaf_mat, "z", 2.6, leaf, segments=1)
    else:  # flush: one slab with lipped edges
        box("slab", (W, T, Hh), (W / 2, y0, Hh / 2), leaf_mat, "z", 1.0, leaf)
    # ---------------------------------------------------------------- hardware
    for k, zc in enumerate((260, Hh / 2 + 40, Hh - 260)):
        cylinder(f"hinge_{k}", 7, 110, (0, 0, zc), hw_mat, "z", leaf)
    face_front = y0 - T / 2
    face_back = y0 + T / 2
    lz = lock_height - floor_gap
    box("lock_face", (3, 24, 240), (W + 1.5, y0, lz), hw_mat, "z", 0.4, leaf)
    box("latch", (5, 12, 22), (W + 2.5, y0, lz + 40), hw_mat, "z", 0.4, leaf)
    if handle == "lever":
        for sgn, fy in ((-1, face_front), (1, face_back)):
            plate_y = fy + sgn * 2
            box(f"plate_{sgn}", (46, 4, 210), (W - 62, plate_y, lz - 30), hw_mat, "z", 1.2, leaf)
            cylinder(f"rose_{sgn}", 11, 30, (W - 62, fy + sgn * 15, lz + 30), hw_mat, "y", leaf, 32)
            lever = cylinder(f"lever_{sgn}", 9, 125, (W - 62 - 55, fy + sgn * 32, lz + 30), hw_mat, "x", leaf, 32)
            lever.name = f"lever_{sgn}"
            box(f"keyhole_{sgn}", (7, 2, 20), (W - 62, fy + sgn * 4.5, lz - 85), flat("keyhole", "#0B0B0B", 0.6), "z", 0, leaf)
    elif handle == "pull":
        x = W - 85
        z0, z1 = 450, 1650
        cylinder("pull_bar", 13, z1 - z0, (x, face_front - 62, (z0 + z1) / 2), hw_mat, "z", leaf, 48, 1.0)
        for zc in (z0 + 60, z1 - 60):
            cylinder(f"pull_post_{zc}", 8, 62, (x, face_front - 31, zc), hw_mat, "y", leaf, 32)
        cylinder("lock_rose", 24, 8, (W - 85, face_front - 4, lz - 230), hw_mat, "y", leaf, 48)
        box("lock_slot", (2, 2, 14), (W - 85, face_front - 8.2, lz - 230), flat("keyhole", "#0B0B0B", 0.6), "z", 0, leaf)
    return {"root": root, "pivot": pivot, "leaf": leaf, "opening": (ow, oh), "frame_face": frame_face,
            "frame_depth": frame_depth}


def wall_around(opening_w, opening_h, frame_face, thickness, left, right, top, mat, parent=None, y=0.0):
    """Wall pieces round a framed opening: from x = -left to +right, up to z = top (all mm)."""
    hole_w = opening_w + 2 * frame_face
    hole_h = opening_h + frame_face
    lw = left - hole_w / 2
    rw = right - hole_w / 2
    out = []
    out.append(box("wall_l", (lw, thickness, top), (-hole_w / 2 - lw / 2, y, top / 2), mat, "z", 0, parent))
    out.append(box("wall_r", (rw, thickness, top), (hole_w / 2 + rw / 2, y, top / 2), mat, "z", 0, parent))
    out.append(box("wall_t", (hole_w, thickness, top - hole_h), (0, y, hole_h + (top - hole_h) / 2), mat, "z", 0, parent))
    return out


def floor(name, size_mm, mat, loc_mm=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=tuple(v * MM for v in loc_mm))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (size_mm[0] * MM, size_mm[1] * MM, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    return ob
