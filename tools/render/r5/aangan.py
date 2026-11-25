"""PROTOTYPE round 5: the house behind round 4's pivot door, as a module (import court first). A contemporary
courtyard house: the door opens onto a verandah on teak columns that runs round an open court (an aangan) under
the sky, a brass urli of water and marigolds on a stone plinth at its centre, a tree in one corner, and the
house's own rooms behind doors on the far and side walls (catalogue leaf photographs, placeholders). The film
scripts light it; this only builds it.

Exposes: pivot (the main door's hinge; open_door(deg) swings it in), cx (the door's axis, m), the y of each band
(FRONT_IN, COURT_Y0, COURT_Y1, FAR_IN, m), urli (m), and marigolds.
"""
import math

import bmesh
import bpy
from mathutils import Vector

import common as C
import doorkit as D
import kit3 as K
import court as S

MM = 0.001
scene = C.scene

# ------------------------------------------------------------------ the main door hangs on a pivot now
x0 = S.x0
DW = S.DW
DOOR_L = x0 + 60                                   # the leaf's left edge, mm
PIV = DOOR_L + 300                                 # a pivot door turns 300 mm in from its edge
pivot = bpy.data.objects.new("pivot", None)
scene.collection.objects.link(pivot)
pivot.location = (PIV * MM, (S.DEPTH + 10 + 27) * MM, 0)
bpy.context.view_layer.update()
for name in ("door_" + S.opt.leaf, "pull", "pull_post_-1", "pull_post_1"):
    ob = bpy.data.objects[name]
    mw = ob.matrix_world.copy()
    ob.parent = pivot
    ob.matrix_parent_inverse = pivot.matrix_world.inverted()
    ob.matrix_world = mw


def open_door(deg):
    """Swing the leaf into the house (its handle side goes in, the narrow side out into the portal)."""
    pivot.rotation_euler.z = math.radians(deg)


# ------------------------------------------------------------------ the house's front wall, with the door's opening
bpy.data.objects.remove(bpy.data.objects["back"])
plaster = S.plaster
FW0, FW1, H_ROOF, H_SOFFIT, H_PARAPET = S.DEPTH + 60, 950, 4200, 3900, 4800
cx = S.dx                                          # mm; the house is built on the door's axis
XW = 5600                                          # inner half-width of the house
left_w = DOOR_L - (cx - XW - 300)
D.box("front_l", (left_w, FW1 - FW0, H_PARAPET), (cx - XW - 300 + left_w / 2, (FW0 + FW1) / 2, H_PARAPET / 2), plaster)
right_x = DOOR_L + DW
right_w = (cx + XW + 300) - right_x
D.box("front_r", (right_w, FW1 - FW0, H_PARAPET), (right_x + right_w / 2, (FW0 + FW1) / 2, H_PARAPET / 2), plaster)
D.box("front_top", (DW, FW1 - S.DEPTH - 30, H_PARAPET - S.DOOR_H - 5),
      (DOOR_L + DW / 2, (S.DEPTH + 30 + FW1) / 2, (H_PARAPET + S.DOOR_H + 5) / 2), plaster)

# ------------------------------------------------------------------ plan: verandah, open court, verandah
VER = 2400
FRONT_IN = FW1 * MM
CY0 = FW1 + VER                                    # the open court, mm
CY1 = CY0 + 5200
FAR_IN = CY1 + VER
CXH = 3200                                         # the court's half-width
COURT_Y0, COURT_Y1, FAR_Y = CY0 * MM, CY1 * MM, FAR_IN * MM
for side in (-1, 1):
    D.box(f"side_wall_{side}", (300, FAR_IN + 300 - FW0, H_PARAPET),
          (cx + side * (XW + 150), (FW0 + FAR_IN + 300) / 2, H_PARAPET / 2), plaster)
D.box("far_wall", (2 * XW + 600, 300, H_PARAPET), (cx, FAR_IN + 150, H_PARAPET / 2), plaster)

# floors: the verandah in light terrazzo, the court a step down in honed stone
terrazzo = K.pbr("terrazzo", "terrazzo_tiles", size_m=1.2, val=1.25, sat=0.55, rough=(0.18, 0.32), bump=0.05,
                 coat=0.3, coat_rough=0.08)
court_stone = K.pbr("court_stone", "granite_tile", size_m=1.6, val=1.15, sat=0.5, rough=(0.45, 0.7), bump=0.25)
kerb = D.stone("kerb", base="#9A9C96", alt="#8E918B", tile_mm=900, rough=0.35, joint="#7D807A")
D.box("court_floor_in", (2 * CXH, CY1 - CY0, 40), (cx, (CY0 + CY1) / 2, -170), court_stone, "x", 0)
for name, size, loc in (
    ("kerb_f", (2 * CXH + 240, 120, 160), (cx, CY0 + 60, -80)),
    ("kerb_b", (2 * CXH + 240, 120, 160), (cx, CY1 - 60, -80)),
    ("kerb_l", (120, CY1 - CY0, 160), (cx - CXH + 60, (CY0 + CY1) / 2, -80)),
    ("kerb_r", (120, CY1 - CY0, 160), (cx + CXH - 60, (CY0 + CY1) / 2, -80)),
):
    D.box(name, size, loc, kerb, "x", 2.0)
