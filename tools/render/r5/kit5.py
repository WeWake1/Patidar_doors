"""PROTOTYPE round 5 kit: what makes a render read as filmed.

  film(cam, place, N, out, extra)  keyframes the camera (location, rotation, focus) for every frame of the move,
                                   turns on motion blur, then renders frame by frame with frame_set, so Cycles
                                   blurs the move the way a shutter does. extra: [(owner, path)] also keyframed
                                   (e.g. a water ripple's W)
  haze(min_xyz, max_xyz, density)  a box of thin air that scatters light: sun shafts you can see
  rack(t, t0, t1, near, far)       a focus pull from near to far between t0 and t1
The grade (grain, vignette, a little bloom) is applied when the frames are encoded (see the r5 render queue).
"""
import bpy
from mathutils import Vector

import common as C


def film(cam, place, N, out, extra=(), blur=True, shutter=0.45):
    scene = C.scene
    scene.frame_start, scene.frame_end = 0, N - 1
    prev = None
    for f in range(N):
        place(f / (N - 1))
        if prev is not None:                         # keep the euler continuous, or the blur smears a flip
            cam.rotation_euler = cam.rotation_euler.to_quaternion().to_euler("XYZ", prev)
        prev = cam.rotation_euler.copy()
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.dof.keyframe_insert("focus_distance", frame=f)
        for owner, path in extra:
            owner.keyframe_insert(path, frame=f)
    scene.render.use_motion_blur = blur
    scene.render.motion_blur_shutter = shutter
    import os
    for f in C.frame_list(N):
        scene.frame_set(f)
        C.render_to(os.path.join(out, f"{f:03d}.webp"))


def haze(lo, hi, density=0.02, anisotropy=0.55, color="#FFFFFF"):
    """lo/hi in metres. Forward scattering (anisotropy > 0) makes beams brightest looking toward the sun."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = "haze"
    ob.scale = tuple((h - l) for l, h in zip(lo, hi))
    ob.location = tuple((h + l) / 2 for l, h in zip(lo, hi))
    m = bpy.data.materials.new("haze")
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n["Principled BSDF"])
    v = n.new("ShaderNodeVolumePrincipled")
    v.inputs["Density"].default_value = density
    v.inputs["Anisotropy"].default_value = anisotropy
    v.inputs["Color"].default_value = (*C.srgb(color), 1)
    l.new(v.outputs[0], n["Material Output"].inputs["Volume"])
    ob.data.materials.append(m)
    ob.visible_shadow = False
    return ob


def rack(t, t0, t1, near, far):
    k = C.ease_in_out(min(max((t - t0) / (t1 - t0), 0.0), 1.0))
    return near + (far - near) * k


def lerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)
