"""PROTOTYPE round 3 kit: photoreal scenes from real scans. Import after common (and doorkit for its boxes).

  pbr(name, id, size_m)   a Poly Haven texture set (tools/render/assets/<id>/) projected in real metres
                          (box projection on object coordinates), with its height map as bump or as true
                          displacement (displace=True: the object needs subdivide())
  model(id, loc, ...)     a Poly Haven glTF model (plants, furniture), parented to one empty
  photo_door(leaf, ...)   a door leaf whose face is a catalogue photograph (public/images/leaves/<id>.webp) and
                          whose edges are real wood: the products stay photographs (decisions.md round 1 Q8)
  subdivide(ob, cuts)     a dense grid for true displacement
"""
import glob
import math
import os

import bmesh
import bpy
from mathutils import Vector

import common as C
import doorkit as D

ASSETS = os.path.join(C.HERE, "assets")
LEAVES = os.path.join(C.REPO, "public", "images", "leaves")


def _img(n, l, path, cs, vec, box=True):
    t = n.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path, check_existing=True)
    t.image.colorspace_settings.name = cs
    t.interpolation = "Cubic"
    if box:
        t.projection = "BOX"
        t.projection_blend = 0.2
    l.new(vec, t.inputs["Vector"])
    return t


def pbr(name, tid, size_m=1.0, val=1.0, sat=1.0, hue=0.5, tint=None, rough=None, bump=0.6, displace=0.0,
        coat=0.0, coat_rough=0.1, res="2k", spec=0.5):
    """Material from assets/<tid>/<tid>_{diff,rough,disp}_<res>.jpg, size_m metres per repeat.
    rough: None = the scan's map, a number = flat, (a, b) = the map remapped to a..b.
    displace > 0: true displacement of that many metres (needs a dense mesh)."""
    base = os.path.join(ASSETS, tid, f"{tid}_")
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size_m,) * 3
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    vec = mp.outputs["Vector"]
    col = _img(n, l, base + f"diff_{res}.jpg", "sRGB", vec)
    hs = n.new("ShaderNodeHueSaturation")
    hs.inputs["Hue"].default_value = hue
    hs.inputs["Saturation"].default_value = sat
    hs.inputs["Value"].default_value = val
    l.new(col.outputs["Color"], hs.inputs["Color"])
    out = hs.outputs["Color"]
    if tint:
        mx = n.new("ShaderNodeMix")
        mx.data_type = "RGBA"
        mx.blend_type = "MULTIPLY"
        mx.inputs["Factor"].default_value = 1.0
        l.new(out, D._sock(mx, "A", "RGBA"))
        D._sock(mx, "B", "RGBA").default_value = (*C.srgb(tint), 1)
        out = D._out(mx, "RGBA")
    l.new(out, b.inputs["Base Color"])
    if isinstance(rough, (int, float)):
        b.inputs["Roughness"].default_value = rough
    elif os.path.exists(base + f"rough_{res}.jpg"):
        r = _img(n, l, base + f"rough_{res}.jpg", "Non-Color", vec)
        if rough:
            mr = n.new("ShaderNodeMapRange")
            mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = rough
            l.new(r.outputs["Color"], mr.inputs["Value"])
            l.new(mr.outputs[0], b.inputs["Roughness"])
        else:
            l.new(r.outputs["Color"], b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = coat_rough
    dpath = base + f"disp_{res}.jpg"
    if os.path.exists(dpath) and (bump or displace):
        h = _img(n, l, dpath, "Non-Color", vec)
        if displace:
            dn = n.new("ShaderNodeDisplacement")
            dn.inputs["Midlevel"].default_value = 0.5
            dn.inputs["Scale"].default_value = displace
            l.new(h.outputs["Color"], dn.inputs["Height"])
            l.new(dn.outputs[0], n["Material Output"].inputs["Displacement"])
            m.displacement_method = "BOTH"
        else:
            bp = n.new("ShaderNodeBump")
            bp.inputs["Strength"].default_value = bump
            bp.inputs["Distance"].default_value = 0.003
            l.new(h.outputs["Color"], bp.inputs["Height"])
            l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def subdivide(ob, cuts=6, levels=0):
    """Dense enough for true displacement: simple subdivision (no smoothing) in the modifier stack."""
    mod = ob.modifiers.new("dense", "SUBSURF")
    mod.subdivision_type = "SIMPLE"
    mod.levels = mod.render_levels = cuts
    return mod


def model(tid, loc=(0, 0, 0), rot_deg=0.0, scale=1.0, height=None):
    """Import assets/<tid>/*.gltf; returns its root empty. height: scale it to this many metres tall."""
    path = glob.glob(os.path.join(ASSETS, tid, "*.gltf"))[0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(tid, None)
    C.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    if height:
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == "MESH" for c in o.bound_box]
        if zs:
            scale *= height / (max(zs) - min(zs))
    root.location = loc
    root.rotation_euler.z = math.radians(rot_deg)
    root.scale = (scale,) * 3
    return root


def photo_door(leaf, height=2.4, thickness=0.045, lip=None, back=None, gloss=0.08):
    """A leaf standing on z = 0, centred on x, its face on -Y at y = 0, the photograph on the face.
    Returns (object, width). The photograph is the colour; a little clear coat gives it a real surface."""
    path = os.path.join(LEAVES, f"{leaf}.webp")
    im = bpy.data.images.load(path, check_existing=True)
    w = height * im.size[0] / im.size[1]
    face = bpy.data.materials.new(f"face_{leaf}")
    face.use_nodes = True
    n, l = face.node_tree.nodes, face.node_tree.links
    b = n["Principled BSDF"]
    t = n.new("ShaderNodeTexImage")
    t.image = im
    t.interpolation = "Cubic"
    t.extension = "EXTEND"
    uv = n.new("ShaderNodeUVMap")
    l.new(uv.outputs["UV"], t.inputs["Vector"])
    l.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Coat Weight"].default_value = gloss
    b.inputs["Coat Roughness"].default_value = 0.18
    lip = lip or D.teak(f"lip_{leaf}", "polished", val=0.5)
    back = back or lip
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * w, (v.co.y + 0.5) * thickness, (v.co.z + 0.5) * height))
    bm.normal_update()
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        nrm = f.normal
        f.material_index = 0 if nrm.y < -0.9 else (1 if nrm.y > 0.9 else 2)
        for lp in f.loops:
            co = lp.vert.co
            if f.material_index == 0:
                lp[uvl].uv = (co.x / w + 0.5, co.z / height)
            else:                                           # wood edges: grain along the long side
                lp[uvl].uv = (co.y + co.x, co.z)
    me = bpy.data.meshes.new(f"door_{leaf}")
    bm.to_mesh(me)
    bm.free()
    for m in (face, back, lip):
        me.materials.append(m)
    ob = bpy.data.objects.new(f"door_{leaf}", me)
    C.scene.collection.objects.link(ob)
    bv = ob.modifiers.new("bevel", "BEVEL")
    bv.width = 0.0015
    bv.segments = 2
    bv.limit_method = "ANGLE"
    return ob, w