# the verandah floor: four strips round the court
for name, size, loc in (
    ("ver_f", (2 * XW, CY0 - FW0, 160), (cx, (FW0 + CY0) / 2, -80)),
    ("ver_b", (2 * XW, FAR_IN - CY1, 160), (cx, (CY1 + FAR_IN) / 2, -80)),
    ("ver_l", (XW - CXH, CY1 - CY0, 160), (cx - (XW + CXH) / 2, (CY0 + CY1) / 2, -80)),
    ("ver_r", (XW - CXH, CY1 - CY0, 160), (cx + (XW + CXH) / 2, (CY0 + CY1) / 2, -80)),
):
    D.box(name, size, loc, terrazzo, "x", 0)

# the roof over the verandah ring, its soffit lined in teak; a teak beam along the court's edge on teak columns
soffit = D.teak("soffit", "oiled", val=0.62, sat=1.0)
col_teak = D.teak("col_teak", "oiled", val=0.55, sat=1.05)
roof = K.white_wall("roof", "#ECEAE5", bump=0.1)
for name, size, loc in (
    ("roof_f", (2 * XW, CY0 - FW1, H_ROOF - H_SOFFIT), (cx, (FW1 + CY0) / 2, (H_ROOF + H_SOFFIT) / 2)),
    ("roof_b", (2 * XW, FAR_IN - CY1, H_ROOF - H_SOFFIT), (cx, (CY1 + FAR_IN) / 2, (H_ROOF + H_SOFFIT) / 2)),
    ("roof_l", (XW - CXH, CY1 - CY0, H_ROOF - H_SOFFIT), (cx - (XW + CXH) / 2, (CY0 + CY1) / 2, (H_ROOF + H_SOFFIT) / 2)),
    ("roof_r", (XW - CXH, CY1 - CY0, H_ROOF - H_SOFFIT), (cx + (XW + CXH) / 2, (CY0 + CY1) / 2, (H_ROOF + H_SOFFIT) / 2)),
):
    D.box(name, size, loc, roof, "x", 0)
    D.box(name + "_soffit", (size[0], size[1], 20), (loc[0], loc[1], H_SOFFIT - 10), soffit, "y" if size[1] > size[0] else "x", 0)
BEAM = 260
for name, size, loc, g in (
    ("beam_f", (2 * CXH + 220, 220, BEAM), (cx, CY0 - 110, H_SOFFIT - BEAM / 2), "x"),
    ("beam_b", (2 * CXH + 220, 220, BEAM), (cx, CY1 + 110, H_SOFFIT - BEAM / 2), "x"),
    ("beam_l", (220, CY1 - CY0, BEAM), (cx - CXH - 110, (CY0 + CY1) / 2, H_SOFFIT - BEAM / 2), "y"),
    ("beam_r", (220, CY1 - CY0, BEAM), (cx + CXH + 110, (CY0 + CY1) / 2, H_SOFFIT - BEAM / 2), "y"),
):
    D.box(name, size, loc, col_teak, g, 3.0)
col_base = D.stone("col_base", base="#A3A49E", alt="#999A94", tile_mm=2000, rough=0.3, joint="#A3A49E")
COL_H = H_SOFFIT - BEAM
cols = []
for xx in (-CXH, -CXH / 3, CXH / 3, CXH):
    cols += [(cx + xx - (110 if xx < 0 else -110) * (abs(xx) == CXH), y) for y in (CY0 - 110, CY1 + 110)]
for yy in (CY0 + (CY1 - CY0) / 3, CY0 + 2 * (CY1 - CY0) / 3):
    cols += [(cx - CXH - 110, yy), (cx + CXH + 110, yy)]
for i, (px, py) in enumerate(cols):
    D.box(f"col_{i}", (210, 210, COL_H - 220), (px, py, 220 + (COL_H - 220) / 2), col_teak, "z", 3.0)
    D.box(f"col_base_{i}", (300, 300, 220), (px, py, 110), col_base, "z", 4.0)
    D.box(f"col_cap_{i}", (280, 280, 60), (px, py, COL_H - 30), col_teak, "z", 2.0)

# ------------------------------------------------------------------ the rooms' doors (catalogue photographs)
frame_m = D.teak("room_frame", "polished", val=0.5)


