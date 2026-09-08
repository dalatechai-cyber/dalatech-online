"""Build the Dala AI office in Blender (bpy) from CC0 Kenney furniture and
Quaternius people, then render a still.

    python3 scripts/office3d/build_room.py preview   # 480x560, quick
    python3 scripts/office3d/build_room.py final     # 1500x1750

Everything is in metres. Kenney's furniture kit is authored at half scale, so
it is imported at 2x. People are Quaternius humanoid-rig FBX at 1.66 m, posed
procedurally (the animation library's rig has different bone names, so for a
still we pose by hand).
"""
import bpy, math, os, sys, time
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEN = os.path.join(ROOT, "assets-src/office/3d/kenney/3d/furniture")
QUA = os.path.join(ROOT, "assets-src/office/3d/quaternius")
OUT = "/tmp/office3d"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textures

S = 2.0  # Kenney kit units -> metres

# ---------------------------------------------------------------- palette
NAVY_CARPET = (0.040, 0.055, 0.115)
NAVY_WALL = (0.070, 0.095, 0.190)
NAVY_WALL_DARK = (0.050, 0.068, 0.140)
OAK = (0.52, 0.36, 0.22)
OAK_DARK = (0.34, 0.22, 0.13)
DESK_GREY = (0.30, 0.34, 0.46)
METAL_DARK = (0.09, 0.12, 0.21)
METAL_MID = (0.17, 0.21, 0.33)
METAL_LIGHT = (0.72, 0.76, 0.84)
SEAT_BLUE = (0.19, 0.28, 0.50)
SEAT_PALE = (0.70, 0.74, 0.82)
BRAND = (0.10, 0.26, 0.62)
PLANT = (0.18, 0.62, 0.40)
GOLD = (1.0, 0.72, 0.30)

# Kenney material name -> (base colour, roughness)
KENNEY_MAT = {
    "wood": (OAK, 0.55), "woodDark": (OAK_DARK, 0.6),
    "metal": (DESK_GREY, 0.45), "metalDark": (METAL_DARK, 0.5), "metalMedium": (METAL_MID, 0.5), "metalLight": (METAL_LIGHT, 0.4),
    "carpet": ((0.44, 0.46, 0.54), 0.85), "carpetWhite": (SEAT_PALE, 0.8), "carpetBlue": ((0.16, 0.22, 0.42), 0.85), "carpetDarker": (METAL_MID, 0.8),
    "glass": ((0.75, 0.85, 1.0), 0.1), "plant": (PLANT, 0.7), "_defaultMat": ((0.80, 0.83, 0.90), 0.5), "fur": (OAK_DARK, 0.9),
    "lamp": ((0.9, 0.85, 0.7), 0.6),
}

_cache = {}
_recoloured = set()


def recolour_kenney(objs):
    for o in objs:
        if o.type != 'MESH':
            continue
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in _recoloured:
                continue
            key = m.name.split('.')[0]
            spec = KENNEY_MAT.get(key)
            if spec and m.use_nodes:
                b = m.node_tree.nodes.get("Principled BSDF")
                if b:
                    b.inputs["Base Color"].default_value = (*spec[0], 1)
                    b.inputs["Roughness"].default_value = spec[1]
            _recoloured.add(m.name)


def kenney(name, x, y, rot=0, z=0.0, scale=1.0, sub=None):
    """Place a Kenney piece with its footprint centred on (x, y), base at z."""
    path = os.path.join(KEN, name + ".glb")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None or o.parent not in new]
    grp = bpy.data.objects.new("grp_" + name, None)
    bpy.context.scene.collection.objects.link(grp)
    for r in roots:
        r.parent = grp
    for o in new:
        o.scale = (1, 1, 1)
    grp.scale = (S * scale,) * 3
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == 'MESH' for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (mn + mx) / 2
    # move the group so the bbox centre sits at the target; rotate about that centre
    piv = bpy.data.objects.new("piv_" + name, None)
    bpy.context.scene.collection.objects.link(piv)
    piv.location = (x, y, z)
    piv.rotation_euler = (0, 0, math.radians(rot))
    grp.parent = piv
    grp.location = (-centre.x, -centre.y, -mn.z)
    recolour_kenney(new)
    bpy.context.view_layer.update()
    return {"objs": new, "size": (mx - mn), "piv": piv}


