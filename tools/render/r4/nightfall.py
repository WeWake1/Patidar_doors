"""PROTOTYPE round 4 · N "Nightfall" (Blender film, plays by itself). The whole house, at blue hour: a two-storey
modern white house whose upper floor is cantilevered over the entrance; the main door (a catalogue photograph,
3 m tall) in a teak-lined recess under it, lit by soffit downlights; floor-to-ceiling glass on the ground floor
glowing warm from a furnished room; a stone feature wall grazed by uplights; a lawn, a slab path, planters. The
sky is a real dusk HDRI. The camera arcs slowly from the street and settles on the lit door.
(The owner's round-4 answers: other light, the whole house, a more cinematic camera, grander architecture.)

  blender -b --factory-startup --python tools/render/r4/nightfall.py -- --out <dir> --size 1600x900 [--phone]
      [--count 144] [--frames 0-143] [--test]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "r3"))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import kit3 as K  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true")
ap.add_argument("--count", type=int, default=144)
ap.add_argument("--leaf", default="burma-border-teak-door")
opt, _ = ap.parse_known_args(C.argv)
N = opt.count
scene = C.scene
C.setup_cycles(exposure=1.1, bounces=10)

WARM = "#FFC98E"
plaster = K.white_wall("plaster", "#ECE9E3")
stone = K.pbr("stone", "stacked_stone_wall", size_m=1.6, val=1.05, sat=0.45, bump=0.9, rough=(0.75, 0.95))
paving = K.pbr("paving", "smooth_concrete_floor", size_m=2.0, val=1.0, sat=0.15, rough=(0.3, 0.5), bump=0.1)
lining = D.teak("lining", "oiled", val=0.5, sat=1.05)
interior_floor = K.pbr("in_floor", "white_oak_veneer", size_m=1.8, val=1.0, sat=0.8, rough=(0.3, 0.5), bump=0.05)
grass = bpy.data.materials.new("lawn")
grass.use_nodes = True
gn, gl = grass.node_tree.nodes, grass.node_tree.links
gbsdf = gn["Principled BSDF"]
gbsdf.inputs["Base Color"].default_value = (*C.srgb("#3D5A2A"), 1)
gbsdf.inputs["Roughness"].default_value = 0.9
gnz = gn.new("ShaderNodeTexNoise")
gnz.inputs["Scale"].default_value = 400.0
gnz.inputs["Detail"].default_value = 8.0
gbp = gn.new("ShaderNodeBump")
gbp.inputs["Strength"].default_value = 0.6
gl.new(gnz.outputs["Fac"], gbp.inputs["Height"])
gl.new(gbp.outputs["Normal"], gbsdf.inputs["Normal"])
gcr = gn.new("ShaderNodeValToRGB")
gcr.color_ramp.elements[0].color = (*C.srgb("#2E4720"), 1)
gcr.color_ramp.elements[1].color = (*C.srgb("#4E6B33"), 1)
gl.new(gnz.outputs["Fac"], gcr.inputs["Fac"])
gl.new(gcr.outputs["Color"], gbsdf.inputs["Base Color"])
glass = bpy.data.materials.new("glass")
glass.use_nodes = True
gg = glass.node_tree.nodes["Principled BSDF"]
gg.inputs["Transmission Weight"].default_value = 1.0
gg.inputs["Roughness"].default_value = 0.02
gg.inputs["IOR"].default_value = 1.5

# ------------------------------------------------------------------ the house (mm): the front facade at y = 0
GF_H, FF_H = 3500, 3300
D.box("gf_left_side", (300, 8000, GF_H), (-6950, 4000, GF_H / 2), plaster, "z", 0)   # the living room is hollow:
D.box("gf_left_mid", (300, 8000, GF_H), (-650, 4000, GF_H / 2), plaster, "z", 0)     # side walls and a back wall
D.box("gf_floor_slab", (16000, 8400, 300), (0, 4200, GF_H + 150), plaster, "x", 2.0)
D.box("ff", (10000, 8000, FF_H), (2000, 2000, GF_H + 300 + FF_H / 2), plaster, "z", 0)  # cantilevered 2 m forward
D.box("roof_edge", (10200, 8200, 200), (2000, 2000, GF_H + 300 + FF_H + 100), plaster, "x", 2.0)
# the living room behind floor-to-ceiling glass: a real room, lit from inside
D.box("living_floor", (6000, 6500, 60), (-3800, 3400, 30), interior_floor, "x", 0)
D.box("living_back", (6000, 120, GF_H), (-3800, 6700, GF_H / 2), plaster, "z", 0)
D.box("living_glass", (6000, 20, GF_H - 100), (-3800, 150, (GF_H - 100) / 2 + 50), glass, "z", 0)
for i, x in enumerate((-6700, -4800, -2900, -1000)):
    D.box(f"mullion_{i}", (60, 80, GF_H), (x, 150, GF_H / 2), D.dark_metal("mullion", 0.4), "z", 0)
K.model("sofa_03", (-4.2, 5.4, 0.06), rot_deg=180, height=0.8)
K.model("modern_coffee_table_01", (-4.0, 4.0, 0.06), rot_deg=0, height=0.4)
K.model("potted_plant_01", (-6.0, 5.8, 0.06), rot_deg=0, height=1.7)
for i, (x, y) in enumerate(((-5.2, 3.5), (-2.6, 3.5), (-3.9, 5.6))):
    C.area(f"in_light_{i}", (x, y, GF_H / 1000 - 0.05), 0.6, 220, WARM, (x, y, 0.0))
# the entrance: a teak-lined recess under the cantilever, the door in it, a stone wall beside
DOOR_H = 3000
door, door_w = K.photo_door(opt.leaf, DOOR_H / 1000, 0.055, lip=D.teak("lip", "polished", val=0.45), gloss=0.12)
DW = round(door_w * 1000)
EX = 1100                                                  # the door's centre
RW = DW + 400
D.box("entry_back", (RW, 100, GF_H), (EX, 900, GF_H / 2), lining, "z", 1.0)
D.box("entry_l", (100, 900, GF_H), (EX - RW / 2, 450, GF_H / 2), lining, "z", 1.0)
D.box("entry_r", (100, 900, GF_H), (EX + RW / 2, 450, GF_H / 2), lining, "z", 1.0)
door.location = (EX / 1000, 0.79, 0.0)
D.box("stone_wall", (3400, 500, GF_H), (EX + RW / 2 + 1750, 250, GF_H / 2), stone, "z", 0)
K.subdivide(bpy.data.objects["stone_wall"], 6)
D.box("gf_right", (3200, 8000, GF_H), (EX + RW / 2 + 3450 + 1600, 4000, GF_H / 2), plaster, "z", 0)
D.box("gf_mid", (EX - RW / 2 + 700, 8000, GF_H), ((-700 + EX - RW / 2) / 2, 4000 + 900, GF_H / 2), plaster, "z", 0)
for k, x in enumerate((EX - 300, EX + 300)):                # soffit downlights over the door
    K.spot(f"soffit_{k}", (x / 1000, 0.35, GF_H / 1000 - 0.02), (x / 1000, 0.6, 0.8), 160, WARM, 48, 0.8, 0.02)
for k, x in enumerate((EX + RW / 2 + 400, EX + RW / 2 + 1700, EX + RW / 2 + 3000)):   # uplights grazing the stone
    K.spot(f"up_{k}", (x / 1000, -0.12, 0.04), (x / 1000, 0.25, 3.2), 120, WARM, 30, 0.5, 0.01)
for k, x in enumerate((-1200, 6500)):                       # a strip of first-floor window, lit
    pass
D.box("ff_window", (4200, 30, 900), (2500, -2010, GF_H + 300 + 1700), glass, "z", 0)
ffg = bpy.data.materials.new("ff_glow")
ffg.use_nodes = True
fft = ffg.node_tree
fft.nodes.remove(fft.nodes["Principled BSDF"])
ffe = fft.nodes.new("ShaderNodeEmission")
ffe.inputs["Color"].default_value = (*C.srgb("#FFD6A6"), 1)
ffe.inputs["Strength"].default_value = 3.0
fft.links.new(ffe.outputs[0], fft.nodes["Material Output"].inputs["Surface"])
D.box("ff_room_glow", (4200, 4, 900), (2500, -2003, GF_H + 300 + 1700), ffg, "z", 0)
C.area("ff_light", (2.5, -1.2, GF_H / 1000 + 0.3 + 2.6), 1.2, 160, WARM, (2.5, -1.2, GF_H / 1000 + 0.3))

# ------------------------------------------------------------------ the garden: lawn, a slab path, planters
D.box("plinth", (16000, 2400, 150), (0, -1200, -75), paving, "x", 2.0)
D.box("lawn", (60000, 30000, 100), (0, -2400 - 15000, -200), grass, "x", 0)
for i in range(6):
    D.box(f"path_{i}", (1400, 700, 100), (EX, -2900 - i * 1100, -120), paving, "x", 3.0)
    K.point(f"path_light_{i}", ((EX + 950) / 1000, -2.9 - i * 1.1, 0.25), 6, WARM, 0.03)
D.box("planter", (3000, 700, 500), (EX - 2600, -900, 250), K.pbr("planter_c", "concrete_wall_008", size_m=2, val=0.9,
                                                               sat=0.2), "x", 6.0)
K.model("potted_plant_02", (EX / 1000 - 3.3, -0.9, 0.5), rot_deg=20, height=1.2)
K.model("fern_02", (EX / 1000 - 2.2, -0.9, 0.5), rot_deg=80, height=0.7)
K.model("potted_plant_01", (EX / 1000 + RW / 2000 + 3.6, -0.6, 0.0), rot_deg=200, height=1.8)

# ------------------------------------------------------------------ the sky: a real dusk, the blue hour
def blue_hour(strength=0.5):
    """A deep blue-hour sky: navy at the zenith, a paler, faintly warm blue at the horizon (no ground in it)."""
    w = bpy.data.worlds.new("blue_hour")
    scene.world = w
    w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = n.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.5, (*C.srgb("#5D6F8E"), 1)
    e[1].position, e[1].color = 0.75, (*C.srgb("#0F1C36"), 1)
    mid = e.new(0.56)
    mid.color = (*C.srgb("#33476B"), 1)
    l.new(sep.outputs["Z"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], n["Background"].inputs["Color"])
    n["Background"].inputs["Strength"].default_value = strength


blue_hour(0.55)
for side, x in ((-1, -13000), (1, 15000)):                  # the plot's boundary walls: no bare land at the edges
    D.box(f"boundary_{side}", (400, 40000, 2600), (x, -6000, 1300), K.white_wall(f"bw{side}", "#5E5D5A"), "z", 0)
D.box("boundary_back", (40000, 400, 2600), (0, 14000, 1300), K.white_wall("bwb", "#5E5D5A"), "x", 0)

# ------------------------------------------------------------------ the camera: a slow arc from the street
cam = C.camera(26 if opt.phone else 30)
if opt.phone:
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 8.0
door_c = Vector((EX / 1000, 0.79, 1.4))


def place(t):
    e = C.ease_in_out(t)
    r = 15.0 - 7.0 * e                                       # from the street to the path
    a = math.radians(-32 + 30 * e)                           # an arc that squares up
    target = Vector((EX / 1000 - 1.6 * (1 - e), 0.5, 2.6 - 1.3 * e))
    cam.location = Vector((EX / 1000 + math.sin(a) * r, -math.cos(a) * r, 1.5 + 0.9 * (1 - e)))
    C.look_at(cam, target)
    cam.data.dof.focus_distance = (door_c - cam.location).length


for f in C.frame_list(N):
    place(f / (N - 1))
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