def room_door(leaf, x_mm, y_mm, facing, h=2400):
    """A door set into a wall: facing 'y-' (far wall, face toward -Y), 'x+' (left wall), 'x-' (right wall)."""
    ob, w = K.photo_door(leaf, h * MM, 0.045, lip=frame_m, gloss=0.1)
    W = w * 1000
    holder = bpy.data.objects.new(f"room_{leaf}", None)
    scene.collection.objects.link(holder)
    ob.parent = holder
    ob.location = (0, -20 * MM, 0)
    for nm, size, loc in (("l", (70, 40, h + 70), (-W / 2 - 35, -25, (h + 70) / 2)),
                          ("r", (70, 40, h + 70), (W / 2 + 35, -25, (h + 70) / 2)),
                          ("t", (W + 140, 40, 70), (0, -25, h + 35))):
        D.box(f"arch_{leaf}_{nm}", size, loc, frame_m, "z" if nm != "t" else "x", 2.0, parent=holder)
    holder.location = (x_mm * MM, y_mm * MM, 0)
    holder.rotation_euler.z = {"y-": 0.0, "x+": -math.pi / 2, "x-": math.pi / 2}[facing]
    return holder, w


room_door("honne-ab-door", cx, FAR_IN, "y-")
room_door("gana-teak-polish-door", cx - 3400, FAR_IN, "y-")
room_door("burma-border-teak-door", cx + 3400, FAR_IN, "y-")
room_door("teak-osc-2nds", cx - XW, (CY0 + CY1) / 2, "x+")
room_door("mahagony-ab-door", cx + XW, (CY0 + CY1) / 2, "x-")

# ------------------------------------------------------------------ the urli: brass, wide and shallow, on a plinth
URLI_Y = (CY0 + CY1) / 2
plinth = K.pbr("plinth", "granite_tile", size_m=0.7, val=0.85, sat=0.35, rough=(0.3, 0.5), bump=0.15)
D.cylinder("plinth", 640, 330, (cx, URLI_Y, -150 + 165), plinth, "z", None, 96, 4.0)
prof = [(0, 0), (180, 0), (330, 25), (450, 80), (535, 165), (575, 245), (590, 268), (585, 280), (565, 272),
        (548, 250), (512, 175), (430, 105), (315, 60), (170, 40), (0, 36)]
bm = bmesh.new()
vs = [bm.verts.new((r * MM, 0, z * MM)) for r, z in prof]
for a, b in zip(vs, vs[1:]):
    bm.edges.new((a, b))
bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=math.radians(360),
               steps=96, use_merge=True)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
me = bpy.data.meshes.new("urli")
bm.to_mesh(me)
bm.free()
urli = bpy.data.objects.new("urli", me)
scene.collection.objects.link(urli)
urli.location = (cx * MM, URLI_Y * MM, 180 * MM)
for p in me.polygons:
    p.use_smooth = True
urli_brass = D.metal("urli_brass", "#D9B36A", rough=0.26, rough_var=0.1)
me.materials.append(urli_brass)
water_m = bpy.data.materials.new("urli_water")
water_m.use_nodes = True
wn, wl = water_m.node_tree.nodes, water_m.node_tree.links
wn.remove(wn["Principled BSDF"])
wg = wn.new("ShaderNodeBsdfGlass")
wg.inputs["IOR"].default_value = 1.33
wg.inputs["Roughness"].default_value = 0.01
wg.inputs["Color"].default_value = (0.93, 0.96, 0.92, 1)
wt = wn.new("ShaderNodeBsdfTransparent")
wlp = wn.new("ShaderNodeLightPath")
wsel = wn.new("ShaderNodeMath")
wsel.operation = "MAXIMUM"
wl.new(wlp.outputs["Is Shadow Ray"], wsel.inputs[0])
wl.new(wlp.outputs["Is Diffuse Ray"], wsel.inputs[1])
wmx = wn.new("ShaderNodeMixShader")
wl.new(wsel.outputs[0], wmx.inputs["Fac"])
wl.new(wg.outputs[0], wmx.inputs[1])
wl.new(wt.outputs[0], wmx.inputs[2])
wl.new(wmx.outputs[0], wn["Material Output"].inputs["Surface"])
wtc = wn.new("ShaderNodeTexCoord")
wnz = wn.new("ShaderNodeTexNoise")
wnz.noise_dimensions = "4D"
wnz.inputs["Scale"].default_value = 9.0
wnz.inputs["Detail"].default_value = 3.0
wl.new(wtc.outputs["Object"], wnz.inputs["Vector"])
wbp = wn.new("ShaderNodeBump")
wbp.inputs["Strength"].default_value = 0.05
wbp.inputs["Distance"].default_value = 0.005
wl.new(wnz.outputs["Fac"], wbp.inputs["Height"])
wl.new(wbp.outputs["Normal"], wg.inputs["Normal"])
water_w = wnz.inputs["W"]
D.cylinder("urli_water", 560, 4, (cx, URLI_Y, 180 + 225), water_m, "z", None, 96, 0)