def mat(name, rgb, rough=0.6, emit=None, strength=1.0, alpha=1.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission
        b.inputs["IOR"].default_value = 1.2
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND'
    return m


def tex_mat(name, path, emit_strength=0.0, rough=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    if emit_strength:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit_strength
    return m


def plane(name, w, h, loc, rot=(0, 0, 0), material=None):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = (w, h, 1)
    if material:
        o.data.materials.append(material)
    return o


def box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.data.materials.append(material)
    return o


def light(kind, loc, energy, color=(1, 1, 1), size=1.0, rot=(0, 0, 0), radius=0.1):
    bpy.ops.object.light_add(type=kind, location=loc, rotation=rot)
    l = bpy.context.object
    l.data.energy = energy
    l.data.color = color
    if kind == 'AREA':
        l.data.size = size
    if kind == 'POINT':
        l.data.shadow_soft_size = radius
    return l


# ---------------------------------------------------------------- people
def person(fbx, x, y, rot, colours, seated=True):
    """Import a Quaternius humanoid-rig FBX, recolour by material name, pose."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=fbx)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    for o in new:
        if o.type == 'MESH':
            for slot in o.material_slots:
                m = slot.material
                if not m:
                    continue
                m = m.copy(); slot.material = m
                b = m.node_tree.nodes.get("Principled BSDF")
                # some of the packs' FBX files carry alpha 0 on every material, which renders as nothing
                b.inputs["Alpha"].default_value = 1.0
                m.blend_method = 'OPAQUE'
                if m.name.split('.')[0] in colours:
                    b.inputs["Base Color"].default_value = (*colours[m.name.split('.')[0]], 1)
                    b.inputs["Roughness"].default_value = 0.7
    arm.location = (x, y, 0.0)
    arm.rotation_euler = (0, 0, math.radians(rot))
    bpy.context.view_layer.update()
    if seated:
        pose_seated(arm)
    return arm


def aim_bone(arm, name, direction):
    """Rotate a pose bone so it points along `direction` (armature space), keeping roll."""
    pb = arm.pose.bones.get(name)
    if not pb:
        return
    bpy.context.view_layer.update()
    rest = arm.data.bones[name].matrix_local.to_3x3()
    cur = pb.matrix.to_3x3()
    cur_dir = cur.col[1].normalized()
    q = cur_dir.rotation_difference(Vector(direction).normalized())
    newrot = q.to_matrix() @ cur
    pb.matrix = Matrix.Translation(pb.head) @ newrot.to_4x4()
    bpy.context.view_layer.update()


def pose_seated(arm):
    # the character faces -y in its own space; directions below are in armature space
    arm.location.z = -0.40  # hips drop to the seat
    bpy.context.view_layer.update()
    aim_bone(arm, "Abdomen", (0, -0.10, 1))
    aim_bone(arm, "Torso", (0, -0.12, 1))
    aim_bone(arm, "Chest", (0, -0.10, 1))
    aim_bone(arm, "Neck", (0, -0.15, 1))
    aim_bone(arm, "Head", (0, -0.25, 1))
    for side, sx in (("L", 1), ("R", -1)):
        aim_bone(arm, f"UpperLeg.{side}", (sx * 0.12, -1, -0.05))
        aim_bone(arm, f"LowerLeg.{side}", (0, -0.05, -1))
        aim_bone(arm, f"Foot.{side}", (0, -1, 0))
        aim_bone(arm, f"UpperArm.{side}", (sx * 0.45, -0.55, -0.70))
        aim_bone(arm, f"LowerArm.{side}", (sx * -0.05, -1, -0.25))
        aim_bone(arm, f"Hand.{side}", (sx * 0.1, -1, -0.15))


# ---------------------------------------------------------------- the room
def build(quality="preview"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    tex = textures.all_textures(os.path.join(OUT, "tex"))

    # floor and walls -----------------------------------------------------
    # 8 m x 8.4 m room; back wall at y = 4.2, side walls to y = -0.6, nothing in front
    carpet = mat("carpet", NAVY_CARPET, 0.9)
    nt = carpet.node_tree; noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 90; noise.inputs["Detail"].default_value = 4
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.030, 0.042, 0.095, 1); ramp.color_ramp.elements[1].color = (0.052, 0.070, 0.140, 1)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    plane("floor", 10, 12, (0, 0, 0), material=carpet)
    for i, x in enumerate((-3.2, -1.6, 0.0, 1.6, 3.2)):
        kenney("wallWindow" if i in (1, 3) else "wall", x, 4.2, 0, scale=0.8)
    for y in (3.4, 1.8, 0.2):
        kenney("wall", -4.0, y, 90, scale=0.8)
        kenney("wall", 4.0, y, 90, scale=0.8)
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name.startswith(("wall", "wallWindow", "window")):
            for slot in o.material_slots:
                if not slot.material:
                    continue
                key = slot.material.name.split('.')[0]
                if key == "_defaultMat":
                    nm = slot.material.copy(); slot.material = nm
                    nm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*NAVY_WALL, 1)
                if key == "glass":
                    g = slot.material.copy(); slot.material = g
                    g.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.12; g.blend_method = 'BLEND'
    box("skirting", (8.0, 0.05, 0.10), (0, 4.16, 0.05), mat("skirt", NAVY_WALL_DARK, 0.6))
    plane("city", 26, 9, (0, 8.0, 3.2), rot=(math.radians(90), 0, 0), material=tex_mat("city", tex["skyline"], emit_strength=1.6))

    # rugs
    kenney("rugRectangle", 0.3, -2.8, 0)
    kenney("rugRound", -2.6, -1.6, 0)

    # back wall furniture ---------------------------------------------------
    kenney("bookcaseOpen", -0.45, 3.8, 0)
    kenney("bookcaseClosedWide", 0.5, 3.8, 0)
    kenney("books", -0.45, 3.8, 0, z=1.78)
    plane("whiteboard", 1.5, 0.85, (0.0, 4.13, 1.55), rot=(math.radians(90), 0, 0), material=tex_mat("wb", tex["whiteboard"], rough=0.3))
    kenney("pottedPlant", -3.6, 3.7, 0)
    kenney("pottedPlant", 3.6, 3.7, 0)
    kenney("coatRackStanding", 3.6, 2.5, 0)
    kenney("bookcaseClosedWide", 3.65, 1.2, 90)
    kenney("cardboardBoxClosed", -3.6, 2.4, 20)
    kenney("cardboardBoxOpen", -3.55, 2.4, -15, z=0.56)

    # workstations ----------------------------------------------------------
    stations = {
        "ara": dict(x=-2.0, y=2.7, live=True, screen="chat"),
        "veda": dict(x=2.0, y=2.7, live=True, screen="chart"),
        "nova": dict(x=-2.0, y=0.3, live=False, screen="off"),
        "eho": dict(x=2.0, y=0.3, live=False, screen="off"),
    }
    lamp_mat_on = mat("lampOn", (0.95, 0.85, 0.6), 0.5, emit=GOLD, strength=6)
    lamp_mat_off = mat("lampOff", (0.35, 0.38, 0.5), 0.6)
    for sid, st in stations.items():
        x, y = st["x"], st["y"]
        d = kenney("desk", x, y, 0)
        top = d["size"].z  # 0.76
        kenney("computerScreen", x - 0.28, y - 0.22, 0, z=top, scale=0.72)
        kenney("computerKeyboard", x + 0.05, y + 0.12, 0, z=top)
        kenney("computerMouse", x + 0.38, y + 0.12, 0, z=top)
        lamp = kenney("lampSquareTable", x + 0.58, y + 0.15, 0, z=top)
        for o in lamp["objs"]:
            if o.type == 'MESH':
                for slot in o.material_slots:
                    if slot.material and slot.material.name.split('.')[0] == "lamp":
                        slot.material = lamp_mat_on if st["live"] else lamp_mat_off
        kenney("plantSmall1", x - 0.60, y + 0.20, 0, z=top)
        kenney("books", x + 0.50, y - 0.18, 25, z=top)
        kenney("chairDesk", x + 0.12, y + 0.72, 180)
        sm = tex_mat("screen_" + sid, tex[st["screen"]], emit_strength=(2.2 if st["live"] else 0.15))
        plane("screen_" + sid, 0.50, 0.30, (x - 0.28, y - 0.22 - 0.076, top + 0.26), rot=(math.radians(90), 0, 0), material=sm)
        if st["live"]:
            light('POINT', (x + 0.58, y + 0.15, top + 0.62), 70, GOLD, radius=0.06)
        # a small drawer unit beside each desk and a bin
        kenney("sideTableDrawers", x - 1.05, y + 0.1, 90)
        kenney("trashcan", x + 0.95, y + 0.25, 0, scale=0.7)
    kenney("laptop", 2.0 + 0.55, 2.7 - 0.18, -20, z=0.76)
    box("phone", (0.16, 0.12, 0.05), (-2.0 - 0.55, 2.7 - 0.20, 0.76 + 0.025), mat("phone", METAL_DARK, 0.4))

    frost = mat("frost", (0.72, 0.84, 1.0), 0.5, alpha=0.10)
    for sid in ("nova", "eho"):
        st = stations[sid]
        box("frost_" + sid, (2.9, 2.1, 1.5), (st["x"], st["y"] + 0.3, 0.75), frost)

    # middle: printer stand and plant between the rows
    kenney("cabinetTelevision", 0.0, 1.6, 0)
    kenney("radio", 0.0, 1.6, 0, z=0.62)
    kenney("plantSmall2", 0.55, 1.6, 0, z=0.62)

    # lounge and kitchen ------------------------------------------------------
    kenney("kitchenBar", -3.55, -1.0, 90)
    kenney("kitchenCoffeeMachine", -3.55, -0.7, 90, z=0.86)
    kenney("kitchenFridgeSmall", -3.6, -2.3, 90)
    kenney("stoolBar", -2.9, -1.2, 0)
    kenney("tableRound", -2.6, -1.7, 0, scale=0.85)
    kenney("chair", -3.2, -1.7, 90)
    kenney("chair", -2.0, -1.7, -90)
    kenney("laptop", -2.6, -1.7, 30, z=0.62)
    kenney("loungeSofa", 0.3, -3.4, 0)
    kenney("loungeChair", -1.2, -2.4, 55)
    kenney("loungeChair", 1.8, -2.4, -55)
    kenney("tableCoffee", 0.3, -2.45, 0)
    kenney("plantSmall3", 0.3, -2.45, 0, z=0.46)
    kenney("lampRoundFloor", 2.5, -3.5, 0)
    kenney("sideTable", 3.3, -3.6, 0)
    kenney("speaker", 3.7, -3.6, 0)
    kenney("bookcaseOpenLow", 3.65, -1.6, 90)
    kenney("cardboardBoxClosed", 3.5, -0.3, 10)
    kenney("cardboardBoxClosed", 3.5, -0.3, -5, z=0.56)
    kenney("cardboardBoxOpen", 3.0, -0.4, 30)
    kenney("pottedPlant", -1.7, -3.7, 0)
    kenney("pottedPlant", 3.0, -0.9, 0)
    kenney("trashcan", -3.0, -2.9, 0)
    kenney("toaster", -3.55, -1.35, 90, z=0.86)

    # people ------------------------------------------------------------------
    skin_a = (0.62, 0.42, 0.24); skin_b = (0.55, 0.36, 0.20); skin_c = (0.70, 0.50, 0.32)
    person(os.path.join(QUA, "women/humanoid/Formal.fbx"), -2.0 + 0.12, 2.7 + 0.70, 0,
           {"LimeGreen": (0.88, 0.90, 0.95), "Gold": (0.10, 0.13, 0.26), "Red": (0.08, 0.08, 0.10), "Brown": (0.05, 0.03, 0.02), "Skin": skin_a})
    person(os.path.join(QUA, "women/humanoid/Suit.fbx"), 2.0 + 0.12, 2.7 + 0.70, 0,
           {"Black": (0.07, 0.09, 0.18), "White": (0.85, 0.87, 0.92), "Hair_Blond": (0.18, 0.10, 0.05), "Hair_Brown": (0.12, 0.07, 0.03), "Skin": skin_c})
    person(os.path.join(QUA, "men/humanoid/Casual.fbx"), -2.0 + 0.12, 0.3 + 0.70, 0,
           {"Purple": BRAND, "LightBlue": (0.10, 0.12, 0.20), "White": (0.8, 0.8, 0.85), "Skin": skin_b})
    person(os.path.join(QUA, "men/humanoid/Suit.fbx"), 2.0 + 0.12, 0.3 + 0.70, 0,
           {"Suit": (0.08, 0.10, 0.20), "Tie": (0.22, 0.74, 0.97), "White": (0.85, 0.87, 0.92), "Skin": skin_a})

    # lights ------------------------------------------------------------------
    for x in (-1.6, 1.6):
        light('AREA', (x, 4.4, 1.3), 220, (0.55, 0.70, 1.0), size=1.3, rot=(math.radians(90), 0, 0))
    light('AREA', (0, -0.5, 6.0), 520, (0.82, 0.86, 1.0), size=9, rot=(0, 0, 0))
    light('AREA', (0, -7, 4.5), 420, (0.88, 0.90, 1.0), size=5, rot=(math.radians(-40), 0, 0))
    light('POINT', (2.5, -3.5, 1.35), 8, GOLD, radius=0.1)
    sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.02, 0.03, 0.08, 1); bg.inputs[1].default_value = 0.35

    # camera ------------------------------------------------------------------
    if quality == "station":
        bpy.ops.object.camera_add(location=(0.2, -0.6, 3.4)); tloc = (-2.0, 2.75, 0.85)
    else:
        bpy.ops.object.camera_add(location=(0.0, -9.6, 8.4)); tloc = (0, 0.5, 0.45)
    cam = bpy.context.object; sc.camera = cam; cam.data.lens = 46
    tgt = bpy.data.objects.new("tgt", None); sc.collection.objects.link(tgt); tgt.location = tloc
    c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    cam.data.dof.use_dof = True; cam.data.dof.focus_object = tgt; cam.data.dof.aperture_fstop = 8

    # render ------------------------------------------------------------------
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    if quality == "preview":
        sc.render.resolution_x, sc.render.resolution_y, sc.cycles.samples = 600, 700, 40
    elif quality == "station":
        sc.render.resolution_x, sc.render.resolution_y, sc.cycles.samples = 1400, 1000, 160
    else:
        sc.render.resolution_x, sc.render.resolution_y, sc.cycles.samples = 1500, 1750, 200
    sc.render.filepath = os.path.join(OUT, f"room_{quality}.png")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "room.blend"))
    t = time.time(); bpy.ops.render.render(write_still=True)
    print("rendered", sc.render.filepath, "in", round(time.time() - t, 1), "s")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "preview")