def spot(name, loc, target, power, color="#FFB46B", size_deg=50, blend=0.7, radius=0.03):
    ld = bpy.data.lights.new(name, "SPOT")
    ld.energy = power
    ld.color = C.srgb(color)
    ld.spot_size = math.radians(size_deg)
    ld.spot_blend = blend
    ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    C.scene.collection.objects.link(ob)
    ob.location = loc
    C.look_at(ob, Vector(target))
    return ob


def point(name, loc, power, color="#FFB46B", radius=0.05):
    ld = bpy.data.lights.new(name, "POINT")
    ld.energy = power
    ld.color = C.srgb(color)
    ld.shadow_soft_size = radius
    ob = bpy.data.objects.new(name, ld)
    C.scene.collection.objects.link(ob)
    ob.location = loc
    return ob


def white_wall(name="white_wall", hexcol="#EEEBE5", bump=0.25, tid="white_plaster_02"):
    """Clean white plaster: a flat paint colour (the scan's own albedo reads as grey concrete), with the scan's
    height map for the trowelled surface."""
    m = pbr(name, tid, size_m=1.4, bump=bump, rough=(0.82, 0.95))
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    for link in list(b.inputs["Base Color"].links):
        l.remove(link)
    b.inputs["Base Color"].default_value = (*C.srgb(hexcol), 1)
    return m