# marigolds afloat: each head built petal by petal, eight rings of them, the outer ones lying open, the inner ones
# standing up into a pompom
def _petal_mat(name, hexcol):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*C.srgb(hexcol), 1)
    b.inputs["Roughness"].default_value = 0.5
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 900.0
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    bp = n.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.4
    l.new(nz.outputs["Fac"], bp.inputs["Height"])
    l.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


PETALS = [(_petal_mat(f"marigold_{k}_out", a), _petal_mat(f"marigold_{k}_in", b))
          for k, (a, b) in enumerate((("#E58C00", "#C86000"), ("#EBA000", "#D27400"), ("#DE7C00", "#C25600")))]


def marigold(name, R, rng, mats):
    bm = bmesh.new()
    rings = 8
    for i in range(rings):
        f = i / (rings - 1)                      # 0 = the outer ring
        n = int(round(17 - 7 * f))
        r_out, r_in = R * (1 - 0.72 * f), R * 0.06
        tilt = math.radians(10 + 66 * f)
        z0 = R * 0.2 * f
        L = r_out - r_in
        wid = 2 * math.pi * r_out / n * 1.05
        off = rng.random() * 2 * math.pi
        for k in range(n):
            a = off + 2 * math.pi * k / n + rng.uniform(-0.12, 0.12)
            u, v = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
            grid = []
            for si in range(4):
                sv = si / 3
                row = []
                for ti in (-1, 0, 1):
                    rad = r_in + sv * L * math.cos(tilt)
                    h = z0 + sv * L * math.sin(tilt) + 0.22 * R * abs(ti) * sv + rng.uniform(-0.09, 0.09) * R * sv
                    half = 0.5 * wid * (0.35 + 0.65 * math.sin(0.5 * math.pi * sv) ** 0.5)   # broad, ruffled tips
                    row.append(bm.verts.new(u * rad + v * (ti * half) + Vector((0, 0, h))))
                grid.append(row)
            for si in range(3):
                for ti in range(2):
                    face = bm.faces.new((grid[si][ti], grid[si][ti + 1], grid[si + 1][ti + 1], grid[si + 1][ti]))
                    face.material_index = 0 if f < 0.5 else 1
                    face.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


rng = __import__("random").Random(7)
marigolds = []
for i in range(19):
    a = rng.uniform(0, 2 * math.pi)
    r = 0.14 + 0.32 * math.sqrt(rng.random())
    ob = marigold(f"marigold_{i}", 0.034 + 0.008 * rng.random(), rng, PETALS[i % 3])
    ob.location = (cx * MM + r * math.cos(a), URLI_Y * MM + r * math.sin(a), (180 + 222) * MM)
    ob.rotation_euler = (rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), rng.uniform(0, 6.3))
    marigolds.append(ob)

# ------------------------------------------------------------------ green: a tree in the court's far corner
bed = D.stone("bed_edge", base="#8F918B", alt="#878983", tile_mm=3000, rough=0.4, joint="#8F918B")
soil = K.pbr("soil", "granite_tile", size_m=0.8, val=0.25, sat=0.6, rough=0.9, bump=0.6)
BX, BY = cx + CXH - 950, CY1 - 950
D.box("bed", (1900, 1900, 200), (BX + 50, BY + 50, -50), bed, "x", 4.0)
D.box("bed_soil", (1780, 1780, 20), (BX + 50, BY + 50, 45), soil, "x", 0)
K.model("island_tree_02", (BX * MM, BY * MM, 0.05), rot_deg=110, height=4.8)
K.model("shrub_02", ((BX - 450) * MM, (BY - 400) * MM, 0.05), rot_deg=40, height=0.7)
K.model("shrub_04", ((BX + 350) * MM, (BY - 550) * MM, 0.05), rot_deg=120, height=0.55)
K.model("planter_pot_clay", ((cx - CXH - 700) * MM, (CY1 + 700) * MM, 0.0), rot_deg=10, height=0.7)
K.model("potted_plant_04", ((cx - CXH - 700) * MM, (CY1 + 700) * MM, 0.55), rot_deg=80, height=1.2)


def fill(power=120.0, color="#FFE7CF"):
    """A cinematographer's bounce: a big soft light in the court facing the far verandah, seen by nothing but the
    surfaces it lights (as the sunlit court floor would throw light back into the shade, only more)."""
    ob = C.area("fill", (cx * MM, (CY0 + 700) * MM, 2.2), 5.0, power, color, look=(cx * MM, FAR_IN * MM, 1.3),
                size_y=2.4)
    ob.visible_camera = False
    ob.visible_glossy = False
    return ob
