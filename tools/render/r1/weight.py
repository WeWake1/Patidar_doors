"""PROTOTYPE round 1 · A "The weight": a tall solid-teak door in a quiet white room. On the page you drag it
and it swings like the heavy thing it is; as it opens, the sunlit courtyard behind it throws a slab of
light across this room's floor.

True thing it shows: the door is solid teak, from logs bought whole and sawn in Patidar's own yard
(owner-confirmed, decisions round 1 Q9). The door itself is representative, not a catalogue product.

Frames 0..COUNT-1 = the leaf opening from 0 to MAX_DEG degrees (the page eases between them).

  blender -b --factory-startup --python tools/render/r1/weight.py -- --out <dir> [--phone] \
      [--size 1600x900] [--count 37] [--frames 0,18,36] [--test]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C  # noqa: E402
import doorkit as D  # noqa: E402
import bpy  # noqa: E402

ap = C.argparse.ArgumentParser()
ap.add_argument("--phone", action="store_true", help="portrait framing for phones")
ap.add_argument("--count", type=int, default=37)
opt, _ = ap.parse_known_args(C.argv)
COUNT, MAX_DEG = opt.count, 108.0

C.setup_cycles(look="AgX - Medium High Contrast", exposure=-0.55, bounces=10)

# ------------------------------------------------------------------ materials
leaf_mat = D.teak("teak_leaf", "polished", sat=1.08, val=0.62)
frame_mat = D.teak("teak_frame", "polished", sat=1.08, val=0.56)
brass = D.brass(rough=0.18)
wall_mat = D.plaster("lime", "#E9E9E6", rough=0.9, bump=0.14)
court_mat = D.plaster("court", "#EFEEEA", rough=0.92, bump=0.08)


def microcement(name, hexcol="#B8BBB9", alt="#A9ADAB"):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.6
    nz.inputs["Detail"].default_value = 10.0
    nz.inputs["Roughness"].default_value = 0.6
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*C.srgb(alt), 1)
    ramp.color_ramp.elements[1].color = (*C.srgb(hexcol), 1)
    l.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.07, 0.22
    l.new(nz.outputs["Fac"], rr.inputs["Value"])
    l.new(rr.outputs[0], b.inputs["Roughness"])
    return m


floor_mat = microcement("microcement", "#9DA19F", "#8F9391")

# ------------------------------------------------------------------ the doorway: 8' x 4' solid teak, hung on the right
d = D.door(1220, 2440, 45, style="plank", leaf_mat=leaf_mat, frame_mat=frame_mat, hw_mat=brass,
           handle="pull", n_planks=6, frame_face=80, frame_depth=140)
d["root"].scale.x = -1                                  # mirror: hinges on the right, the lock edge faces the camera
ow, oh = d["opening"]
WALL_T = 250
D.wall_around(ow, oh, d["frame_face"], WALL_T, 4200, 4200, 3400, wall_mat)

# room 1 (camera side): floor, ceiling, a side wall with a tall window on the left, a back wall
D.floor("floor", (12000, 14000), floor_mat, (0, -1000, 0))
D.box("ceiling_1", (8400, 6200, 120), (0, -3100 - WALL_T / 2, 3460), wall_mat, "x", 0)
D.box("wall_left_a", (250, 6200, 3400), (-4200, -3100 - WALL_T / 2, 1700), wall_mat, "z", 0)
D.box("wall_right", (250, 6200, 3400), (4200, -3100 - WALL_T / 2, 1700), wall_mat, "z", 0)
D.box("wall_back", (8400, 250, 3400), (0, -6200 - WALL_T / 2, 1700), wall_mat, "z", 0)
# the left wall has a tall window close to the door wall (y -2525..-725, z 400..2900), so its light rakes
# across the plaster and falls off toward the door: built round the gap
bpy.data.objects.remove(bpy.data.objects["wall_left_a"])
D.box("wall_left_1", (250, 600, 3400), (-4200, -300 - WALL_T / 2, 1700), wall_mat, "z", 0)
D.box("wall_left_2", (250, 3800, 3400), (-4200, -4300 - WALL_T / 2, 1700), wall_mat, "z", 0)
D.box("wall_left_sill", (250, 1800, 400), (-4200, -1500 - WALL_T / 2, 200), wall_mat, "z", 0)
D.box("wall_left_head", (250, 1800, 500), (-4200, -1500 - WALL_T / 2, 3150), wall_mat, "z", 0)

# room 2 (beyond the door): an open, sunlit courtyard with no far wall. With the sun behind the door,
# any wall facing us out there is backlit and reads as a dark slab; open, it reads as light.
D.box("court_l", (250, 9000, 2400), (-4200, 4500, 1200), court_mat, "z", 0)
D.box("court_r", (250, 9000, 2400), (4200, 4500, 1200), court_mat, "z", 0)

# ------------------------------------------------------------------ light
# the HDRI lights the scene; the camera sees a bright sky past the door instead of the HDRI's room
C.world_hdri("lebombo_2k.hdr", strength=0.05, rotate_deg=120, camera_color="#E8EEF2", camera_strength=2.8)
sun = C.sun("sun", 9.0, "#FFE6C7", 0.9)                  # morning sun in the courtyard, low enough to reach inside
C.aim_sun(sun, 30, 276)
C.area("window", (-4.6, -1.625, 1.65), 1.8, 1000, "#EEF3FF", (0, -1.625, 1.2), size_y=2.5)  # metres

# ------------------------------------------------------------------ camera
if opt.phone:
    C.scene.render.resolution_x, C.scene.render.resolution_y = 800, 1000
    cam = C.camera(30)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 30
    cam.location = (-1.2, -4.0, 1.35)
    C.look_at(cam, (0.0, 0, 1.3))
else:
    # frontal, verticals kept straight with lens shift (as an architectural photographer would); the shift
    # puts the door right of centre and leaves the plain wall on the left for the headline
    cam = C.camera(24)
    cam.location = (-0.3, -4.1, 1.05)
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.shift_x = -0.12
    cam.data.shift_y = 0.02
bpy.context.view_layer.update()
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (cam.location - bpy.data.objects["pivot"].matrix_world.translation).length
cam.data.dof.aperture_fstop = 5.6

# ------------------------------------------------------------------ frames
for f in C.frame_list(COUNT):
    ang = MAX_DEG * f / (COUNT - 1)
    d["pivot"].rotation_euler.z = math.radians(ang)
    C.render_to(os.path.join(C.args.out, f"{f:03d}.webp"))
