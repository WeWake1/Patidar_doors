"""PROTOTYPE render setup for the creative reboot. Run inside Blender, imported by a scene script.

Every scene gets from here: a clean scene, Cycles on the AMD GPU through HIP (on this machine the Radeon
RX 9060 XT alone: the integrated GPU and the CPU only slow it down), the AgX view, denoising, a camera
helper, lights, a world, and a frame loop that writes WebP files 000.webp, 001.webp, ...

  "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --factory-startup \
      --python tools/render/r1/<scene>.py -- --out <dir> [--size 1600x900] [--frames 0-47] [--test]

Flags after `--`:
  --out DIR        where the frames go
  --size WxH       output size (default 1600x900)
  --samples N      path-tracing samples (default 128; --test uses 24)
  --frames LIST    frames to render, e.g. 0-47 or 0,24,47 (default: all)
  --quality Q      WebP quality (default 80)
  --test           half the width and height, few samples: judge a shot before spending time on it
  --gpu NAME       part of the GPU's name to render on (default "RX 9060")
Scene scripts add their own flags; unknown flags are left for them.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEXTURES = os.path.join(HERE, "textures")
HDRIS = os.path.join(HERE, "hdri")

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--size", default="1600x900")
ap.add_argument("--samples", type=int, default=128)
ap.add_argument("--frames", default="", help="e.g. 0-47 or 0,24,47 (default: all)")
ap.add_argument("--quality", type=int, default=80)
ap.add_argument("--test", action="store_true", help="half size, few samples")
ap.add_argument("--gpu", default="RX 9060")
args, _ = ap.parse_known_args(argv)
# absolute, always: with no .blend open, Blender resolves a relative output path against the drive root
# (C:\...), not the working directory, so the frames silently land somewhere else
args.out = os.path.abspath(args.out)
# and only ever inside the repo or the temp folder (test renders): round 1's first frames landed in C:\reboot
REPO = os.path.dirname(os.path.dirname(HERE))
_allowed = [os.path.normcase(os.path.abspath(p)) for p in (REPO, __import__("tempfile").gettempdir())]
if not any(os.path.commonpath([os.path.normcase(args.out), a]) == a for a in _allowed):
    sys.exit(f"REFUSED: {args.out} is outside the repo ({REPO}) and the temp folder")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
W, H = (int(v) for v in args.size.split("x"))
os.makedirs(args.out, exist_ok=True)


def srgb(hexstr):
    """'#RRGGBB' in sRGB -> linear RGB tuple, for colour sockets."""
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def setup_cycles(look="AgX - Medium High Contrast", exposure=0.0, bounces=8, samples=None):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "HIP"
    prefs.refresh_devices()
    using = []
    for d in prefs.devices:
        d.use = args.gpu.lower() in d.name.lower()
        if d.use:
            using.append(d.name)
    if not using:
        raise SystemExit(f"no GPU matching {args.gpu!r}: {[d.name for d in prefs.devices]}")
    print("RENDERING ON", using, flush=True)
    cy = scene.cycles
    cy.device = "GPU"
    cy.samples = 24 if args.test else (samples or args.samples)
    cy.use_adaptive_sampling = True
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    if hasattr(cy, "denoising_use_gpu"):
        cy.denoising_use_gpu = True
    cy.max_bounces = bounces
    cy.glossy_bounces = min(bounces, 6)
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    scene.render.use_persistent_data = True          # keep the BVH between frames of a film
    scene.view_settings.view_transform = "AgX"
    for name in (look, look.replace("AgX - ", "")):
        try:
            scene.view_settings.look = name
            break
        except TypeError:
            continue
    scene.view_settings.exposure = exposure
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.resolution_percentage = 50 if args.test else 100
    scene.render.film_transparent = False


def camera(lens=50.0, sensor=36.0, clip_start=0.01):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_width = sensor
    cd.clip_start = clip_start
    cam = bpy.data.objects.new("cam", cd)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def look_at(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()


def sun(name, strength, color="#FFFFFF", angle_deg=0.53):
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy = strength
    ld.color = srgb(color)
    ld.angle = math.radians(angle_deg)
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    return ob


def aim_sun(ob, elev_deg, azim_deg):
    """azim 0 = the sun is at -X, 90 = at -Y (behind a camera that looks along +Y)."""
    el, az = math.radians(elev_deg), math.radians(azim_deg)
    to_sun = Vector((-math.cos(el) * math.cos(az), -math.cos(el) * math.sin(az), math.sin(el)))
    ob.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()


def area(name, loc, size, power, color="#FFFFFF", look=(0, 0, 0), shape="RECTANGLE", size_y=None, spread_deg=180):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    ld.size = size
    if size_y is not None:
        ld.size_y = size_y
    ld.energy = power
    ld.color = srgb(color)
    ld.spread = math.radians(spread_deg)
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, look)
    return ob


def world_hdri(name, strength=1.0, rotate_deg=0.0, camera_color=None, camera_strength=1.0):
    """An HDRI from tools/render/hdri lights the scene; camera_color (hex) is what the camera sees
    directly instead, so a scene can light with a real interior and still sit on a flat backdrop."""
    w = bpy.data.worlds.new("world")
    scene.world = w
    w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
    bg = n["Background"]
    env = n.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(HDRIS, name), check_existing=True)
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(rotate_deg))
    l.new(tc.outputs["Generated"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], env.inputs["Vector"])
    l.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    if camera_color:
        cam_bg = n.new("ShaderNodeBackground")
        cam_bg.inputs["Color"].default_value = (*srgb(camera_color), 1)
        cam_bg.inputs["Strength"].default_value = camera_strength
        lp = n.new("ShaderNodeLightPath")
        mix = n.new("ShaderNodeMixShader")
        l.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
        l.new(bg.outputs[0], mix.inputs[1])
        l.new(cam_bg.outputs[0], mix.inputs[2])
        l.new(mix.outputs[0], n["World Output"].inputs["Surface"])
    return w


def world_color(hexcol, strength):
    w = bpy.data.worlds.new("world")
    scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb(hexcol), 1)
    bg.inputs["Strength"].default_value = strength
    return w


def frame_list(count):
    if not args.frames:
        return list(range(count))
    out = []
    for part in args.frames.split(","):
        if "-" in part:
            a, b = (int(v) for v in part.split("-"))
            out += range(a, b + 1)
        elif part:
            out.append(int(part))
    return [f for f in out if 0 <= f < count]


def render_to(path):
    s = scene.render.image_settings
    s.file_format = "WEBP"
    s.color_mode = "RGB"
    s.quality = args.quality
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("WROTE", path, flush=True)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
